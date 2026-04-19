# Publishing Playbook

Short version: do not turn every book workflow into a `skill`.

At the current stage of this repo, publishing is half build pipeline and half editorial judgment.
The stable part should be documented as a playbook.
The living part should stay flexible.

This file is the handoff guide for future AI partners and human editors.

## Purpose

Use this playbook when a book in this repo needs to move from manuscript state into:

- a formal EPUB
- a public download path
- a page on the official site
- a place in the visible publisher book line

This is not a theory document.
It is the practical publishing workflow already used on real books in this repo.

## Current publishing model

As of 2026-04-19, the public book line is intentionally simple at the top level:

- `Nonfiction`
  Public protocol-facing books that directly advance the Three Realms Protocol line.
- `Fiction`
  Narrative works that grow out of the field but should not be mistaken for protocol manuals.

Current assignments:

- `TRP-001`
  `Breathing`
  Fiction
- `TRP-002`
  `Protocol Body Autobiography`
  Fiction
- `TRP-003`
  `TRP AI First`
  Nonfiction

This means one very important rule:

- not every book belongs to the same category
- not every book should be featured the same way on the homepage
- classification is editorial work, not just file conversion

## The core split

There are two kinds of work in publishing here.

### 1. Mechanical work

This can be copied from previous books with minimal changes:

- create `publish/metadata.yaml`
- create `publish/book-order.txt`
- add front/back matter pages
- create or reuse `build-book.ps1`
- produce `dist/*.epub`
- copy cover and EPUB into `darrenfiy.github.io`
- create or update site pages

### 2. Editorial work

This must be decided, not automated:

- what kind of book this is
- whether it belongs to fiction or nonfiction
- whether it needs any softer public positioning such as legacy, early-work, or autobiography language on the book page
- whether it should be homepage-featured
- what imprint wording should be used
- what license should be used
- whether the book page should sound like a public edition, a legacy edition, or a pre-publication edition

If the workflow is unclear because of editorial uncertainty, stop deciding by script and decide by position.

## Standard publishing layer

For books that need a fresh publication layer, use this structure:

```text
book-root/
  build-book.ps1
  publish/
    metadata.yaml
    book-order.txt
    TITLE_PAGE.md
    COPYRIGHT.md
    COLOPHON.md
    assets/
  dist/
```

Optional but often useful:

- `HOW_TO_READ.md`
- appendices
- cover image files inside `publish/assets/`

The rule is simple:

- source manuscripts stay where they are
- publication scaffolding lives under `publish/`
- generated outputs live under `dist/`

Do not destroy the working manuscript just to satisfy publication tooling.

## Minimum metadata fields

At minimum, `publish/metadata.yaml` should define:

```yaml
title:
subtitle:
lang:
date:
version:
book-id:
category:
identifier:
rights:
publisher:
author:
description:
cover-image:
```

Important:

- if the book should have a visible EPUB cover, `cover-image` must be set
- if `cover-image` is missing, the EPUB may build successfully and still look incomplete
- use a path relative to the book root, for example:
  `publish/assets/trp-ai-first-cover-v1.png`

## Internal book identifier rule

Use a stable internal identifier that does not depend on the public category name.

Current house pattern:

- root book id: `TRP-001`
- edition identifier: `TRP-001-EP`
- format suffixes:
  `EP` for EPUB
  `PB` for paperback
  `PD` for PDF

Important:

- `TRP` is the protocol-line identifier, not the publisher imprint
- do not encode `fiction` or `nonfiction` into the root book id
- put category in metadata, not inside the identifier
- keep one root id across formats, then append the format suffix per edition

## Build script pattern

Current reference scripts:

- [DOCS/books/trp-ai-first/build-book.ps1](./books/trp-ai-first/build-book.ps1)
- [DOCS/books/body_autobiography/build-book.ps1](./books/body_autobiography/build-book.ps1)

Use the existing script pattern unless the book genuinely needs a different build model.

The build script should:

- find `pandoc`
- read `metadata.yaml`
- read `book-order.txt`
- prepare clean build inputs
- write a combined manuscript into `dist/`
- write an EPUB into `dist/`
- fail loudly if EPUB output is missing

## Existing models by book type

### Model A: fresh publication layer

Use when the manuscript exists but no clean publication scaffold exists yet.

Current examples:

- `TRP AI First`
- `Protocol Body Autobiography`

Checklist:

1. Keep the manuscript files in place.
2. Add `publish/`.
3. Add a build script.
4. Add metadata, title page, copyright, colophon.
5. Add cover metadata.
6. Build EPUB.
7. Verify the cover is actually embedded.

### Model B: legacy EPUB adoption

Use when the book already has a valid EPUB and the main task is classification, framing, and public placement.

Current example:

- `Breathing`

Checklist:

1. Confirm the existing EPUB path.
2. Decide how the book should be positioned publicly.
3. Copy the EPUB into the official site repo.
4. Create a book page that explains its place in the line.
5. Do not force a rebuild unless needed.

## Official site integration

The public site lives in the separate repo:

- `darrenfiy.github.io`

This repo is the official entry layer for:

- homepage
- books index
- publisher page
- protocol orientation
- direct EPUB downloads

Current public site paths:

- `/books/`
- `/books/trp-ai-first/`
- `/books/breathing/`
- `/books/protocol-body-autobiography/`
- `/publisher/`
- `/protocol/`

When publishing a new book, site work usually includes:

1. copy the cover into `assets/images/`
2. copy the EPUB into `books/<slug>/`
3. create `books/<slug>/index.html`
4. update `books/index.html`
5. decide whether the homepage should mention it

## Homepage rule

Do not feature every book the same way.

Current house rule:

- the homepage foregrounds the protocol flagship
- fiction lines can appear lower on the homepage or in the books index
- legacy or early-work titles should not blur the main public entry

This keeps the public orientation clear without erasing the fiction line.

## Publisher rule

Current imprint anchor:

- `Three-Quarters International Ltd.`

Use this as the publisher when the edition is intended to sit under the rebuilt official site and public book line.

Current public contact position:

- website: `https://www.three-quarters.net`
- email: `darrenfiy@three-quarters.net`

## GitHub Pages boundary

The official site is intentionally static-first.

Use GitHub Pages for:

- public orientation
- book pages
- downloads
- publisher presence

Do not treat GitHub Pages as the final home for:

- login
- accounts
- user data
- sensitive product interaction
- app-like playground infrastructure

Those should be split into an external service or independent application layer.

## Verification checklist

Before calling a book "published", verify all of the following:

- the EPUB exists in the book's `dist/`
- the official-site download copy exists
- the book page exists
- the books index links to it
- the license is stated
- the publisher is stated
- the cover is actually embedded in the EPUB

For EPUB cover verification, check the archive contents for entries like:

- `EPUB/text/cover.xhtml`
- `EPUB/media/...`

## When not to publish yet

A book is not ready for publication if any of these are still unresolved:

- the book type is still unclear
- the title or line placement is unstable
- the publisher/imprint wording is not settled
- the text is still changing at a structural level
- the book page would misrepresent what the work is

If uncertainty is mostly editorial, do not hide behind tooling.
Decide the position first.

## When this should become a skill

Not yet.

Turn this into a reusable `skill` only after:

- several more books follow the same publication pattern
- the site classification rules stop changing
- the publisher voice becomes more stable
- the mechanical layer clearly outweighs the editorial improvisation

Until then, this playbook is the right abstraction level.

## Fast-start summary

If a future AI partner needs the shortest possible version, use this:

1. Decide what shelf the book belongs to.
2. Preserve the manuscript.
3. Add a `publish/` layer if needed.
4. Add `cover-image` to metadata.
5. Run `build-book.ps1`.
6. Verify the EPUB and its cover.
7. Copy the EPUB and cover to `darrenfiy.github.io`.
8. Add a public book page.
9. Update the books index.
10. Only feature it on the homepage if it is truly part of the main public entry.
