# 03 — ts-learn Revamp Plan

Prioritized, actionable plan. Three phases: **Quick Wins** (high impact, low effort) → **Structural** (navigation, glossary, learning loop) → **Polish** (a11y, motion, finale). Each item: **What · Why (principle) · Effort**. Effort = S (<1h) / M (a few hours) / L (a day+).

Overarching content rule baked into every item: **brief but very clear and engaging inline; link out to the glossary for depth.**

---

## Phase 1 — Quick Wins

1. **Global `:focus-visible` ring.** Add one consistent, high-contrast focus style for `.btn`, theme toggle, `<summary>`, sidebar/roadmap links, prev/next, search.
   - *Why:* Focus visibility, keyboard operability (a11y).
   - *Effort:* S — a few rules in `global.css`.

2. **Contrast audit + fixes for muted/small text.** Check `--fg-muted` small text, amber warnings, and pill text on tinted backgrounds against WCAG AA (4.5:1) in both themes; darken/lighten tokens as needed.
   - *Why:* Contrast (WCAG), color accessibility.
   - *Effort:* S–M.

3. **Bigger, button-like prev/next nav.** Convert `.navlink` into larger card/button targets with clear labels ("← Previous: Unions" / "Next: Narrowing →").
   - *Why:* Fitts's Law (most frequent action), mapping, peak-end.
   - *Effort:* S.

4. **Playground-hydrating placeholder.** Render a skeleton ("Loading interactive playground…") inside `.play-mount` before the client `$effect` hydrates it; reserve its height.
   - *Why:* Visibility of system status, avoid layout shift, Doherty.
   - *Effort:* S.

5. **Search zero/empty state.** When no query, show a helpful prompt + maybe popular terms; when no results, the existing message is fine but add a sample-query nudge.
   - *Why:* Empty-state-as-onboarding, visibility of status.
   - *Effort:* S.

6. **ARIA on stateful widgets.** `aria-pressed` on theme toggle buttons; `role="progressbar"` + `aria-valuenow/min/max` on the progress bar.
   - *Why:* Semantic a11y, recognition of state.
   - *Effort:* S.

7. **`prefers-reduced-motion` guard.** Wrap the progress-bar transition and any future popover/scroll motion.
   - *Why:* Reduced-motion accessibility.
   - *Effort:* S.

8. **Stronger lesson-completion beat.** On "Mark done," show a brief celebratory confirmation + "X / 12 done" + the big Next CTA right there.
   - *Why:* Peak-End Rule, Goal-Gradient, momentum.
   - *Effort:* S–M.

---

## Phase 2 — Structural

9. **Per-lesson Table of Contents (sticky).** Build a TOC from the lesson's `##` headings with anchor links; sticky on wide screens, collapsible on mobile.
   - *Why:* Recognition over recall, wayfinding, F-pattern scanning.
   - *Effort:* M — requires emitting heading ids in `render.ts` and a TOC component.

10. **Group lessons into named phases in the sidebar.** E.g. *Foundations (01–04)*, *The Type System (05–08)*, *Functions & Classes (09–10)*, *Advanced & JS Reality (11–12)*.
    - *Why:* Miller's Law, chunking, serial-position (refresh the middle).
    - *Effort:* M.

11. **Mobile sidebar as collapsible nav.** Replace the tall static stack <880px with a hamburger/drawer or a slim top bar that expands on demand.
    - *Why:* Responsive/mobile ergonomics, reduce scroll-to-content, Fitts.
    - *Effort:* M.

12. **Resume affordance everywhere.** Persist last-viewed lesson + scroll position; surface "Continue where you left off" on home and (optionally) sidebar.
    - *Why:* Zeigarnik, user control, recognition.
    - *Effort:* M — small extension to `progress.svelte.ts`.

13. **Course-completion finale.** A "course complete" state/page when 12/12 done — a real ending peak.
    - *Why:* Peak-End, Goal-Gradient.
    - *Effort:* M.

14. **THE GLOSSARY FEATURE** — see dedicated section below. Largest structural item.
    - *Effort:* L.

---

## Phase 3 — Polish

15. **Motion & microinteraction pass.** Subtle, reduced-motion-aware transitions on popovers, TOC active-section highlight, done-checkmarks.
    - *Why:* Aesthetic-Usability, microinteractions, feedback.
    - *Effort:* M.

16. **Error states for the in-browser engine.** Graceful "compiler failed to load — retry" in the lesson playground embeds (Playground already handles its own runtime error).
    - *Why:* Help users recover from errors, visibility of status.
    - *Effort:* S–M.

17. **Spaced-repetition nudges (optional).** Lightweight "review" prompts for completed lessons after time elapses.
    - *Why:* Spaced repetition, retrieval practice.
    - *Effort:* L.

18. **Print/share polish & consistent copy voice.** Align search placeholders, ensure brief-but-engaging microcopy throughout.
    - *Why:* Consistency & standards, aesthetic-usability.
    - *Effort:* S.

---

## The Glossary — pure UX spec

The glossary is a first-class surface: a set of **standalone pages**, each a deeper explanation (with examples where useful) of any advanced concept — **Python, TS, JS, or general dev/SWE**. It is the mechanism that lets lessons stay *brief but clear* while depth is one interaction away.

### Interaction model

- **Inline term signifier.** A glossary term in lesson prose gets a consistent, learnable signifier: a **dotted/dashed underline** in a subtle accent (not a normal link's solid underline), so users distinguish "definition available" from "navigates away."
  - *Principles:* Signifiers, Jakob/consistency (learn the cue once), information scent.
- **Hover → brief side-note.** Hovering (pointer devices) opens a small popover/side-note with a 1–2 sentence plain-language explanation — the *preview*, not the full page.
  - *Principles:* Progressive disclosure, recognition over recall, information scent (decide before clicking), figure/ground (elevated `--bg-elev` + subtle shadow).
- **Click → full glossary page.** Clicking the term navigates to `/glossary/[term]` — the deep explanation with examples, Python/JS anchoring, and cross-links to related entries and the lessons that use it.
  - *Principles:* Progressive disclosure (the depth tier), anchoring, wayfinding (backlinks to lessons).
- **Glossary index page** (`/glossary`) — searchable/alphabetized list, grouped by domain (TS · JS · Python · General SWE). Reachable from the sidebar **Tools** group alongside Playground/Search.
  - *Principles:* Wayfinding, chunking, consistency.

### Behavior details (the part people get wrong)

- **Open delay / close grace.** ~100–150ms open delay (avoid accidental flicker on pass-through), and a close *grace period* + tolerance so the user can move the pointer *into* the popover without it vanishing (the classic "diagonal" problem). Popover must be hoverable (to allow selecting text / clicking a link inside).
  - *Principles:* Feedback timing, forgiving interaction, Fitts (don't make the user race a closing target).
- **Positioning.** Prefer a side-note to the right margin on wide screens (uses the `760px` measure's whitespace); flip/clamp to stay in viewport; never cover the term itself. Arrow/connector ties it to the source term (mapping).
- **One at a time.** Only one side-note open at once; opening another closes the previous (reduces clutter, Hick's Law).
- **Dismissal.** Closes on: pointer leaves (after grace), `Esc`, scroll, route change, click-outside.

### Keyboard & a11y (non-negotiable)

- **Focusable trigger.** The term is a real `<button>`/`<a>` in tab order, not a bare `<span>` — so keyboard and screen-reader users reach it.
- **Keyboard preview.** Focusing the term (Tab) opens the side-note too (don't make hover the only path); `Esc` closes; `Enter`/click navigates to the full page.
- **ARIA.** Trigger gets `aria-describedby` pointing at the popover, or use a tooltip/`aria-expanded` disclosure pattern; the full-page link has a clear accessible name ("Open glossary: discriminated union").
- **Screen-reader fallback.** The brief explanation must be programmatically associated, so AT announces it; never rely on visual hover alone.
- **Focus management.** Popover doesn't steal focus on hover; if it contains interactive content, focus moves in on keyboard activation and returns to the trigger on close.
- *Principles:* Keyboard operability, hover-≠-access, semantic a11y, user control.

### Mobile / touch

- **No hover on touch.** First **tap** opens the side-note (preview); a clear **"Read full →"** affordance inside the popover navigates to the page. (Do *not* use the iOS "double-tap" hack.)
- **Bottom sheet on small screens.** Render the preview as a bottom sheet or inline expansion rather than a floating popover near the thumb-occluded term.
- **Large tap target.** Term hit area ≥44px effective; "Read full" button comfortably tappable (Fitts).
- *Principles:* Mobile ergonomics, responsive design, forgiving interaction.

### Authoring model (so content stays brief)

- Add a markdown syntax (mirroring existing `:::compare`/`:::quiz`/`:::play` extensions in `render.ts`), e.g. `[[discriminated union]]` or `{gloss:discriminated-union}`, resolved at build time to the styled trigger + preview text pulled from the glossary entry's frontmatter.
- Glossary entries are markdown files (consistent with `src/lib/content/*.md`): frontmatter `term`, `short` (the hover preview), `domain` (ts|js|py|swe), body = deep explanation. Single source of truth feeds both hover text and full page.
- *Principles:* Consistency, single-source-of-truth (no drift between preview and page), DRY.

### Anti-patterns to avoid

- **Hover-only with no keyboard/touch path** — inaccessible; the #1 tooltip failure.
- **Instant-disappear popover** — no close grace = users can't reach links/text inside.
- **Tooltip that covers the term or the next line** — breaks reading flow and mapping.
- **Dumping the full deep explanation into the hover** — defeats progressive disclosure; keep hover to 1–2 sentences, depth on the page.
- **Inconsistent signifier** — if glossary terms look like normal links, users can't predict behavior (violates Jakob/consistency, information scent).
- **Title-attribute tooltips** — uncontrollable timing/styling, no touch, poor a11y. Use a real popover.
- **Auto-opening on scroll/load or motion-heavy reveals** — distracting; ignores reduced-motion.
- **Trapping focus or stealing focus on hover** — violates user control.

### Suggested build order (within Phase 2 item 14)

1. Glossary entry markdown schema + index page (`/glossary`) — static, no popover yet.
2. Full term pages (`/glossary/[slug]`) with lesson backlinks.
3. Markdown extension for inline term triggers (build-time, like the existing extensions).
4. Accessible popover component: keyboard + hover, open/close timing, one-at-a-time.
5. Touch/bottom-sheet variant + reduced-motion + final a11y audit.
