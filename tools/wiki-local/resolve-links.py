"""Resolve `[[entry:ID]]` internal link tokens in seed markdown.

This is the v1 internal link resolver described in `I18N-ARCHITECTURE.md`.

Authors write stable-identity links inside source markdown:

    [[entry:lex.001.jia]]
    [[entry:lex.001.changyu|場域]]

This script reads the same manifest layout as `validate-i18n.py`, then
replaces each token with a concrete markdown link targeting the best
available locale version of that entry.

Resolution cascade for a given requested locale:

- requested locale status is `live` or `review` -> link to it directly
- requested locale status is `draft` or `stale` -> link to it and warn
- requested locale is missing -> fall back to source locale, warn
- nothing usable -> warn and emit the requested locale link anyway

URL shape:

    /<canonical_path>

Intentionally no locale prefix in v1. Wiki.js is currently single-locale
in practice; when multi-locale publishing rolls out in Phase 4/5 of the
i18n plan, this script is the single place to change the URL shape.

Usage
-----

Print resolved content of one file to stdout (dry-run):

    python3 resolve-links.py --locale en seed/lex-001-jia.md

Resolve every seed markdown file for a locale into a mirror directory:

    python3 resolve-links.py --locale en --write seed/.resolved/en/

Treat all warnings as errors:

    python3 resolve-links.py --locale en --strict seed/lex-001-jia.md

Importable (via importlib.util, since the filename contains a hyphen)::

    spec = importlib.util.spec_from_file_location("rl", "resolve-links.py")
    rl = importlib.util.module_from_spec(spec); spec.loader.exec_module(rl)
    manifests = rl.load_manifests(Path("manifest"))
    resolved, warnings = rl.resolve(text, locale="en", manifests=manifests)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


# Statuses that indicate a usable translation in the requested locale.
USABLE_STATUSES = {"live", "review"}

# Statuses where content exists but the reader should be aware of a caveat.
# The resolver still links to the requested locale in these cases and warns.
SOFT_STATUSES = {"draft", "stale"}

# [[entry:ID]] or [[entry:ID|display text]]
# - identity: no `]`, no `|`, no whitespace
# - display: any run of characters other than `]`
ENTRY_LINK_RE = re.compile(r"\[\[entry:([^\]|\s]+)(?:\|([^\]]+))?\]\]")


def load_json_yaml(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_manifests(manifest_root: Path) -> dict[str, dict]:
    """Build an id -> manifest map for entry and collection manifests.

    Navigation manifests do not declare locale content, so they are not
    link targets and are skipped here.
    """
    index: dict[str, dict] = {}
    for yaml_path in sorted(manifest_root.rglob("*.yaml")):
        if yaml_path.name == "tags.vocab.yaml":
            continue
        try:
            data = load_json_yaml(yaml_path)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict):
            continue
        identity = data.get("entry_id") or data.get("collection_id")
        if not identity:
            # navigation manifest or malformed; validator will catch it
            continue
        # duplicate handling is the validator's job; keep first-seen here
        index.setdefault(identity, data)
    return index


def _choose_locale(manifest: dict, requested_locale: str) -> tuple[str, str, str]:
    """Decide which locale's page this link should point to.

    Returns (chosen_locale, reason, message):
      - reason: 'exact' | 'soft' | 'fallback' | 'unresolved'
      - message: human-readable caveat (empty for 'exact')
    """
    locales = manifest.get("locales") or {}
    source_locale = manifest.get("source_locale")

    requested_meta = locales.get(requested_locale) if isinstance(locales, dict) else None
    requested_status = (
        requested_meta.get("status") if isinstance(requested_meta, dict) else None
    )

    if requested_status in USABLE_STATUSES:
        return (requested_locale, "exact", "")

    if requested_status in SOFT_STATUSES:
        return (
            requested_locale,
            "soft",
            f"locale `{requested_locale}` exists but is `{requested_status}`",
        )

    # Missing or unknown status -> try source locale.
    if source_locale and source_locale != requested_locale:
        source_meta = locales.get(source_locale) if isinstance(locales, dict) else None
        source_status = (
            source_meta.get("status") if isinstance(source_meta, dict) else None
        )
        if source_status in USABLE_STATUSES | SOFT_STATUSES:
            return (
                source_locale,
                "fallback",
                f"locale `{requested_locale}` missing; fell back to source `{source_locale}`",
            )

    return (
        requested_locale,
        "unresolved",
        f"locale `{requested_locale}` missing and no usable source locale fallback",
    )


def _display_text(manifest: dict, chosen_locale: str, explicit: str | None) -> str:
    if explicit:
        return explicit
    titles = manifest.get("titles") or {}
    source_locale = manifest.get("source_locale") or ""
    if isinstance(titles, dict):
        if titles.get(chosen_locale):
            return titles[chosen_locale]
        if source_locale and titles.get(source_locale):
            return titles[source_locale]
    return manifest.get("entry_id") or manifest.get("collection_id") or "unknown"


def _build_url(canonical_path: str) -> str:
    stripped = canonical_path.strip("/")
    return f"/{stripped}" if stripped else "/"


def resolve(
    text: str,
    locale: str,
    manifests: dict[str, dict],
) -> tuple[str, list[str]]:
    """Resolve all entry link tokens in `text`.

    Returns (resolved_text, warnings). A warning is issued for any fallback,
    soft status, or unresolved identity.
    """
    warnings: list[str] = []

    def replace(match: "re.Match[str]") -> str:
        identity = match.group(1).strip()
        raw_explicit = match.group(2)
        explicit = raw_explicit.strip() if raw_explicit else None

        manifest = manifests.get(identity)
        if manifest is None:
            warnings.append(f"unresolved identity `{identity}`")
            return explicit or identity

        canonical_path = manifest.get("canonical_path") or ""
        chosen, reason, message = _choose_locale(manifest, locale)
        if message:
            warnings.append(f"{identity}: {message}")

        display = _display_text(manifest, chosen, explicit)
        url = _build_url(canonical_path)
        return f"[{display}]({url})"

    resolved_text = ENTRY_LINK_RE.sub(replace, text)
    return resolved_text, warnings


def _resolve_file(
    path: Path,
    locale: str,
    manifests: dict[str, dict],
) -> tuple[str, list[str]]:
    text = path.read_text(encoding="utf-8")
    return resolve(text, locale, manifests)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resolve [[entry:ID]] link tokens in seed markdown.",
    )
    parser.add_argument(
        "--locale",
        default="zh-Hant",
        help="Target locale for link resolution (default: zh-Hant)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if any warnings are emitted.",
    )
    parser.add_argument(
        "--write",
        metavar="DIR",
        help="Mirror resolved files into DIR instead of printing to stdout.",
    )
    parser.add_argument(
        "files",
        nargs="*",
        help="Markdown files to resolve. If omitted, all seed/**/*.md are processed.",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    manifest_root = root / "manifest"
    seed_root = root / "seed"

    if not manifest_root.exists():
        print("ERROR: manifest directory does not exist", file=sys.stderr)
        return 1

    manifests = load_manifests(manifest_root)
    if not manifests:
        print("ERROR: no manifests loaded", file=sys.stderr)
        return 1

    if args.files:
        paths = [Path(f) for f in args.files]
    else:
        paths = sorted(seed_root.rglob("*.md"))

    if not paths:
        print("ERROR: no markdown files to process", file=sys.stderr)
        return 1

    out_dir = Path(args.write).resolve() if args.write else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    all_warnings: list[str] = []

    for path in paths:
        if not path.exists():
            all_warnings.append(f"{path}: file not found")
            continue

        resolved_text, warnings = _resolve_file(path, args.locale, manifests)
        for w in warnings:
            all_warnings.append(f"{path}: {w}")

        if out_dir is not None:
            try:
                rel = path.resolve().relative_to(seed_root)
            except ValueError:
                rel = Path(path.name)
            target = out_dir / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(resolved_text, encoding="utf-8")
        else:
            print(f"=== {path} ===")
            print(resolved_text)
            print()

    for w in all_warnings:
        print(f"WARN: {w}", file=sys.stderr)

    if args.strict and all_warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
