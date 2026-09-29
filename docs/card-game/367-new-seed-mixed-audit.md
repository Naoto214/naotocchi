# 367 新seed混合4経路の候補監査

[367計画](plans/2026-09-29-new-seed-mixed-audit-367.md)。[366保存state](data/proxy-new-seed-mixed-replay-366-20260929.json)を保護照合して[監査JSON](data/proxy-new-seed-mixed-audit-367-20260929.json)に4経路の候補を記録した。raw SHA256は`49fd52d914a5c491ceafb2d2471ba61a536e5b276d9673d6b1ec3a0117a692f0`。

| 経路 | 次の候補 |
| --- | --- |
| 01-A | 終了前response-passのみ |
| 01-B | E-first-date未解決の連鎖中response-passのみ |
| 02-A | AのP-desert_scorpion配置、M-beetle-01誕生、pass |
| 02-B | Aの通常passのみ |

01-Bの起動域は未解決のまま。02-A/Bは`game_state.turn_player=A`を確認。C-boxは能力なし、P-cliff_goatはセカイ変更条件なし、P-anglerfishはメインからのちょうせん条件なしとして、この局面で除外した。新event0、completed0、独立balance標本0。次は既存選択契約で4経路を選ぶ。全proxy回帰とCI成功は未確認。
