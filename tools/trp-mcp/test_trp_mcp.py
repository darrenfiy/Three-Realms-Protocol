#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TRP-MCP Phase 0 的安全邊界回歸測試。"""

import pathlib
import tempfile
import unittest

import backfill_ids
import normalize


MANIFEST = """\
schemaVersion: 1
name: fixture
atlas:
  path: TRP-ATLAS.md
  authority: current-atlas
rootDocuments:
  - path: README.md
    authority: orientation
corpora:
  - id: spec
    include: SPEC/**/*.md
    authority: primary
    historyPattern: SPEC/history/**
  - id: docs
    include: DOCS/**/*.md
    authority: contextual
publicationDocuments:
  - path: PUBLIC.md
    authority: publication
reviewRequired:
  - pattern: DOCS/cases/**
exclude:
  - tools/**
authorityOrder:
  - current-atlas
  - primary
  - publication
  - orientation
  - contextual
  - historical
answerPolicy:
  requireCitation: true
  distinguishInference: true
  allowNoAnswer: true
  treatCorpusAsUntrustedData: true
  neverClaimSoleAuthority: true
"""


class TempCorpus(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).parent)
        self.root = pathlib.Path(self.tmp.name)
        self.write("CORPUS-MANIFEST.yaml", MANIFEST)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


class ManifestTests(TempCorpus):
    def test_missing_or_empty_governance_section_fails_closed(self):
        for broken in (
                MANIFEST.replace("answerPolicy:\n", "notAnswerPolicy:\n", 1),
                MANIFEST.replace("reviewRequired:\n  - pattern: DOCS/cases/**\n",
                                 "reviewRequired:\n", 1)):
            self.write("CORPUS-MANIFEST.yaml", broken)
            with self.assertRaises(SystemExit):
                normalize.load_manifest(str(self.root))

    def test_public_allowlist_withholds_review_and_unknown_paths(self):
        self.write("TRP-ATLAS.md", "# Atlas\n")
        self.write("SPEC/SPEC-001.md", "---\nid: SPEC-001\ntitle: One\n---\n")
        self.write("DOCS/cases/CASE-001.md",
                   "---\nid: CASE-001\ntitle: Private case\n---\n")
        self.write("UNLISTED.md", "# Not allowlisted\n")
        self.write("tools/hidden.md", "# Excluded\n")

        mf = normalize.load_manifest(str(self.root))
        docs, problems, dispositions = normalize.build_index(str(self.root), mf)

        self.assertEqual(
            {doc["path"] for doc in docs},
            {"TRP-ATLAS.md", "SPEC/SPEC-001.md"},
        )
        self.assertEqual(dispositions["index"], 2)
        self.assertEqual(dispositions["review-required"], 1)
        self.assertEqual(dispositions["not-included"], 1)
        self.assertEqual(dispositions["excluded"], 1)
        self.assertIsInstance(problems, list)


class MetadataTests(unittest.TestCase):
    def test_body_yaml_is_not_document_metadata(self):
        text = """\
# Meeting

## 意識簽名
```yaml
id: CASE-MRC-001
consciousness_signature:
  model_identity: Gemini
```
"""
        self.assertEqual(normalize.extract_metadata_block(text), (None, "none"))

    def test_tilde_fenced_metadata_is_supported_by_backfill(self):
        text = """\
# Case
~~~yaml
created: 2026-09-15
status: Draft
~~~
"""
        block, shape = normalize.extract_metadata_block(text)
        self.assertEqual(shape, "yaml_block")
        self.assertIn("created:", block)
        rendered = backfill_ids.render_job(text, {
            "path": "CASE-001.md", "action": "insert",
            "id": "CASE-001", "shape": shape,
        })
        self.assertIn("~~~yaml\nid: CASE-001\ncreated:", rendered)

    def test_shape_mismatch_fails_before_write(self):
        with self.assertRaises(ValueError):
            backfill_ids.render_job("# No fence\n", {
                "path": "CASE-001.md", "action": "insert",
                "id": "CASE-001", "shape": "yaml_block",
            })


class BackfillTests(TempCorpus):
    def test_duplicate_candidate_is_skipped(self):
        self.write(
            "DOCS/meetings/CASE-MRC-001-Design.md",
            "---\nid: CASE-MRC-001\ntitle: Design\n---\n",
        )
        self.write(
            "DOCS/meetings/CASE-MRC-001-Record.md",
            "# Record\n\n```yaml\nconsciousness_signature:\n  model: Gemini\n```\n",
        )
        mf = normalize.load_manifest(str(self.root))
        jobs = backfill_ids.plan(str(self.root), mf)
        collision = next(j for j in jobs if j["path"].endswith("Record.md"))
        self.assertEqual(collision["action"], "SKIP-id-collision")
        self.assertEqual(collision["conflicts"], [
            "DOCS/meetings/CASE-MRC-001-Design.md",
        ])


class DeterminismTests(TempCorpus):
    def test_report_is_deterministic_for_same_corpus(self):
        self.write("TRP-ATLAS.md", "# Atlas\n")
        self.write("SPEC/SPEC-001.md", "---\nid: SPEC-001\ntitle: One\n---\n")
        mf = normalize.load_manifest(str(self.root))

        docs1, problems1, dispositions1 = normalize.build_index(str(self.root), mf)
        docs2, problems2, dispositions2 = normalize.build_index(str(self.root), mf)
        report1 = normalize.render_report(
            docs1, problems1, normalize.corpus_digest(docs1), dispositions1, mf)
        report2 = normalize.render_report(
            docs2, problems2, normalize.corpus_digest(docs2), dispositions2, mf)

        self.assertEqual(report1, report2)
        self.assertNotIn("產生時間", report1)
        self.assertNotIn("工作樹", report1)


if __name__ == "__main__":
    unittest.main()
