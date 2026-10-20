# CARD GAME Learning Implementation Plan

> Use superpowers:executing-plans inline. Final fresh reviewer after implementation.

**Goal:** fifteen-chapter official rulebook and nine practical lessons in a new private trial.
**Architecture:** independent learning dialogs, canonical engine actions and isolated progress storage.
**Tech Stack:** existing native JavaScript modules, HTML/CSS, Node tests and DOM integration.
**Spec:** ../specs/2026-10-20-card-learning-design.md

## Global constraints
No rule/engine/effect/schema/art/CPU changes, no main merge or production update, no allowlist changes, no existing trial update. User explicitly authorized completion without design/plan approval stops.

## Review focus
- Opening help during CPU response must freeze progress and preserve privacy on blur.
- Stale or double taps must not execute a next-lesson action.
- Leaving/resuming/skipping must not overwrite match/decks/collection storage.
- Completing practice while a saved match exists must not silently replace it.
- Small landscape height, long rules and card details remain scrollable and closable.

### Task 1: Rulebook
- [x] Test chapter count, search, glossary, canonical examples and full source snapshot equality (RED).
- [x] Implement `CHAPTERS`, `GLOSSARY`, `searchChapters(query)`, `relatedChapter(card)` and source snapshot generator. Verify tests GREEN.
- [x] Implement book modal, diagrams and links, keeping original match mounted.

### Task 2: Practice
- [x] Test `TutorialSession` nine lessons end-to-end using `legalActions`, fixture `validate`, wrong/stale command rejection, exact outcomes, chain reverse order and progress isolation (RED).
- [x] Implement `TutorialSession(lesson)`, `projection`, `expectedAction`, `perform(id,revision)`, `next`, fixed checkpoints and bounded canonical auto-settlement. Verify GREEN.
- [x] Implement tap card/detail/confirm flow, progress, lesson selection, skip/restart/resume and non-destructive CPU setup.

### Task 3: Integration and QA
- [x] DOM test app routes, lesson completion, menu return, storage and CPU pause, deck/collection related rules (RED→GREEN).
- [x] Existing card regression + CPU/hotseat/deck/collection DOM suites. Document known unrelated failures.
- [x] Managed browser images, portrait/landscape/reduced-motion and private info checks; save screenshots.
- [x] Fresh whole-branch review, fix important issues with targeted regression coverage.

### Task 4: Delivery
- [x] Commit/push independent branch and create new Draft PR.
- [x] New owner-private Site, package exact runtime/assets, deploy and verify native success.
- [x] Record HEAD/tree/PR/trial/evidence and confirm remote main unchanged.
