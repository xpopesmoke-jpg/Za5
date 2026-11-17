# Za5: Home Chores

Za5 ("Za Five" in English, "Za Pet" in Croatian) is a household app for chores, routines and home supplies, built on the household's own floor plan. The name is the Croatian "za 5 minuta", the "in 5 minutes" people say about a chore they never get to. The app is built to be sold, so it has to be simple to use and polished.

Product language lives in `CONTEXT.md`; decisions that are hard to reverse live in `docs/adr/`. Read both before working on a feature.

## Agent skills

### Issue tracker

Tickets live in GitHub Issues on `xpopesmoke-jpg/za5`, accessed through the REST API (`gh api`), because GraphQL is blocked in cloud sessions. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root and decisions in `docs/adr/`. See `docs/agents/domain.md`.
