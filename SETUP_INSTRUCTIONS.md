# How to wire these files up

Copy this whole folder structure into the root of your `samai-sdk` repo
(the `.github/` folder and the three top-level `.md` files), then do the
following. None of this works until you complete these steps.

## 1. CI (`.github/workflows/ci.yml`)

Nothing to configure — it'll start running automatically on your next push
or PR, as long as `npm run typecheck`, `npm run build`, and `npm test`
already work locally (they should, per your README's scripts section).

Once it's green, add the badge to the top of your README, right next to the
npm/license badges:

```md
[![CI](https://github.com/Sameer9823/samai-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Sameer9823/samai-sdk/actions/workflows/ci.yml)
```

## 2. Publish with provenance (`.github/workflows/publish.yml`)

This replaces manual `npm publish` from your laptop. Steps:

1. **Generate an npm automation token**: npmjs.com → your profile → Access
   Tokens → Generate New Token → type "Automation" (this type works with
   2FA-enabled accounts and CI).
2. **Add it as a repo secret**: GitHub repo → Settings → Secrets and
   variables → Actions → New repository secret → name it `NPM_TOKEN`.
3. From now on, to publish a new version:
   - Bump `version` in `package.json` (e.g. `0.3.1` → `0.3.2`)
   - Commit and push
   - Create a GitHub Release with tag `v0.3.2` (must match package.json
     exactly, including the `v` prefix) → the workflow publishes
     automatically once you click "Publish release"
4. Once it succeeds, npm will show a "Provenance" tab on your package page
   with a verified link back to the exact commit and workflow run that
   built it — this is one of the strongest anti-supply-chain-attack signals
   you can offer.

## 3. Security policy

Edit `SECURITY.md` and replace `[security contact email]` with a real,
monitored address (or delete that line if you're only using GitHub Security
Advisories). GitHub will automatically surface this on the repo's Security
tab once it's in the default branch.

## 4. Code of Conduct

Edit `CODE_OF_CONDUCT.md` and replace the placeholder contact email. GitHub
auto-links this from the "Community" health check on your repo.

## 5. Issue & PR templates

These activate automatically once merged — anyone opening a new issue will
be prompted to choose "Bug report" or "Feature request," and every new PR
will show the checklist.

## 6. Changelog

`CHANGELOG.md` has a starter `[Unreleased]` section and one real entry for
0.3.1 based on your README. Go back through your git tags/npm version
history and backfill 0.1.0–0.3.0 with what actually shipped in each — this
is tedious once but very valuable for anyone deciding whether to upgrade.
From here on, add entries under `[Unreleased]` as you merge PRs, then move
them under a version heading when you cut a release.

## After this: the "Community Profile" checklist

GitHub has a built-in checklist for exactly this kind of thing. Once you've
merged all of the above, check:

`https://github.com/Sameer9823/samai-sdk/community`

It will show a checkmark for README, Code of Conduct, Contributing guide
(consider adding a short `CONTRIBUTING.md` next), License, Security policy,
and Issue/PR templates — a 100% score here is a small but real trust signal
for anyone evaluating the repo.
