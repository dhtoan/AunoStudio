---
name: ux-consistency
description: OpenPost acceptance bar for frontend UI and copy changes. Load when changing frontend UI (components, pages, design tokens) or user-facing copy; run again as the final check before finishing.
---

# UX and visual consistency

UX and visual consistency is OpenPost's highest product priority. Apply these criteria to any frontend, UI, component, design-token, or user-facing copy change. `DESIGN.md` and `PRODUCT.md` describe the system itself; this skill is the acceptance bar.

## Direct over blocking

- Prefer direct, seamless flows over blocking modals and confirmation dialogs.
- Accept pastes and uploads immediately wherever they can land, with an undo path instead of a preflight dialog.
- Give substantial or recurring flows a dedicated page. Reserve dialogs for short, consequential, or destructive steps.
- When a blocking confirmation is unavoidable, make the consequence, the exact action, and the undo path explicit.

## Verify visually

- Exercise the change in the browser and capture before/after screenshots.
- Check desktop and phone widths (including 390 px and 320 px), controls, overflow, and the settled state after interaction.
- Confirm light and dark themes, keyboard access, visible focus, readable contrast, reduced motion, and 44px coarse-pointer touch targets.
- Watch for console errors during the flow.

## Consistency

- Reuse shared primitives (page chrome, form controls, loading/empty/notice/toast/error/destructive states) before creating route-specific chrome.
- Match spacing, layout, and typography to surrounding routes; use the design tokens in `DESIGN.md` rather than ad-hoc values.
- Prove hierarchy with tone, border, and spacing; follow `DESIGN.md`'s Do's and Don'ts for shadows, cards, and shared chrome.

## Copy

- Avoid stock metaphors, similes, idioms, and other figures of speech. Prefer short, familiar words when they keep the exact meaning. Cut every word or section that adds no meaning.
- Prefer active voice when it makes the actor and action clearer. Replace jargon and needless academic terms with everyday English.
- Apply these rules in context, not as blind replacements. Break them when accuracy, natural phrasing, tone, legal meaning, accessibility, or readability requires it.
- Keep code, commands, API fields, proper nouns, citations, quotes, legal wording, and exact technical terms intact.
- Finish every copy change with a line-by-line prose review for meaning, facts, voice, consistency, and useful detail.

## Done

A UI or copy change is done when it renders correctly in both themes at desktop and phone widths, uses shared primitives, and you can attach before/after screenshots showing the settled state.
