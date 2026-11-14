# VERSION 7 checkpoint ledger

Plan: docs/superpowers/plans/2026-11-14-bgm-v7.md
Baseline: 146383829818fc986926c05700986705d7241858 / PR #546.

- Isolated worktree /workspace/work/bgm-v7, branch codex/bgm-v7-chamber. No baseline changes.
- User already specifies A/B approaches; this phase stops at their selection, not at additional design approvals.
- V6 diagnostic: 277 sustained auxiliary notes, 44 avoidable cache-induced artificial extensions (25 clarinet/16 flute/3 viola), 0 cello. Full source recordings generally 6–14 seconds; note demands are much shorter.
- Pitch diagnostic: solo violin G3 sample ~196Hz/MIDI55 (standard octave); cello E1 ~82.4Hz/MIDI40 (filename octave offset+2).
- Sample source candidates: VSCO CE solo violin p and cello section v1 (CC0); VCSL checked but no corresponding bowed string source. No unsupported premium-quality claims.
- Completed A/B4 scores; 3158 melody events and all piano events exact. Other28 unchanged.3 sampler/preservation regression tests pass.
- Full V6 mix reconstruction residual -117.48 to -117.73dB; piano stems verified by SHA. Native string source manifests verified.
- Eight variants measured: -23LUFS, clipping0, no limiter, mono and loop pass. NightA exactV6; nightB first half sample-identical.147 native string notes, artificial loops0.
- Chromium and WebKit:12 AACs and all3-way comparison controls passed. Screenshots saved. No physical iPhone test.
- Independent read-only review: no blocking findings. Ready for Draft checkpoint and additive playtest publication.
- Saved all8 variants to independent Draft PR #547, baseV6, headcodex/bgm-v7-chamber. Initial source/audio checkpoints646a72a +1e64c2a.
- Published additive-only playtest commit c6bfd8e984f7d51f483967c238aff54dabbef97c (12new paths). Existing file changes0, checked via git objects despite sparse checkout. Pages run43552522268 awaiting deployment completion.
- Pages run43552522268 completed successfully. Public HTTP200/SHA256 checks16/16 passed with TLS verification. Fixed URL https://naoto214.github.io/naotocchi-playtest/bgm-v7/ .
- STOP: user A/B selection pending. Remaining28, V7 game integration, production main, protected old PRs/masters untouched.

## 追加調査: 本体スピーカー無音

- ユーザー報告: イヤホンを外すと無音だがバー進行。消音OFF、YouTube正常。
- speaker-check-1候補: playbackセッション、context/session中断管理、同位置/ゲインのcontext再生成、直接AACの標準プレーヤー診断。詳細OUTPUT-INVESTIGATION.md。
- Chromium/WebKit制御テストと既存比較の回帰は合格。実機iPhone本体出音は未確認。**不具合は未完了・実機結果待ち。** 音源・編曲・ゲームは変更なし。
- speaker-check-1公開: playtest37c0c6b、Pages43561699285成功。公開18ファイルのハッシュ一致、AAC Range206。本番main/V6head不変。**通常比較のiPhone本体出音が確認されるまで未完了。**

## 音声出力修正の採用 — 2026年11月14日（日本時間）

- 利用者が通常のV7比較ページで、イヤホンなし・消音モードOFFのiPhone本体スピーカーから正常な出音を確認。
- 利用者の明示的な採用指示を受領。speaker-check-1を採用済みに更新。直前までの「実機結果待ち」は履歴。
- 実機報告はuser-acceptance.jsonに記録。接続→切断・バックグラウンド復帰・全案ごとの確認を実施済みとは拡張しない。
- 今回の変更は記録のみ。音源・編曲・V6/A/B比較・ゲームは不変。PR #547はDraftを維持、本番mainへのマージなし。音楽A/Bの選択待ちと残り28曲の保留は継続。
