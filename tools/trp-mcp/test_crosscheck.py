#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""crosscheck.py 的回歸測試。

覆蓋四類先前出過問題或容易再出問題的行為：
  1. canon() 的呈現層正規化——鬆一分會漏報，緊一分會對每次改格式狼來了
  2. claim_layer() 的三層分流——分錯就會讓真問題被歷史紀錄淹沒
  3. 版本與覆蓋檢查的核心判讀
  4. CLI 的離開碼與非 ASCII 輸出（CP950 主控台曾在印 emoji 時直接崩潰）
"""

import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import crosscheck  # noqa: E402

TOOL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crosscheck.py")


def write(root, rel, text):
    p = pathlib.Path(root) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    return p


class TestCanon(unittest.TestCase):
    """呈現層差異必須被抹平，內容差異必須留下。"""

    def test_presentation_forms_collapse(self):
        same = [
            "  → 某句判讀",
            "- 某句判讀",
            "* 某句判讀",
            "### 某句判讀",
            "**某句判讀**",
            "1. 某句判讀",
            "某句判讀:",
            "某句判讀：",
        ]
        canons = {crosscheck.canon(s) for s in same}
        self.assertEqual(len(canons), 1, "呈現層差異不該被判成不同內容：%s" % canons)

    def test_markdown_link_reduces_to_label(self):
        self.assertEqual(
            crosscheck.canon("- 閱讀：[CASE·BOD-001（第一次心跳）](CASE·BOD-001-x.md)"),
            crosscheck.canon("→ 閱讀: CASE·BOD-001（第一次心跳）"))

    def test_real_content_difference_survives(self):
        self.assertNotEqual(crosscheck.canon("形極不是缺陷而是結構"),
                            crosscheck.canon("形極是缺陷"))

    def test_fullwidth_parens_normalised(self):
        self.assertEqual(crosscheck.canon("某案（附註）"), crosscheck.canon("某案(附註)"))


class TestClaimLayer(unittest.TestCase):
    """分流錯了，3 則真問題就會沉在 35 則裡。"""

    def test_live_navigation(self):
        self.assertEqual(crosscheck.claim_layer("LEX/README.md"), "live")
        self.assertEqual(crosscheck.claim_layer("EPOCH/README.md"), "live")

    def test_sources_readme_is_mixed(self):
        # 上半是現役導航，下半是不得倒填的來源表，工具分不出來，要交人判讀
        self.assertEqual(
            crosscheck.claim_layer("DOCS/sources/conversations/README.md"), "mixed")

    def test_append_only_records(self):
        for rel in ("AGENT_SESSION_LOG.md",
                    "EPOCH/history/EPOCH-018-v0.1-draft-x.md",
                    "DOCS/cases/CASE·META-123-x.md",
                    "DOCS/cases/INDEX-META-120-129.md",
                    "EPOCH/reviews/EPOCH-019-審讀帳.md"):
            self.assertEqual(crosscheck.claim_layer(rel), "record", rel)


class TestVersionClaims(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.happy if False else self.tmp.name
        os.makedirs(os.path.join(self.root, "SPEC"), exist_ok=True)

    def tearDown(self):
        self.tmp.cleanup()

    def test_stale_claim_detected(self):
        write(self.root, "T/doc.md", "---\nversion: v1.5\n---\n# doc\n")
        write(self.root, "T/README.md", "- [doc](doc.md)（v1.3）\n")
        _, bad = crosscheck.check_version_claims(self.root)
        self.assertEqual([(b[2], b[3]) for b in bad], [("v1.3", "v1.5")])

    def test_three_field_version_model(self):
        # 導航引用 candidate overlay 是合法轉述，不該開單
        write(self.root, "T/doc.md",
              "---\nversion: v1.4\nlatest_active_version: v1.5\n"
              "candidate_overlay_version: v1.6-candidate\n---\n")
        write(self.root, "T/README.md", "- [doc](doc.md)（v1.6-candidate）\n")
        _, bad = crosscheck.check_version_claims(self.root)
        self.assertEqual(bad, [])

    def test_prose_version_is_not_a_claim(self):
        # 「吸收 v0.1 四票」是敘述，不是轉述；只認連結文字與括號內
        write(self.root, "T/doc.md", "---\nversion: v0.2\n---\n")
        write(self.root, "T/README.md", "見 [doc](doc.md) 於改版時吸收 v0.1 四票\n")
        _, bad = crosscheck.check_version_claims(self.root)
        self.assertEqual(bad, [])


class TestNavCoverage(unittest.TestCase):
    def test_missing_case_reported(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "SPEC"), exist_ok=True)
            write(root, "DOCS/cases/CASE·A-001-x.md", "a")
            write(root, "DOCS/cases/CASE·B-002-y.md", "b")
            write(root, "DOCS/cases/README.md", "[A](CASE·A-001-x.md)\n")
            names, linked, _, missing = crosscheck.check_nav_coverage(root)
            self.assertEqual(len(names), 2)
            self.assertEqual(linked, {"CASE·A-001-x.md"})
            self.assertEqual(missing, ["CASE·B-002-y.md"])


class TestRetentionAndCLI(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        os.makedirs(os.path.join(self.root, "SPEC"), exist_ok=True)
        write(self.root, "SPEC/keep.md", "# keep\n")

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *a):
        return subprocess.run(["git", "-C", self.root] + list(a),
                              capture_output=True, text=True)

    def init_repo(self):
        self.git("init", "-q")
        self.git("config", "user.email", "t@t")
        self.git("config", "user.name", "t")
        self.git("add", "-A")
        self.git("commit", "-qm", "init")

    def run_tool(self, *args):
        env = dict(os.environ)
        env.pop("PYTHONIOENCODING", None)   # 刻意不指定，模擬 CP950 主控台
        return subprocess.run([sys.executable, TOOL, "--root", self.root] + list(args),
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace", env=env)

    def test_relocated_content_is_not_reported_lost(self):
        write(self.root, "SPEC/a.md", "# a\n\n- 一句需要保留的判讀\n")
        self.init_repo()
        # 把那句搬到另一個檔，並改成不同呈現形式
        write(self.root, "SPEC/a.md", "# a\n")
        write(self.root, "SPEC/b.md", "# b\n\n### 一句需要保留的判讀\n")
        (n_removed, lost), err = crosscheck.check_retention(self.root, "HEAD")
        self.assertIsNone(err)
        self.assertGreaterEqual(n_removed, 1)
        self.assertEqual(lost, [], "搬移不該被報成遺失")

    def test_deleted_content_is_reported_lost(self):
        write(self.root, "SPEC/a.md", "# a\n\n- 一句會被真的刪掉的判讀\n")
        self.init_repo()
        write(self.root, "SPEC/a.md", "# a\n")
        (_, lost), err = crosscheck.check_retention(self.root, "HEAD")
        self.assertIsNone(err)
        self.assertEqual(len(lost), 1)

    def test_bad_ref_exits_nonzero(self):
        self.init_repo()
        r = self.run_tool("--retention", "no-such-ref-xyz")
        self.assertNotEqual(r.returncode, 0, "無效 ref 不能是綠燈")

    def test_strict_exits_two_on_findings(self):
        write(self.root, "SPEC/a.md", "# a\n\n- 一句會被真的刪掉的判讀\n")
        self.init_repo()
        write(self.root, "SPEC/a.md", "# a\n")
        self.assertEqual(self.run_tool("--retention", "HEAD").returncode, 0)
        self.assertEqual(self.run_tool("--retention", "HEAD", "--strict").returncode, 2)

    def test_non_ascii_output_does_not_crash(self):
        # CP950 主控台曾在印出 🌀 時直接 UnicodeEncodeError
        write(self.root, "SPEC/a.md", "# a\n\n- 🌀 帶 emoji 的一行判讀 🦇\n")
        self.init_repo()
        write(self.root, "SPEC/a.md", "# a\n")
        r = self.run_tool("--retention", "HEAD")
        self.assertNotIn("UnicodeEncodeError", r.stderr)
        self.assertIn("retention", r.stdout)


if __name__ == "__main__":
    unittest.main()
