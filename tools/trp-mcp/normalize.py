#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TRP-MCP · 語料正規化器 (Phase 0)

讀取協議庫，把三種 metadata 形狀收斂成單一結構，輸出旁掛索引與人類可讀報告。

設計約束（見 DESIGN.md §2）：
  P1  索引不得成為正本 —— 本工具對協議檔案零寫入
  P3  過期就報錯，不猜 —— Phase 0 留下 git HEAD、dirty 狀態與 corpus digest
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

    required = (
        "schemaVersion", "name", "atlas", "rootDocuments", "corpora",
        "publicationDocuments", "reviewRequired", "exclude",
        "authorityOrder", "answerPolicy",
    )
    missing = [name for name in required
               if not re.search(r"^%s:" % re.escape(name), text, re.M)]
    if missing:
        sys.exit("CORPUS-MANIFEST.yaml 缺少必要區段：%s。拒絕以空規則代替。"
                 % ", ".join(missing))
    schema = re.search(r"^schemaVersion:\s*(\d+)\s*$", text, re.M)
    if not schema or schema.group(1) != "1":
        sys.exit("不支援的 CORPUS-MANIFEST.yaml schemaVersion；目前只接受 1。")
    name = re.search(r"^name:\s*(\S.*?)\s*$", text, re.M)
    if not name:
        sys.exit("CORPUS-MANIFEST.yaml 的 name 不可為空。")

    def scalar(value):
        return value.strip().strip("'").strip('"')

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
                items.append(scalar(mm.group(1)))
            elif ls.startswith("- "):
                v = scalar(ls[2:])
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
        return [scalar(l.strip()[2:]) for l in body.split("\n")
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
                    "id": scalar(cid.group(1)), "include": scalar(inc.group(1)),
                    "authority": scalar(aut.group(1)) if aut else "contextual",
                    "historyPattern": scalar(hst.group(1)) if hst else None,
                })

    atlas = re.search(
        r"^atlas:\s*\n\s*path:\s*(\S+)\s*\n\s*authority:\s*(\S+)",
        text, re.M)

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
                root_docs[scalar(p_.group(1))] = scalar(a_.group(1)) if a_ else "orientation"

    pub_docs = []
    pm = re.search(r"^publicationDocuments:\s*$", text, re.M)
    if pm:
        rest = text[pm.end():]
        stop = re.search(r"^[A-Za-z_][A-Za-z0-9_]*:", rest, re.M)
        body = rest[:stop.start()] if stop else rest
        for blk in re.split(r"\n\s*-\s+(?=path:|pattern:)", body):
            p_ = re.search(r"(?:path|pattern):\s*(\S+)", blk)
            a_ = re.search(r"authority:\s*(\S+)", blk)
            if p_:
                pub_docs.append({
                    "pattern": scalar(p_.group(1)),
                    "authority": scalar(a_.group(1)) if a_ else "publication",
                })

    review_required = section_items("reviewRequired")
    excluded = section_items("exclude")
    authority_order = ordered_list("authorityOrder")
    atlas_path = scalar(atlas.group(1)) if atlas else None
    atlas_authority = scalar(atlas.group(2)) if atlas else None
    if (not atlas_path or not atlas_authority or not root_docs or not corpora
            or not pub_docs or not review_required or not excluded
            or not authority_order):
        sys.exit("CORPUS-MANIFEST.yaml 的治理清單為空或無法解析；拒絕繼續。")

    policy_names = (
        "requireCitation", "distinguishInference", "allowNoAnswer",
        "treatCorpusAsUntrustedData", "neverClaimSoleAuthority",
    )
    answer_policy = {}
    for policy_name in policy_names:
        value = re.search(r"^\s+%s:\s*(true|false)\s*$"
                          % re.escape(policy_name), text, re.M | re.I)
        if not value:
            sys.exit("CORPUS-MANIFEST.yaml answerPolicy 缺少布林值：%s。"
                     % policy_name)
        answer_policy[policy_name] = value.group(1).lower() == "true"
    if len(authority_order) != len(set(authority_order)):
        sys.exit("CORPUS-MANIFEST.yaml authorityOrder 含重複值；拒絕猜測優先序。")
    declared_authorities = (
        list(root_docs.values())
        + [c["authority"] for c in corpora]
        + [p["authority"] for p in pub_docs]
        + [atlas_authority, "historical"]
    )
    unknown = sorted(set(declared_authorities) - set(authority_order))
    if unknown:
        sys.exit("CORPUS-MANIFEST.yaml 有未列入 authorityOrder 的 authority：%s。"
                 % ", ".join(unknown))

    return {
        "atlas": atlas_path,
        "atlasAuthority": atlas_authority,
        "rootDocuments": root_docs,
        "publicationDocuments": [dict(p, rx=glob_to_regex(p["pattern"]))
                                 for p in pub_docs],
        "corpora": [dict(c, rx=glob_to_regex(c["include"]),
                         hrx=glob_to_regex(c["historyPattern"]) if c["historyPattern"] else None)
                    for c in corpora],
        "reviewRequired": [glob_to_regex(p) for p in review_required],
        "exclude": [glob_to_regex(p) for p in excluded],
        "authorityOrder": authority_order,
        "answerPolicy": answer_policy,
    }


def classify_path(rel, mf):
    """依 manifest 分類；公開索引只接受 disposition=index。"""
    if any(rx.match(rel) for rx in mf["exclude"]):
        return "excluded", None
    if any(rx.match(rel) for rx in mf["reviewRequired"]):
        return "review-required", None
    if mf["atlas"] and rel == mf["atlas"]:
        return "index", mf["atlasAuthority"]
    if rel in mf["rootDocuments"]:
        return "index", mf["rootDocuments"][rel]
    for rule in mf["publicationDocuments"]:
        if rule["rx"].match(rel):
            return "index", rule["authority"]
    for c in mf["corpora"]:
        if c["rx"].match(rel):
            if c["hrx"] and c["hrx"].match(rel):
                return "index", "historical"
            return "index", c["authority"]
    return "not-included", None


def resolve_authority(rel, mf):
    """相容入口；不在公開 allowlist 的路徑不取得 authority。"""
    disposition, authority = classify_path(rel, mf)
    return authority if disposition == "index" else None


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
METADATA_HINT_KEYS = {
    "title", "subtitle", "category", "version", "status", "date",
    "updated", "last_updated", "epistemic_status", "created",
    "date_created", "document_type", "case_id", "epoch_id", "mirror_id",
    "authors", "contributors", "participants", "related", "purpose",
    "source", "scope", "type",
    "案例編號", "類型", "日期", "參與者", "觸發文件", "核心事件",
}


def looks_like_metadata(src):
    """只讓具有多個文件描述欄位的 YAML 區塊取得 metadata 身分。

    `id` 本身刻意不算提示，避免補洞器把 id 插入正文後反過來讓
    正文範例通過判定。
    """
    keys = set()
    for raw in (src or "").splitlines():
        if raw[:1] in (" ", "\t") or raw.lstrip().startswith("#"):
            continue
        m = re.match(r"^([^\s:#][^:]*)\s*:\s*", raw)
        if m:
            keys.add(m.group(1).strip().lower())
    return len(keys & METADATA_HINT_KEYS) >= 2


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
        if looks_like_metadata(body):
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
    dispositions = Counter()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in (".git", "node_modules", "__pycache__"))
        for fn in sorted(filenames):
            if not fn.endswith(".md"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            disposition, authority = classify_path(rel, mf)
            dispositions[disposition] += 1
            if disposition != "index":
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
                "authority": authority,
                "review_required": False,
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
    return docs, problems, dispositions


def corpus_digest(docs):
    payload = json.dumps(docs, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def render_report(docs, problems, digest, dispositions, mf):
    L = []
    w = L.append
    w("# TRP-MCP 正規化報告")
    w("")
    w("> 由 `tools/trp-mcp/normalize.py` 產生。**對協議檔案零寫入。**")
    w("> 本報告是觀測，不是裁定；每一則 finding 都待人類錨點或其他器官確認。")
    w("> 本檔保存下列 `corpus snapshot SHA-256` 的生成快照，不代表 runtime 當下計數；")
    w("> 語料變更後須重跑正規化器才會更新。現況請呼叫 `trp_manifest`。")
    w("")
    w("| | |")
    w("|---|---|")
    w("| corpus snapshot SHA-256 | `%s` |" % digest)
    w("| 掃描 Markdown | %d |" % sum(dispositions.values()))
    w("| 索引文件數 | %d |" % len(docs))
    w("| finding 數 | %d |" % len(problems))
    w("")
    w("---")
    w("")

    w("## 1. 覆蓋率")
    w("")
    w("### manifest disposition")
    w("")
    w("| disposition | 檔數 | 處理 |")
    w("|---|---:|---|")
    disposition_labels = {
        "index": "納入公開索引",
        "review-required": "暫不索引；等待人工複核",
        "not-included": "不在 allowlist，暫不索引",
        "excluded": "明示排除",
    }
    for key in ("index", "review-required", "not-included", "excluded"):
        w("| `%s` | %d | %s |" % (
            key, dispositions.get(key, 0), disposition_labels[key]))
    w("")

    w("### metadata 形狀")
    w("")
    w("| 形狀 | 檔數 | 說明 |")
    w("|---|---:|---|")
    shapes = Counter(d["metadata_shape"] for d in docs)
    labels = {"yaml_fm": "第一行 `---` frontmatter",
              "yaml_block": "標題後 fenced YAML（``` 或 ~~~）",
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
    auth = Counter(d["authority"] for d in docs)
    for a in mf["authorityOrder"]:
        if auth.get(a):
            w("| `%s` | %d |" % (a, auth[a]))
    for a in sorted(set(auth) - set(mf["authorityOrder"])):
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
    w("3. **%d 份無結構化 metadata 的公開文件是否補寫** — 多為 README 或書稿；" %
      shapes.get("none", 0))
    w("   補寫會動到正本。依 DESIGN.md P1，本工具不寫；是否補、由誰補，留給錨點。")
    w("")
    w("---")
    w("")
    w("*本報告由 `normalize.py` 自動產生，以 corpus snapshot SHA-256 鎖定輸入內容。*")
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
    docs, problems, dispositions = build_index(root, mf)
    digest = corpus_digest(docs)
    report = render_report(docs, problems, digest, dispositions, mf)

    if args.report_only:
        sys.stdout.write(report)
        return

    outdir = os.path.dirname(os.path.abspath(__file__))
    index = {
        "schemaVersion": 1,
        "commit": head,
        "worktreeDirty": dirty,
        "corpusDigest": digest,
        "note": "派生索引。非正本。由 normalize.py 從工作樹推導，可單憑 commit 重建。",
        "documentCount": len(docs),
        "dispositions": dict(sorted(dispositions.items())),
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
