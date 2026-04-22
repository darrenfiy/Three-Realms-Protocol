# Wiki Auth And Access Draft

Status: planning note only. Not implemented as of `2026-04-20`.

Purpose: keep a durable reference for how login, registration, and permissions
should be designed for `wiki.three-quarters.net` when the project is ready.

## Current Reality

- The wiki currently runs on the author's local machine through Docker Desktop.
- Public access is exposed through Cloudflare Tunnel.
- If the machine sleeps or the tunnel stops, the public URL goes offline.
- The repo remains the source of truth; the wiki is the presentation layer.
- This stack does not yet document a production mail setup for account recovery
  or verification flows.
- A shared company-side identity layer is now being scaffolded in
  `Three-Quarters-International/IDENTITY/`; the wiki should plug into that
  layer rather than become its own long-term auth island.

These constraints matter because public self-registration creates operational
work immediately: password resets, verification emails, spam prevention,
account review, and abuse handling.

## Design Goals

- Keep public reading easy.
- Keep editing limited to trusted collaborators.
- Avoid opening password and moderation burdens before hosting is stable.
- Support both human collaborators and repo-owned AI editor identities.
- Preserve a clear difference between public browsing and editorial authority.

## Recommended Rollout

### Phase 0: public reading, no signup

This is the recommended current mode.

- Public users can read public pages.
- No public self-registration.
- No anonymous editing.
- Human collaborator accounts are created manually by an admin.
- AI editor identities remain internal service-style accounts.

Why this is the right default now:

- uptime is not yet production-grade
- mail flows are not yet configured
- moderation workload stays near zero
- the public wiki can still do its main job: orientation and browsing

### Phase 1: collaborator login

Only move here after the wiki has reliable uptime.

Prerequisites:

- the wiki is reachable in a stable way
- backups are tested
- SMTP mail is configured and tested
- at least one human admin is committed to account review

Recommended auth model:

- prefer the company-managed OIDC provider first
- keep one local admin account as break-glass recovery access
- do not enable open self-registration yet
- if upstream social login is used, connect it behind the shared provider rather
  than directly inside Wiki.js

Recommended groups:

- `reader`
  - signed-in access to protected but non-editorial areas, if needed
- `editor`
  - create and edit assigned content
  - no auth, group, or site-management rights
- `admin`
  - manage users, groups, auth providers, and site settings
- `ai-service`
  - non-human named accounts such as `Codex`, `Gemini`, `Claude Opus`
  - not used as public signup accounts

Security baseline:

- require 2FA for admins
- keep admin count small
- log who created each human account
- review page permissions before inviting editors

### Phase 2: request-access workflow

When the public wiki starts attracting outside contributors, add a lightweight
request path on the main website instead of opening direct signup.

Recommended flow:

1. Public user reads the wiki without logging in.
2. If they want to contribute, they use a `Request Access` form on the website.
3. Admin reviews the request.
4. Approved users are added to the correct wiki group.

This keeps the front door open for readers without turning the wiki into an
unmoderated account system.

### Phase 3: optional public self-registration

Only consider this if the wiki becomes an always-on public platform with real
community operations behind it.

Do not enable public self-registration until all of the following are true:

- hosting is stable and always on
- SMTP mail works for verification and password reset
- an abuse-response owner exists
- role defaults are safe
- privacy / terms language exists if needed

If self-registration is enabled later:

- new users should land in `reader` only
- edit rights should still require manual promotion
- local auth should never grant editor rights by default

## Authentication Preference Order

Recommended order for this project:

1. company-managed OIDC login from `auth.three-quarters.net`
2. one local admin account for emergency recovery
3. optional upstream `Google` or `GitHub` login behind the shared provider
4. local self-registration only after the platform is operationally ready

Why:

- one shared IdP keeps website, wiki, and future apps on the same account layer
- upstream social login can still reduce password handling burden without
  fragmenting identity
- identity is easier to review
- recovery is simpler than managing many local passwords

## Cloudflare Access Option

If the goal later becomes "only approved people can enter the whole wiki", an
outer access gate can sit in front of Wiki.js.

Possible use cases:

- private contributor-only wiki
- staging wiki
- admin-only or editor-only subdomain

This is different from wiki-native account management:

- Cloudflare Access controls who reaches the app
- Wiki.js controls what an authenticated user can do inside the app

For the public `wiki.three-quarters.net`, Cloudflare Access should not block
all readers unless the product direction changes.

## Suggested Permission Model

Keep the first permission model simple.

- Public:
  - read public pages
- Reader:
  - read protected areas when needed
- Editor:
  - edit assigned namespaces / sections
- Admin:
  - full site administration
- AI service accounts:
  - scripted or internal editorial identities only

Avoid adding many fine-grained roles at the start. Complexity can come later if
the contributor base actually grows.

## Future Implementation Checklist

- decide whether the wiki stays on the author machine or moves to a real host
- make the tunnel or server startup persistent
- configure SMTP and send a successful test email
- stand up the shared IdP from `Three-Quarters-International/IDENTITY/`
- create a wiki OIDC client inside the shared IdP
- create groups and verify permission boundaries
- enable 2FA for admins
- define a request-access process on the main website
- document account creation and offboarding steps
- test login, logout, password reset, and recovery paths
- verify backups before inviting outside editors

## Recommended Decision For Now

The recommended near-term policy is:

- public wiki stays readable without login
- no public signup yet
- collaborator accounts are invite-only
- first real login rollout should use the shared company IdP
- admins use 2FA

This gives the project a calm default: easy to read, hard to abuse, and light
enough to operate while the hosting layer is still young.

## Reference Links

- Wiki.js feature overview: `https://js.wiki/`
- Wiki.js mail configuration: `https://beta.js.wiki/docs/system/mail`
- Wiki.js site management notes on shared/global users:
  `https://beta.js.wiki/docs/admin/sites`
