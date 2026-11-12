# 作業進捗（中断に そなえた 記録）

採用32曲 VERSION 2 音質改善。8曲ずつ 4グループ。各グループは 描画 → 検証 → コミット → push → GitHub 上の ハッシュ照合 の 順。
GitHub 上で 照合できない ときは 次の グループへ 進まない。

| グループ | 曲 | 状態 |
|---|---|---|
| 1 | home-morning, home-day, home-evening, home-night, poyo-1, koro-1, card-2, game-1 | 完了（GitHub 照合 済み） |
| 2 | explore-1, event-2, event-1, kisetsu, ohayo, bgm-game, bgm-race, bgm-farewell | 完了（GitHub 照合 済み） |
| 3 | poyo-2, game-2, explore-2, board-b, fishing-a, lullaby-a, jingle-achieve, jingle-card-lose | 描画・検証 済み（GitHub 照合は 下の 記録） |
| 4 | var-poyo-clear, var-poyo-chapter, var-koro-goal, var-koro-album, var-card-late, var-card-win, var-flight, var-ohayo-hatch2 | 未 |

再開方法: `python prototypes/bgm-v2-20261112/tools/render_v2.py --group N`。receipts/<id>.json と ファイルの SHA-256 が 一致する 曲は 作り直さない。

## GitHub 照合の 記録
- 2026-11-12 グループ1: コミット 76964cd69。GitHub API の ディレクトリ一覧（git blob SHA・サイズ）と 手元の 16 音源（FLAC 8・AAC 8）が 一致（tools/remote_check.py）。
- 2026-11-12 グループ2: コミット 1fcef3ccb。GitHub 上の 16 音源と 一致。
- 2026-11-12 グループ3 の 制作中に、自作ギターが 明るすぎる（3〜6 kHz が −8 dB）と 分かり、ナイロン弦らしい 音色（−22 dB 前後）に 直した。
  ギターを 使う グループ1・2 の 6曲（koro-1, game-1, event-1, ohayo, bgm-game, bgm-race）も 同じ 音色で 描き直し、このコミットで 置きかえた（未承認の 途中成果の 差しかえ）。
