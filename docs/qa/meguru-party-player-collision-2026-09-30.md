# めぐる party / player の すりぬけ 最小修正 — QA 記録(2026-09-30)

基準: `main` `05b31dfd`(Merge PR #358 = RH-11)
branch: `claude/naotocchi-party-player-collision-fix`
監査(正本): `docs/audit/meguru-collision-audit-2026-09-29.md`、`tools/audit/meguru-collision-audit.cjs` / `meguru-corridor-depth.cjs`

変えた production は `meguru.js` だけ(`index.html` は その token)。けしきの 配置・props の かず・道の はば・corridor の 作り・transition・travel・save・見た目の テーマは かえて いない。collision の 全面改修・3D は して いない。

## 1. なにを なおしたか

### C1 なかまの 歩行に あたりが なかった(必ず 修正)

3 つに わけた(player の コードの コピーでは ない):

| 役わり | 関数 | 中身 |
|---|---|---|
| ならびに ついていく | `partyFollowStep` | どこへ どれだけ すすみたいか だけ |
| あたりの 解決 | `moveWithCollision` | player・住人と **おなじ 関数**(半径 `PARTY_RADIUS`) |
| まわりこみ | `reachSlot` / `partyAvoid` | ならびの 点を player から まっすぐ 行ける ところまで よこに ちぢめる。かどに 4 秒 はさまった ときだけ ならびの そばへ もどす |

- `placeParty`(地域に 入った とき)も `reachSlot` を とおす(生け垣の むこうに おかない)。
- corridor: player と なかまが おなじ `corridorBody(s, u, rad)`(帯の はば + はしの いし)。なかまの 1 frame の うごき(+ おしもどし)は ふだんの 歩幅 まで(とばない)。
- corridor の はしの いしは 帯の はしから 16(からだ 1 つ ぶん より ちかい)。そとへ おすと 帯の はばで もどされて player も なかまも すりぬけて いた → **うちがわを まわる**。

半径: **player 22(`RULES.bodyRadius`)、住人と なかま 17.6(× `STAND_CLEAR` 0.8)** の まま。なかまを 22 に すると ならびの すきま(spacing 30)と RH-7 の `clearSlot`・住人の 立ちいち が ずれる。そろえるのは 3D で(監査 §3D 条件)。

### C2〜C4 見た目は かたいのに あたりが ない / ずれて いる(最小)

- `fore` 層の かたい 3 種(`ledgerock`・`guardpost`・`fencerail`)を solid(草・花・葉は とおれる まま)。
- ちいさな struct の かたい もの(`stump`・`log`・`driftwood`・`bigrock`・`riverrock`・`hayroll`)を solid。かさなりの 丸太も solid。
- 道ばた(`side` 層)の 絵文字を solid(あたりの 形は いままでどおり `colliderOf` が 木・建物・岩の ときだけ つける)。
- 道の そばの かたく 見える 物(建物・岩・がけ・木・柵、role が solid の もの)は `clearCorridor` で **あたり だけ 消さず**、道と 反対がわへ ずらして のこす(`fitOffRoad`)。
  - 道の 通行帯(half + 26)は あけた まま。`bandClear` で 箱の かどを 道に そって じっさいに しらべる。
  - たて看板(建物・がけ = `OCCLUDER_SHIFT`)は 画面の みぎへ えがく ため、見る むきで 道の どちらがわに 出るかが かわる。**もとの あたりの そとへは 出さない**(道がわを けずる だけ。見えない かべを つくらない)。
  - 水・世界の ふち(boundary)は いままでどおり。

## 2. before / after(監査の 物差し)

### なかま(27 にん)の めりこみ — `meguru-collision-audit.cjs`(4000 frame)

| | forest | mountain | city |
|---|---|---|---|
| 障害物 | 469 → 531 | 336 → 439 | 390 → 573 |
| なかまが めりこんだ frame | **2980 → 0** | **2900 → 0** | **3536 → 0** |
| player の めりこみ frame | 0 → 0 | 0 → 0 | 0 → 0 |

### corridor(10 本 × 両むき) — `meguru-corridor-depth.cjs`

| | before | after |
|---|---|---|
| なかまが いしに ふかく 入った frame | **1709** | **0** |
| なかまの いちばん ふかい | 40 | 19 |
| player が いしに ふかく 入った frame | 28 | 13 |
| player の いちばん ふかい | 14 | 13 |

のこりは chart の s が 10 きざみ な ことと、chart と world の ひずみ(player も 同じ。3D へ)。

### player が 見た目の 中心部に 立てるか — `meguru-collision-audit.cjs stand`(歩き方に よらない)

かたく 見える 物(木・建物・岩・柵・landmark)の 絵の 中心(たて看板は ずらした 中心)に 半径 22 の からだが 立てる 数。

| | forest | mountain | city |
|---|---|---|---|
| 道の そと | **64 → 22**(548 のうち) | **145 → 64**(499) | **184 → 53**(609) |
| 道の 面の うえ(のこり、§4) | 136 → 136 | 76 → 76 | 106 → 106 |
| 中心 + 8 点 で 立てる 点 | 1815 → 1477 / 6156 | 1993 → 1362 / 5175 | 2647 → 1650 / 6435 |

種類べつ(中心に 立てる 数): forest 木 163 → 123・岩 34 → 32、mountain 岩 148 → 91・木 61 → 40・建物 11 → 8、city 建物 143 → 80・柵 127 → 64・木 20 → 15。

### あるいた 跡の 物差し(`core`、12000 frame)— 参考

| | forest | mountain | city |
|---|---|---|---|
| player が 中心部に いた frame | 79 → 0 | 387 → 301 | 1297 → 4199 |
| なかまが 中心部に いた frame | 6767 → 589 | 5434 → 3120 | 6851 → 9315 |
| player が 壁を おして とまった frame | 42 → 75 | 51 → 122 | 41 → 313 |

この 物差しは 歩いた 跡しだい。city では でたらめ歩きが 建物に ぶつかって その そば(= 道の 面の うえの たて看板の 中心部)に ながく いる ため ふえる。上の `stand` を 正本に する。とまった 場所は すべて どこかの むきへ 0.5 秒で 20 いじょう うごける(はまり 0。main と 同じ)。

### 速さ(Node、27 にん、1 step)

| | main | after |
|---|---|---|
| forest | 0.19 ms(p95 0.26) | 0.45 ms(p95 0.69) |
| mountain | 0.19 ms(p95 0.33) | 0.48 ms(p95 0.88) |
| city | 0.21 ms(p95 0.33) | 0.67 ms(p95 1.24) |

ふえた ぶんは ほぼ「なかま 27 にんに あたりが ある」こと そのもの。線の しらべは 線の ちかくの あたり だけ、ちぢめる わりあいは 4 frame に 1 かい。描画は かわらない。

## 3. テスト

- 専用 `tests/meguru-party-player-collision-test.cjs`(8):なかまの めりこみ 0.5 いか / player の みちは なかまで かわらない / かたい 物の solid / 道の 3/4 の なかは あく・はしの かすりは main(12)いか / 中心に 立てる 数が main の 半分 いか / corridor の いし / まわりこみ と セーブ / たて看板は もとの あたりの なか。
- 意図した 変更で 値を かえた もの(コメントに まえの 値):
  - 障害物・当たりの かず: `meguru-scenery-final-qa`(city 390 → 573・river_lake 294 → 325)、`meguru-scenery-polish2`(snow・star_stop・memory_lake)、`meguru-visual-completion`(forest 469 → 531・jungle 552 → 593)。props の かずは どこも かわらない。
  - `meguru-phase3b3` の めくら うち: 山ごえ 9 → 6(オフィスがいの 建物の あいだ から はじめた 3 本が 建物で とまる)。出口 そのものは かわらない。
  - `meguru-party-arrival` の めりこみの しきい値 0 → 0.5: すべりながら ふれる ぶん(0.00x)を 数えない。
  - `meguru-scenery-polish` の アーチの よびだし: 時刻を すすめて くらべて いたので 波・住人の ぶれ(±500)が アーチ(~600)に まざって いた → おなじ frame で くらべる(main でも 緑)。
- remove-it(1 つずつ もどす): なかまの あたり・fore・`fitOffRoad` の 符号・corridor の うちがわ・`reachSlot`・`bandClear`・道の あき・ちいさな solid の 8 つは 赤。たて看板の そとがわの 上限は 箱の おさまり(`fits`)が 先に きく ので 単独では 赤に ならない(二重の まもり)。
- `npm test` 1522 / 1522。

## 4. のこり(判断が いる もの / 3D へ)

- **道の 面の うえに ねもとが ある かたい 物**(forest 136・mountain 76・city 106): あたりを つけると 道を ふさぐ。配置を かえる(生成で 見た目を おかない)か、道を ふさぐ ことを みとめるか、3D へ まわすか の 判断が いる(停止条件「map 配置を 変更しないと 解決できない」)。この PR では さわって いない。
- たて看板の 絵が 見る むきで 道の どちらがわに 出るかが かわる(2D の 絵の しくみ。3D へ)。
- 半径の 統一(player 22 / なかま・住人 17.6)は 3D へ。
- かどに 4 秒 はさまった なかまは ならびの そばへ もどる(city で 6000 frame × 27 にん に 5 かい)。
- corridor の chart の きざみ・ひずみ による のこり(player 13・なかま 19 の かすり)。
- 10 本の corridor・3 つの transition・memory_lake の 除外・save・travel は かえて いない(既存の テストが 全部 緑)。
