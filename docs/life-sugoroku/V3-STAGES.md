# V3 ステージ定義

日本ステージの実装は `prototypes/life-sugoroku/stages.mjs`。`getStage()` / `getStage('meguru-japan')` で同じ定義を返す。未登録IDは RangeError。登録済みは1ステージのみ。海外ステージの画像・効果音・イベントは作成も読み込みもしていない。

## データ契約

| フィールド | 日本ステージの内容 | 拡張時の責務 |
|---|---|---|
| id / version / status | meguru-japan / 3 / playable | 安定ID、版、実装状態を明記 |
| name / shortName / description | 表示名と場所の説明 | テーマだけでなく旅の内容を書く |
| geography.source | meguru.js WORLD_GEOGRAPHY v2 / canon v1 / D2 | 正本・参照版を宣言 |
| geography.worldRegions | home, river_lake, mountain, forest, countryside, city, sea | 地域IDを宣言し盤面の全マスを対応させる |
| geography.features / watersheds | 西と東の山地、湖、別々の2水系、分水界、湾、海岸 | つながる地形と分離する地形を宣言 |
| geography.abstractions | 循環盤・圧縮された谷の帰路・旧抽選プール | 世界正本との違いを明文化 |
| board | data.mjs BOARD、48マス、開始0、分岐1/13/25/37、各腕4歩、900×800 | 座標・next・分岐長・初期位置とviewBoxを揃える |
| board.rounds | 10 / 15 / 20 | ラウンド変更と旅程サイズを混同しない |
| board.tileSchema | tiles.mjs | 色・形・記号・説明と実際の着地効果を一致させる |
| events | events.mjs、既存4プール、friend/fateカテゴリ | 地域とイベント抽選を別途設計・検証 |
| gimmicks | 等距離分岐は実装済み。橋と峠は景観のみ | 実装済み効果と景観だけのものを区別 |
| sounds | 既存の手続き効果音。地域別環境音なし | 音源パス、ライセンス、ミュート対応を追加 |
| assets | 新規ネイティブSVG地形、既存公式人物アダプタ | ソースと用途を明記。Draftを混在させない |
| playtime | 10回:10–20分、15回:15–30分、20回:20–40分 | 見積もりか実測かを明記。現在は未計測 |
| extensionContract | 必須フィールド一覧 | 新ステージを登録する前に独立した盤面・イベント・アセットを揃える |

## 互換性の境界

`BOARD.region` は旧セーブ用の抽選キー。V3新規対戦では JAPAN_STAGE.events.regionPools[worldRegion] を使う。`BOARD.worldRegion` は世界の場所。画面上の地域名には `WORLD_REGION_NAMES[worldRegion]` を使う。旧region名を風景ラベルに流用しない。

`terrainSvg()` と `tileSvg(node, fill?, icon?, {active, visited, fork, debug})` は既存の呼び出しに対応する。fill/icon省略時はTILE_SCHEMAが正本。通常は監査番号を描かない。デバッグ時だけ `debug:true` で番号を描く。

海外展開のための拡張点はデータ契約まで。別ステージの実装、追加選択UI、未使用アセットの先行ロードは含めない。現在のエンジンは日本のBOARDに接続されているため、新ステージを登録するだけでは自動的に遊べない。将来はエンジンへのboard注入、セーブのstageId検証、イベントと地域の接続、音源と地形モジュールの選択も実装する。

48マスの具体的な監査結果は [V3-BOARD-AUDIT.md](V3-BOARD-AUDIT.md)。
