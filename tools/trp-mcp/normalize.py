#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TRP-MCP · 語料正規化器 (Phase 0)

讀取協議庫，把三種 metadata 形狀收斂成單一結構，輸出旁掛索引與人類可讀報告。

設計約束（見 DESIGN.md §2）：
  P1  索引不得成為正本 —— 本工具對協議檔案零寫入
  P3  過期就報錯，不猜 —— 索引記錄建立時的 git HEAD
  P4  查不到是合法輸出 —— 解析失敗記在報告，不猜測、不填預設值

相依：Python 3.8+ 標準庫。與 tools/wiki-local/*.py 的既有慣例一致，不需 pip。

用法：
    python3 normalize.py                      # 產生 index.json + REPORT.md
    python3 normalize.py --report-only        # 只印報告到 stdout，不寫檔
    python3 normalize.py --root /path/to/repo
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

# ─────────────────────────────────────────────────────────────
# 受控詞彙：machine 值 ← 現況自由文字
# 原始字串一律保留在 status_raw，此處只做機器層映射。
# 語義溫度的差異（Genesis / Resonating / Breathing / Eternal）
# 是表述，不是狀態機轉移，故全部收斂為 Active。
# ─────────────────────────────────────────────────────────────
STATUS_MAP = [
    # (優先序, 比對用 regex, machine 值)
    (10, r"honored[-\s]?completion",              "Honored-Completion"),
    (20, r"superseded|已退役|已昇華",              "Superseded"),
    (30, r"candidate|候選|revision[-\s]?required", "Candidate"),
    (40, r"seed[-\s]?for[-\s]?review|seed",        "Seed"),
    (50, r"draft|草案",                            "Draft"),
    (60, r"active|eternal|living|sacred|資格",      "Active"),
]

# ─────────────────────────────────────────────────────────────
# 治理規則一律讀 CORPUS-MANIFEST.yaml，不在本檔手抄。
# manifest 是正本；本工具是它的執行者（DESIGN.md §0）。
# ─────────────────────────────────────────────────────────────

def glob_to_regex(pat):
    """manifest 的 glob → regex。支援 ** / * / ? / [0-9] 字元類。"""
    out, i = ["^"], 0
    while i < len(pat):
        c = pat[i]
        if pat.startswith("**/", i):
            out.append("(?:.*/)?"); i += 3
        elif pat.startswith("**", i):
            out.append(".*"); i += 2
        elif c == "*":
            out.append("[^/]*"); i += 1
        elif c == "?":
            out.append("[^/]"); i += 1
        elif c == "[":
            j = pat.index("]", i) + 1
            out.append(pat[i:j]); i = j
        else:
            out.append(re.escape(c)); i += 1
    out.append("$")
    return re.compile("".join(out))


def load_manifest(root):
    """
    讀 CORPUS-MANIFEST.yaml。只取本工具需要的區段，
    用與 parse_flat_yaml 同級的容錯策略；讀不到就中止（不猜預設值，P4）。
    """
    path = os.path.join(root, "CORPUS-MANIFEST.yaml")
    if not os.path.isfile(path):
        sys.exit("找不到 CORPUS-MANIFEST.yaml：治理規則的正本缺席，拒絕以預設值代替。")
    text = open(path, encoding="utf-8").read()

    def section_items(name):
        """取出 `name:` 之下的清單項（含 - path: / - pattern: / - 純量）"""
        m = re.search(r"^%s:\s*$" % re.escape(name), text, re.M)
        if not m:
            return []
        rest = text[m.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        items = []
        for line in body.split("\n"):
            ls = line.strip()
            if not ls or ls.startswith("#"):
                continue
            mm = re.match(r"^-?\s*(?:path|pattern|include):\s*(.+)$", ls)
            if mm:
                items.append(mm.group(1).strip().strip("'").strip('"'))
            elif ls.startswith("- "):
                v = ls[2:].strip().strip("'").strip('"')
                if ":" not in v:
                    items.append(v)
        return items

    def ordered_list(name):
        m = re.search(r"^%s:\s*$" % re.escape(name), text, re.M)
        if not m:
            return []
        rest = text[m.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        return [l.strip()[2:].strip() for l in body.split("\n")
                if l.strip().startswith("- ")]

    # corpora：id + include + authority（逐塊解析）
    corpora = []
    cm = re.search(r"^corpora:\s*$", text, re.M)
    if cm:
        rest = text[cm.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        for blk in re.split(r"\n\s*-\s+(?=id:)", body):
            cid = re.search(r"id:\s*(\S+)", blk)
            inc = re.search(r"include:\s*(\S+)", blk)
            aut = re.search(r"authority:\s*(\S+)", blk)
            hst = re.search(r"historyPattern:\s*(\S+)", blk)
            if cid and inc:
                corpora.append({
                    "id": cid.group(1), "include": inc.group(1),
                    "authority": aut.group(1) if aut else "contextual",
                    "historyPattern": hst.group(1) if hst else None,
                })

    atlas = re.search(r"^atlas:\s*\n\s*path:\s*(\S+)", text, re.M)

    root_docs = {}
    rm = re.search(r"^rootDocuments:\s*$", text, re.M)
    if rm:
        rest = text[rm.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        for blk in re.split(r"\n\s*-\s+(?=path:)", body):
            p_ = re.search(r"path:\s*(\S+)", blk)
            a_ = re.search(r"authority:\s*(\S+)", blk)
            if p_:
                root_docs[p_.group(1)] = a_.group(1) if a_ else "orientation"

    pub_docs = []
    pm = re.search(r"^publicationDocuments:\s*$", text, re.M)
    if pm:
        rest = text[pm.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        for blk in re.split(r"\n\s*-\s+(?=path:|pattern:)", body):
            p_ = re.search(r"(?:path|pattern):\s*(\S+)", blk)
            if p_:
                pub_docs.append(p_.group(1))

    return {
        "atlas": atlas.group(1) if atlas else None,
        "rootDocuments": root_docs,
        "publicationDocuments": [glob_to_regex(p) for p in pub_docs],
        "corpora": [dict(c, rx=glob_to_regex(c["include"]),
                         hrx=glob_to_regex(c["historyPattern"]) if c["historyPattern"] else None)
                    for c in corpora],
        "reviewRequired": [glob_to_regex(p) for p in section_items("reviewRequired")],
        "exclude": [glob_to_regex(p) for p in section_items("exclude")],
        "authorityOrder": ordered_list("authorityOrder"),
    }


def resolve_authority(rel, mf):
    """依 manifest 決定 authority。history 一律降為 historical。"""
    if mf["atlas"] and rel == mf["atlas"]:
        return "current-atlas"
    for c in mf["corpora"]:
        if c["hrx"] and c["hrx"].match(rel):
            return "historical"
    if re.search(r"(^|/)history/", rel):
        return "historical"
    if rel in mf["rootDocuments"]:
        return mf["rootDocuments"][rel]
    for rx in mf["publicationDocuments"]:
        if rx.match(rel):
            return "publication"
    if rel.startswith("DOCS/wiki/"):
        return "draft-mirror"
    for c in mf["corpora"]:
        if c["rx"].match(rel):
            return c["authority"]
    return "contextual"


# 協議文件的 ID 命名慣例：只有符合者才該有 id 欄位。
# README / ORIGIN / 書稿章節等不適用，不列為 finding。
PROTOCOL_ID_RE = re.compile(
    r"^(SPEC|MB|LEX|EPOCH|CASE|ACADEMIC|INDEX)[\u00b7\-]", re.I)

# 我們關心的純量欄位（其餘原樣保留在 raw）
SCALAR_KEYS = {
    "id", "title", "subtitle", "category", "version", "status", "date",
    "updated", "last_updated", "epistemic_status", "created",
    "latest_active_version", "candidate_overlay_version",
    "candidate_overlay_status", "successor_note", "integration_note",
    "source_revision",
}
LIST_KEYS = {"authors", "contributors", "related", "changelog", "supersedes"}


# ─────────────────────────────────────────────────────────────
# frontmatter 擷取：三種形狀
# ─────────────────────────────────────────────────────────────
def extract_metadata_block(text):
    """回傳 (yaml_text, shape)。shape ∈ {yaml_fm, yaml_block, none}"""
    if text.startswith("---\n") or text.startswith("---\r\n"):
        m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
        if m:
            return m.group(1), "yaml_fm"
    # ```yaml 區塊：開頭必須落在檔案前段（避免抓到內文範例），
    # 但區塊本身可以很長——CASE·META-112 的 metadata 就超過 3000 字元，
    # 若把結尾也限制在同一個窗口內，會把它誤判成「沒有 metadata」。
    # 反引號與波浪號圍籬都是合法 Markdown，兩種都收。
    m = re.search(r"(```|~~~)yaml\r?\n", text[:3000])
    if m:
        fence = m.group(1)
        close = re.search(r"\n" + re.escape(fence), text[m.end():])
        body = text[m.end():m.end() + close.start()] if close else text[m.end():]
        return body, "yaml_block"
    return None, "none"


def parse_flat_yaml(src):
    """
    容錯的扁平 YAML 解析器，只處理本庫實際用到的子集：
      key: scalar
      key: "quoted"
      key: |  / >  (區塊純量)
      key:
        - item
    不支援巢狀 mapping；遇到不認識的結構記為 unparsed 而非猜測。
    """
    if not src:
        return {}, []
    data, unparsed = {}, []
    lines = src.split("\n")
    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        i += 1
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        # 只處理零縮排的 key（巢狀交給下面的 list/block 收集）
        if raw[:1] in (" ", "\t"):
            unparsed.append(line)
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_\-]*)\s*:\s*(.*)$", line)
        if not m:
            unparsed.append(line)
            continue
        # 鍵名正規化為小寫：庫裡並存 id: 與 ID:、title: 與 Title:
        key, rest = m.group(1).lower(), m.group(2).strip()

        # 區塊純量 | 或 >
        if rest in ("|", ">", "|-", ">-", "|+", ">+"):
            buf = []
            while i < len(lines) and (not lines[i].strip() or lines[i][:1] in (" ", "\t")):
                buf.append(lines[i].strip())
                i += 1
            data[key] = " ".join(x for x in buf if x).strip()
            continue

        # 行內值
        if rest:
            # 去掉行尾註解（僅當 # 前有空白，避免砍掉 #標籤）
            rest = re.sub(r"\s+#.*$", "", rest).strip()
            data[key] = rest.strip('"').strip("'")
            continue

        # 空值 → 可能是 list
        items = []
        while i < len(lines) and re.match(r"^\s+-\s+", lines[i]):
            items.append(re.sub(r"^\s+-\s+", "", lines[i]).strip().strip('"').strip("'"))
            i += 1
        data[key] = items if items else ""
    return data, unparsed


# ─────────────────────────────────────────────────────────────
# 正規化
# ─────────────────────────────────────────────────────────────
def lookup_key(raw_id):
    """
    分隔符不敏感的查找鍵。
    MB-001 / MB·001 / mb 001 → MB001
    這讓 id: 欄位與檔名的既有差異不必被改動即可互通。

    只移除分隔符（· - _ 空白），不移除其餘非英數字元——
    SPEC·∆ 與 SPEC·∞ 的 ∆／∞ 是 ID 本身，刪掉會讓兩者撞成同一鍵。
    """
    if not raw_id:
        return None
    return re.sub(r"[\u00b7\-_\s]+", "", str(raw_id)).upper()


def id_from_filename(fname):
    """檔名 → 推定 ID（取第一段，直到中文或說明性後綴）"""
    stem = re.sub(r"\.md$", "", fname)
    m = re.match(r"^([A-Za-z0-9\u00b7\u2206\u221e\-]+?)"
                 r"(?=-[^A-Za-z0-9\u00b7\u2206\u221e\-]|$)", stem)
    return m.group(1) if m else stem


# CASE／紀錄類文件自成一套狀態詞彙，與生命週期無關。
# 兩者不共用欄位——壓成同一格會讓「這條還算不算數」與
# 「這份紀錄封到哪」互相汙染。
DOC_STATUS_RE = re.compile(
    r"field[-\s]?documentation|sealed|已封存|紀錄完成|review[-\s]?recorded|"
    r"structural[-\s]?observation|historic[-\s]?milestone|evidence[-\s]?layered|"
    r"published|completed|canonical|verified", re.I)


def machine_status(raw):
    """回傳 (status_machine, status_kind)。判不出來就回 None，不猜（P4）。"""
    if not raw:
        return None, None
    s = str(raw).lower()
    for _, pat, val in sorted(STATUS_MAP):
        if re.search(pat, s):
            return val, "lifecycle"
    if DOC_STATUS_RE.search(str(raw)):
        return None, "documentation"
    return None, "unmapped"


def machine_version(raw):
    """從自由文字抽出第一個 vX.Y(.Z) 形狀；抽不到回 None（不猜）"""
    if not raw:
        return None
    m = re.search(r"v(\d+)\.(\d+)(?:\.(\d+))?", str(raw))
    if not m:
        return None
    parts = [m.group(1), m.group(2)] + ([m.group(3)] if m.group(3) else [])
    return "v" + ".".join(parts)


def first_match(rules, relpath, default=None):
    for pat, val in rules:
        if re.search(pat, relpath):
            return val
    return default


def any_match(pats, relpath):
    return any(re.search(p, relpath) for p in pats)


def detect_candidates(meta, text_head):
    """偵測未決候選 overlay 的訊號（回傳訊號清單，不下判斷）"""
    sig = []
    for k in ("candidate_overlay_version", "candidate_overlay_status",
              "successor_note"):
        if meta.get(k):
            sig.append(k)
    blob = " ".join(str(meta.get(k, "")) for k in ("version", "status"))
    if re.search(r"candidate|候選|Revision-Required", blob, re.I):
        sig.append("status_or_version_text")
    return sig


def git_head(root):
    try:
        out = subprocess.run(["git", "-C", root, "rev-parse", "HEAD"],
                             capture_output=True, text=True, timeout=10)
        if out.returncode == 0:
            return out.stdout.strip()
    except Exception:
        pass
    return None


def git_dirty(root):
    try:
        out = subprocess.run(["git", "-C", root, "status", "--porcelain"],
                             capture_output=True, text=True, timeout=15)
        return bool(out.stdout.strip()) if out.returncode == 0 else None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
def build_index(root, mf):
    docs, problems = [], []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames
                       if d not in (".git", "node_modules", "__pycache__")]
        for fn in sorted(filenames):
            if not fn.endswith(".md"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            if any(rx.match(rel) for rx in mf["exclude"]):
                continue
            try:
                text = open(full, encoding="utf-8").read()
            except Exception as e:
                problems.append({"path": rel, "kind": "unreadable", "detail": str(e)})
                continue

            block, shape = extract_metadata_block(text)
            meta, unparsed = parse_flat_yaml(block)

            # 只有符合協議 ID 命名慣例的檔案才「應該」有 id。
            # README / ORIGIN / 書稿章節不適用，不推定、不列 finding。
            # SPEC 的編號聖典（000 / 001 / 002 / 005 / 999）沒有字母前綴，
            # 但同樣是協議文件，同樣該有 id。
            expects_id = bool(PROTOCOL_ID_RE.match(fn)) or bool(
                re.match(r"^SPEC/(history/)?\d{3}-", rel))
            declared_id = meta.get("id") or ""
            if declared_id:
                raw_id, derived = declared_id, False
            elif expects_id:
                raw_id, derived = id_from_filename(fn), True
            else:
                raw_id, derived = None, False

            corpus = None
            for c in mf["corpora"]:
                if c["rx"].match(rel) or (c["hrx"] and c["hrx"].match(rel)):
                    corpus = c["id"]
                    break

            status_raw = meta.get("status") or ""
            st_machine, st_kind = machine_status(status_raw)
            version_raw = meta.get("version") or ""

            entry = {
                "lookup_key": lookup_key(raw_id),
                "id_raw": raw_id,
                "id_declared": bool(declared_id),
                "id_derived_from_filename": derived,
                "path": rel,
                "corpus": corpus,
                "title": meta.get("title") or re.sub(r"\.md$", "", fn),
                "authority": resolve_authority(rel, mf),
                "review_required": any(rx.match(rel) for rx in mf["reviewRequired"]),
                "metadata_shape": shape,
                "status_machine": st_machine,
                "status_kind": st_kind,
                "status_raw": status_raw,
                "version_machine": machine_version(version_raw),
                "version_raw": version_raw,
                "date": meta.get("date") or meta.get("created") or "",
                "updated": meta.get("updated") or meta.get("last_updated") or "",
                "epistemic_status": meta.get("epistemic_status") or "",
                "related": meta.get("related") if isinstance(meta.get("related"), list)
                           else ([meta["related"]] if meta.get("related") else []),
                "candidate_signals": detect_candidates(meta, text[:3000]),
                "bytes": len(text.encode("utf-8")),
                "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            }
            docs.append(entry)

            # ── finding 登記（只記錄，不修正）──
            # 僅對「應該有 metadata」的協議文件開單，避免書稿章節製造雜訊。
            if expects_id:
                if shape == "none":
                    problems.append({"path": rel, "kind": "no_metadata_block",
                                     "detail": "協議命名但無 frontmatter 與 yaml 區塊"})
                elif not declared_id:
                    problems.append({"path": rel, "kind": "missing_id",
                                     "detail": "有 metadata 但無 id 欄位，已由檔名推定為 %s"
                                               % raw_id})
            # 只有核心四庫「應該」有生命週期狀態。
            # DOCS 的紀錄類詞彙列為觀測（見報告 §1），不開 finding。
            if (status_raw and st_kind == "unmapped"
                    and corpus in ("spec", "mb", "lex", "epoch")):
                problems.append({"path": rel, "kind": "unmapped_status",
                                 "detail": status_raw[:120]})
            if version_raw and not entry["version_machine"]:
                problems.append({"path": rel, "kind": "unparsable_version",
                                 "detail": version_raw[:120]})
            if unparsed:
                problems.append({"path": rel, "kind": "yaml_unparsed_lines",
                                 "detail": "%d 行" % len(unparsed)})

    # 衝突偵測：只比對「明示宣告」的 id。
    # 檔名推定值不參與——推定不是宣告，拿推定值互撞只會產生假陽性。
    by_key = defaultdict(list)
    for d in docs:
        if d["lookup_key"] and d["id_declared"]:
            by_key[d["lookup_key"]].append(d)
    for key, group in by_key.items():
        live = [g for g in group if g["authority"] != "historical"]
        if len(live) > 1:
            problems.append({
                "path": ", ".join(g["path"] for g in live),
                "kind": "duplicate_id_live",
                "detail": "lookup_key %s 對應多份非 historical 文件" % key,
            })
    return docs, problems


def render_report(docs, problems, head, dirty):
    L = []
    w = L.append
    w("# TRP-MCP 正規化報告")
    w("")
    w("> 由 `tools/trp-mcp/normalize.py` 產生。**對協議檔案零寫入。**")
    w("> 本報告是觀測，不是裁定；每一則 finding 都待人類錨點或其他器官確認。")
    w("")
    w("| | |")
    w("|---|---|")
    w("| 產生時間 | %s |" % datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"))
    w("| git HEAD | `%s` |" % (head or "未知"))
    w("| 工作樹 | %s |" % ("有未提交變更" if dirty else "乾淨" if dirty is False else "未知"))
    w("| 索引文件數 | %d |" % len(docs))
    w("| finding 數 | %d |" % len(problems))
    w("")
    w("---")
    w("")

    w("## 1. 覆蓋率")
    w("")
    w("### metadata 形狀")
    w("")
    w("| 形狀 | 檔數 | 說明 |")
    w("|---|---:|---|")
    shapes = Counter(d["metadata_shape"] for d in docs)
    labels = {"yaml_fm": "第一行 `---` frontmatter",
              "yaml_block": "標題後 ```` ```yaml ```` 區塊",
              "none": "無結構化 metadata"}
    for s, n in shapes.most_common():
        w("| `%s` | %d | %s |" % (s, n, labels.get(s, "")))
    w("")

    w("### 依 corpus")
    w("")
    w("| corpus | 檔數 | 有 id | 可解析 version | 可映射 status |")
    w("|---|---:|---:|---:|---:|")
    for c in ["spec", "mb", "lex", "epoch", "docs", None]:
        g = [d for d in docs if d["corpus"] == c]
        if not g:
            continue
        w("| %s | %d | %d | %d | %d |" % (
            c or "(根目錄)", len(g),
            sum(1 for d in g if d["id_declared"]),
            sum(1 for d in g if d["version_machine"]),
            sum(1 for d in g if d["status_machine"])))
    w("")

    w("### 依 authority（依 CORPUS-MANIFEST.yaml authorityOrder）")
    w("")
    w("| authority | 檔數 |")
    w("|---|---:|")
    order = ["current-atlas", "primary", "primary-version-aware", "publication",
             "orientation", "contextual", "historical", "draft-mirror"]
    auth = Counter(d["authority"] for d in docs)
    for a in order:
        if auth.get(a):
            w("| `%s` | %d |" % (a, auth[a]))
    w("")
    w("### status 詞彙分佈")
    w("")
    w("兩套詞彙並存，且**不應被壓進同一個欄位**：")
    w("")
    w("| kind | 檔數 | 說明 |")
    w("|---|---:|---|")
    kc = Counter(d["status_kind"] for d in docs if d["status_kind"])
    kl = {"lifecycle": "生命週期（這條還算不算數）",
          "documentation": "紀錄狀態（這份紀錄封到哪）",
          "unmapped": "兩套皆未命中，待判讀"}
    for k, n in kc.most_common():
        w("| `%s` | %d | %s |" % (k, n, kl.get(k, "")))
    w("")
    unm = sorted({d["status_raw"] for d in docs if d["status_kind"] == "unmapped"})
    if unm:
        w("未命中的 status 原文（去重）。**這是提案，不是待辦**——")
        w("每擴充一條映射都是一次語義裁定，留給錨點與其他器官：")
        w("")
        for u in unm[:30]:
            w("- `%s`" % u.replace("|", "\\|")[:150])
        if len(unm) > 30:
            w("- …另 %d 種" % (len(unm) - 30))
        w("")
    w("---")
    w("")

    w("## 2. Findings")
    w("")
    kinds = Counter(p["kind"] for p in problems)
    w("| 類型 | 件數 | 意義 |")
    w("|---|---:|---|")
    meaning = {
        "no_metadata_block": "MCP 只能靠路徑與檔名定位，無版本／狀態",
        "missing_id": "已由檔名推定，但推定值未經確認",
        "unmapped_status": "status 文字未落入受控詞彙，需人工判讀或擴充映射表",
        "unparsable_version": "version 文字抽不出 vX.Y，無法做版本比較",
        "yaml_unparsed_lines": "有解析器未處理的結構（多為巢狀 mapping）",
        "duplicate_id_live": "同一 ID 對應多份現役文件，MCP 無法決定回傳哪一份",
        "unreadable": "檔案無法讀取",
    }
    for k, n in kinds.most_common():
        w("| `%s` | %d | %s |" % (k, n, meaning.get(k, "")))
    w("")

    for k, _ in kinds.most_common():
        items = [p for p in problems if p["kind"] == k]
        w("### `%s`（%d 件）" % (k, len(items)))
        w("")
        show = items if len(items) <= 25 else items[:25]
        for p in show:
            d = (" — " + p["detail"]) if p.get("detail") else ""
            w("- `%s`%s" % (p["path"], d))
        if len(items) > len(show):
            w("- …另 %d 件（完整清單見 `index.json`）" % (len(items) - len(show)))
        w("")

    w("---")
    w("")
    w("## 3. 待決（需錨點或其他器官裁定）")
    w("")
    w("1. **`unmapped_status` 的映射表擴充** — 每新增一條映射都是一次語義裁定，")
    w("   不應由單一 session 決定。現況映射表見 `normalize.py` `STATUS_MAP`。")
    w("   **本工具刻意不自行擴充**：上表的未命中原文是提案，不是待辦。")
    w("2. **`duplicate_id_live`** — 若確有同 ID 多份現役，需決定何者為現役、")
    w("   何者應標 `historical`。**本工具不做這個判斷。**")
    w("3. **`no_metadata_block` 是否補寫** — 補寫會動到協議檔案。")
    w("   依 DESIGN.md P1，本工具不寫；是否補、由誰補，留給錨點。")
    w("")
    w("---")
    w("")
    w("*本報告由 `normalize.py` 自動產生，內容為對上述 commit 的觀測。*")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description="TRP-MCP 語料正規化器（唯讀）")
    ap.add_argument("--root", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    ap.add_argument("--report-only", action="store_true", help="只印報告，不寫檔")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(os.path.join(root, "SPEC")):
        sys.exit("找不到協議庫根目錄（缺 SPEC/）：%s" % root)

    head, dirty = git_head(root), git_dirty(root)
    mf = load_manifest(root)
    docs, problems = build_index(root, mf)
    report = render_report(docs, problems, head, dirty)

    if args.report_only:
        sys.stdout.write(report)
        return

    outdir = os.path.dirname(os.path.abspath(__file__))
    index = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commit": head,
        "worktreeDirty": dirty,
        "note": "派生索引。非正本。由 normalize.py 從工作樹推導，可單憑 commit 重建。",
        "documentCount": len(docs),
        "documents": docs,
        "problems": problems,
    }
    with open(os.path.join(outdir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(os.path.join(outdir, "REPORT.md"), "w", encoding="utf-8") as f:
        f.write(report)

    print("索引 %d 份文件，%d 則 finding" % (len(docs), len(problems)))
    print("→ tools/trp-mcp/index.json")
    print("→ tools/trp-mcp/REPORT.md")


if __name__ == "__main__":
    main()
