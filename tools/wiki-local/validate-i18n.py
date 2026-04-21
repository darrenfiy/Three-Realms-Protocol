from __future__ import annotations

import json
import sys
from pathlib import Path


VALID_STATUSES = {"missing", "draft", "review", "live", "stale"}


def load_json_yaml(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"{path}: manifest is not valid JSON-compatible YAML. "
            "For v1, manifests should use the JSON subset of YAML."
        ) from exc


def fail(errors: list[str]) -> int:
    for err in errors:
        print(f"ERROR: {err}")
    return 1


def warn(warnings: list[str]) -> None:
    for item in warnings:
        print(f"WARN: {item}")


def validate_manifest_schema(path: Path, data: dict, root: Path, allowed_tags: set[str]) -> list[str]:
    errors: list[str] = []

    is_entry = "entry_id" in data
    is_collection = "collection_id" in data

    if is_entry == is_collection:
        errors.append(f"{path}: manifest must declare exactly one of `entry_id` or `collection_id`")
        return errors

    base_required = ["canonical_path", "source_locale", "titles", "locales", "tags"]
    for key in base_required:
        if key not in data:
            errors.append(f"{path}: missing required key `{key}`")

    if is_entry:
        for key in ["entry_id", "placement"]:
            if key not in data:
                errors.append(f"{path}: missing required key `{key}`")
    else:
        for key in ["collection_id", "collection", "contains"]:
            if key not in data:
                errors.append(f"{path}: missing required key `{key}`")

    if errors:
        return errors

    source_locale = data["source_locale"]
    locales = data["locales"]

    if source_locale not in locales:
        errors.append(f"{path}: source_locale `{source_locale}` must exist in locales")

    if is_entry:
        placement = data["placement"]
        if not isinstance(placement, dict):
            errors.append(f"{path}: placement must be an object")
        else:
            for key in ["system", "volume", "kind"]:
                if key not in placement:
                    errors.append(f"{path}: placement missing `{key}`")

            volume = placement.get("volume")
            if isinstance(volume, str) and "." in volume:
                errors.append(f"{path}: placement.volume should be a container id like `lex-001`, not an entry id")
    else:
        collection = data["collection"]
        if not isinstance(collection, dict):
            errors.append(f"{path}: collection must be an object")
        else:
            for key in ["system", "kind"]:
                if key not in collection:
                    errors.append(f"{path}: collection missing `{key}`")

        contains = data.get("contains")
        if not isinstance(contains, list):
            errors.append(f"{path}: contains must be a list")

    tags = data.get("tags", [])
    if not isinstance(tags, list):
        errors.append(f"{path}: tags must be a list")
    else:
        for tag in tags:
            if tag not in allowed_tags:
                errors.append(f"{path}: tag `{tag}` is not in controlled vocabulary")

    if not isinstance(locales, dict):
        errors.append(f"{path}: locales must be an object")
        return errors

    for locale, meta in locales.items():
        if not isinstance(meta, dict):
            errors.append(f"{path}: locale `{locale}` metadata must be an object")
            continue

        status = meta.get("status")
        if status not in VALID_STATUSES:
            errors.append(f"{path}: locale `{locale}` has invalid status `{status}`")
            continue

        file_rel = meta.get("file")
        needs_file = status in {"draft", "review", "live", "stale"}

        if needs_file and not file_rel:
            errors.append(f"{path}: locale `{locale}` with status `{status}` must declare a file")
            continue

        if file_rel:
            file_path = root / file_rel
            if not file_path.exists():
                errors.append(f"{path}: locale `{locale}` points to missing file `{file_rel}`")

        source_revision = meta.get("source_revision")
        if locale == source_locale:
            if status != "live":
                errors.append(f"{path}: source locale `{locale}` should normally be `live` in v1")
            if source_revision != "self":
                errors.append(f"{path}: source locale `{locale}` should use source_revision `self`")
        else:
            if status in {"draft", "review", "live", "stale"} and "source_revision" not in meta:
                errors.append(f"{path}: translated locale `{locale}` should record source_revision")

    return errors


def main() -> int:
    root = Path(__file__).resolve().parent
    manifest_root = root / "manifest"
    vocab_path = manifest_root / "tags.vocab.yaml"
    strict = "--strict" in sys.argv[1:]

    if not manifest_root.exists():
        print("ERROR: manifest directory does not exist")
        return 1

    if not vocab_path.exists():
        print("ERROR: controlled vocabulary file is missing")
        return 1

    vocab = load_json_yaml(vocab_path)
    allowed_tags = set(vocab.get("tags", []))
    if not allowed_tags:
        print("ERROR: controlled vocabulary is empty")
        return 1

    manifest_paths = sorted(
        p for p in manifest_root.rglob("*.yaml")
        if p.name != "tags.vocab.yaml"
    )

    if not manifest_paths:
        print("ERROR: no manifest files found")
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    manifests: dict[str, dict] = {}
    identity_ids: dict[str, Path] = {}
    canonical_paths: dict[str, Path] = {}

    for path in manifest_paths:
        try:
            data = load_json_yaml(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        manifests[str(path)] = data
        errors.extend(validate_manifest_schema(path, data, root, allowed_tags))

        identity_id = data.get("entry_id") or data.get("collection_id")
        canonical_path = data.get("canonical_path")

        if identity_id:
            if identity_id in identity_ids:
                errors.append(f"{path}: duplicate identity `{identity_id}` also used by {identity_ids[identity_id]}")
            else:
                identity_ids[identity_id] = path

        if canonical_path:
            if canonical_path in canonical_paths:
                errors.append(
                    f"{path}: duplicate canonical_path `{canonical_path}` also used by {canonical_paths[canonical_path]}"
                )
            else:
                canonical_paths[canonical_path] = path

    all_identity_ids = set(identity_ids.keys())
    declared_files: set[Path] = set()

    for path_str, data in manifests.items():
        path = Path(path_str)
        links = data.get("links", {})
        related = links.get("related", []) if isinstance(links, dict) else []
        for target in related:
            if target not in all_identity_ids:
                message = f"{path}: links.related references unknown identity `{target}`"
                if strict:
                    errors.append(message)
                else:
                    warnings.append(message)

        contains = data.get("contains", [])
        if isinstance(contains, list):
            for target in contains:
                if target not in all_identity_ids:
                    message = f"{path}: contains references unknown identity `{target}`"
                    if strict:
                        errors.append(message)
                    else:
                        warnings.append(message)

        locales = data.get("locales", {})
        if isinstance(locales, dict):
            for meta in locales.values():
                if isinstance(meta, dict) and meta.get("file"):
                    declared_files.add((root / meta["file"]).resolve())

    for seed_file in sorted((root / "seed").rglob("*.md")):
        if seed_file.resolve() not in declared_files:
            message = f"{seed_file}: seed file exists without a matching manifest declaration"
            if strict:
                errors.append(message)
            else:
                warnings.append(message)

    if warnings:
        warn(warnings)

    if errors:
        return fail(errors)

    mode = "strict" if strict else "progressive"
    print(f"OK: validated {len(manifest_paths)} manifest(s) in {mode} mode")
    return 0


if __name__ == "__main__":
    sys.exit(main())
