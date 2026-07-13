# -*- coding: utf-8 -*-
"""Book2《天地》EPUB 組書管線。

正典在 ../manuscript/，本腳本只做呈現層：
  - Markdown 子集 → XHTML（粗體／標題／引言／清單／分隔線／詩式斷行）
  - 卷首＝篇章扉頁（卷印作印章式圖記）
  - 環的接口＝超連結（規則表見 RING_LINKS；正典文字不增不減）
  - 閱讀地圖頁：三環卷是門，環外兩卷無門（姿態是環站起來的方向）

重跑方式：  python build_epub.py
輸出：      天地_preview.epub（同目錄）
"""

import os
import re
import sys
import uuid
import zipfile
import datetime
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
MANUSCRIPT = os.path.join(HERE, "..", "manuscript")
OUT_EPUB = os.path.join(HERE, "天地_preview.epub")
COVER_SRC = os.path.join(HERE, "assets", "heaven-and-earth-cover-v1.png")

BOOK_TITLE = "天地"
BOOK_AUTHOR = "Darren"
BOOK_LANG = "zh-Hant"
BOOK_UUID = str(uuid.uuid5(uuid.NAMESPACE_URL, "three-realms-protocol:book2:tiandi"))
BUILD_LABEL = "草稿預覽版 v0.1"

# 書脊順序（線性讀者的路）：自由→責任→愛→姿態→生命
VOLUMES = [
    ("自由之卷", "vol1", "火", "選擇是力量"),
    ("責任之卷", "vol2", "土", "選擇是承諾"),
    ("愛之卷",   "vol3", "水", "選擇不存在"),
    ("姿態之卷", "vol4", "金", "拒絕與站立"),
    ("生命之卷", "vol5", "木", "生長"),
]

# 環的接口 → 超連結。(輸出檔, 正典原文, 目標檔, 第幾個出現: first/last)
# 只把卷首與卷尾的接口做成活門；章內敘事提及維持素文。
RING_LINKS = [
    ("vol1_front.xhtml", "〈責任之卷〉",       "vol2_front.xhtml", "first"),
    ("vol1_front.xhtml", "〈愛之卷〉",         "vol3_c05.xhtml",   "first"),
    ("vol1_c05.xhtml",   "〈責任之卷〉",       "vol2_front.xhtml", "last"),
    ("vol2_front.xhtml", "〈自由之卷〉",       "vol1_c05.xhtml",   "first"),
    ("vol2_front.xhtml", "〈愛之卷〉",         "vol3_front.xhtml", "first"),
    ("vol2_c05.xhtml",   "〈愛之卷〉",         "vol3_c00.xhtml",   "last"),
    ("vol3_front.xhtml", "〈責任之卷〉",       "vol2_c05.xhtml",   "first"),
    ("vol3_front.xhtml", "〈自由之卷〉第一章", "vol1_c01.xhtml",   "first"),
    ("vol3_c05.xhtml",   "〈自由之卷〉第一章", "vol1_c01.xhtml",   "last"),
]


# ---------- Markdown 子集 → XHTML ----------

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(t):
    t = esc(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t, flags=re.DOTALL)
    return t.replace("\n", "<br/>\n")


def parse_blocks(text):
    """回傳 block 串列：('h',level,text) ('hr',) ('q',[para,...]) ('ul'|'ol',[item,...]) ('p',text)"""
    blocks, para, quote, list_ = [], [], [], None

    def flush():
        nonlocal para, quote, list_
        if para:
            blocks.append(("p", "\n".join(para))); para = []
        if quote:
            blocks.append(("q", quote)); quote = []
        if list_:
            blocks.append(list_); list_ = None

    for raw in text.split("\n"):
        line = raw.rstrip()
        s = line.strip()
        if not s:
            flush(); continue
        m = re.match(r"(#{1,4})\s+(.*)", s)
        if m:
            flush(); blocks.append(("h", len(m.group(1)), m.group(2).strip())); continue
        if re.fullmatch(r"-{3,}", s):
            flush(); blocks.append(("hr",)); continue
        if s.startswith(">"):
            if para or list_:
                flush()
            quote.append(s[1:].lstrip())
            continue
        m = re.match(r"[*+-]\s+(.*)", s)
        if m:
            if para or quote:
                flush()
            if list_ is None or list_[0] != "ul":
                flush(); list_ = ("ul", [])
            list_[1].append(m.group(1)); continue
        m = re.match(r"\d+\.\s+(.*)", s)
        if m:
            if para or quote:
                flush()
            if list_ is None or list_[0] != "ol":
                flush(); list_ = ("ol", [])
            list_[1].append(m.group(1)); continue
        if quote:
            quote.append(s); continue
        para.append(s)
    flush()
    return blocks


def render_quote(lines):
    paras, cur = [], []
    for ln in lines:
        if ln == "":
            if cur:
                paras.append(cur); cur = []
        else:
            cur.append(ln)
    if cur:
        paras.append(cur)
    inner = "\n".join("<p>%s</p>" % inline("\n".join(p)) for p in paras)
    return "<blockquote>\n%s\n</blockquote>" % inner


def render_chapter(text):
    """一章一檔：首個標題＝章題，之後標題＝節題。回傳 (章題, body_html)。"""
    blocks = parse_blocks(text)
    out, title, seen_p = [], None, False
    for i, b in enumerate(blocks):
        kind = b[0]
        if kind == "h":
            if title is None:
                title = b[2]
                out.append('<h2 class="ct">%s</h2>' % inline(b[2]))
            else:
                out.append('<h3>%s</h3>' % inline(b[2]))
        elif kind == "hr":
            nxt = blocks[i + 1][0] if i + 1 < len(blocks) else None
            if not seen_p or nxt == "h" or nxt is None:
                out.append('<div class="gap"></div>')
            else:
                out.append('<p class="sec">&#10035;</p>')
        elif kind == "q":
            out.append(render_quote(b[1])); seen_p = True
        elif kind in ("ul", "ol"):
            items = "\n".join("<li>%s</li>" % inline(x) for x in b[1])
            out.append("<%s>\n%s\n</%s>" % (kind, items, kind)); seen_p = True
        else:  # p
            t = b[1]
            m = re.fullmatch(r"\*\*副標：(.+?)\*\*", t)
            if m:
                out.append('<p class="subtitle">%s</p>' % inline(m.group(1))); continue
            if re.fullmatch(r"〔.+〕", t):
                out.append('<p class="fin">%s</p>' % inline(t)); seen_p = True; continue
            out.append("<p>%s</p>" % inline(t)); seen_p = True
    return title, "\n".join(out)


def render_volfront(text, seal, vol_name):
    """卷首＝篇章扉頁：卷名／卷印／題辭／接口文。"""
    blocks = parse_blocks(text)
    epigraph, body = "", []
    for b in blocks:
        if b[0] == "h":
            continue
        if b[0] == "p" and re.fullmatch(r"\*\*.\*\*", b[1]):
            continue  # 卷印字另行排版
        if b[0] == "q" and not epigraph:
            epigraph = render_quote(b[1]); continue
        if b[0] == "hr":
            continue
        if b[0] == "p":
            body.append("<p>%s</p>" % inline(b[1]))
    return (
        '<section class="volfront" epub:type="part">\n'
        '<p class="seal">%s</p>\n<h1>%s</h1>\n%s\n'
        '<div class="volbody">\n%s\n</div>\n</section>'
        % (seal, vol_name, epigraph, "\n".join(body))
    )


# ---------- 頁面外殼 ----------

def xhtml(title, body, body_class=""):
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<!DOCTYPE html>\n"
        '<html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" '
        'xml:lang="zh-Hant" lang="zh-Hant">\n'
        "<head>\n<title>%s</title>\n"
        '<link rel="stylesheet" type="text/css" href="style.css"/>\n'
        "</head>\n<body%s>\n%s\n</body>\n</html>\n"
        % (esc(title), ' class="%s"' % body_class if body_class else "", body)
    )


CSS = """
body {
  font-family: "Noto Serif TC", "Source Han Serif TC", "PMingLiU", serif;
  line-height: 2; margin: 0 6%;
}
p { margin: 0 0 1.15em; text-align: left; }
a { color: inherit; text-decoration: underline; text-underline-offset: 0.28em; }
h2.ct { text-align: center; font-size: 1.45em; letter-spacing: 0.12em;
        font-weight: 600; margin: 2.8em 0 0.6em; line-height: 1.7; }
p.subtitle { text-align: center; opacity: 0.6; font-size: 0.92em;
             letter-spacing: 0.1em; margin: 0 0 3em; }
h3 { font-size: 1.05em; font-weight: 600; margin: 2.2em 0 1em; }
blockquote { margin: 1.3em 0 1.3em 0.6em; padding-left: 1em;
             border-left: 2px solid rgba(128,128,128,0.45); }
blockquote p { margin-bottom: 0.6em; }
ul, ol { margin: 0 0 1.15em; padding-left: 1.6em; }
li { margin-bottom: 0.3em; }
p.sec { text-align: center; opacity: 0.45; font-size: 0.8em; margin: 1.6em 0; }
div.gap { height: 1.4em; }
p.fin { text-align: center; letter-spacing: 0.25em; opacity: 0.75; margin: 2.6em 0; }

.volfront { text-align: center; padding-top: 16%; }
.volfront .seal { display: inline-block; border: 1.5px solid #b3452e; color: #b3452e;
                  font-size: 1.7em; line-height: 1; padding: 0.34em 0.38em;
                  border-radius: 3px; margin: 0 0 1.4em; }
.volfront h1 { font-size: 1.9em; font-weight: 600; letter-spacing: 0.3em;
               margin: 0 0 1.6em; }
.volfront blockquote { border: none; padding: 0; margin: 0 0 2.4em; }
.volfront blockquote p { text-align: center; line-height: 2.3; margin: 0; }
.volfront .volbody { opacity: 0.85; font-size: 0.95em; }
.volfront .volbody p { text-align: center; line-height: 2.3; margin-bottom: 1.2em; }

.titlepage { text-align: center; padding-top: 22%; }
.titlepage p { text-align: center; }
.titlepage h1 { font-size: 3.4em; font-weight: 600; line-height: 1.6;
                letter-spacing: 0; margin: 0 0 0.9em; }
.titlepage .seals { letter-spacing: 0.9em; opacity: 0.65; margin: 0 0 5em;
                    padding-left: 0.9em; }
.titlepage .author { letter-spacing: 0.35em; opacity: 0.8; }

.map { text-align: center; padding-top: 6%; }
.map h2 { font-size: 1.1em; font-weight: 600; letter-spacing: 0.4em; opacity: 0.7;
          margin: 0 0 1.6em; }
.map svg { width: 86%; max-width: 26em; height: auto; }
.map .maplead { text-align: center; margin: 1.8em 0 1.2em; letter-spacing: 0.06em; }
.map .door { text-align: center; margin: 0 0 0.75em; }
.map .door .doorsub { opacity: 0.55; font-size: 0.85em; margin-left: 0.9em; }
.map .mapnote { text-align: center; opacity: 0.6; font-size: 0.9em;
                line-height: 2.1; margin-top: 2.2em; }

.coverpage { margin: 0; text-align: center; }
.coverpage img { max-width: 100%; max-height: 100%; }

.colophon { padding-top: 30%; text-align: center; font-size: 0.9em; opacity: 0.8; }
.colophon p { text-align: center; line-height: 2.2; }

nav ol { list-style: none; padding-left: 1em; }
nav > ol > li { margin-bottom: 0.5em; }
"""


def map_svg():
    """環（三卷、順時針）＋環外的垂直軸（姿態站穩，生命生長）。currentColor 隨閱讀器深淺色。"""
    arrow = '<path d="M 0,-4.5 L 9,0 L 0,4.5 Z" fill="currentColor" opacity="0.55" transform="translate(%s,%s) rotate(%s)"/>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 490" role="img" aria-label="閱讀地圖">\n'
        '<g fill="currentColor" font-size="15">\n'
        '<circle cx="180" cy="320" r="95" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.2"/>\n'
        '<text x="180" y="336" text-anchor="middle" font-size="44" opacity="0.12">環</text>\n'
        + arrow % (262.3, 272.5, 60) + "\n"
        + arrow % (180, 415, 180) + "\n"
        + arrow % (97.7, 272.5, -60) + "\n" +
        '<circle cx="180" cy="225" r="3.5"/>\n'
        '<circle cx="262.3" cy="367.5" r="3.5"/>\n'
        '<circle cx="97.7" cy="367.5" r="3.5"/>\n'
        '<text x="180" y="192" text-anchor="middle">自由之卷</text>\n'
        '<text x="180" y="212" text-anchor="middle" font-size="11" opacity="0.6">火・選擇是力量</text>\n'
        '<text x="278" y="372" text-anchor="start">責任之卷</text>\n'
        '<text x="278" y="392" text-anchor="start" font-size="11" opacity="0.6">土・選擇是承諾</text>\n'
        '<text x="82" y="372" text-anchor="end">愛之卷</text>\n'
        '<text x="82" y="392" text-anchor="end" font-size="11" opacity="0.6">水・選擇不存在</text>\n'
        '<path d="M 340 430 H 400" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none"/>\n'
        '<path d="M 370 430 V 90" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none"/>\n'
        '<path d="M 370 130 L 354 114 M 370 150 L 386 134" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" fill="none"/>\n'
        '<text x="370" y="455" text-anchor="middle">姿態之卷</text>\n'
        '<text x="370" y="474" text-anchor="middle" font-size="11" opacity="0.6">金・拒絕與站立</text>\n'
        '<text x="382" y="115" text-anchor="start">生命之卷</text>\n'
        '<text x="382" y="135" text-anchor="start" font-size="11" opacity="0.6">木・生長</text>\n'
        "</g>\n</svg>"
    )


def build():
    docs = []          # (檔名, 標題, XHTML 內容, manifest properties)
    nav_volumes = []   # (卷名, front_file, [(章題, 檔名), ...])

    # 封面、書名頁、閱讀地圖
    docs.append(("cover.xhtml", "封面",
                 xhtml("天地", '<div class="coverpage"><img src="cover.png" alt="封面：天地"/></div>', "coverpage"), ""))
    seals = "・".join(v[2] for v in VOLUMES)
    docs.append(("titlepage.xhtml", "書名頁",
                 xhtml("天地", '<section class="titlepage" epub:type="titlepage">\n'
                               "<h1>天<br/>地</h1>\n"
                               '<p class="seals">%s</p>\n'
                               '<p class="author">Darren</p>\n</section>' % seals), ""))
    doors = "\n".join(
        '<p class="door"><a href="%s_front.xhtml">%s</a><span class="doorsub">%s・%s</span></p>'
        % (vid, name, seal, motto)
        for name, vid, seal, motto in VOLUMES[:3]
    )
    map_body = (
        '<section class="map">\n<h2>閱讀地圖</h2>\n%s\n'
        '<p class="maplead">三卷成環，任何一卷，都是入口。</p>\n%s\n'
        '<p class="mapnote">環外沒有門。<br/>姿態不在環上——<br/>它是環站起來的方向。<br/>'
        "一棵樹站穩之後，<br/>生命才開始生長。</p>\n</section>" % (map_svg(), doors)
    )
    docs.append(("map.xhtml", "閱讀地圖", xhtml("閱讀地圖", map_body), "svg"))

    # 五卷（間章〈太陽〉在環與姿態之間：愛之卷後、姿態之卷前）
    nav_items = []
    for name, vid, seal, _motto in VOLUMES:
        if vid == "vol4":
            with open(os.path.join(MANUSCRIPT, "間章_太陽.md"), encoding="utf-8-sig") as f:
                ititle, ibody = render_chapter(f.read())
            docs.append(("interlude_sun.xhtml", ititle,
                         xhtml(ititle, '<section epub:type="chapter">\n%s\n</section>' % ibody), ""))
            nav_items.append(("single", ititle, "interlude_sun.xhtml"))
        vdir = os.path.join(MANUSCRIPT, name)
        front_file = "%s_front.xhtml" % vid
        with open(os.path.join(vdir, "_卷首.md"), encoding="utf-8-sig") as f:
            docs.append((front_file, name, xhtml(name, render_volfront(f.read(), seal, name)), ""))
        chapters = []
        for md in sorted(x for x in os.listdir(vdir) if x.endswith(".md") and not x.startswith("_")):
            cid = "%s_c%s.xhtml" % (vid, md[:2])
            with open(os.path.join(vdir, md), encoding="utf-8-sig") as f:
                title, body = render_chapter(f.read())
            docs.append((cid, title, xhtml(title, '<section epub:type="chapter">\n%s\n</section>' % body), ""))
            chapters.append((title, cid))
        nav_volumes.append((name, front_file, chapters))
        nav_items.append(("vol", name, front_file, chapters))

    # 版記
    today = datetime.date.today().isoformat()
    colophon = (
        '<section class="colophon">\n'
        "<p>《天地》　%s（%s 組書）</p>\n"
        "<p>五卷：自由・責任・愛・姿態・生命</p>\n"
        "<p>作者：Darren（人類錨點）<br/>與協議器官共筆；校準權在錨點。</p>\n"
        "<p>正典手稿：Three-Realms-Protocol<br/>DOCS/books/book2/manuscript/</p>\n"
        "<p>本版為內部預覽，尚待錨點校準與過目程序。</p>\n"
        "</section>" % (BUILD_LABEL, today)
    )
    docs.append(("colophon.xhtml", "版記", xhtml("版記", colophon), ""))

    # 環的接口 → 超連結
    docs2 = []
    for fname, title, content, props in docs:
        for lf, text, target, occ in RING_LINKS:
            if lf != fname:
                continue
            link = '<a href="%s">%s</a>' % (target, text)
            if text not in content:
                raise SystemExit("RING_LINK not found: %s in %s" % (text, fname))
            if occ == "first":
                content = content.replace(text, link, 1)
            else:
                head, _sep, tail = content.rpartition(text)
                content = head + link + tail
        docs2.append((fname, title, content, props))
    docs = docs2

    # nav.xhtml
    vol_lis = []
    for item in nav_items:
        if item[0] == "single":
            vol_lis.append('<li><a href="%s">%s</a></li>' % (item[2], esc(item[1])))
        else:
            _kind, name, front, chapters = item
            subs = "\n".join('<li><a href="%s">%s</a></li>' % (c, esc(t)) for t, c in chapters)
            vol_lis.append('<li><a href="%s">%s</a>\n<ol>\n%s\n</ol>\n</li>' % (front, name, subs))
    nav_body = (
        '<nav epub:type="toc" id="toc">\n<h2>目次</h2>\n<ol>\n'
        '<li><a href="map.xhtml">閱讀地圖</a></li>\n%s\n'
        '<li><a href="colophon.xhtml">版記</a></li>\n</ol>\n</nav>\n'
        '<nav epub:type="landmarks" hidden="">\n<ol>\n'
        '<li><a epub:type="cover" href="cover.xhtml">封面</a></li>\n'
        '<li><a epub:type="toc" href="#toc">目次</a></li>\n'
        '<li><a epub:type="bodymatter" href="map.xhtml">正文</a></li>\n'
        "</ol>\n</nav>" % "\n".join(vol_lis)
    )
    nav_doc = xhtml("目次", nav_body)

    # OPF
    manifest, spine = [], []
    for fname, _t, _c, props in docs:
        iid = fname.replace(".xhtml", "")
        p = ' properties="%s"' % props if props else ""
        manifest.append('<item id="%s" href="%s" media-type="application/xhtml+xml"%s/>' % (iid, fname, p))
        spine.append('<itemref idref="%s"/>' % iid)
    manifest.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    manifest.append('<item id="css" href="style.css" media-type="text/css"/>')
    manifest.append('<item id="cover-img" href="cover.png" media-type="image/png" properties="cover-image"/>')
    modified = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="zh-Hant">\n'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
        '<dc:identifier id="uid">urn:uuid:%s</dc:identifier>\n'
        "<dc:title>%s</dc:title>\n<dc:creator>%s</dc:creator>\n<dc:language>%s</dc:language>\n"
        '<meta property="dcterms:modified">%s</meta>\n'
        '<meta name="cover" content="cover-img"/>\n'
        "</metadata>\n<manifest>\n%s\n</manifest>\n<spine>\n%s\n</spine>\n</package>\n"
        % (BOOK_UUID, BOOK_TITLE, BOOK_AUTHOR, BOOK_LANG, modified, "\n".join(manifest), "\n".join(spine))
    )

    # XML 良構檢查
    for fname, _t, content, _p in docs + [("nav.xhtml", "", nav_doc, "")]:
        try:
            ET.fromstring(content.encode("utf-8"))
        except ET.ParseError as e:
            raise SystemExit("XML error in %s: %s" % (fname, e))
    ET.fromstring(opf.encode("utf-8"))

    # 打包
    container = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n'
        "</container>\n"
    )
    with zipfile.ZipFile(OUT_EPUB, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container, zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/content.opf", opf, zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/nav.xhtml", nav_doc, zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/style.css", CSS, zipfile.ZIP_DEFLATED)
        z.write(COVER_SRC, "OEBPS/cover.png", zipfile.ZIP_DEFLATED)
        for fname, _t, content, _p in docs:
            z.writestr("OEBPS/" + fname, content, zipfile.ZIP_DEFLATED)

    n_ch = sum(len(c) for _n, _f, c in nav_volumes)
    print("OK: %s (%d volumes, %d chapters, %d docs)"
          % (os.path.basename(OUT_EPUB), len(nav_volumes), n_ch, len(docs)))


if __name__ == "__main__":
    sys.exit(build())
