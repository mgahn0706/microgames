<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Commit Message Rule

Allowed commit types:

- `feat`
- `fix`
- `chore`
- `docs`

Every commit message must include:

- The feature list number in the title
- A `Confirmed:` line in the body
- An `Unclear at first:` line in the body

Use the following commit title format:

```text
feat: #3 뉴스 카드 컴포넌트
```

Write the commit body in English using this format:

```text
Confirmed: Checked the component layout and decided to further split components because the structure was complex.
Unclear at first: Confirmed why `useCallback` was used.
```

Guidelines:

- Include the feature list number as `#<number>` in every commit title.
- Start confirmed items with `Confirmed:`.
- Start things that were unclear at first but later understood with `Unclear at first:`.
- Keep each line short, direct, and written in natural English.

Workflow rule for Codex:

- Follow `docs/WORKFLOW.md` for branch and PR handling.
- Do not create branches automatically.
- Create a new `feat/<number>-<short-topic>` branch only when the user explicitly asks Codex to create a branch.
- When the user explicitly asks for a branch, always create it from `main`, never from another feature branch.
- For every Codex task, summarize the changes before any commit.
- When working on a task branch, push the branch and open or update a GitHub PR after each commit.
- If the user asks to commit, run the repo-local `pre-commit-review` skill before committing.
- Share the pre-commit review report before committing.
- If the review passes and the user already asked to commit, commit automatically without asking again.
- If the review does not pass, report the issues and do not commit until they are resolved.
- If the user has not asked to commit yet, only summarize the changes and wait.
- If the current change is cohesive and clearly commit-ready, Codex may commit it without waiting for a separate commit request.
- In frontend UI components and route pages, move `useEffect`-driven loading or sync logic into custom hooks in separate files whenever possible.
- For any commit that directly changes frontend features or components, run the React Testing Library suite with `npm test` in `frontend` before commit. If the tests fail, refactor or fix the code before committing.
- Prefer `const` by default. Do not use `var`, and do not use `let` unless mutation is truly unavoidable.
- In React code, preserve immutability of state, props, and derived data. Do not mutate arrays, objects, or nested structures in place.
- Hook filenames must use camelCase. Do not add new hook files with kebab-case or snake_case names.
- Use `git add -A` before commit so the full tracked and untracked change set is staged in one step.
- Determine the next feature list number incrementally from previous commit logs when possible, instead of asking the user each time.
