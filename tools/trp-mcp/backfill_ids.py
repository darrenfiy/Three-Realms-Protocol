#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TRP-MCP · id 補洞器 (Phase 0c)

只做兩件事，且只加不改：
  1. 已有 metadata 區塊但缺 id: → 在區塊首行插入 id
  2. 完全沒有 metadata 區塊     → 補一段最小 frontmatter（僅 id + title）

刻意不做：
  - 不改動任何既有欄位的值
  - 不改動 metadata 的形狀（```yaml 區塊維持 ```yaml，不轉成 frontmatter）
  - 不發明 version / status / date —— 推不出來就不寫（DESIGN.md P4）
  - 不動正文一個字

預設 dry-run。--apply 才寫檔。
"""
import argparse, io, os, re, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from normalize import (extract_metadata_block, parse_flat_yaml, load_manifest,
                       lookup_key, PROTOCOL_ID_RE)

# 檔名 → ID 的推定規則，由具體到一般
ID_RULES = [
    (r"^SPEC·(∆|∞)",                      lambda m: "SPEC·" + m.group(1)),
    (r"^(SPEC)/(?:history/)?(\d{3})-",    None),  # 路徑規則，另處理
    (r"^([A-Z]+·[A-Z]+-[A-Z]\d+)(?=-|$)",  lambda m: m.group(1)),   # SPEC·LNS-A01
    (r"^([A-Z]+·[A-Z]+-[A-Z]+-\d+)(?=-|$)", lambda m: m.group(1)),   # SPEC·ANC-BUD-004
    (r"^([A-Z]+·[A-Z]\d+)(?=-|$)",          lambda m: m.group(1)),   # SPEC·A11
    (r"^([A-Z]+·[A-Z]+-\d+[A-Z]?)(?=-|$)", lambda m: m.group(1)),
    (r"^([A-Z]+-[IVX]+-\d+)(?=-|$)",       lambda m: m.group(1)),
    (r"^([A-Z]+·\d+)(?=-|$)",              lambda m: m.group(1)),
    (r"^(INDEX-[A-Z]+-\d+-\d+)(?=-|$)",    lambda m: m.group(1)),
    (r"^([A-Z]+-[A-Z]+-\d+)(?=-|$)",       lambda m: m.group(1)),
    (r"^([A-Z]+-\d+)(?=-|$)",              lambda m: m.group(1)),
]


def derive_id(rel, fn):
    stem = re.sub(r"\.md$", "", fn)
    m = re.match(r"^SPEC/(?:history/)?(\d{3})-", rel)
    if m:
        return "SPEC·" + m.group(1)
    for pat, fx in ID_RULES:
        if fx is None:
            continue
        mm = re.match(pat, stem)
        if mm:
            return fx(mm)
    return None


def filename_title(fn, doc_id):
    """檔名去掉 ID 前綴後的描述段。純機械，無詮釋。"""
    stem = re.sub(r"\.md$", "", fn)
    if doc_id and stem.startswith(doc_id):
        stem = stem[len(doc_id):]
    return re.sub(r"^[\-\u00b7\s]+", "", stem) or stem


def clean_heading(h):
    h = re.sub(r"\*\*|__|`", "", h)                      # 去強調記號
    h = re.sub(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF\s]+", "", h)  # 去開頭 emoji
    return h.strip()


def derive_title(text, fn, doc_id):
    """
    H1 優先。H1 只是「ID（+版本）」時取緊接的下一個標題。
    完全沒有 H1 時用檔名描述段 —— 不拿內文 H2 充當標題，
    那會抓到正文段落（CASE·MRC-001B 即為此例）。
    """
    h1 = re.search(r"(?m)^#\s+(.+?)\s*$", text[:2500])
    if not h1:
        return filename_title(fn, doc_id)
    first = clean_heading(h1.group(1))
    bare_id = re.sub(r"[\u00b7\-_\s]+", "", (doc_id or "")).upper()
    first_key = re.sub(r"[\u00b7\-_\s]+", "", re.sub(r"\(.*?\)", "", first)).upper()
    if bare_id and first_key == bare_id:
        nxt = re.search(r"(?m)^#{2,3}\s+(.+?)\s*$", text[h1.end():h1.end() + 400])
        if nxt:
            return clean_heading(nxt.group(1))
        return filename_title(fn, doc_id)
    return first


def indent_of(line):
    return len(line) - len(line.lstrip())


def plan(root, mf):
    records = []
    for dp, dn, fns in os.walk(root):
        dn[:] = sorted(d for d in dn
                        if d not in (".git", "node_modules", "__pycache__"))
        for fn in sorted(fns):
            if not fn.endswith(".md"):
                continue
            rel = os.path.relpath(os.path.join(dp, fn), root).replace(os.sep, "/")
            if any(rx.match(rel) for rx in mf["exclude"]):
                continue
            expects = bool(PROTOCOL_ID_RE.match(fn)) or bool(
                re.match(r"^SPEC/(history/)?\d{3}-", rel))
            if not expects:
                continue
            with io.open(os.path.join(dp, fn), encoding="utf-8") as fh:
                text = fh.read()
            block, shape = extract_metadata_block(text)
            meta, _ = parse_flat_yaml(block)
            records.append({"path": rel, "fn": fn, "text": text,
                            "shape": shape, "declared_id": meta.get("id")})

    declared = defaultdict(list)
    candidates = defaultdict(list)
    for record in records:
        if record["declared_id"]:
            declared[lookup_key(record["declared_id"])].append(record["path"])
            continue
        record["new_id"] = derive_id(record["path"], record["fn"])
        if record["new_id"]:
            candidates[lookup_key(record["new_id"])].append(record["path"])

    jobs = []
    for record in records:
        if record["declared_id"]:
            continue
        rel, fn, text, shape = (record["path"], record["fn"],
                                record["text"], record["shape"])
        new_id = record.get("new_id")
        if not new_id:
            jobs.append({"path": rel, "action": "SKIP-no-rule",
                         "id": None, "shape": shape})
            continue
        key = lookup_key(new_id)
        conflicts = declared.get(key, []) + [p for p in candidates[key] if p != rel]
        if conflicts:
            jobs.append({"path": rel, "action": "SKIP-id-collision",
                         "id": new_id, "shape": shape,
                         "conflicts": sorted(conflicts)})
            continue
        jobs.append({"path": rel,
                     "action": "insert" if shape != "none" else "create",
                     "id": new_id, "shape": shape,
                     "title": derive_title(text, fn, new_id) if shape == "none" else None})
    return jobs


def render_job(text, j):
    """先在記憶體完成轉換；所有 job 都能 render 後才開始批次寫入。"""
    nl = "\r\n" if "\r\n" in text[:2000] else "\n"

    if j["action"] == "create":
        title = j["title"].replace('"', "'")
        return "---%sid: %s%stitle: \"%s\"%s---%s%s%s" % (
            nl, j["id"], nl, title, nl, nl, nl, text)

    # insert：在既有區塊的第一個實質行之前插入，沿用該行縮排
    if j["shape"] == "yaml_fm":
        m = re.match(r"^(---\r?\n)", text)
    else:
        m = re.search(r"(?:```|~~~)yaml\r?\n", text[:3000])
    if not m:
        raise ValueError("metadata shape 與實際 fence 不一致：%s" % j["path"])
    head_end = m.end()
    rest = text[head_end:]
    first = re.match(r"^([ \t]*)", rest.split("\n", 1)[0]).group(1)
    return text[:head_end] + "%sid: %s%s" % (first, j["id"], nl) + rest


def apply_job(root, j):
    full = os.path.join(root, j["path"])
    text = io.open(full, encoding="utf-8").read()
    io.open(full, "w", encoding="utf-8", newline="").write(
        render_job(text, j))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    mf = load_manifest(root)
    jobs = plan(root, mf)

    ins = [j for j in jobs if j["action"] == "insert"]
    cre = [j for j in jobs if j["action"] == "create"]
    skp = [j for j in jobs if j["action"].startswith("SKIP")]

    for label, group in (("插入 id（既有區塊）", ins),
                         ("新建 frontmatter", cre),
                         ("無法安全推定，跳過", skp)):
        print("\n=== %s：%d ===" % (label, len(group)))
        for j in group:
            extra = ("  title=%s" % j["title"]) if j.get("title") else ""
            if j.get("conflicts"):
                extra += "  conflicts=%s" % ", ".join(j["conflicts"])
            print("  %-11s %-62s -> %s%s" % (j["shape"], j["path"][:62], j["id"], extra))

    if not a.apply:
        print("\n[dry-run] 未寫入任何檔案。加 --apply 才套用。")
        return
    # 先把每一份結果都算完；格式錯誤時一個檔案也不寫，避免半套用。
    prepared = []
    for j in ins + cre:
        full = os.path.join(root, j["path"])
        text = io.open(full, encoding="utf-8").read()
        prepared.append((full, render_job(text, j)))
    for full, rendered in prepared:
        io.open(full, "w", encoding="utf-8", newline="").write(rendered)
    print("\n已套用 %d 檔。" % len(ins + cre))


if __name__ == "__main__":
    main()
