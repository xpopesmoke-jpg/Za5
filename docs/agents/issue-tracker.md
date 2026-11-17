# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on `xpopesmoke-jpg/za5`.

**Use the REST API through `gh api`, not `gh issue …`.** Claude Code cloud sessions block GitHub's GraphQL API, and the `gh issue` / `gh pr` subcommands depend on it, so they fail with HTTP 403. Every operation below goes through `gh api repos/xpopesmoke-jpg/za5/...`, which works in both cloud sessions and a local terminal.

## Conventions

- **Create an issue**:
  `gh api repos/xpopesmoke-jpg/za5/issues -f title="..." -f body="$(cat <<'EOF' ... EOF)" -f "labels[]=ready-for-agent"`
- **Read an issue**: `gh api repos/xpopesmoke-jpg/za5/issues/<n> --jq '{number,title,body,state,labels:[.labels[].name]}'`, and comments with `gh api repos/xpopesmoke-jpg/za5/issues/<n>/comments --jq '[.[].body]'`
- **List issues**: `gh api "repos/xpopesmoke-jpg/za5/issues?state=open&per_page=100" --jq '[.[] | select(.pull_request == null) | {number,title,labels:[.labels[].name]}]'`, adding `&labels=<label>` to filter. The endpoint also returns pull requests, hence the `select`.
- **Comment on an issue**: `gh api repos/xpopesmoke-jpg/za5/issues/<n>/comments -f body="..."`
- **Add labels**: `gh api repos/xpopesmoke-jpg/za5/issues/<n>/labels -f "labels[]=<label>"`
- **Remove a label**: `gh api --method DELETE repos/xpopesmoke-jpg/za5/issues/<n>/labels/<label>`
- **Close**: comment first, then `gh api --method PATCH repos/xpopesmoke-jpg/za5/issues/<n> -f state=closed`

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the REST equivalents:

- **Read a PR**: `gh api repos/xpopesmoke-jpg/za5/pulls/<n>`, the diff with `gh api repos/xpopesmoke-jpg/za5/pulls/<n> -H "Accept: application/vnd.github.diff"`, comments via the issues comments endpoint.
- **List external PRs for triage**: `gh api "repos/xpopesmoke-jpg/za5/pulls?state=open"`, then keep only `author_association` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` or `NONE`.
- **Comment / label / close**: the issues endpoints above work for PRs too (same number space); close with `gh api --method PATCH repos/xpopesmoke-jpg/za5/pulls/<n> -f state=closed`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: an issue object with a `pull_request` key is a PR.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the issue and its comments with the two "Read an issue" calls above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue: `gh api --method POST repos/xpopesmoke-jpg/za5/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`. Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's native issue dependencies. Add an edge with `gh api --method POST repos/xpopesmoke-jpg/za5/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric database id (`gh api repos/xpopesmoke-jpg/za5/issues/<n> --jq .id`, not the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `gh api repos/xpopesmoke-jpg/za5/issues/<n>/assignees -f "assignees[]=<login>"`, the session's first write.
- **Resolve**: comment the answer, close the issue, then append a context pointer (gist + link) to the map's Decisions-so-far.
