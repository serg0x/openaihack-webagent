<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Website Operator

Project guidance for working in this repo. These rules favor clarity, small diffs, and verifiable progress over speculative implementation.

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly when requirements or existing code are ambiguous.
- If more than one interpretation is plausible, present the relevant options instead of silently picking one.
- If a simpler approach exists, say so before implementing.
- Ask for clarification only when the ambiguity materially changes the design, risk, or user-visible behavior.

## 2. Simplicity First

Ship the minimum code that solves the task. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No extra configurability, fallback layers, or dependencies unless they clearly improve this specific app.
- If a solution feels bloated, simplify it before finalizing.

## 3. Surgical Changes

Touch only what you must. Clean up only what your change affects.

- Do not refactor unrelated areas while touching nearby code.
- Match the surrounding style and patterns unless the task explicitly calls for a broader cleanup.
- Preserve existing comments and structure unless they are directly wrong or affected by the task.
- Remove imports, variables, and helpers made unused by your own change, but do not delete unrelated dead code unless asked.

## 4. Goal-Driven Execution

Define success criteria and verify them.

- For non-trivial tasks, start with a short plan and include how each step will be checked.
- For bug fixes, reproduce the issue first when practical, then verify the fix.
- For feature work, define the user-visible outcome and the concrete checks that prove it works.
- Finish by running the smallest relevant verification commands and report what passed or what could not be run.

Suggested format for substantial tasks:

1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]

## Project-Specific Guidelines

- For visually strong landing pages, app surfaces, marketing pages, demos, and UI-heavy frontend work, use the local skill at `skills/frontend-skill/SKILL.md` and follow its visual thesis, content plan, interaction thesis, hierarchy, imagery, and motion rules.
- For frontend design tasks, start with low or medium reasoning and only turn reasoning up when the design or interaction problem is genuinely complex.
- Define frontend constraints early: usually one H1, no more than six sections, two typefaces max, one accent color, and one primary CTA above the fold.
- Establish design tokens early for frontend work. Prefer explicit roles such as `background`, `surface`, `primary text`, `muted text`, and `accent`, plus typography roles like `display`, `headline`, `body`, and `caption`.
- Ground frontend work in real product context and real copy whenever available; avoid placeholder messaging, generic SaaS language, and made-up proof.
- If visual references exist, use them as guardrails. Prefer uploaded or repo-local images and mood boards over arbitrary external web imagery.
- When using fixed, sticky, floating, or layered UI, explicitly check that key text, buttons, and forms do not overlap or become obscured across desktop and mobile sizes.
- Read the relevant Next.js 16 docs in `node_modules/next/dist/docs/` before using unfamiliar App Router behavior.
- Prefer `npm run lint` and `npm run build` as the default verification steps for app-wide changes.
- For substantial frontend changes, also verify the rendered UI in-browser across at least desktop and mobile dimensions when the available tools make that practical.
- Keep the live demo reliable: preserve the fixture fallback when changing the analysis flow.
- Keep OpenAI calls on the server; never expose secrets to the client.
- Treat `.env*` as secret except `.env.example`; never commit real keys.
- Keep the preview route safe: sanitize proxied HTML and avoid enabling active third-party scripts.
