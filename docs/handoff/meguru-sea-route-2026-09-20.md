# めぐる — ジャングル島への海路 v1(2026-09-20)

ブランチ `claude/meguru-sea-route`。**PR #309(`claude/meguru-explore-ux`)の上に積んでいます。**
#309 でジャングルを南西の外洋の島にしたので、その島化を前提にしないと成り立ちません。
#309 が main へ入ったあとで base を main に付けかえてください。**main へはマージしていません。**

## 1. なぜ直したか

#309 でジャングルを `mapX:-6.3, mapY:-7.8` の島にした結果、

- `desert|jungle`「ほねのたにま」— さばく(-3.2, 1.4)から島まで **外洋を 9.7 めもり横断する徒歩の道**
- `jungle|sea`「にしぎしのマングローブ」— 「岩場をまわりこむと岸が湿って緑になる」という
  陸つづきの説明のまま、5.4 めもりの海を渡っていた

の 2 本が地理と食い違っていました。100% の世界地図では、海の上に徒歩の道が 2 本描かれていました。

## 2. 直したこと

| 変更 | 中身 |
| --- | --- |
| `desert|jungle` を削除 | 徒歩でさばく → ジャングルへは行けない。北西の砂の世界と南西の外洋の島は別方向の外縁地域 |
| `jungle|sea` を special sea connection へ | `special:'sea'` / `kind:'sea'` / `gate.kind:'sea'`。`sea{ ride, from, to, layerFrom, layerTo, waters, stages }` |
| 乗りもの | `{ id:'shimawatari-boat', name:'しまわたりのふね', kind:'boat', size:'small' }`。**実在の航路・船・会社の名前は使っていない。豪華客船でもない** |
| うみ側 anchor | `breakwater`「ぼうはてい」(みなと ちく・非秘密・既存 spot)。`rockarch` から移した |
| ジャングル側 anchor | `entry`「ジャングルのいりぐち」(entry ちく・非秘密・既存 spot)。変更なし |
| **新 spot** | **0 個**。既存 spot の再利用だけで成立した |
| stages | `approach(みなと) → board(ぼうはてい) → depart → sail → arrive → land(いりぐち)`。海の上の 3 段階は `region: null` |
| 非 region の外洋 | `sea.waters = { id:'southwest-open-sea', region: null, role:'beyond', far, note }` |
| way `sail` | `TRANSITION.ways.sail`。approach 0.55 / cross 1.75 / arrive 0.70 / settle 0.35 |
| 世界地図の線 | 海路だけ別ループ。うすい波の線 + 小さな船のしるし。徒歩の道のループは `ln.special` を飛ばす |
| `rim.near` | 未発見の地域 id を渡さないようにした(「がいようのむこうに jungle がある」がデータで漏れていた) |
| `playerEmoji` | `playerGlyph()` は canvas イラスト用の私用領域文字(``)を返すので、生 canvas に描くと □ になる。乗りものの絵では普通の絵文字を使う(**ゴンドラ側の既存の不具合も一緒に直った**) |

## 3. Phase 2.1 の仕組みをそのまま使っている

新しい transition engine は作っていません。

- `approach → cross → arrive → settle` も `transitionPlan` / `transitionPhaseAt` / `transitionCover` も共通
- `regionGates()` が `gate.kind === 'sea'` を `way: 'sail'` に変える。あとは walk / up / down と同じ道を通る
- 2 かいめ 0.62 ばい、reduced motion 0.45 ばい、performance tier の `density` も共通
- 音は sim/world 側の `plan.phases[].cue`。`drawTransition` は音を鳴らさない
- 渡っているあいだ ちず・たび・もどる はロック、その場のボタンは消える。二重に始まらない

**初回と再訪**: 海路だけ `S.worldRegions()` も見て、島をもう見つけている人には
「はじめて島を見つける」長い演出を出しません(セッション内の `crossedBefore` に加えて)。

## 4. 探索率(実データで再計算)

通常 link は `NORMAL_REGIONS` 11 地域どうしを結ぶ connection。削除前 15 本 → 削除後 **14 本**。

`jungle|sea` は special になっても **両端が通常地域なので、これまでどおり分母に入っています**。
つまり「海路を分母に数える」だけでは 15 には戻りません。15 に戻すには `countryside|star_stop`
(ゴンドラ)も分母に入れるしかなく、それをやると **ほしぞらへ行かないと 100% にできなく**なり、
「秘密を 1 つも見つけなくても、ほしぞらへ行かなくても 100%」という正本が壊れます。

そこで **分母 14 を正本にしました**。ユーザーの指示どおり、探索率を 15 に固定するためだけに
不自然な connection は残していません。special でも世界の主要な道として数える、という考え方
(§22)は `jungle|sea` を数えていることで満たしています。

- 旧セーブに `desert|jungle` が残っていても、`gotL` は正本の id しか数えないので無害。移行不要
- weight(0.4 / 0.25 / 0.2 / 0.15)、地域 11・大めじるし 17・地区 103 は無変更
- 471 spot / 654 path / 118 zone / 107 ひみつ も無変更

## 5. 変えていないもの

- `travelToRegion()` — 1 行も変更なし。**歩いて行けなくなっても、たびではこれまでどおりジャングルへ行ける**
- ジャングル region 内部 40 spot / 57 path / 10 zone / 10 ひみつ
- うみ region 内部(35 spot / 10 zone)。新 spot 0、座標変更 0
- さばくの位置(-3.2, 1.4)
- Phase 2 / Phase 2.1 の walk / up / down の演出
- 住民 AI。**住民は船に乗らない**(住民の地域あいだ移動は別 Phase)
- 景色の生きもの。魚・鳥・イルカなどは 1 つも足していない(生きものは住民台帳由来だけ、の原則を維持)

## 6. 確認したこと

- `npm test` 1032 件成功(新規 17 件 + 既存 5 件の書きかえ)
- `tests/meguru-sea-route-test.cjs` 17 件。正本・anchor・非 region の外洋・Phase 2.1 の再利用・
  初回/再訪/reduced/tier・音の分離・往路/復路・party 追従・住民の非搭乗と重複なし・
  二重開始なし・たび不変・Fog・発見条件・地図の線・探索率の分母・内部不変・秘密漏洩なし
- 実画面 iPhone 390×844 / 375×667 / 360×640。うみ → 船 → ジャングル → 船 → うみ を往復。
  はみ出し 0px、`pageerror` 0 件、party 二重 0、住民 二重 0
- 世界地図 4 段階(ジャングル未発見 / 島は見つけたが海路はまだ / 海路も発見 / 100%)を 3 サイズ

### 演出時間(390×844 実測。おした → 操作が戻るまで)

| | 初回 | 復路 | 2 かいめ |
| --- | --- | --- | --- |
| ふつう | 3.63s | 1.98s | 2.09s |
| reduced motion | 1.68s | 1.24s | 1.14s |

正本の計算値は 3.35s / 2.08s / 1.51s。ゴンドラ(2.95s)の 2 ばい以内に収めています。

## 7. Three.js への接続

`connection.sea` は **絵のためのデータではなく world / simulation の意味データ**です。
`stages` の `region: null` の 3 段階がそのまま海上区間になり、`waters` が non-region の
海面 terrain になります。`from.anchor` / `to.anchor` は実在 spot の id なので、
本物の 3D 世界でも同じ場所が港と上陸地点になります。`gate.isleFrom` / `isleTo` も
「島へ渡るのか、島から戻るのか」という意味で、絵の側が region id を直書きせずに済みます。

## 8. 確認していないこと

- 実機(iPhone 本体)での指の操作感・FPS。上の 3 サイズは Playwright の Chromium
- low tier を強制した実機走行(tier での粒の削減は自動テストで固定)
- 住民の地域あいだ移動、regionOrigin、global physical world、Three.js 本体(今回の範囲外)
