# The Karpathy Method: A Course Creation Blueprint

*A prescriptive style guide and instructional-design playbook reverse-engineered from Andrej Karpathy's complete educational footprint — engineered for a creator building "TypeScript for Python Developers," and reusable for a future LLMs course.*

## TL;DR
- Karpathy's content works because of one repeatable move: **build the real thing from scratch, by hand, in live code, starting from an empty file** — then reveal that the toy you built IS the real system. (Of micrograd he tweeted, "These 94 lines of code are everything that is needed to train a neural network. Everything else is just efficiency.")
- The style is **peer-to-peer, "spelled-out," anti-magic**: long uncut sessions, mistakes and bugs debugged live, anthropomorphized systems, relentless analogies (an LLM is "a zip file of the internet"), and a single running example that grows in complexity across the entire course.
- To copy it for TypeScript-for-Python-devs: pick one running artifact, build the type system's mental model from scratch, exploit the audience's existing Python knowledge as the analogy scaffold, leave in the red squiggly errors and fix them on camera, and set "you must type it yourself" exercises.

## Key Findings

**1. The single most important principle is "build it from scratch before you use the abstraction."** Karpathy's entire pedagogy is organized around constructing the real system by hand before any library is allowed. In micrograd he writes backpropagation as ~100 lines of Python (an autograd engine plus a ~50-line neural-net library) before revealing it is functionally identical to PyTorch's autograd — the repo's unit tests literally "install PyTorch, which the tests use as a reference for verifying the correctness of the calculated gradients." In the makemore series he has students manually backpropagate through a 2-layer MLP "without using PyTorch autograd's loss.backward()" (the "Becoming a Backprop Ninja" video) before they're allowed to call `.backward()`. He builds a tokenizer by hand, then reproduces GPT-2 from an empty file. His blog post "Yes you should understand backprop" is the philosophical justification: abstractions like backprop are "leaky," and "if you insist on using the technology without understanding how it works you are likely to fail."

**2. He teaches with a single running example that compounds.** The Zero to Hero course is not eight disconnected topics — it is one continuous thread: scalar autograd (micrograd) → bigram counts → MLP → activations/BatchNorm → manual backprop → WaveNet → GPT. Each video "complexifies" the previous artifact. This is deliberate cognitive-load management: the student never re-loads context; they extend a familiar object.

**3. Motivation precedes mechanism, and intuition precedes math.** He opens by showing what the thing *does* and why it matters, then derives the formalism. In the micrograd lecture he first plays with a "completely meaningless" expression — "I'm just flexing about the kinds of operations that are supported by micrograd" — builds intuition for derivatives as how the output responds "if a and b get tweaked a tiny amount in a positive direction," and only then formalizes the chain rule.

**4. Errors are demystified, not hidden.** His videos are near-single-take, comprehensive builds where he encounters bugs and debugs them on camera. His most-quoted tweet (July 1, 2018), verbatim — "most common neural net mistakes: 1) you didn't try to overfit a single batch first. 2) you forgot to toggle train/eval mode for the net. 3) you forgot to .zero_grad() (in pytorch) before .backward(). 4) you passed softmaxed outputs to a loss that expects raw logits." — became the blog post "A Recipe for Training Neural Networks," whose core message is that "neural net training is a leaky abstraction" and "fails silently," so the cure is a slow, paranoid, hypothesis-driven process.

**5. The code itself is a teaching artifact.** Deliberate minimalism is a pedagogical choice: micrograd ~100 lines; nanochat ~8,300 lines of clean, dependency-minimal code (released Oct 13, 2025, tagline "The best ChatGPT that $100 can buy" — a full tokenizer → pretrain → SFT → eval → inference → web-UI pipeline that trains a GPT-2-capability model in ~4 hours on an 8×H100 node, which Karpathy notes is "basically entirely hand-written (with tab autocomplete)"); and llm.c, whose reference trainer is "~1,000 lines of clean code in one file train_gpt2.c" with "no need for 245MB of PyTorch or 107MB of cPython." The `build-nanogpt` repo preserves the full commit history "so you can step through all of the code changes in the video, step by step." Minimal code = minimal cognitive surface area.

**6. The tone is humble, peer-level, and "anti-hype."** He introduces himself simply ("hello, my name is Andre and I've been training deep neural networks for a bit more than a decade"), admits work is "unhinged," uses "we" framing ("we are going to start with a blank Jupyter notebook and by the end… we will define and train a neural net"), and is repeatedly described by learners as having "gentle, unhurried humility… no theatrics, no hype."

## Details

### Phase 1 — The Educational Footprint (what was reviewed)

- **Formal course — Stanford CS231n** (Convolutional Neural Networks for Visual Recognition): co-created and taught by Karpathy. Its hallmark is assignment design that *forces* understanding: students "implement the forward and the backward pass of each layer in raw numpy." The published course notes (cs231n.github.io) are unusually intuition-first (e.g., the backprop notes emphasize "gradients add up at forks," with circuit/gate analogies). In "Yes you should understand backprop" Karpathy says the assignments were "intentionally designed… to include explicit calculations" because "95% of backpropagation materials out there present it all wrong, filling pages with mechanical math."
- **Self-published — Neural Networks: Zero to Hero** (7+ videos; karpathy.ai/zero-to-hero.html + nn-zero-to-hero repo): micrograd → makemore (5 parts) → "Let's build GPT" → "Let's build the GPT Tokenizer." Prerequisites stated plainly: "solid programming (Python), intro-level math (e.g. derivative, gaussian)." Explicit rationale for using language models as the teaching vehicle: "most of what you learn will be immediately transferable."
- **General-audience talks:** "[1hr Talk] Intro to Large Language Models" (the "busy person's intro"), "Deep Dive into LLMs like ChatGPT," "How I use LLMs." These show his analogy engine at general-audience altitude: an LLM is "two files" (a parameters file + a run file); training is "a zip file of the internet" — using Llama-2-70B he walks through ~10TB of internet text processed by ~6,000 GPUs over ~12 days at ~$2M, compressed into a 140GB parameters file, noting "the compression ratio here is roughly like 100x, but this is not exactly a zip file because a zip file is lossless compression"; the LLM is "the kernel process of an emerging operating system"; and reasoning maps to Kahneman's "System 1 / System 2."
- **Written essays** (karpathy.github.io, Medium): "The Unreasonable Effectiveness of Recurrent Neural Networks" (2015) — the viral post that trained char-RNNs on Shakespeare, LaTeX, and Linux source to show emergent structure; "A Recipe for Training Neural Networks"; "Yes you should understand backprop"; "Software 2.0" (neural nets as a new programming paradigm — "the program is the weights"); "A Survival Guide to a PhD."
- **Code-as-teaching repos:** micrograd, makemore, minGPT, char-rnn, nanoGPT, nn-zero-to-hero, llm.c, nanochat. nanochat (Oct 2025) is the stated "capstone project of LLM101n" — a full ChatGPT-clone pipeline "in a single, dependency-minimal codebase."
- **Eureka Labs** (founded July 2024): the formal statement of his educational philosophy — "Teacher + AI symbiosis," modeled on the dream of learning physics "together with Feynman, who is there to guide you every step of the way." "Eureka… is the awesome feeling of understanding something, of feeling it click. The goal here is to spark those moments."

### Phase 2 — Stylistic & Linguistic Decomposition

**Tone & framing.** Authority is established by track record, then immediately softened to peer level. He admits uncertainty ("Residual connections and the Adam optimizer remain notable todos for later video"), self-deprecates about length ("New (2h13m 😅) lecture"; "New 4 hour (lol) video lecture"), and uses inclusive "we."

**Recurring vocabulary / catchphrases (document and reuse):**
- **"spelled-out" / "from scratch" / "in code"** — the signature triad, in nearly every title.
- **"under the hood"** — "what neural network training looks like under the hood."
- **"…is all you need" / "everything else is just efficiency"** — the reveal that the toy is the real thing: "micrograd is what you need to train your networks and everything else is just efficiency" ("These 94 lines of code are everything that is needed…").
- **Anthropomorphism** — networks "want" things, neurons are "dead," the network "struggles to fit your data," tensors get "tamed."
- **Anti-magic framing** — "Backprop + SGD does not magically make your network work"; the recurring enemy is the false belief that things work "magically."
- **Concrete physical analogies** — "zip file of the internet," gradients as "nudges," loss as something you can "feel."

**Difficulty pacing / narrative arc.** The canonical arc: (1) play with a toy / show the end result; (2) build the simplest possible version by hand (scalar, not tensor; counts, not gradient descent); (3) hit a wall that motivates the next abstraction; (4) introduce the abstraction as the *efficient* version of what they already built; (5) reveal equivalence to the production system. Example: micrograd is built at scalar granularity "mainly for pedagogical reasons, so that you do not have to deal with complicated tensors, but none of the fundamental math and intuition changes." makemore deliberately builds the bigram model two ways — by counting, then as a one-layer neural net — and shows they give the same results, bridging the familiar to the new.

**Presentation mechanics (concrete setup).**
- **Tools:** Jupyter notebooks built live, with movement "between jupyter notebooks and repository code" in an editor; Colab notebooks shipped as exercises; for GPT-2 he starts from an empty file and builds the repo, committing as he goes; GitHub Copilot autocomplete is visible on screen ("we watch GitHub Copilot, itself a GPT, help us write a GPT").
- **Format:** screen capture of code + voiceover. No talking-head/webcam.
- **Length:** very long, comprehensive sessions — "Let's build the GPT Tokenizer" is 2h13m; "Let's reproduce GPT-2 (124M)" runs ~4 hours (timestamps to ~03:59:39, including an overnight training run he returns to "in the morning").
- **Editing:** minimal cuts; the authentic dev process is left visible — reading docs, tracking tensor shapes, hitting and fixing bugs. The `build-nanogpt` repo's commit-per-step mirrors the video exactly.

### Phase 3 — Pedagogical Framework

- **First-principles / build-from-scratch.** Cognitive rationale: building the mechanism yourself converts a "leaky abstraction" into an owned mental model, which is what lets you debug and innovate later. The manual-backprop exercise "helps build competence and intuition… and sets you up to more confidently innovate on and debug modern neural networks."
- **Error demystification.** He normalizes confusion by experiencing it on camera and by cataloguing canonical mistakes. "A Recipe for Training Neural Networks" reframes debugging as the *main skill*: be "thorough, defensive, paranoid, and obsessed with visualizations of basically every possible thing… patience and attention to detail." The recipe is itself a teachable sequence: become one with the data → end-to-end skeleton + dumb baseline → overfit one batch → regularize → tune → squeeze.
- **Cognitive-load management.** Techniques observed: one running example; scalar-before-tensor (defer complexity); foreshadowing ("notable todos for later video"); repetition of the same train/sample/eval loop; "complexify" gradually so each step adds exactly one idea.
- **Motivation & intuition first.** Why-before-how; connect to what the learner already knows (Python, high-school calculus, files, zip compression).
- **Desirable difficulty / active learning.** His explicit stance: "It took me a while to really admit to myself that just reading a book is not learning but entertainment" (July 15, 2018). The Backprop Ninja exercise instruction: "I recommend you work through the exercise yourself but work with it in tandem and whenever you are stuck unpause the video and see me give away the answer. This video is not super intended to be simply watched." His "how to become expert at thing" recipe (Nov 7, 2020): "1 iteratively take on concrete projects and accomplish them depth wise, learning 'on demand' (ie don't learn bottom up breadth wise) 2 teach/summarize everything you learn in your own words 3 only compare yourself to younger you, never to others."

---

## The Blueprint (Prescriptive)

### A. Stylistic Style Guide

**DO:**
- Title episodes with the signature pattern: "Let's build X, from scratch, spelled out."
- Use "we" for the shared journey; "you" for direct exercises ("now you try"); reserve "I" for opinion/experience ("in my opinion…").
- Open every concept with *why it matters and what it does* before any syntax.
- Use one physical analogy per hard concept and reuse it consistently.
- Admit limits and defer: "we'll come back to this," "I'm not going to fully explain this yet."
- Self-deprecate lightly about length/difficulty to lower the stakes.
- Anthropomorphize the system to build intuition ("the compiler wants…", "this type is complaining because…").

**DON'T:**
- Don't present polished, pre-baked code with no history — show it being typed.
- Don't say things work "magically" or wave away mechanism.
- Don't front-load formalism/jargon; introduce a term only when the student feels the need for it.
- Don't edit out mistakes — they are content.
- Don't lecture passively; constantly pose "what do you think happens if…" predictions.

### B. Instructional-Design Playbook (sequencing)

1. **Choose ONE running artifact** that will live across the whole course and grow in complexity.
2. **Show the destination first** (a 2-minute demo of the finished thing) to create motivation.
3. **Build the dumbest possible version by hand** — no libraries, smallest data, scalar/single-case granularity.
4. **Hit a real wall** that the next abstraction solves; let the student feel the pain before relieving it.
5. **Introduce the abstraction as "the efficient version of what you just built."**
6. **Reveal equivalence:** prove the hand-built toy and the production tool give the same result.
7. **Complexify by exactly one idea per episode;** foreshadow what's deferred.
8. **End each episode with a do-it-yourself exercise** ("unpause and try it") and a capstone project for the course.

### C. Production / Recording Playbook

- **Environment:** live-code in the real editor your audience uses (for TS: VS Code, which surfaces type errors inline). Keep a notebook/REPL or `ts-node`/the TS Playground for instant feedback.
- **Format:** screen capture + voiceover; webcam optional and not required. Karpathy proves a talking head is unnecessary.
- **Start from an empty file.** Build up, narrating every line. Commit per step so the repo is a step-by-step companion (mirror `build-nanogpt`).
- **Length:** don't fear long, comprehensive episodes — but only because they are *complete builds*, not padding. If a build genuinely takes 2 hours, ship 2 hours; provide chapter timestamps.
- **Editing philosophy:** minimal cuts. Leave in the red squiggly error and debug it live. When something compiles/runs, *show it running.*
- **Ship the artifacts:** notebooks/repo + exercises in the video description, permissively licensed.

### D. Repeatable Episode Template

1. **Cold open (1–3 min):** the end result + "by the end of this you will have built ___."
2. **Motivation (2–5 min):** why this exists; connect to something they already know.
3. **Hand-built core (bulk):** from an empty file, smallest version, live, with mistakes.
4. **The wall + the abstraction:** feel the limitation, then introduce the tool.
5. **The reveal:** "what you built is what the library does."
6. **Recap + foreshadow:** what we built, what's deferred to next time.
7. **Exercise:** "Here's a starter file. Try it yourself; unpause when stuck."

### E. Checklists

**Per-episode pre-flight:**
- [ ] One new idea only?
- [ ] Running example carried over from last episode?
- [ ] Destination demoed in first 3 minutes?
- [ ] At least one analogy to prior knowledge?
- [ ] A from-scratch build before any library?
- [ ] A planned bug to debug live (or willingness to keep real ones)?
- [ ] A "now you try" exercise + starter file?
- [ ] Repo committed step-by-step?

**Anti-patterns to avoid:**
- [ ] No unexplained magic.
- [ ] No jargon before need.
- [ ] No silent jumps in code (every line narrated).
- [ ] No purely passive stretches >5 min without a prediction prompt.

---

## F. Applying the Blueprint to "TypeScript for Python Developers"

**The "build from scratch" analog.** You cannot rebuild the TS compiler in an afternoon, but you can rebuild the *mental model* from first principles. Concretely:
- **Build a runtime type-checker by hand in plain JS/Python first**, then reveal that "this is what TypeScript's static checker does for you at compile time, for free." This is the micrograd move — hand-build the thing, then show the tool is the efficient version (exactly as micrograd's tests prove the hand-built engine matches PyTorch).
- **Type the same program three ways** (untyped JS → `any` everywhere → properly typed) and show the errors each catches, the way Karpathy builds the bigram model by counting and then as a neural net to show equivalence.

**The running example.** Choose one artifact that grows across the course — e.g., a small **typed CLI todo app or a typed API client** — starting as a plain `.ts` file and accreting: basic types → interfaces/`type` → unions & narrowing → generics → utility types → async typing → a strict-mode config. Never reset context; always extend the same app.

**Leverage existing Python knowledge as the analogy scaffold (the "connect to what they already know" move).** Build an explicit Python↔TypeScript Rosetta mapping and return to it constantly:
- type hints / `mypy` → TS's static types (but "TS checks are not optional decoration; they block compilation").
- `dataclass` / `TypedDict` → `interface` / `type`.
- `Optional[X]` / `None` → `X | undefined` / `X | null`, and **null-narrowing**.
- duck typing → **structural typing** ("TS cares about shape, not name — just like Python's duck typing, but checked").
- `List[int]`, `Dict[str,int]` → `number[]`, `Record<string, number>`.
- `Union`, `Generic`, `TypeVar` → `|`, generics, `<T>`.
- `*args`/`**kwargs`, decorators, comprehensions → rest/spread, decorators, `.map`/`.filter`.
- the interpreter/runtime vs the **compile step** → the single biggest mental shift: there is a build phase, and types vanish at runtime.

**Error demystification for TS specifically.** TypeScript's error messages are infamous (deeply nested generic errors). Karpathy's method says: *don't hide them — perform them.* Deliberately trigger "Type 'string' is not assignable to type 'number'," "Object is possibly 'undefined'," and a gnarly generic error, then read them aloud and fix them live. Make a "most common TS mistakes for Python devs" list (the analog of "most common neural net mistakes"): forgetting `strict` mode; using `any` as a crutch; confusing `interface` vs `type`; expecting runtime type enforcement; `==` vs `===`; mutating what you think is immutable.

**Intuition-first sequencing.** Motivate *why* a Python dev should care (catch bugs before runtime, autocomplete, refactoring safety) by showing a JS bug that types would have caught — before teaching a single type annotation.

**Catchphrase adaptation.** "Let's build a type checker from scratch, spelled out." "Let's look under the hood of `tsc`." "Structural typing is all you need — everything else is convenience."

## G. Generalizing to a Future "LLMs Course"

The same skeleton transfers directly, and Karpathy's own LLM material is the proof of concept:
- **Running artifact:** a tiny GPT that grows micrograd → bigram → MLP → attention → full Transformer → tokenizer → fine-tuning → chat UI (literally the nanochat capstone path).
- **Build-from-scratch analog:** hand-write backprop before autograd; build a BPE tokenizer before importing one; reproduce GPT-2 from an empty file before touching a framework.
- **Connect to prior knowledge:** for an audience that already codes, frame training as "just" an optimization loop; frame an LLM as "a zip file of the internet" and "the kernel of an OS."
- **Error demystification:** "most common neural-net mistakes" (overfit one batch first, `zero_grad` before `backward`, logits vs softmax) is ready-made — demonstrate each failure live.
- **Cognitive load:** scalar-before-tensor, one innovation per video (BatchNorm, then residuals, then attention), constant return to the train/sample/eval loop.
- **Capstone:** end with a complete, minimal, forkable repo (the nanochat-style model) the learner trains and talks to.

## Recommendations

1. **Start by locking your one running artifact and your one "from-scratch" hand-built core.** For TS-for-Python: the typed CLI/API app + a hand-rolled runtime type-checker. Do not proceed to scripting until these are decided — they are the spine of the entire course. *Benchmark to change this:* if the artifact can't carry ≥6 episodes of escalating concepts, pick a richer one.
2. **Write the Python↔TypeScript Rosetta table next**, and design every episode to begin from a Python concept the learner owns. *Threshold:* if an episode introduces a concept with no Python anchor, add an explicit "this has no Python equivalent — here's the new mental model" callout (the deliberate-novelty flag).
3. **Script episode 1 as a full from-scratch build from an empty file, recorded in one comprehensive take with live error-fixing.** Pilot it; measure completion/retention. *If* watch-through is poor, shorten scope per episode (one idea only) rather than over-editing.
4. **Build the exercises and a step-by-step-committed starter repo before publishing.** Adopt the "unpause and try it" instruction in spirit.
5. **Maintain a living "most common TS mistakes for Python devs" doc** and convert the top items into live-debugging set pieces.
6. **Default to long, complete, lightly edited episodes with chapter markers** — but justify every minute as a real build, not filler.

## Caveats
- **Audience fit:** Karpathy teaches a technically motivated, self-selected audience (his stated prereqs assume programming + some math). His low-edit, multi-hour, build-everything style suits committed learners; a casual or absolute-beginner audience may need shorter, more scaffolded episodes. Calibrate length to your audience's commitment.
- **Domain transfer isn't 1:1:** the "rebuild the real system from scratch" move is cleaner in ML (a ~100-line autograd genuinely mirrors PyTorch) than in language tooling (you won't rebuild `tsc`). The faithful translation is to rebuild the *mental model / a minimal analog*, not the production compiler.
- **Production reality:** Karpathy has *not* published his exact recording rig (microphone, capture software); claims here about "no webcam / minimal cuts / live debugging" are inferred from his video descriptions, commit-per-step repos, and his own announcements, not from a documented setup guide. Don't treat specific gear as prescribed.
- **Figures to treat carefully:** line counts are headline figures from Karpathy's own posts/READMEs (micrograd ~100; nanochat ~8,300; llm.c's reference trainer ~1,000 lines in one file — larger totals exist once CUDA kernels are added). Eureka Labs' "Teacher + AI symbiosis" and LLM101n are, as of the research window, early-stage and partly unbuilt; treat them as stated philosophy and roadmap, not proven outcomes. A few quotes are cross-referenced via secondary outlets and his own curated tweets page rather than the original live posts.