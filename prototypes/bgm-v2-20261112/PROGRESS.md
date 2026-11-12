# 作業進捗（中断に そなえた 記録）

採用32曲 VERSION 2 音質改善。8曲ずつ 4グループ。各グループは 描画 → 検証 → コミット → push → GitHub 上の ハッシュ照合 の 順。
GitHub 上で 照合できない ときは 次の グループへ 進まない。

| グループ | 曲 | 状態 |
|---|---|---|
| 1 | home-morning, home-day, home-evening, home-night, poyo-1, koro-1, card-2, game-1 | 描画・検証 済み（GitHub 照合は 下の 記録） |
| 2 | explore-1, event-2, event-1, kisetsu, ohayo, bgm-game, bgm-race, bgm-farewell | 未 |
| 3 | poyo-2, game-2, explore-2, board-b, fishing-a, lullaby-a, jingle-achieve, jingle-card-lose | 未 |
| 4 | var-poyo-clear, var-poyo-chapter, var-koro-goal, var-koro-album, var-card-late, var-card-win, var-flight, var-ohayo-hatch2 | 未 |

再開方法: `python prototypes/bgm-v2-20261112/tools/render_v2.py --group N`。receipts/<id>.json と ファイルの SHA-256 が 一致する 曲は 作り直さない。

## GitHub 照合の 記録
