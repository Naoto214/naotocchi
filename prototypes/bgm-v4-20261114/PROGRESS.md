# BGM VERSION 4 — 進み具合

| 段階 | 曲 | 状態 |
|---|---|---|
| 第1段階 | ホーム4曲（home-morning・home-day・home-evening・home-night） | 完成・保存 |
| 第2段階 グループ2 | poyo-1・koro-1・card-2・game-1・explore-1・event-2・event-1 | 完成・保存 |
| 第2段階 グループ3 | kisetsu・ohayo・bgm-game・bgm-race・bgm-farewell・poyo-2・game-2 | 完成・保存 |
| 第2段階 グループ4 | explore-2・board-b・fishing-a・lullaby-a・jingle-achieve・jingle-card-lose・var-poyo-clear | 完成・保存 |
| 第2段階 グループ5 | var-poyo-chapter・var-koro-goal・var-koro-album・var-card-late・var-card-win・var-flight・var-ohayo-hatch2 | 未 |

完成した 曲は receipts/<id>.json の ハッシュ（FLAC・AAC・MIDI）で 確認し、作り直さない（render_v4.py は 一致すれば skip）。
再開: `python prototypes/bgm-v4-20261114/tools/render_v4.py --group N` を 未の グループから。点検は `tools/verify_v4.py --audio`。
