#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TRP-MCP · 跨檔一致性檢查（唯讀）

normalize.py 的 finding 全是單檔自檢——這份檔自己格式對不對。
本檔補上另一刀：A 檔對 B 檔的說法，還算不算數。

轉述層是唯一隨語料量成長的一層：宣告只有一處，轉述散在各導航檔，
改版漏改就過期，而且沒有人會發現。兩個檢查：

  version_claim   A 檔在連往 B 檔的連結上寫了版本，B 自己宣告的不是那一版
  nav_coverage    每個 CASE 檔是否至少被 README 或一份 INDEX 分冊連到
  source_integrity  CASE 為來源檔宣告的 SHA-256，與該檔現況是否相符
  retention       相對某個 git ref，被刪掉的內容行是否還存在於工作樹某處

source_integrity 補的是一個長期沒人守的缺口：來源逐字留存是本庫的根據，
CASE 為此宣告 bytes 與 SHA-256，但在此之前沒有任何程式讀過那些雜湊。

retention 是文件搬遷專用的安全網。覆蓋檢查只看「邊還在不在」，看不出
「內容有沒有變薄」——把一段判讀壓成一行摘要，覆蓋數不會變，判讀卻沒了。
搬移後跑一次，沒有回報才算真的只搬不刪。

設計約束與 normalize.py 一致：
  P1  對協議檔案零寫入
  P4  查不到是合法輸出，不猜測
本檔輸出是觀測，不是裁定。

用法：
    python3 tools/trp-mcp/crosscheck.py
    python3 tools/trp-mcp/crosscheck.py --only version
    python3 tools/trp-mcp/crosscheck.py --only coverage
    python3 tools/trp-mcp/crosscheck.py --only integrity
    python3 tools/trp-mcp/crosscheck.py --retention HEAD
"""

import argparse
import hashlib
import os
import subprocess
import re
import sys
import urllib.parse
from collections import Counter

# 輸出一律 UTF-8。本語料含 emoji 與 CJK，而 Windows 主控台預設 CP950／CP437
# 會在印出時直接拋 UnicodeEncodeError——工具不該因為終端機編碼而崩在報告途中。
for _stream in ("stdout", "stderr"):
    try:
        getattr(sys, _stream).reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from normalize import extract_metadata_block, parse_flat_yaml  # noqa: E402

# 版本字串：v1、v1.4、v0.2-draft、v0.2-seed-draft、v1.1-semantic-amendment-candidate
VER_RE = re.compile(
    r"v\d+(?:\.\d+)*(?:-[A-Za-z0-9\u4e00-\u9fff]+(?:-[A-Za-z0-9\u4e00-\u9fff]+)*)?")
LINK_RE = re.compile(r"\[([^\]\n]*)\]\(([^)\n]+)\)")
TARGET_RE = re.compile(r"\]\(([^)\n]+)\)")

# 本語料的版本是三欄模型（見 tools/trp-mcp/README「現役與候選資訊分開保留」）。
# 導航引用 latest_active 或 candidate overlay 都是合法轉述，三欄都算宣告。
VERSION_FIELDS = ("version", "latest_active_version", "candidate_overlay_version")


def numeric(v):
    m = re.match(r"v(\d+(?:\.\d+)*)", v)
    return m.group(1) if m else None


def version_claim_matches(claim, declared):
    """未帶後綴可指基版；帶後綴時必須完整相符。

    `v1.4` 可以指向 `v1.4-candidate`，但 `v1.4-draft` 不能把
    `v1.4-candidate` 當成同一個治理狀態。這與 MCP resolve 的版本契約一致。
    """
    base = numeric(claim)
    if not base:
        return False
    tokens = VER_RE.findall(declared or "")
    if claim != "v" + base:
        return claim in tokens
    return any(numeric(token) == base for token in tokens)


def all_md(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in (".git", "node_modules", "__pycache__"))
        for fn in sorted(filenames):
            if fn.endswith(".md"):
                full = os.path.join(dirpath, fn)
                yield os.path.relpath(full, root).replace(os.sep, "/"), full


def read(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
def check_version_claims(root):
    declared = {}
    for rel, full in all_md(root):
        text = read(full)
        if text is None:
            continue
        meta, _ = parse_flat_yaml(extract_metadata_block(text)[0])
        v = " ".join(str(meta.get(k) or "").strip() for k in VERSION_FIELDS).strip()
        if v:
            declared[rel] = v

    mismatch, checked = [], 0
    for rel, full in all_md(root):
        text = read(full)
        if text is None:
            continue
        base = os.path.dirname(full)
        for ln, line in enumerate(text.split("\n"), 1):
            for m in LINK_RE.finditer(line):
                label, target = m.group(1), m.group(2).split("#")[0].strip()
                if not target.endswith(".md") or target.startswith(("http:", "https:")):
                    continue
                tgt = os.path.relpath(
                    os.path.normpath(os.path.join(base, urllib.parse.unquote(target))),
                    root).replace(os.sep, "/")
                if tgt not in declared or tgt == rel:
                    continue
                # 版本宣稱只認兩個位置：連結文字內，或同段落的括號內。
                # 自由散文裡的版本字串（「吸收 v0.1 四票」）是敘述，不是轉述，不開單。
                seg = line[m.end():]
                for stop in ("[", "|"):
                    if stop in seg:
                        seg = seg[:seg.index(stop)]
                paren = " ".join(re.findall(r"[（(]([^）)]*)[）)]", seg))
                claims = [c for c in VER_RE.findall(label) + VER_RE.findall(paren)
                          if numeric(c)]
                if not claims:
                    continue
                checked += 1
                dv = declared[tgt]
                for c in claims:
                    if not version_claim_matches(c, dv):
                        mismatch.append((rel, ln, c, dv, tgt))
    return checked, mismatch


# ─────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# 版本轉述命中要分三層讀，否則真問題會被歷史紀錄淹沒。
RECORD_PAT = re.compile(
    r"(^|/)(AGENT_SESSION_LOG\.md$"          # 施工流水帳
    r"|history/"                              # 版本快照
    r"|DOCS/cases/(CASE|INDEX)"               # 個案與已封口分冊
    r"|reviews/)")


def claim_layer(rel):
    """live=活導航，record=append-only 紀錄，mixed=同檔兩者兼有。"""
    if rel.startswith("DOCS/sources/"):
        # 來源目錄的 README 上半是現役導航段落，下半是不得倒填的來源表。
        return "mixed"
    if RECORD_PAT.search("/" + rel):
        return "record"
    return "live" if os.path.basename(rel) == "README.md" else "record"


# ─────────────────────────────────────────────────────────────
def check_nav_coverage(root):
    cases_dir = os.path.join(root, "DOCS", "cases")
    if not os.path.isdir(cases_dir):
        return None
    names = sorted(f for f in os.listdir(cases_dir)
                   if f.startswith("CASE") and f.endswith(".md"))
    navs = ["README.md"] + sorted(f for f in os.listdir(cases_dir)
                                  if f.startswith("INDEX") and f.endswith(".md"))

    linked, by_nav = set(), Counter()
    for nav in navs:
        text = read(os.path.join(cases_dir, nav))
        if text is None:
            continue
        for m in TARGET_RE.finditer(text):
            b = os.path.basename(urllib.parse.unquote(m.group(1).split("#")[0].strip()))
            if b in names and b not in linked:
                by_nav[nav] += 1
                linked.add(b)
    return names, linked, by_nav, [f for f in names if f not in linked]


# ─────────────────────────────────────────────────────────────
# 結構性雜訊：這些行被刪掉不代表 judgment 消失，不值得逐行追蹤。
NOISE = re.compile(r"^(```|~~~|\|[\s\-:|]*\||-{3,}|={3,}|\s*)$")


def canon(line):
    """只留內容，去掉呈現層差異。

    清單記號、縮排、markdown 連結與強調、全半形冒號都屬於呈現。
    若不一併正規化，任何一次格式轉換都會被誤報成內容遺失，
    安全網就會因為常態誤報而失去作用。
    """
    t = line.strip()
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)   # [標籤](網址) → 標籤
    t = re.sub(r"[*`_~]", "", t)                      # 強調記號
    for _ in range(2):
        t = re.sub(r"^(?:#{1,6}|[-+>]|\d+\.|→|—|·)\s*", "", t)
    # 冒號在本語料是分隔符號（yaml key 與標題各用一種寫法），不是內容。
    t = t.replace("：", "").replace(":", "")
    t = t.replace("（", "(").replace("）", ")")
    return re.sub(r"\s+", "", t)


def check_retention(root, ref):
    try:
        diff = subprocess.run(
            ["git", "-C", root, "-c", "core.quotepath=false",
             "diff", "--unified=0", ref, "--", "*.md"],
            capture_output=True, text=True, encoding="utf-8", errors="replace")
    except Exception as e:
        return None, "無法執行 git diff：%s" % e
    if diff.returncode != 0:
        return None, "git diff 失敗：%s" % (diff.stderr or "").strip()

    removed, cur = [], None
    for line in (diff.stdout or "").splitlines():
        if line.startswith("--- a/"):
            cur = line[6:]
        elif line.startswith("-") and not line.startswith("---"):
            body = line[1:]
            if not NOISE.match(body) and len(canon(body)) >= 8:
                removed.append((cur, body))

    present = set()
    for _, full in all_md(root):
        text = read(full)
        if text is None:
            continue
        for line in text.splitlines():
            c = canon(line)
            if c:
                present.add(c)

    return (len(removed), [(f, b) for f, b in removed if canon(b) not in present]), None


# ─────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# 來源檔逐字留存是本庫的根據，CASE 會為它宣告 bytes 與 SHA-256。
# 但宣告寫下來之後從沒有人讀過——雜湊只有被算過一次，之後純粹是文字。
SOURCE_PATH_RE = re.compile(r"^\s*(?:file|path):\s*(\S.*?)\s*$")
DECLARED_BYTES_RE = re.compile(r"(\d+)\s*bytes")
SHA_FIELDS = {
    "sha256": "original",
    "original_sha256": "original",
    "repository_copy_sha256": "repository",
    "normalized_lf_sha256": "normalized_lf",
}
SHA_RE = re.compile(r"^\s*([a-z_]*sha256):\s*([0-9A-Fa-f]{64})\s*$")


def declared_sources(text):
    """取出 (來源路徑, 欄位類別, 宣告雜湊, 宣告位元組數)。

    以 YAML 縮排定作用域：雜湊欄位必須與設定它的 path／file 同層或更深，
    一旦退排就視為離開該來源區塊。CASE 的 frontmatter 寫在 ```yaml 區塊內，
    而 derived／引文段落常整段複述一次來源宣告——不看縮排就會把引文裡的
    雜湊錯配到上一個 path 去。
    """
    pending = None
    pending_indent = 0
    declared_bytes = None
    for line in text.split("\n"):
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        if pending is not None and indent < pending_indent:
            pending, declared_bytes = None, None
        m = SOURCE_PATH_RE.match(line)
        if m:
            pending, pending_indent, declared_bytes = m.group(1), indent, None
            continue
        if pending is None:
            continue
        if "integrity:" in line or "_bytes:" in line:
            b = DECLARED_BYTES_RE.search(line)
            if b:
                declared_bytes = int(b.group(1))
        m = SHA_RE.match(line)
        if not m:
            continue
        kind = SHA_FIELDS.get(m.group(1))
        if kind:
            yield pending, kind, m.group(2).lower(), declared_bytes


def check_source_integrity(root):
    """驗每一筆宣告；回傳 {verdict: [(宣告者, 來源, 詳情)]}。

    同一個來源可能同時宣告原件與庫內副本的雜湊，必須合起來判讀：
      repository_copy_sha256  宣稱的就是入庫那份，逐位元相符才算過
      original_sha256／sha256 交付原件；庫內副本另有宣告並驗過時，它的落差
                              是 normalization_note 寫明的設計，不是不符
    兩者都對不上、但還原 CRLF 後相符者單獨成一類：雜湊沒寫錯，是 git 的
    行尾正規化在 commit 當下把 CR 剝掉了，被雜湊的位元從未進庫。
    """
    buckets = {"ok": [], "crlf": [], "mismatch": [], "missing": []}
    checked = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames
                       if d not in (".git", "node_modules", "__pycache__")]
        for name in sorted(filenames):
            if not name.endswith(".md"):
                continue
            claimant = os.path.join(dirpath, name)
            text = read(claimant)
            if text is None or "sha256:" not in text:
                continue
            rel_claimant = os.path.relpath(claimant, root).replace(os.sep, "/")

            groups = {}
            for src, kind, digest, declared_bytes in declared_sources(text):
                g = groups.setdefault(src, {"original": [], "repository": [],
                                            "normalized_lf": [], "bytes": None})
                g[kind].append(digest)
                if declared_bytes:
                    g["bytes"] = declared_bytes

            for src, g in groups.items():
                checked += 1
                base = dirpath if src.startswith("..") else root
                full = os.path.normpath(os.path.join(base, src.replace("/", os.sep)))
                if not os.path.isfile(full):
                    buckets["missing"].append((rel_claimant, src, "來源檔不在工作樹"))
                    continue
                with open(full, "rb") as fh:
                    raw = fh.read()
                as_is = hashlib.sha256(raw).hexdigest()
                crlf = hashlib.sha256(
                    raw.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")).hexdigest()
                lf = hashlib.sha256(
                    raw.replace(b"\r\n", b"\n").replace(b"\r", b"\n")).hexdigest()
                repo, orig = g["repository"], g["original"]

                if lf in g["normalized_lf"]:
                    buckets["ok"].append((rel_claimant, src,
                                          "LF 正規化後相符，%d bytes" % len(raw)))
                elif g["normalized_lf"] and not (repo or orig):
                    buckets["mismatch"].append((rel_claimant, src,
                        "normalized_lf 宣告 %s…，實際 %s…（%d bytes）"
                        % (g["normalized_lf"][0][:12], lf[:12], len(raw))))
                elif as_is in repo:
                    buckets["ok"].append((rel_claimant, src,
                                          "庫內副本相符，%d bytes" % len(raw)))
                elif crlf in repo:
                    buckets["crlf"].append((rel_claimant, src,
                        "宣告庫內副本為 CRLF／%s bytes，實際入庫 LF／%d bytes"
                        % (g["bytes"] or "?", len(raw))))
                elif repo:
                    buckets["mismatch"].append((rel_claimant, src,
                        "repository_copy 宣告 %s…，實際 %s…（%d bytes）"
                        % (repo[0][:12], as_is[:12], len(raw))))
                elif as_is in orig:
                    buckets["ok"].append((rel_claimant, src,
                                          "原件雜湊相符，%d bytes" % len(raw)))
                elif crlf in orig:
                    buckets["crlf"].append((rel_claimant, src,
                        "原件宣告 CRLF／%s bytes，實際入庫 LF／%d bytes；未另記 repository_copy_sha256"
                        % (g["bytes"] or "?", len(raw))))
                else:
                    buckets["mismatch"].append((rel_claimant, src,
                        "宣告 %s…，實際 %s…（%d bytes）"
                        % ((orig or repo)[0][:12], as_is[:12], len(raw))))
    return checked, buckets


def main():
    ap = argparse.ArgumentParser(description="TRP-MCP 跨檔一致性檢查（唯讀）")
    ap.add_argument("--root", default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    ap.add_argument("--only", choices=("version", "coverage", "integrity"),
                    help="只跑其中一個檢查")
    ap.add_argument("--retention", metavar="REF",
                    help="只跑內容留存檢查：相對該 git ref，被刪的內容行是否仍存在")
    ap.add_argument("--verbose", action="store_true",
                    help="version_claim 連記錄層命中也逐筆列出")
    ap.add_argument("--strict", action="store_true",
                    help="有 finding 時以離開碼 2 結束（供 pre-commit／CI 使用）")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(os.path.join(root, "SPEC")):
        print("找不到協議庫根目錄（缺 SPEC/）：%s" % root, file=sys.stderr)
        return 1

    if args.retention:
        res, err = check_retention(root, args.retention)
        print("## retention（相對 %s）" % args.retention)
        if err:
            print("  " + err)
            return 1
        n_removed, lost = res
        print("被刪除的內容行 %d，其中在工作樹中已找不到的 %d 行" % (n_removed, len(lost)))
        print("")
        for f, b in lost:
            print("  %s" % f)
            print("     %s" % b.strip()[:110])
        if n_removed and not lost:
            print("  全部可在別處找到：這是一次搬移，不是刪除。")
        print("")
        print("  註：只比對逐字內容。改寫、壓縮成摘要或翻譯都會被判為遺失——")
        print("      那正是要被看見的情形，請確認是有意為之。")
        print("      本檢查是煙霧警報器，不是火災鑑定書：比對範圍是全庫的正規化行，")
        print("      同一句出現在無關文件也算「還在」，清單改表格則可能誤判為遺失。")
        return 2 if (lost and args.strict) else 0

    if args.only not in ("coverage", "integrity"):
        checked, mismatch = check_version_claims(root)
        buckets = {"live": [], "mixed": [], "record": []}
        for m in mismatch:
            buckets[claim_layer(m[0])].append(m)
        print("## version_claim")
        print("帶版本字串的跨檔連結 %d 條，版號不符 %d 則" % (checked, len(mismatch)))

        def dump(items):
            for rel, ln, c, dv, tgt in items:
                print("  %s:%d" % (rel, ln))
                print("     宣稱 %-20s 實宣告 %-24s → %s" % (c, dv, tgt))

        print("")
        print("### 活導航 %d 則——過期即需修正" % len(buckets["live"]))
        print("")
        dump(buckets["live"]) if buckets["live"] else print("  無。")

        print("")
        print("### 混合層 %d 則——需人判讀" % len(buckets["mixed"]))
        print("")
        print("  DOCS/sources/ 的 README 上半是現役導航段落，下半是來源表。")
        print("  導航段落過期要修；來源表記的是「當初蒸餾成哪一版」，改了就是倒填。")
        print("  兩者同檔，工具分不出來，請逐筆看它落在哪一段。")
        if buckets["mixed"]:
            print("")
            dump(buckets["mixed"])

        print("")
        print("### 記錄層 %d 則——預設不動" % len(buckets["record"]))
        print("")
        print("  CASE、已封口分冊、session log、快照與審讀帳裡的版本是歷史紀錄。")
        print("  逐筆列出請加 --verbose。")
        if args.verbose and buckets["record"]:
            print("")
            dump(buckets["record"])

        live = buckets["live"]
        if args.strict and live:
            return 2
        print("")

    if args.only not in ("version", "integrity"):
        cov = check_nav_coverage(root)
        print("## nav_coverage")
        if cov is None:
            print("  找不到 DOCS/cases/")
            return
        names, linked, by_nav, missing = cov
        print("CASE 檔 %d，可由導航連結抵達 %d，未連到 %d\n"
              % (len(names), len(linked), len(missing)))
        for nav, n in by_nav.most_common():
            print("  %-28s %d" % (nav, n))
        if missing:
            print("\n未被任何導航連結抵達（可能僅以純文字列於程式碼區塊內）：")
            for f in missing:
                print("  " + f)
        print("")

    if args.only not in ("version", "coverage"):
        checked, buckets = check_source_integrity(root)
        print("## source_integrity")
        print("宣告的來源雜湊 %d 筆：相符 %d，CRLF 落差 %d，不符 %d，來源不在 %d\n"
              % (checked, len(buckets["ok"]), len(buckets["crlf"]),
                 len(buckets["mismatch"]), len(buckets["missing"])))

        def dump_integrity(items):
            for claimant, src, detail in items:
                print("  %s" % claimant)
                print("     → %s" % src)
                print("       %s" % detail)

        if buckets["mismatch"]:
            print("### 不符 %d 筆——來源已被改動，或雜湊寫錯\n" % len(buckets["mismatch"]))
            dump_integrity(buckets["mismatch"])
            print("")
        if buckets["missing"]:
            print("### 來源不在 %d 筆\n" % len(buckets["missing"]))
            dump_integrity(buckets["missing"])
            print("")
        if buckets["crlf"]:
            print("### CRLF 落差 %d 筆——可解釋，非不符\n" % len(buckets["crlf"]))
            print("  雜湊沒寫錯：還原 CRLF 後逐位元相符。落差來自 git 的行尾正規化，")
            print("  在 commit 當下就把 CR 剝掉了，於是被雜湊的位元從未進庫。")
            print("  `.gitattributes` 的 `DOCS/sources/** -text` 已擋住往後再發生；")
            print("  既有這幾筆不改寫歷史就無法回復 CR，是否在 CASE 補記 in-repo 雜湊，")
            print("  屬治理決定，本工具不代為判斷。\n")
            dump_integrity(buckets["crlf"])
            print("")
        if not any(buckets[k] for k in ("mismatch", "missing", "crlf")):
            print("  全部相符。")
            print("")
        print("  註：只驗 frontmatter 明文宣告的雜湊，沒有宣告的來源不在範圍內。")
        print("      本檢查唯讀，不改任何檔案，也不替雜湊落差做裁定。")
        if args.strict and (buckets["mismatch"] or buckets["missing"]):
            return 2


if __name__ == "__main__":
    sys.exit(main() or 0)
