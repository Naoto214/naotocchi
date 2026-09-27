# RH-3 Deterministic Harness & Asset Gate — QA 記録(2026-09-27)

基準: `main` `d686838199e754d1e2883d867e292acd726a2f73`(Merge PR #349 = RH-2)
branch: `claude/naotocchi-rh3-harness-asset-gate`
正本: `docs/roadmap/naotocchi-release-hardening-roadmap-2026-09-24.md` §5.3

production の JS / CSS / HTML は変えていない(index.html も変更なし)。

## 1. harness の任意の設定(`tests/helpers/runtime-harness.cjs`、足すだけ)

| 設定 | 中身 | 既定(わたさない) |
|---|---|---|
| `environment: { time, weather }` | `world-environment.js` の **うつし** を包み、`timeOfDay` / `simulatedWeather` を この値にする。`timeMode` / `weatherMode` は `'auto'` のまま(save は書きかえない)。手で えらんだ mode は優先。`deepsea` / `star_stop` は いままでどおり天気なし。値は `morning/day/evening/night`・`sunny/cloudy/rain/snow` だけ(ほかは throw) | 本物の module をそのまま渡す |
| `hostEnvironmentClock: true` | 日付を省いたとき、`world-environment` が host の時計ではなく harness の時計(`now`)を使う(時刻の解釈は host の TZ) | host の時計 |
| `seed: n` | 1 本の mulberry32 を、**起動前から** ページの `Math.random` に、読みこみ後に `meguruMod.setRandom` にも渡す(めぐるは読みこみ時に同じ関数を つかまえる)。`h.rng.calls()` で呼ばれた回数が分かる | `Math.random` は本物、`h.rng === null` |

- **季節は固定しない**: script.js の こよみ から決まるので、既存の `pinDate` + `clockNow` で固定する(`environment.season` は作らない)。
- `new Date()` ぜんたいは固定しない(9edc0e7 の hang を さける)。host の TZ は管理しない(process 全体の設定)。
- 既存の手書きの固定(`Math.random` の置きかえ・`meguruMod.setRandom`・`timeMode` / `weatherMode`)は そのまま動く(option を渡さなければ何も変わらない。全テスト緑)。
- #278 の harness の変更(pet-expression の読みこみ・API の 1 export)とは別の行。消したり上書きしたりしていない。

## 2. asset gate(`tests/asset-integrity-test.cjs`)

| 検査 | 対象 | いまの結果 |
|---|---|---|
| 静的な `assets/…` 参照の実在 | ルートの HTML / CSS / JS(`git ls-files`) | 413 件、欠け 0 |
| 大文字小文字の完全一致 | 同上(`git ls-files` の名前と比べる。Pages は区別する) | 食いちがい 0 |
| token の有無 | `<script src>`・`<link rel="stylesheet">` | 漏れ 0 |
| token の hash | `?v=YYYYMMDD-<assetHash>`。hash は `tools/bump-versions.js` の式(sha1 の先頭 8 桁)。日付は比べない | 33 件すべて一致(RH-1 / RH-2 で手で直した `script.js` も一致) |
| 動的な種族 | `ALL_LINES` の各段の `asset` | 248 / 248 |
| item | **`UNIFIED_ITEM_IDS`**(renderer が実際に画像を出す一覧。CATALOG 全部ではない — `new_themed_pack` は `sticker_pack` を使う) | 27 / 27 |
| 卵 | `intact` / `cracking` / `ready` | 3 / 3 |
| ゴールの絵の fallback | `assets/clear/goal-1..5.jpg` | 5 / 5 |

- **preload は token を必須にしない**: `assets/fonts/mplus-rounded-1c-regular.woff2` と `assets/characters/egg/{intact,cracking,ready}.png` の `rel="preload"` は、CSS / JS が同じ token なしの URL で読むので、**意図的に token なし**(付けると二重に取得する)。テストで「preload には token が無い」ことも固定した。
- 監査時点で欠けは無い。この gate は「これからの欠け」を CI で止めるためのもの。シールの絵(319)と表示用の絵は既存の `sticker-test` / `illustration-catalog-test` が見ている。

## 3. `tools/bump-versions.js`

- hash の計算を `assetHash(bytes)` として export し、CLI は `require.main === module` のときだけ動く。CLI の出力・書きかえの対象は変えていない。
- テストで固定: 一時ディレクトリに index.html と参照先を うつし、古い token にして `node tools/bump-versions.js` → 出力 `N asset token(s) updated in index.html`、token 以外は 1 文字も変わらない、各 token は `今日-assetHash`、もう一度 走らせると `asset tokens already up to date`。

## 4. CI

- `runtime-smoke-test.yml`: `timeout-minutes: 30`(いまは未設定 = GitHub の既定 360 分。`npm test` は 7〜14 分)。
- `home-layout.yml` の `paths`(pull_request / push): `assets/**`・`**.json`・`**.mjs` を追加。理由: 画像・atlas / manifest の JSON・`vite.config.mjs` も browser の layout と RH-3 の gate に影響するのに、いままで home-layout を起動しなかった。workflow の実行内容は変えていない。

## 5. home-layout の ECONNRESET(RH-3 には入れない)

Roadmap §7.3(RH-6)に backlog として記録した: `context.route` の中の `route.fetch()` の rejection が unhandled になり process ごと落ちうる、CI で 3 回、手元では再現せず、vite の optimizer が原因とは証明できない、小さな retry / catch は原因を隠しうる。home-layout 専用の retry や runner の hack は入れていない。

## 6. テスト

### `tests/harness-determinism-test.cjs`(8 件)
host の時計は `--require` の shim(別 process)で ずらし、TZ は env で変える。

| 観点 | テスト |
|---|---|
| host 03:00Z UTC / 13:00Z Asia/Tokyo / 2027-01-15 21:30Z America/Los_Angeles で、同じ `environment` + `seed` + `pinDate` / `clockNow` → 時間帯・天気・季節・ページのらんすう が一致 | 1 |
| option なし → 時間帯は host の時計で、季節は host の こよみ で変わる(差を検出)。`pinDate` + `clockNow` だけで季節は そろう | 2 |
| `hostEnvironmentClock` だけで 時間帯が harness の時計に従う | 3 |
| 既知の flaky「めぐるに はいる」場面が、option ありなら どの host の時計・TZ でも同じ。option なしでは ゆれる | 4 |
| 1 本の generator が 起動時・ページ・めぐる の らんすう を まかなう | 5 |
| 既定の `harness()` は不変(`rng` なし、本物の module、`Math.random` は native、`new Date()` は固定しない、`Date.now()` は harness の時計) | 6 |
| 手で えらんだ mode が優先、海の底・星の停留所は天気なし、不正な値は throw | 7 |
| harness の天気の表示名が `world-environment.js` と一致 | 8 |

既存の flaky 2 本(meguru-discovery ⑥-1、meguru-test の entering)は **変えていない**(書きかえは RH-6)。

### `tests/asset-integrity-test.cjs`(6 件)
いまの repo(静的参照・token・動的な path)、こわれた入力(メモリ上の合成 HTML / path と、本物の index.html の token を古くする・落とす・参照の大文字を変える)、bump CLI の挙動。

### remove-it

harness(`tests/helpers/runtime-harness.cjs` を 1 か所ずつ外す):

| 外したもの | 赤になったテスト |
|---|---|
| environment の包み全体 | 1, 3, 4, 7 |
| `environment.time` | 1, 4 |
| `environment.weather` | 1, 4, 7 |
| `hostEnvironmentClock` | 3 |
| 起動前の `Math.random` の差しかえ | 1, 5 |
| 手で えらんだ mode の優先 | 7 |
| 海の底・星の停留所の null | 7 |

asset gate: 欠け・大文字小文字・古い token・token なし・hash のない token・存在しない file の token・動的な path の欠け を、メモリ上の こわれた入力で それぞれ検出(実ファイルは こわしていない)。

## 7. 結果

- `harness-determinism-test`: 8 / 8 PASS(別 process を ふくめて 約 5 秒)
- `asset-integrity-test`: 6 / 6 PASS
- `npm test` 全体: **1432 / 1432 PASS、exit 0**(RH-2 後の 1418 + 8 + 6)
- remove-it: harness 7 / 7 が赤、asset gate は こわれた入力 すべてで赤
- workflow の YAML は parse できる(`timeout-minutes: 30`、paths の追加)
