# CARD GAME設計監査の固定入力

本編の現在の成長名・アイテム構造とは別の、既存カード設計の入力を保存する。
ゲームからは読み込まない。既存452枚・96/97のhash・対戦証跡は更新しない。

- 設計基準commit: `204f2b7453a9734be6a7a9708c89b4a4c6c5b16b`。
  根拠は `../item-source-20260917.json` の `design_base_commit` と文書76。
- `character-world-master.v1.js`: 上記commitの同名ファイルをバイト単位で複製。
  Git blob `062cf5bcaea5f78742af8cc66194f7c0e1a84c54`。
  文書97作成commit `3d16b894` と452枚export作成commit `643a7581` のblobも同一。
- `legacy-item-arrays.js`: 同commitの `script.js`
  （Git blob `5f970283ac49b4625615626fcba1bc69ed6cb882`）から下の式で
  5配列の宣言をそのまま抽出。実行しない。旧登録38件のIDと分類の監査専用。
  SHA-256 `00dc1a11e53695b5790cfc34674c7c3b252b76a478c4bd07a78ac504f07501f5`。

```python
names = ['SHOP_ITEMS', 'NAOTO_ITEMS', 'CONSUMABLE_ITEMS', 'FUN_ITEMS', 'RECOVERY_ITEMS']
blocks = [re.search(rf'  const {name} = \[\n.*?\n  \];', script, re.S)[0] for name in names]
output = ('\n\n'.join(blocks) + '\n').encode('utf-8')
```

文書76の `source_blobs.script.js` は別のmain commit `4ed128d` の値。
旧38件の基準blobと混同しない。現行26アイテムは既存の76/77固定snapshotによる
別の監査を維持する。旧38件は本編PR #274 (`cdbdc64c`) の再設計で廃止された。

`tools/design_sources.py` が両入力の内容を検証し、不一致は即時失敗とする。
通常の監査で履歴全体やネットワークを必要としないように同梱した。
再生成のためにこの入力や過去の期待hashを更新してはならない。

2026-10-24の調査では、現行本編との段階名差分は計19件
（ヒトデ8・サクラ1・せかいじゅ3・ナゾ7）。うち明示表で表面化するのは
サクラ1・ナゾ7の8件。その他も全文hashに含まれるため、8件だけの例外扱いは
不十分。固定マスターを使うと96/97の既存hashと452枚exportが一致する。
