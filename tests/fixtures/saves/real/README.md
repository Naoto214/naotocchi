# 本物の 古い save(RH-8)

ここの JSON は **その 時代の コード 自身が 書いた save** です。古い コードは repo に 置きません。

## つくりかた

```
node tools/gen-real-save-fixtures.cjs            # つくりなおす(manifest.json も)
node tools/gen-real-save-fixtures.cjs --rollback # 旧 → 新 → 旧: いまの コードで 読んで 書いた save を 古い コードで 読みなおす
```

1. `git worktree` で 古い commit を 一時的に 出す(おわったら 消す)。
2. その commit の `index.html` の `<script>` の 順で、vm に よみこむ(DOM・音・ネットは なんでも うけとる にせもの。時計と `Math.random` は 固定)。
3. たまごを かえし(`hatchEgg` が ある 時代だけ)、時代ごとの 手順(お金・旧しゅぞく・シール・めぐるの きろく を その 時代の 形で)を して、8 分 すすめる(毎分 メーターを もどす = せわを した ことに する)。
4. その コードが `localStorage` に 書いた save を JSON に する。位置情報(`lifetime.currentLocation`)は のこさない。

| file | commit | 時代 |
|---|---|---|
| `pre-v3.json` | `2c38b42d` | schemaVersion 3 より まえ(旧 age / 旧 stage。8 分で 寿命を むかえた `dead`) |
| `v3.json` | `dc137f1e` | schemaVersion 3 |
| `v4-pre-master.json` | `dcc9eaec` | master 導入より まえ。旧しゅぞく `bird` の 人生、旧 図鑑 キー、旧しゅぞく `rabbit` の 過去の 人生 |
| `v5-pre-items-v2.json` | `300d2aee` | items-v2 より まえ |
| `sticker-points-meguru-p1.json` | `619fc900` | シールの ポイント・4 ページ制(#304 より まえ)+ めぐる Phase 1 |
| `meguru-p2.json` | `e4254e4c` | めぐる Phase 2 の はじめ |

オーナーの 実機の save(セーブコード)は まだ ない(もらえたら 位置情報を 消して ここへ 足す)。

## 検査(`tests/save-compat-test.cjs`)

- 例外なく 読める・schemaVersion 5 に なる
- お金・図鑑の キー・恋人・シール・めぐるの きろく・過去の 人生が **へらない**
- RH-2 の 件数(`dexFoundCount`)が 期待どおり(旧しゅぞくの キーは save に のこり、件数には 入らない)
- load → save → load が 冪等
