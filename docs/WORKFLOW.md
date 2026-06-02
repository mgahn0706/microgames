# Codex Branch and PR Workflow

Use this workflow for every planned Codex task.

## Branch Rule

- Start from a clean working tree on `main`.
- For every accepted plan, create a new branch before changing files.
- Use this branch name format:

```text
feat/<feature-number>-<short-topic>
```

Example:

```text
feat/3-plan-pr-workflow
```

- Determine `<feature-number>` from the next feature list number in recent commit history.
- Keep `<short-topic>` lowercase, short, and hyphen-separated.
- If a `feat/...` branch cannot be created because of a Git ref conflict, stop and report the blocker instead of using another prefix.

## Commit Rule

- Keep each commit focused on one coherent change.
- Before every commit, summarize the changes.
- Run the required checks for the files changed.
- Run the repo-local `pre-commit-review` skill before committing when available.
- If the skill is not available, perform a manual review and state that the skill was missing.
- Use `git add -A` before committing.
- Follow the repository commit message rule in `AGENTS.md`.

## Pull Request Rule

- After each commit, push the feature branch.
- Open a GitHub pull request for the branch immediately after the first commit.
- If a PR already exists for the branch, update the existing PR instead of opening a duplicate.
- Use `main` as the PR base branch unless the user explicitly asks for another base.
- The PR title should match the commit title.
- The PR body should include:
  - Summary of the change
  - Validation commands and results
  - Notes about unavailable checks, if any

## Completion Rule

- A task is complete only after the commit is pushed and the PR URL is reported.
- If push or PR creation is blocked by authentication, permissions, or network failure, report the exact blocker and leave the branch ready for the user.
