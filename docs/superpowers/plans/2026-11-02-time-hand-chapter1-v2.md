# 時の針 第1章 V2 Implementation Plan

**Goal:** Restore shipped input/presentation assets without changing D physics or stage content.
**Architecture:** Keep ChapterSession as a D/cage adapter; reuse enteredCells, actorLayout, contactVisualActors/contactEffects directly. Keep formal files read-only. New chapter-specific DOM adapts the formal height-constrained board / four-button layout.
**Tech Stack:** ES modules, Canvas, node:test, Sites preview.
**Spec:** User's 2026-11-02 V2 request (27 audit categories, PR504 only, private delivery).

## Global Constraints
main/Pages/formal01–20/PR494/503 untouched. Preserve engine, priorities, stages, solutions and storage key/schema. Never call WebKit/Chrome QA iPhone real-device QA.

## Review Focus
Pointer identity/cancel/up final samples; adjacent tap vs drag; animation regrab; demo selection/save isolation; short dynamic viewport and keyboard access.

## Tasks
- [x] Identify PR504 e352e3c9 and source Site v1; inspect PR436/482/483/484/494/503 metadata.
- [x] Reproduce adjacent actor selection failure with real contact-v2 engine.
- [ ] Fix BoardInput.start hit priority; preserve enteredCells geometry and gesture grouping; test taps/swap/merge/jitter/cancel.
- [ ] Reuse formal actorLayout and contact effects; remove selected rectangle and normal coordinates. Compare formal motion/hit semantics.
- [ ] Adopt height-constrained arena/four-button layout, compact stage selector and detail dialogs; keep keyboard and accessible actor selector.
- [ ] Verify new chapter witnesses/physics/save/replay, formal suites, tutorial fixed-ref suite and CI. Compare browser UI at requested dimensions.
- [ ] Save 27-row inheritance audit, evidence, limitations, protected-file hashes. Recheck remote HEAD before PR504 update. Update existing private Site and verify delivery.
