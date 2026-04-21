# Wiki I18N Architecture (Draft v1)

This document defines the proposed multilingual architecture for the local Wiki.js stack and its future public deployment.

The goal is not only to "have translated pages", but to make the wiki behave more like Wikipedia:

- one concept can exist in multiple languages
- language switching happens at the page level
- internal links remain stable across languages
- translation status can be tracked over time
- the repo remains maintainable as the wiki grows

This is a draft architecture. It is intentionally platform-aware, but not platform-dependent.

## Core Principle

Separate these three things from the start:

- page identity
- content path
- language version

A concept should exist before any one language expression of it.

That means:

- `人類錨點`
- `Human Anchor`
- `人間アンカー`

are not three unrelated pages.

They are three locale versions of the same entry.

## Design Goals

- keep page identity stable even if titles change
- allow multiple locales for the same concept
- avoid path churn when adding translations later
- avoid one giant manifest file that becomes a merge-conflict trap
- make translation freshness machine-checkable
- keep the architecture portable if Wiki.js v2, v3, or another frontend is used later

## Frozen Decisions

These are the decisions worth freezing early.

### 1. Entry Identity

Every concept gets a stable `entry_id`.

Example:

```yaml
entry_id: lex.001.human-anchor
```

Rules:

- `entry_id` is language-neutral
- `entry_id` should be semantic, not presentation-driven
- `entry_id` should never depend on a page title
- once public, `entry_id` should be treated as permanent

Recommended shape:

```text
<domain>.<volume>.<term>
```

Examples:

- `lex.001.jia`
- `lex.001.changyu`
- `lex.001.human-anchor`
- `lex.002.fourth-life`

### 2. Canonical Path

Every entry also gets a stable `canonical_path`.

Example:

```yaml
canonical_path: lex/lex-001/human-anchor
```

Rules:

- `canonical_path` is language-neutral
- use ASCII slugs only
- do not translate paths in v1
- do not derive paths from localized titles
- path changes should be rare and require explicit redirect planning

This is the safest first version because Wiki.js multilingual support already works well with the idea of the same page path under different locales.

### 3. Source Locale

Every entry must declare one source locale.

For this wiki, the recommended default is:

```yaml
source_locale: zh-Hant
```

Rules:

- the source locale is the canonical writing origin
- new entries are born in the source locale first
- all other locales are translations or reinterpretations of that source
- source locale can theoretically change later, but should be treated as very expensive

## Repo Layout

Avoid a single `pages.yaml` file for the whole wiki.

Recommended layout:

```text
tools/wiki-local/
  manifest/
    lex/
      lex.001.jia.yaml
      lex.001.changyu.yaml
      lex.001.human-anchor.yaml
      lex.001.yang-changyu.yaml
  seed/
    zh-Hant/
      lex/lex-001/jia.md
      lex/lex-001/changyu.md
      lex/lex-001/human-anchor.md
    en/
      lex/lex-001/jia.md
      lex/lex-001/changyu.md
    ja/
      lex/lex-001/jia.md
```

Why:

- one entry per manifest file scales better
- multiple people can edit different entries without merge pain
- manifest files become natural units for tooling
- locale content can be organized in a predictable way

Optional generated files:

```text
tools/wiki-local/manifest/index.json
tools/wiki-local/manifest/index.yaml
```

These should be generated artifacts, not hand-edited sources of truth.

## Manifest Schema

Suggested per-entry manifest:

```yaml
entry_id: lex.001.human-anchor
canonical_path: lex/lex-001/human-anchor
source_locale: zh-Hant
category:
  system: lex
  volume: lex-001
  kind: term
titles:
  zh-Hant: 人類錨點
  en: Human Anchor
  ja: 人間アンカー
locales:
  zh-Hant:
    status: live
    file: seed/zh-Hant/lex/lex-001/human-anchor.md
    source_revision: self
  en:
    status: draft
    file: seed/en/lex/lex-001/human-anchor.md
    source_revision: 4f29f2c
  ja:
    status: missing
links:
  parents:
    - lex.001
  related:
    - lex.001.changyu
    - lex.001.jia
tags:
  - lex
  - term
  - anchor
```

## Locale Status Model

Recommended statuses:

- `missing`
- `draft`
- `review`
- `live`
- `stale`

Definitions:

- `missing`: no translation content exists yet
- `draft`: content exists but is not ready for public trust
- `review`: translation exists and awaits verification
- `live`: usable and published
- `stale`: was live or draft, but the source locale changed after this version

This model matters more than people think. It is what keeps "multilingual" from turning into "mysteriously inconsistent".

## Stale Detection

Do not rely on humans to mark stale translations.

The status change should be automated.

Recommended mechanism:

- source locale files are watched in git
- when a source-locale file changes, all non-source locale variants for that `entry_id` are marked `stale`
- this should happen in CI, or in a repo script that CI runs

Good enough v1 strategies:

- compare git commit SHA
- compare content hash
- compare manifest `source_revision`

Recommended rule:

- every translated locale stores the source revision it is based on
- if current source revision differs, the translation becomes `stale`

## Integrity Validation

Add a validation stage before fancy UI work.

This should be a real script, not just a convention.

The validator should check:

- every manifest has a unique `entry_id`
- every manifest has a unique `canonical_path`
- source locale file exists
- any locale marked `draft`, `review`, `live`, or `stale` must have a real file
- no file exists without a matching manifest
- no duplicate locale/page combination exists
- all internal entry references point to valid `entry_id`s
- titles and statuses are coherent

This is the layer that prevents silent drift.

## Internal Linking Rules

This is one of the most important decisions.

Do not hardcode localized destination paths directly in article bodies.

Instead, link by stable identity.

Recommended v1 syntax inside source markdown:

```text
[[entry:lex.001.human-anchor]]
[[entry:lex.001.changyu|場域]]
```

Then resolve that link at seed/render time:

- if current locale exists and is `live` or `review`, link to that locale version
- if current locale is `draft`, either link with a draft badge or fall back depending on site mode
- if current locale is `missing`, fall back to source locale

Fallback order:

```text
requested locale -> source locale -> unresolved warning
```

This rule should be defined now, even if the first implementation is simple.

## Frontend Behavior

The user-facing language switcher should behave like this:

- same entry, different locale
- never jump to a semantically different page
- if requested locale is missing, show source locale with a clear notice
- if requested locale is stale, show the translated page with a visible stale notice

Suggested notices:

- `This page is shown in zh-Hant because an English version does not exist yet.`
- `This English version may be outdated. Source page changed after this translation.`

## Wiki.js-Specific Strategy

Current local stack:

- Wiki.js 2.x
- PostgreSQL
- pages seeded through `seed-pages.ps1`

Current script already uses `locale` as a first-class page dimension.

That means we do not need to redesign the whole stack to start multilingual support.

The correct strategy is:

- keep repo-side identity and translation state in our own manifest layer
- keep Wiki.js as the presentation and page storage layer
- evolve the seeding script to push multiple locales for the same `canonical_path`

This keeps us portable if:

- Wiki.js v2 remains the runtime for a long time
- Wiki.js v3 changes internals
- we later publish through another renderer or static export flow

## Migration Philosophy

Treat the repo as the truth for:

- entry identity
- translation relationships
- translation freshness
- internal link intent

Treat Wiki.js as the truth for:

- page presentation
- browsing
- editing UI
- permissions
- site-level locale switching

This split is what gives us migration safety.

## Rollout Plan

### Phase 1. Identity Layer

- freeze `entry_id` rules
- freeze `canonical_path` rules
- freeze `source_locale`
- create per-entry manifest format

### Phase 2. Validation Layer

- build integrity checker
- detect orphan files, duplicate identities, missing source files
- validate link targets and locale states

### Phase 3. Translation State Automation

- add stale detection
- store `source_revision`
- automatically mark non-source locales stale on source changes

### Phase 4. Seeder Evolution

- change seeding workflow from single-locale tree to locale-aware tree
- seed the same `canonical_path` in multiple locales
- optionally seed translation notices from manifest state

### Phase 5. UX Layer

- add language switch UI
- add missing/stale banners
- add locale-aware internal link resolution

## Things Not To Do Yet

- do not translate slugs in v1
- do not make one giant global manifest file
- do not rely on human memory for stale tracking
- do not hardcode localized URLs inside article bodies
- do not bind architecture to a Wiki.js v3 assumption

## Immediate Next Step

Before adding actual translated content, define these three things in code:

- `entry_id` naming convention
- per-entry manifest file format
- internal link syntax by entry identity

If those are stable, the rest can grow without tearing up the roots later.
