# なおぽよ。v2 / NAOPOYO.
Independent continuous-drag trial. Production and PR #422 are unchanged.

- Contract: `../../docs/naopoyo-v2-20261022/SPEC.md`
- QA, migration and limitations: `../../docs/naopoyo-v2-20261022/QA.md`
- Test: `node --test prototypes/naopoyo-v2/tests/*.test.mjs`
- Regenerate rescue evidence: `node prototypes/naopoyo-v2/tests/build-solutions.mjs`
- Compare v1/v2 commands: `node prototypes/naopoyo-v2/tests/tempo.mjs`
- Build isolated static package: `node prototypes/naopoyo-v2/build-preview.mjs <absolute-output-directory>`
- Main entry: `prototypes/naopoyo-v2/index.html`; screen QA: `qa.html`.
- Session save key: `naopoyo-v2-continuous-20261022`, schema2; do not migrate v1 states automatically.
