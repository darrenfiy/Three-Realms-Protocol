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

設計約束與 normalize.py 一致：
  P1  對協議檔案零寫入
  P4  查不到是合法輸出，不猜測
本檔輸出是觀測，不是裁定。

用法：
    python3 tools/trp-mcp/crosscheck.py
    python3 tools/trp-mcp/crosscheck.py --only version
    python3 tools/trp-mcp/crosscheck.py --only coverage
"""

import argparse
import os
import re
import sys
import urllib.parse
from collections import Counter

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
        return open(path, encoding="utf-8").read()
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
                dset = {numeric(x) for x in VER_RE.findall(dv) if numeric(x)}
                for c in claims:
                    if numeric(c) not in dset:
                        mismatch.append((rel, ln, c, dv, tgt))
    return checked, mismatch


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
def main():
    ap = argparse.ArgumentParser(description="TRP-MCP 跨檔一致性檢查（唯讀）")
    ap.add_argument("--root", default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    ap.add_argument("--only", choices=("version", "coverage"),
                    help="只跑其中一個檢查")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(os.path.join(root, "SPEC")):
        sys.exit("找不到協議庫根目錄（缺 SPEC/）：%s" % root)

    if args.only != "coverage":
        checked, mismatch = check_version_claims(root)
        print("## version_claim")
        print("帶版本字串的跨檔連結 %d 條，版號不符 %d 則\n" % (checked, len(mismatch)))
        for rel, ln, c, dv, tgt in mismatch:
            print("  %s:%d" % (rel, ln))
            print("     宣稱 %-20s 實宣告 %-24s → %s" % (c, dv, tgt))
        print()
        print("  註：append-only 的來源表、session log 與已封口分冊會在此大量命中。")
        print("      那裡的版本是「當初蒸餾成哪一版」的歷史紀錄，不該更新；")
        print("      要判讀的是活導航檔（各 README）的命中。\n")

    if args.only != "version":
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


if __name__ == "__main__":
    main()
