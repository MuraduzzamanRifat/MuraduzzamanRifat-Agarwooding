# Security Notes

## Threat model

This site is a static GitHub Pages deployment with a browser-only admin
panel that authenticates against the GitHub API using a Personal Access
Token (PAT). The PAT belongs to a single trusted editor.

## Mitigations enforced in code

- **Image upload allowlist** — only JPEG / PNG / WebP / GIF accepted.
  SVG and other formats are rejected. Magic-byte check rejects files
  whose header doesn't match the claimed MIME type.
- **HTML sanitization** — CMS-supplied HTML rendered via `innerHTML`
  passes through `sanitizeCmsHtml()` which strips all tags except a
  small allowlist (`em`, `strong`, `i`, `b`, `br`, `span`) and removes
  every attribute.
- **Content Security Policy** — admin panel sets a strict CSP with
  `frame-ancestors 'none'` (blocks clickjacking) and `connect-src` only
  to `api.github.com`.
- **Token storage** — PAT stored in `sessionStorage` only (cleared
  when the tab closes). Legacy `localStorage` tokens are migrated and
  removed automatically on next admin load.
- **Token re-validation** — every save re-checks the token against
  `GET /user` before attempting the write. Revoked tokens force a
  clean logout instead of a confusing 401.
- **Filename sanitization** — uploaded images are renamed
  `images/uploads/<timestamp>-<sanitized>` with a strict alphanumeric
  filter. Length capped at 80 chars.
- **GitHub Actions pinned to SHAs** — defends against compromised tag
  refs in third-party actions.
- **Build pipeline schema validation** — `scripts/build.js` rejects any
  `content/site.json` with missing required keys, wrong types, or
  payloads that look like script injection (`<script>`, `javascript:`,
  `on*=`).

## Mitigations YOU must enable in GitHub (not code-enforceable)

These are settings on the repo that only you (the owner) can configure.
Without them, a leaked PAT could escalate to remote code execution via
the workflows directory.

### 1. Use a fine-grained PAT
- https://github.com/settings/personal-access-tokens/new
- "Only select repositories" → MuraduzzamanRifat-Agarwooding
- Permissions → Repository → **Contents: Read and write**
- Set an expiration date (≤ 90 days)
- **Avoid classic PATs** — they have full account access by default.

### 2. Enable branch protection on `main`
Settings → Branches → Add branch ruleset for `main`:
- ✅ Require a pull request before merging
- ✅ Require approval (1 approver)
- ✅ Require status checks: build (the JSON validation will run)
- ✅ Restrict who can dismiss pull request reviews
- ✅ Lock force pushes

This means even if a PAT leaks, the attacker can't push directly to
`main`. They'd have to open a PR (visible in your dashboard) and wait
for approval.

**Important:** Branch protection will break the current direct-save
flow from the admin panel. To keep it working, configure the admin to
push to a `cms-edits` branch and merge via PR. Or accept the
single-editor risk and skip this.

### 3. Restrict GitHub Actions permissions
Settings → Actions → General → "Workflow permissions":
- ✅ Read repository contents and packages permissions (default)
- ❌ Do NOT enable "Read and write permissions" globally
- ❌ Disable "Allow GitHub Actions to create and approve pull requests"

The build workflow already declares the minimum permissions it needs
(`contents: write`, `pages: write`, `id-token: write`).

### 4. Enable 2FA on your GitHub account
https://github.com/settings/security
- Required when handling production deploys.
- Use a hardware key (YubiKey) if possible. SMS 2FA is the weakest
  option.

### 5. Set PAT expiration alerts
GitHub emails you when a token is about to expire. Don't ignore them.
Rotate the PAT every 90 days.

### 6. Watch for unauthorized commits
Settings → Notifications → email yourself on every push.
Or set up `git log --since='1 day ago'` as a daily cron via the
`/schedule` skill.

## What's still residual risk

| Risk | Severity | Why we accept it |
|---|---|---|
| Editor's machine compromised | Critical | Out of scope for this CMS; user must protect their own device |
| GitHub itself breached | Critical | Out of scope; would affect every GH user |
| Admin URL discovery | Low | URL is not secret — security relies on PAT, not URL obscurity |
| Polyglot images (image with embedded JS) | Low | Magic-byte check + Content-Type lock down most paths |
| Token visible in network tab | Low | Inherent to client-side API calls; mitigated by sessionStorage |

## Reporting a vulnerability

Email: marketing@try-n.com  
Subject: `[SECURITY]` followed by a brief description.
