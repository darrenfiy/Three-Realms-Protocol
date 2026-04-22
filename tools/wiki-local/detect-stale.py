"""Detect stale non-source-locale translations by content hash.

This is the v1 stale-detection layer described in `I18N-ARCHITECTURE.md`
(Phase 3: Translation State Automation).

Model
-----

Every entry/collection manifest declares a `source_locale`. Non-source
locales that have real content should also record a `source_revision` —
the identifier of the source-locale file version the translation was
based on.

When the source-locale file changes, every non-source locale for the
same identity becomes potentially stale. This script automates that
comparison so humans don't have to remember.

Revision format
---------------

v1 uses a content hash: SHA-256 of the source file bytes, truncated to
the first 12 hex characters. The special string ``"self"`` is reserved
for the source-locale entry itself (``source_revision: "self"``).

Git commit SHAs are intentionally *not* used in v1 — this keeps the
script working outside of a git checkout and independent of commit
boundaries. A future version can add a git mode.

What gets reported
------------------

The script reports three situations:

- **stale**:
  non-source locale has status in {live, review, draft, stale} with a
  real file, its ``source_revision`` does not match the current source
  hash, and status is not already ``stale``.
- **missing-revision**:
  non-source locale has content but no ``source_revision`` at all.
- **status-outdated**:
  status is ``stale`` but ``source_revision`` now matches the current
  source hash; a human should review and promote to ``live``/``review``.

Exit codes
----------

- 0: nothing to report
- 1: at least one stale / missing-revision / status-outdated case found

Usage
-----

Report only (default dry-run)::

    python3 detect-stale.py

Apply: rewrite manifests to set ``status: "stale"`` for non-source locales
whose stored ``source_revision`` no longer matches the current source
hash. Does not touch ``source_revision`` itself — that is the translator's
receipt of what they originally translated against::

    python3 detect-stale.py --apply
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


USABLE_OR_EXISTING = {"live", "review", "draft", "stale"}
SELF_REVISION = "self"
HASH_PREFIX_LEN = 12


def load_json_yaml(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json_yaml(path: Path, data: dict) -> None:
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8")


def content_hash(path: Path) -> str:
    """Stable short content hash for a source-locale file."""
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return digest[:HASH_PREFIX_LEN]


def iter_manifests(manifest_root: Path):
    """Yield (path, data) for every entry/collection manifest."""
    for yaml_path in sorted(manifest_root.rglob("*.yaml")):
        if yaml_path.name == "tags.vocab.yaml":
            continue
        try:
            data = load_json_yaml(yaml_path)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict):
            continue
        if "entry_id" not in data and "collection_id" not in data:
            # navigation manifest or malformed; skip
            continue
        yield yaml_path, data


def analyse_manifest(
    manifest_path: Path,
    data: dict,
    repo_root: Path,
) -> list[dict]:
    """Return a list of finding dicts for this manifest.

    Each finding is a dict with keys:
      kind: 'stale' | 'missing-revision' | 'status-outdated' | 'source-missing'
      manifest: Path to the manifest
      locale: str
      message: human-readable explanation
      current_source_revision: str | None
    """
    findings: list[dict] = []
    locales = data.get("locales")
    source_locale = data.get("source_locale")
    if not isinstance(locales, dict) or not source_locale:
        return findings

    source_meta = locales.get(source_locale)
    if not isinstance(source_meta, dict):
        return findings

    source_file_rel = source_meta.get("file")
    if not source_file_rel:
        return findings

    source_file = repo_root / source_file_rel
    if not source_file.exists():
        findings.append({
            "kind": "source-missing",
            "manifest": manifest_path,
            "locale": source_locale,
            "message": f"source-locale file `{source_file_rel}` does not exist on disk",
            "current_source_revision": None,
        })
        return findings

    current_rev = content_hash(source_file)

    for locale, meta in locales.items():
        if locale == source_locale or not isinstance(meta, dict):
            continue

        status = meta.get("status")
        if status not in USABLE_OR_EXISTING:
            continue  # missing status -> nothing to compare

        stored_rev = meta.get("source_revision")

        if stored_rev in (None, ""):
            findings.append({
                "kind": "missing-revision",
                "manifest": manifest_path,
                "locale": locale,
                "message": (
                    f"locale `{locale}` has status `{status}` with content "
                    f"but no `source_revision` recorded"
                ),
                "current_source_revision": current_rev,
            })
            continue

        if stored_rev == SELF_REVISION:
            findings.append({
                "kind": "missing-revision",
                "manifest": manifest_path,
                "locale": locale,
                "message": (
                    f"locale `{locale}` has `source_revision: \"self\"` "
                    f"but is not the source locale (`{source_locale}`)"
                ),
                "current_source_revision": current_rev,
            })
            continue

        if stored_rev == current_rev:
            if status == "stale":
                findings.append({
                    "kind": "status-outdated",
                    "manifest": manifest_path,
                    "locale": locale,
                    "message": (
                        f"locale `{locale}` is marked `stale` but "
                        f"`source_revision` matches current source hash "
                        f"`{current_rev}`; promote to `review` or `live` "
                        f"after a human check"
                    ),
                    "current_source_revision": current_rev,
                })
            continue

        # Hash mismatch.
        if status == "stale":
            continue  # already marked stale, nothing to do

        findings.append({
            "kind": "stale",
            "manifest": manifest_path,
            "locale": locale,
            "message": (
                f"locale `{locale}` (status `{status}`, source_revision "
                f"`{stored_rev}`) is stale against current source hash "
                f"`{current_rev}`"
            ),
            "current_source_revision": current_rev,
        })

    return findings


def apply_finding(data: dict, finding: dict) -> bool:
    """Mutate `data` in place to reflect the finding. Return True if changed."""
    if finding["kind"] != "stale":
        return False
    locales = data.get("locales")
    if not isinstance(locales, dict):
        return False
    meta = locales.get(finding["locale"])
    if not isinstance(meta, dict):
        return False
    if meta.get("status") == "stale":
        return False
    meta["status"] = "stale"
    return True


def format_finding(finding: dict) -> str:
    return f"{finding['kind'].upper()} {finding['manifest']} [{finding['locale']}]: {finding['message']}"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect stale non-source-locale translations by content hash.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Rewrite manifests to set status=`stale` for detected stale locales. "
            "Does not touch source_revision. missing-revision and status-outdated "
            "findings are only reported, never auto-applied."
        ),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only print a summary line; suppress per-finding detail.",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    manifest_root = root / "manifest"

    if not manifest_root.exists():
        print("ERROR: manifest directory does not exist", file=sys.stderr)
        return 1

    all_findings: list[dict] = []
    applied = 0
    apply_failures = 0

    for manifest_path, data in iter_manifests(manifest_root):
        findings = analyse_manifest(manifest_path, data, root)
        if not findings:
            continue

        all_findings.extend(findings)

        if args.apply:
            mutated = False
            for finding in findings:
                if apply_finding(data, finding):
                    mutated = True
                    applied += 1
            if mutated:
                try:
                    dump_json_yaml(manifest_path, data)
                except OSError:
                    apply_failures += 1

    if not args.quiet:
        for finding in all_findings:
            print(format_finding(finding))

    counts = {"stale": 0, "missing-revision": 0, "status-outdated": 0, "source-missing": 0}
    for finding in all_findings:
        counts[finding["kind"]] = counts.get(finding["kind"], 0) + 1

    summary = (
        f"Findings: stale={counts['stale']} "
        f"missing-revision={counts['missing-revision']} "
        f"status-outdated={counts['status-outdated']} "
        f"source-missing={counts['source-missing']}"
    )
    if args.apply:
        summary += f" | applied stale-marks: {applied}"
        if apply_failures:
            summary += f" | write failures: {apply_failures}"
    print(summary)

    if all_findings or apply_failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
