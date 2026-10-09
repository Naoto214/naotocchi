# Asset tracked-list buffer fix

Base `172bc67e123727705bf2f5f1e4f1569f7de0292a`; commit `577c2177c30d948605362e1cd1687867d4faa00e`; isolated worktree `/workspace/scratch/150320e8a2fd/asset-integrity-buffer`.

Changed only `tests/asset-integrity-test.cjs`: add `maxBuffer: 16 * 1024 * 1024` to existing git ls-files call. No inventory filtering, git argument/quoting/encoding/path decoding changes. The actual tracked output is1094209bytes (14501paths), above Node's default1MiB. Bound remains finite16MiB. No production/Pilot/World/Home changes.

Focused evidence (absolute logs under `/workspace/scratch/150320e8a2fd/`):
- `node --test tests/asset-integrity-test.cjs` before:2PASS4FAIL, all4ENOBUFS (`asset-integrity-buffer-before.log`); after:6PASS0FAIL (`asset-integrity-buffer-after.log`).
- `node /workspace/scratch/150320e8a2fd/asset-integrity-buffer-control.cjs`: temporary1MiB buffer control returns meaningful ENOBUFS on actual existing static asset test; exact test bytes restored; complete git output bytes equal git output redirected to a file with no pipe buffer cap. Same UTF8/default path quoting/newline semantics, no dropped/nonASCII transformed paths. `asset-integrity-buffer-control.log`.
- Restored focused static test1PASS: `asset-integrity-buffer-restored.log`.
- `git diff --check 172bc67e123727705bf2f5f1e4f1569f7de0292a HEAD`:exit0, one-line test diff; clean worktree at this commit.

No redundant permanent test or full npm rerun. Existing6test suite exercises actual oversized inventory and existing negative input controls. Root owns final npm source qualification and relationship suite. Independent review pending.
