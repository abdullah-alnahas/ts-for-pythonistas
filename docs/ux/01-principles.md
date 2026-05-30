# 01 — UI/UX Principles, Laws & Heuristics

A comprehensive reference of proven, well-established UI/UX bodies of knowledge. Each entry is one bullet with a tight explanation. Files 02 and 03 apply these to ts-learn.

---

## Nielsen's 10 Usability Heuristics

- **Visibility of system status** — The system should always keep users informed about what's going on, through timely feedback (spinners, "saved ✓", progress bars).
- **Match between system & real world** — Speak the user's language and concepts, not internal jargon; follow real-world conventions and natural ordering.
- **User control & freedom** — Provide clearly marked exits, undo, and redo; never trap the user in a state with no escape.
- **Consistency & standards** — Same word/action means the same thing everywhere; follow platform and industry conventions (Jakob's Law).
- **Error prevention** — Eliminate error-prone conditions or confirm before committing; better than good error messages.
- **Recognition rather than recall** — Make objects, actions, and options visible; don't force the user to remember information across screens.
- **Flexibility & efficiency of use** — Accelerators (keyboard shortcuts, defaults) serve experts without burdening novices.
- **Aesthetic & minimalist design** — Every extra unit of information competes with the relevant units and diminishes their relative visibility.
- **Help users recognize, diagnose & recover from errors** — Errors in plain language, precise about the problem, constructive about the fix.
- **Help & documentation** — Ideally none is needed; when needed, make it searchable, task-focused, concise.

## Cognitive / Psychological Laws

- **Hick's Law** — Decision time grows with the number and complexity of choices. Reduce/group options to speed decisions.
- **Miller's Law (7±2)** — Working memory holds ~5–9 chunks. Chunk content; don't overload a single view.
- **Fitts's Law** — Time to hit a target depends on its size and distance. Make important/frequent targets large and close; exploit screen edges.
- **Jakob's Law** — Users spend most time on *other* sites and expect yours to work the same way. Lean on established patterns.
- **Tesler's Law (Conservation of Complexity)** — Every system has irreducible complexity; decide whether the system or the user absorbs it. Push it onto the system.
- **Doherty Threshold** — Productivity soars when system response is <400ms. Keep interactions snappy; mask unavoidable latency.
- **Aesthetic-Usability Effect** — Users perceive attractive designs as more usable and forgive minor issues. Visual polish has real usability value.
- **Peak-End Rule** — People judge an experience by its most intense moment and its end, not the average. Engineer strong peaks (a-ha moments) and endings (lesson completion).
- **Von Restorff / Isolation Effect** — When multiple similar items are present, the one that differs is most remembered. Make the key item (primary CTA, key insight) visually distinct.
- **Serial Position Effect** — Items at the start (primacy) and end (recency) of a list are best remembered; the middle sags. Put critical items first/last.
- **Zeigarnik Effect** — People remember incomplete tasks better than completed ones; visible progress and "unfinished" cues pull users back.
- **Goal-Gradient Effect** — Motivation increases as people near a goal. Show proximity to completion to accelerate finishing.
- **Cognitive Load Theory** — Total mental effort = intrinsic (task) + extraneous (interface) + germane (learning). Cut extraneous load so capacity goes to learning.
- **Postel's / Robustness for input** — Be liberal in what you accept from the user (forgiving search, tolerant forms), strict in what you produce.

## Gestalt Principles (perceptual grouping)

- **Proximity** — Elements close together are perceived as a group. Spacing communicates relationship.
- **Similarity** — Elements sharing visual traits (color, shape, size) are seen as related.
- **Common Region** — Elements inside a shared boundary (card, box) are grouped, even if far apart.
- **Closure** — The mind completes incomplete shapes; lets you imply structure without drawing every line.
- **Continuity** — The eye follows the smoothest path; aligned elements read as connected sequences.
- **Figure/Ground** — The mind separates foreground from background; use it for layering (modals, popovers).
- **Common Fate** — Elements moving together are perceived as related (animation grouping).
- **Symmetry & Order (Prägnanz)** — People perceive the simplest, most ordered interpretation available.

## Information Architecture & Reading

- **Visual hierarchy** — Size, weight, color, and position guide the eye to what matters first. Establish a clear 1-2-3 reading order.
- **F-pattern** — For text-heavy pages, eyes scan in an F shape (two horizontal sweeps + a vertical). Front-load key terms at line/paragraph starts.
- **Z-pattern** — For sparse/landing layouts, eyes trace a Z (top-left → top-right → diagonal → bottom). Place logo, CTA, and action along it.
- **Chunking** — Break content and interfaces into digestible, labeled groups to fit working memory.
- **Progressive disclosure** — Show only what's needed now; reveal advanced detail on demand (accordions, "show more", links to depth).
- **Information scent** — Labels and links should clearly signal what's behind them so users predict where to click.
- **Wayfinding** — Persistent navigation, breadcrumbs, and "you are here" cues so users always know location and how to move.

## Interaction & Affordance

- **Affordances** — A control's form suggests how it's used (a button looks pressable, a slider draggable).
- **Signifiers** — Explicit cues (labels, icons, underlines, cursor change) that advertise an affordance's existence and how to act.
- **Feedback** — Every action gets a visible/audible/haptic response, ideally <100ms perceived.
- **Mapping** — Controls spatially/logically correspond to their effects (left arrow = previous).
- **Constraints** — Limit possible actions to prevent errors (disable invalid buttons, grey out unavailable options).
- **Microinteractions** — Small, purposeful animations/states (hover, toggle, success check) that give feedback and delight without distraction.
- **Direct manipulation** — Let users act on objects directly (drag, edit-in-place) rather than through abstract dialogs.
- **Forgiving formats / undo** — Prefer reversible actions and tolerant inputs over confirmation walls.

## Visual Design Fundamentals

- **Whitespace / negative space** — Breathing room reduces cognitive load, creates grouping, and signals quality. Macro (layout) and micro (line/letter) spacing both matter.
- **Typography & readability** — Comfortable measure (~45–75 chars/line), line-height ~1.4–1.7, clear type scale, limited font count, generous size for body text.
- **Type hierarchy** — Distinct, consistent sizes/weights for H1/H2/H3/body/caption establish scannable structure.
- **Color & meaning** — Use color purposefully and consistently (semantic: success/warn/error); never rely on color alone to convey meaning.
- **Contrast (WCAG)** — Body text ≥4.5:1, large text ≥3:1 against background (AA); AAA is 7:1. Ensures legibility for low-vision and bright-screen users.
- **Alignment & grid** — A consistent grid and alignment create order and implied structure (continuity).
- **Consistency of spacing scale** — Use a fixed spacing/sizing scale (e.g. 4/8px) so rhythm is uniform.
- **Responsive / fluid design** — Layouts adapt across viewport sizes; content reflows, touch targets stay ≥44px, no horizontal scroll on mobile.
- **Mobile-first & touch ergonomics** — Design for the smallest screen and thumb reach first, then enhance upward.

## Accessibility (a11y) Basics

- **Semantic HTML** — Use real elements (`button`, `nav`, `a`, headings in order) so assistive tech understands structure.
- **Keyboard operability** — Everything reachable and operable by keyboard alone; logical tab order; no traps.
- **Focus visibility** — Clear, high-contrast focus ring on every interactive element.
- **ARIA when needed** — Roles/labels/states for custom widgets (tooltips, toggles), but prefer native semantics first.
- **Alt text & labels** — Meaningful text alternatives for non-text content; form fields labeled.
- **Color independence** — Convey state with icon/text + color, never color alone (color-blind safe).
- **Reduced motion** — Honor `prefers-reduced-motion`; avoid motion that triggers vestibular issues.
- **Hover ≠ access** — Never hide essential info or actions behind hover only; provide keyboard/focus and touch equivalents.
- **Readable contrast in both themes** — Light and dark themes both meet contrast minimums.

## Feedback, State & Performance

- **Visibility of system status (states)** — Design explicit empty, loading, partial, error, and success states — not just the happy path.
- **Skeleton / loading states** — Show placeholder structure during loads to reduce perceived wait and prevent layout shift.
- **Optimistic UI** — Reflect the likely result immediately, reconcile in background, to feel instant.
- **Perceived performance** — Managing *felt* speed (instant feedback, progress, skeletons) matters as much as raw speed.
- **Avoid layout shift (CLS)** — Reserve space for async content so the page doesn't jump.
- **Empty states as onboarding** — Use empty/zero states to teach, guide, and prompt the first action.

## Learning-Specific UX (for an educational app)

- **Scaffolding** — Support the learner with structure (examples, hints, guided steps), then fade it as competence grows.
- **Worked examples → faded practice** — Show fully worked solutions, then progressively remove parts for the learner to fill in.
- **Active recall & retrieval practice** — Quizzes/exercises that force recall strengthen memory far more than re-reading.
- **Spaced repetition** — Revisiting material over time beats massing it; surface review prompts.
- **Immediate feedback** — Correct/incorrect feedback right after an attempt accelerates learning.
- **Anchoring to prior knowledge** — New concepts learned faster when mapped to what the learner already knows (here: Python).
- **Desirable difficulty** — A little effort/struggle (try-before-reveal) improves retention vs. frictionless reading.
- **Concrete before abstract** — Lead with a concrete example, then generalize to the rule.
- **Chunked progress & momentum** — Small completable units with visible progress sustain motivation (ties to Goal-Gradient, Zeigarnik).
