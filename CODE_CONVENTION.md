# Code Convention

Use this document as the default coding rule for this project.

## Core Principle

- Keep code small, clear, and easy to change.
- Prefer explicit structure over clever shortcuts.
- Write code that explains intent without needing extra explanation.

## Commit Rule

- Keep each commit as small as possible.
- One commit should contain one clear purpose.
- Do not mix unrelated refactoring with feature work.
- If a change is hard to explain in one sentence, the commit is probably too large.
- When a commit directly changes frontend features or components, validate it with the React Testing Library suite by running `npm test` in `frontend` before commit.
- If that test run fails, fix or refactor the code before committing.

## React Rule

### Hooks

- Do not use `useEffect` unless it is truly needed for syncing with an external system or async lifecycle work.
- In UI components and route pages, avoid direct `useEffect` usage whenever possible by moving that logic into dedicated custom hooks in separate files.
- Do not use `useMemo` unless there is a clear calculation or reference-stability reason.
- Do not use `useCallback` unless it solves a real render or dependency problem.
- Do not add hooks preemptively.
- Prefer plain variables and direct function definitions first.

### Immutability

- Preserve immutability in React state, props, and derived data.
- Do not mutate arrays, objects, maps, sets, or nested structures in place when they influence rendering.
- Prefer non-mutating updates such as spreads, `map`, `filter`, and object reconstruction.

### Variables

- Prefer `const` by default.
- Do not use `var`.
- Do not use `let` unless reassignment is truly unavoidable and the reason is clear from the code.

### Components

- Keep components focused on one responsibility.
- Split components when structure or behavior becomes hard to scan.
- Separate a file or component when it becomes too long to understand comfortably in one pass.
- Do not place too much business logic directly inside JSX.
- Move reusable logic into helpers, feature modules, or dedicated functions.

### State

- Keep state minimal.
- Do not store values that can be derived from existing state or props.
- Prefer local state before introducing shared or lifted state.

## Naming Rule

- Use names that describe intent, not implementation detail.
- `const` names should clearly explain what the value means.
- Avoid vague names such as `data`, `item`, `value`, `temp`, `handleThing`.
- Prefer names like `selectedRepository`, `publishedPostCount`, `draftPreviewTitle`.

## Constant Rule

- Do not leave magic numbers in the code without meaning.
- Extract repeated values into named constants.
- Constantize configuration, labels, limits, sizes, and status values when reused.
- Constant names should explain why the value exists.

Example:

```ts
const MAX_SELECTED_COMMITS = 3;
const DEFAULT_BRANCH_NAME = "main";
const PREVIEW_CARD_MIN_HEIGHT = 240;
```

## Duplication Rule

- Do not repeat the same logic in multiple places.
- If a pattern appears more than once, consider extracting it.
- Reuse shared helpers and constants where it improves clarity.
- Do not over-abstract too early. Extract only when the shared meaning is clear.

## Function Rule

- Keep functions small and single-purpose.
- Prefer early returns over deep nesting.
- Break complex logic into well-named helper functions.
- Function names should describe outcome or intent.

## File Structure Rule

- Route-level files belong in `src/app`.
- Domain logic belongs in `src/features/<domain>`.
- Separate `api`, `types`, `queries`, `mutations`, and `components` by responsibility.
- Shared utilities should live in a clear shared location and not be copied between features.
- Hook filenames must use camelCase.

## Styling Rule

- Prefer meaningful design tokens and named values over scattered raw values.
- Reuse spacing, color, and layout patterns when possible.
- Do not introduce visual values that have no clear reason.

## Readability Rule

- Optimize for fast reading.
- Avoid overly compact code.
- Keep conditionals and branches easy to follow.
- If one file grows too much, split it by responsibility instead of keeping everything in one place.
- Add comments only when intent is not obvious from code.

## Practical Rule

- Build the minimum working version first.
- Make behavior correct before making it clever.
- Refactor only when the code becomes meaningfully harder to understand or extend.

## Summary

Before finishing a change, check this:

- Is this commit minimal and focused?
- Did I avoid unnecessary `useEffect`, `useMemo`, and `useCallback`?
- Did I remove magic numbers or make them meaningful constants?
- Did I avoid repeated logic?
- Are names clear enough without extra explanation?
- Does the file still match the intended project structure?
