# なおとっち 正式音楽ライブラリ

V7完成版32曲とPR550の音量設計を正式採用。音楽自体は完成済み。原盤は再生成・再マスタリングしない。

- 台帳：[library.json](library.json) / [正式一覧](../docs/music/TRACKS.md)
- 固定境界：[approved32.lock.json](approved32.lock.json)（32曲のレコードと原盤・楽譜・由来のSHA）
- 配置原本：[placements.json](placements.json)（50行）、ゲームID対応：[game-songs.json](game-songs.json)
- 将来の追加配置：[extensions.json](extensions.json)（元の50行・100ゲーム対応を上書きしない）
- 原盤：AACは`assets/bgm/<id>.m4a`、FLAC/MIDIは`music/masters/<id>/`
- 出典とライセンス：[sources.json](sources.json)、[provenance/](provenance/)
- 再開可能な検証記録：`verification/tracks/<id>.json`
- 制作票：[templates/composition.md](templates/composition.md)
- [構造・音量・復旧](../docs/music/PRODUCTION.md) / [制作ガイド](../docs/music/CREATION.md) / [新曲追加手順](../docs/music/ADDING.md)

必要環境：Python3.12、FFmpeg/ffprobe、`pip install -r tools/music/requirements.txt`。CLIの排他ロックはPOSIX（Linux/macOS）用。CIはLinux。

```sh
python tools/music/library.py verify
python tools/music/library.py build
python -m unittest discover -s tests/music -v
node --test tests/bgm-production-test.cjs tests/bgm-v2-integration-test.cjs
```

verifyは毎回SHAを照合し、成功記録のfingerprintが一致する曲の解析だけをskipする。書き出し・作曲・音量加工は行わない。初回32曲の記録はPR549/550の測定値と固定コミットから輸入した検証済み記録であり、新しい測定を行ったという意味ではない。
