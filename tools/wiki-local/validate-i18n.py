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
        errors.append(f"{path}: entry/collection manifest must declare exactly one of `entry_id` or `collection_id`")
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
            if isinstance(volume, str):
                if "." in volume:
                    errors.append(f"{path}: placement.volume should be a container id like `lex-001`, not an entry id")
                if not volume:
                    errors.append(f"{path}: placement.volume must not be empty")
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


VALID_NAVIGATION_ITEM_KINDS = {"header", "link", "divider"}


def validate_navigation_schema(
    path: Path,
    data: dict,
    all_identity_ids: set[str],
) -> list[str]:
    """Validate a navigation manifest.

    Navigation manifests are the third manifest shape, alongside entry and
    collection manifests. They describe curated sidebar / menu structures
    that are synced into Wiki.js by ``sync-navigation.ps1``. They do not
    declare locale files on their own — they compose existing entries and
    collections by ``ref``.
    """
    errors: list[str] = []

    required = ["navigation_id", "mode", "label_resolution", "target_locales", "items"]
    for key in required:
        if key not in data:
            errors.append(f"{path}: navigation manifest missing required key `{key}`")

    if errors:
        return errors

    target_locales = data["target_locales"]
    if not isinstance(target_locales, list) or not target_locales:
        errors.append(f"{path}: target_locales must be a non-empty list")
        target_locales_set: set[str] = set()
    else:
        target_locales_set = {loc for loc in target_locales if isinstance(loc, str)}

    items = data["items"]
    if not isinstance(items, list):
        errors.append(f"{path}: items must be a list")
        return errors

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            errors.append(f"{path}: items[{index}] must be an object")
            continue

        kind = item.get("kind")
        if kind not in VALID_NAVIGATION_ITEM_KINDS:
            allowed = sorted(VALID_NAVIGATION_ITEM_KINDS)
            errors.append(f"{path}: items[{index}] has invalid kind `{kind}` (must be one of {allowed})")
            continue

        if kind == "divider":
            continue

        labels = item.get("labels")
        if labels is not None and not isinstance(labels, dict):
            errors.append(f"{path}: items[{index}] labels must be an object")
            labels = None

        if kind == "header":
            if not labels:
                errors.append(f"{path}: items[{index}] kind `header` must declare non-empty labels")
        elif kind == "link":
            ref = item.get("ref")
            if not isinstance(ref, str) or not ref:
                errors.append(f"{path}: items[{index}] kind `link` must declare `ref` as a non-empty string")
            elif ref not in all_identity_ids:
                errors.append(
                    f"{path}: items[{index}] ref `{ref}` does not resolve to a known entry_id or collection_id"
                )

        if isinstance(labels, dict) and target_locales_set:
            for locale_key in labels.keys():
                if locale_key not in target_locales_set:
                    errors.append(
                        f"{path}: items[{index}] labels locale `{locale_key}` is not in target_locales"
                    )

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
    manifest_kinds: dict[str, str] = {}
    identity_ids: dict[str, Path] = {}
    canonical_paths: dict[str, Path] = {}
    navigation_ids: dict[str, Path] = {}

    # Pass 1: load all manifests and classify them by shape.
    # Entry/collection manifests get full schema validation now.
    # Navigation manifests defer until pass 2, because their link refs must
    # be cross-checked against the complete identity set.
    for path in manifest_paths:
        try:
            data = load_json_yaml(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        has_entry = "entry_id" in data
        has_collection = "collection_id" in data
        has_navigation = "navigation_id" in data
        type_count = sum([has_entry, has_collection, has_navigation])

        if type_count != 1:
            errors.append(
                f"{path}: manifest must declare exactly one of "
                f"`entry_id`, `collection_id`, or `navigation_id`"
            )
            continue

        manifests[str(path)] = data

        if has_navigation:
            manifest_kinds[str(path)] = "navigation"
            nav_id = data["navigation_id"]
            if not isinstance(nav_id, str) or not nav_id:
                errors.append(f"{path}: navigation_id must be a non-empty string")
            elif nav_id in navigation_ids:
                errors.append(
                    f"{path}: duplicate navigation_id `{nav_id}` also used by {navigation_ids[nav_id]}"
                )
            else:
                navigation_ids[nav_id] = path
            continue

        manifest_kinds[str(path)] = "entry" if has_entry else "collection"
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

    # Pass 2: navigation manifests (need all_identity_ids for ref cross-check).
    for path_str, data in manifests.items():
        if manifest_kinds.get(path_str) != "navigation":
            continue
        errors.extend(validate_navigation_schema(Path(path_str), data, all_identity_ids))

    declared_files: set[Path] = set()

    for path_str, data in manifests.items():
        if manifest_kinds.get(path_str) not in {"entry", "collection"}:
            continue
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
