# めぐる 2D — scenery polish 第3段階(13 地域の最終 visual QA)

日付: 2026-09-25 ／ 起点 main: **`0180172`**(Merge PR #345、第2段階)
前段: [第1段階](meguru-scenery-polish-audit-2026-09-25.md) ・ [第2段階](meguru-scenery-polish-stage2-2026-09-25.md)

> **visual-only**。save / discovery / spotDiscoveryLevel / corridor / travelToRegion / なかま / 住民 /
> 当たり判定 / 世界地図 / DistantFeature / backdrop の yaw 追従 には触らない。新しい asset・Canvas primitive・props なし。

---

## 0. 第2段階の完了(#345 マージ後の main)

| 項目 | 結果 |
|---|---|
| main HEAD | `0180172`(Merge PR #345。親 `0c884dc` + `d7c7f87`) |
| npm test(main) | 1366 / 1366 |
| CI(main) | smoke-test ✅ ・ home-layout ✅ ・ build ✅ ・ deploy ✅ |

→ **scenery polish 第2段階 完了**(snow の道 / memory_lake の霧 / star_stop の地平線の霞)。

---

## 1. 撮りかた

- 13 地域 × 代表 spot を **day / sunny / 390×844 / 道を歩いて到着した視点**でそろえた(`mid.json` の 13 か所)
- 代表 spot の選び方による偏りをなくすため、**全地域でもう 1 か所ずつ別の代表**を撮った(§3)
- mountain / river_lake / sea は **5 か所ずつ**
- evening / night は 13 地域とも。star_stop は night と別の向き(ていりゅうじょ・つきのみち・そらのはて・ほしのおちるところ)
- 見晴らし: snow げれんでのうえ / mountain ひがしのみね / forest くぼちのみはらし / river_lake かみながれのてんぼう / star_stop ほしのおちるところ・まちあいのひろば
- corridor の入口(着いて地域の奥を向く視点)11 本、第1段階の deco 5 か所(アーチ 2 を含む)
- mobile 390×844 / 375×667 / 360×640

**最終 contact sheet**(コミット済み):
- [final-13-contact.jpg](../qa/meguru-scenery-final-20260925/final-13-contact.jpg) — 13 地域の代表 1 枚ずつ
- [final-13-contact-alt.jpg](../qa/meguru-scenery-final-20260925/final-13-contact-alt.jpg) — 別の代表 spot で 13 地域

---

## 2. 明るさ・彩度・見える数(day、UI をよけた景色だけ)

| 地域 | 代表 spot | 明度 | 彩度 | 画面に描いた数 | 別 spot の明度 / 彩度 |
|---|---|---:|---:|---:|---|
| home | ベンチ | 72% | 39% | 51 | にわ 73% / 36% |
| city | ほそいろじ | 54% | 23% | 168 | えきまえひろば 59% / 22% |
| countryside | かわのつりば | 74% | 32% | 59 | むらのひろば 76% / 31% |
| forest | キノコのこみち | 57% | 27% | 72 | ひだまり 59% / 33% |
| mountain | おねのほそみち | 59% | 17% | 124 | キャンプ 53% / 29% |
| snow | こおりのつりば | 93% | 17% | 19 | ゆきだるまのおか 87% / 16% |
| sea | いわばのしおだまり | 68% | 23% | 74 | さんばし 83% / 33% |
| deepsea | おおきなひかりごけ | 48% | 54% | 89 | サンゴのまち 44% / 60% |
| river_lake | はやせ | 46% | 24% | 123 | あしはら 72% / 36% |
| jungle | たき | 37% | 34% | 117 | はなのたに 54% / 42% |
| desert | オアシス | 76% | 38% | 47 | すなやまのおね 85% / 39% |
| star_stop | はたけのあぜ | 53% | 44% | 22 | まちあいのひろば 60% / 31% |
| memory_lake | きりのおく | 51% | 30% | 130 | みずうみのほとり 53% / 31% |

- いちばん明るい snow(87〜93%)と desert(76〜85%)、いちばん暗い jungle たき(37%)は、どれも地域の性格どおり(雪原 / 砂漠 / 林冠の下)。極端に外れた地域はない
- 彩度は deepsea(54〜60%)と star_stop(31〜44%)が高く、mountain・snow が低い(17%)。**そろえていない**(指示どおり)
- 夜は jungle たき の暗部が 82%(ほぼ黒で、滝だけ光る)、forest・river_lake はやせ が 65%。夜の森として成立しているので記録のみ

---

## 3. 似て見えた組み合わせ(地域名を隠して比べた)

| 組 | 最初の印象 | 再確認 | 判定 |
|---|---|---|---|
| **mountain / river_lake / sea** | 灰色の岩壁が 3 地域とも目立つ | 代表 spot が偏っていた。river_lake の「はやせ」は gorge ゾーン、sea の「いわばのしおだまり」は rocks ゾーンで、どちらも岩場。別の 4 か所ずつで見ると、**river_lake = 丸い広葉樹・あし・しずかな湖面・緑の地面**、**sea = 砂浜・水平線の青い海・ヤシ・とうだい**、**mountain = 灰〜ベージュの岩・針葉樹・雪をかぶった峰**。遠景(lakehills / 海の水平線 / peaks)も別物 | 区別できる。混同なし |
| river_lake / sea | 水辺どうし | 川と湖は緑に囲まれた淡い青、海は砂と濃い青の水平線。夜も river_lake は木のシルエット、sea はとうだいとヤシ | 区別できる |
| mountain / snow | 岩と峰 | snow は画面の 74〜77% が明るい白、mountain は 5〜8%。峰の色も別 | 区別できる |
| forest / jungle | どちらも木が密 | jungle は 🌴・大きな葉・赤い 🌺・湿った暗い林冠。forest は茶色の太い幹・針葉樹・木漏れ日 | 区別できる |
| home / countryside | 生活圏どうし | home は赤い屋根の家と生け垣(住宅地)、countryside は白壁の農家・田んぼ・水車(山村) | 区別できる |
| memory_lake / river_lake / forest | 湖と木 | memory_lake は青紫の霧・ランタン・奥の木が霧に沈む。river_lake と forest は明るい昼の緑 | 区別できる |

**ラベルなしで見た印象**: 13 枚とも、色(地面と空)と主役の形(ビル / 農家 / 幹 / 岩 / 雪 / 砂浜 / サンゴ / 川 / ヤシ / 砂丘 / 星 / 霧)で見分けられる。いちばん近いのは mountain と、river_lake の gorge ゾーンの 1 か所だけ。

---

## 4. 13 地域の判定

評価軸: A 地域が一目で分かる / B 明るさ / C 彩度 / D 密度 / E 空白 / F 前・中・後景 / G 繰り返し / H 遠景との整合 / I UI との競合 / J mobile

| 地域 | A | B | C | D | E | F | G | H | I | J | 判定 | 優先度 | メモ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | GREEN | — | |
| **city** | ○ | ○ | ○ | 密 | ○ | ○ | **✕** | ○ | ○ | ○ | **RED** | **HIGH** | 同じ絵の小さなビル(🏢)が広場や通りに 5〜10 個、同じ大きさ・同じ高さで並び、はんこのように見える(えきまえひろば・ほそいろじ・おおどおりのはし) |
| countryside | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | GREEN | — | |
| forest | ○ | ○ | ○ | 密 | ○ | ○ | △ | ○ | ○ | ○ | GREEN | LOW | 太い幹と枝の重なりは多いが「森」として読める。間引きは不要 |
| mountain | ○ | ○ | 低 | ○ | ○ | ○ | ○ | ○ | ○ | ○ | GREEN | — | 彩度が低いのは岩山の性格 |
| snow | ○ | 高 | 低 | ○ | 意図 | ○ | ○ | ○ | ○ | ○ | GREEN | — | 白 / 青灰 / 薄紫 のバランスは第2段階のまま。青くなりすぎていない |
| sea | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | GREEN | — | |
| deepsea | ○ | 暗 | 高 | ○ | ○ | ○ | ○ | ○ | ○ | ○ | GREEN | — | 上下方向の世界。地上と同じ構図でなくてよい |
| **river_lake** | ○ | ○ | ○ | ○ | ○ | ○ | ○ | **✕ 朝・夜** | ○ | ○ | **RED** | **HIGH** | 朝と夜だけ、川のもやが**ふちの硬い 3 本の帯**になり、画面の上半分を横切る「しましま」に見える(描画の欠け・走査線のように見える)。全 spot で出る |
| jungle | ○ | 暗 | ○ | 密 | ○ | ○ | ○ | ○ | ○ | ○ | YELLOW | MEDIUM | 夜の滝まわりはほぼ黒(暗部 82%)。昼も林冠の下は 37%。性格どおりだが、夜の見どころが滝だけになる |
| desert | ○ | ○ | ○ | 疎 | 意図 | ○ | ○ | ○ | ○ | ○ | GREEN | — | 砂丘の単色感(第2段階 MEDIUM)は、13 地域の中で唯一の暖かい黄で、かえって識別の決め手になっている。問題なし |
| star_stop | ○ | ○ | 高 | 疎 | 意図 | ○ | ○ | △ | △ | ○ | YELLOW | LOW | ① ほしのおちるところ(見晴らし・昼)で、地平線の下にうすい灰緑のもやが 1 本残る(硬い帯ではない。夜・ていりゅうじょ・つきのみち・そらのはて では再発なし)。② まちあいのひろば に「奥向き」で立つと、ていりゅうじょの大きな看板がカメラの目の前で半透明になる(第1段階から同じ。ゴンドラの到着向きと同じかは未確認) |
| memory_lake | ○ | ○ | ○ | ○ | 意図 | ○ | ○ | ○ | ○ | ○ | GREEN | — | 霧の改善後、river_lake・forest と明確に違う |

**RED = city / river_lake の 2 地域**(上限 3)。YELLOW と LOW は記録のみ。

---

## 5. 直した 2 地域

### 5.1 city — 同じビルを 1 つずつ違う大きさ・高さで描く

- `EMOJI_VARY`(地域ごとの表)と `emojiVary(regionId, emoji, x, z)` を追加。**city の 🏢 / 🏬 だけ**
- 描くときの幅を 0.8〜1.2 倍(🏬 は 0.86〜1.12)、高さをさらに最大 1.25 倍(🏬 は 1.12)まで、**位置(x, z)から決める**(毎回同じ・seed の契約はそのまま)
- `drawGlyph()` に幅・高さの掛け算 `kw / kh`(既定 1)を足しただけ。ほかの呼び出しは何も変わらない
- `prop.size`・位置・当たり判定・`buildWorld()` の出力は変わらない。1 フレームの描画命令は ±1(大きさで遠くの 1 つが描かれる/描かれないの差)

before / after: [city-before-after.jpg](../qa/meguru-scenery-final-20260925/city-before-after.jpg)(左が before)。えきまえひろばの手前のビルが、低いもの・高いもの・細いものに分かれ、はんこの並びが崩れた。

### 5.2 river_lake — 朝・夜の川のもやを、ふちをぼかした 1 枚に

- `drawCanopy()` の `rivermist`: 3 本の `fillRect`(ふちが硬い帯) → **縦のグラデーション 1 枚**(`RIVERMIST_STOPS`)
- 3 つの山(0.17 / 0.5 / 0.83)は、もとの 3 本の帯の真ん中と同じ高さ。いちばん濃いところで 0.12(もとの 0.14 を超えない)、上と下のふちは透明
- 昼は描かない(もとと同じ)。描画命令は 3 → 1(fillRect)+ グラデーション 1

before / after: [river_lake-night-before-after.jpg](../qa/meguru-scenery-final-20260925/river_lake-night-before-after.jpg)(あしはら・夜、左が before)。しましまが消え、木々の上にうすいもやが残る。

---

## 6. 変えていないもの(main `0180172` と実測で比較)

| 項目 | 結果 |
|---|---|
| spot 471 / path 654 / zone 118 / secret 107 / tier1 17 / link 分母 12 | 一致 |
| L0 184 / L2 216 / L3 71 | 一致 |
| DistantFeature 37(地域ごとも) | 一致 |
| gate 13 地域 | 一致 |
| 当たり判定の fingerprint 13 地域 | 13 / 13 一致 |
| **world 出力**(13 地域すべて、`buildWorld()` 全体のハッシュ) | **13 / 13 一致**(今回の変更は描くときだけ) |
| save / corridor / travelToRegion / なかま / 住民 / 世界地図 | 差分 0 行 |
| 第1段階の deco 5 か所・アーチ 2 か所 | 5 / 5 画面内。いわのアーチ・ほねのアーチの形はそのまま |
| forest.fallslook の solid bigtrunk | 触っていない |

---

## 7. performance(にせの ctx、200 フレーム × 2 回の小さい方)

| 地点 | props | 命令 / フレーム | p50 ms | p95 ms |
|---|---|---|---|---|
| city えきまえひろば day | 1013 → 1013 | 7934 → 7934 | 14.5 → 14.1 | 28.6 → 28.3 |
| city ほそいろじ night | 1013 → 1013 | 7069 → 7068 | 14.9 → 15.6 | 29.1 → 30.7 |
| city おおどおりのはし day | 1013 → 1013 | 5704 → 5704 | 13.3 → 13.8 | 26.2 → 25.8 |
| river_lake あしはら night | 677 → 677 | 8776 → 8775 | 23.0 → 22.1 | 44.9 → 43.6 |
| river_lake みずうみ morning | 677 → 677 | 3200 → 3199 | 20.3 → 20.1 | 41.3 → 40.5 |
| river_lake はやせ night | 677 → 677 | 7721 → 7720 | 24.7 → 25.0 | 49.5 → 49.5 |

命令数は ±1。時間の差は、同じ機械で npm test と並行して測った揺れの範囲(増える向き・減る向きの両方がある)。

---

## 8. mobile / UI

- 390×844 / 375×667 / 360×640 で 13 地域の代表 + city 4 + river_lake 夜 4 = **47 枚、すべて到着・JS error 0・pad とボタンの重なり 0・はみ出し 0・スクロール 0・主役が自分にかかる 0%**
- corridor の入口 11 本(着いて地域の奥を向く視点): 11 / 11 到着、JS error 0
- UI(下の発見トースト・右下の地図ボタン)が主役を隠している画面はない

---

## 9. テスト(`tests/meguru-scenery-final-qa-test.cjs`、12 件)

- city: ばらつきは city の 🏢/🏬 だけ(ほかの 12 地域と ほかの絵文字は null)/ 決定的・範囲内・十分にばらける / 描くところで渡す・`drawGlyph` の既定は 1 / 実フレームで同じ絵の縦横比が 3 通り以上 / props 1013・障害物 390・collider 565
- river_lake(night / morning): もやのグラデーション(7 つの止まり)を実際に塗る・ふちは透明・0.14 を超えない・硬い帯は残っていない / 昼は描かない / 山の位置はもとの帯の真ん中 / props 677・障害物 294・collider 368
- 不変: counts・L0/L2/L3・DistantFeature 37 / save の形

**mutation(7 パターン、すべて赤)**

| 変異 | 落ちたテスト |
|---|---|
| 描くところのばらつきを消す | 2 |
| `drawGlyph` で高さの掛け算を無視 | 1 |
| ばらつきを river_lake にも | 1 |
| 幅を 1 に固定(高さだけ) | 1 |
| もやを硬い 3 本の帯に戻す | 2 |
| もやのふちを硬く | 3 |
| もやを昼にも描く | 1 |

---

## 10. scenery polish 全体の判定

| 完了条件 | 結果 |
|---|---|
| 13 地域に明確な個性 | ✅ ラベルなしで 13 地域を見分けられる(§3) |
| 主要 spot 名と実画面が一致 | ✅ 第1段階(deco 5・アーチ 2)で直した所を含めて回帰なし |
| 密度が破綻していない | ✅ city / forest / jungle は密だが読める。snow / desert / star_stop の空白は意図どおり |
| mobile 正常 | ✅ 3 サイズ |
| performance 悪化なし | ✅ 命令数 ±1 |
| counts / collision / discovery 不変 | ✅ |
| npm test GREEN / CI GREEN | ✅(PR の CI は §11) |

**判定: B(軽微な残りあり)** — visual polish としては完了扱いでよい。残りは YELLOW / LOW の記録だけで、どれも次の段階を必要としない。

### たきのみはらし(forest.fallslook)の solid bigtrunk

visual polish の完了を**止めない**。見た目の問題ではなく、solid の位置(当たり判定)を変える必要があるので、別タスク(Release Hardening か collision の整理)へ送る。

### Release Hardening へ移れるか

**移ってよい**。見た目の側で RH を待たせるものはない。RH の中身は Phase 4E 完了時の記録どおり(forest / mountain 到着時の描画コスト、city の p95、corridor のまれな 60 ms 超え、なかまの障害物めりこみ RH-7)に、fallslook の solid bigtrunk を加える。**実装はまだ始めていない。**

## 11. 残課題(記録のみ)

| 地域 | 優先度 | 中身 |
|---|---|---|
| jungle | MEDIUM | 夜の滝まわりがほぼ黒。見どころが滝だけになる |
| star_stop | LOW | ほしのおちるところ(昼)の地平線の下に、うすい灰緑のもやが 1 本残る |
| star_stop | LOW | まちあいのひろばで奥を向くと、ていりゅうじょの看板が目の前で半透明になる(第1段階から。ゴンドラの到着向きかは要確認) |
| forest | LOW | 太い幹と枝の重なり。間引きは不要と判断 |
| forest.fallslook | 別タスク | solid bigtrunk(当たり判定の変更が必要) |
| city 性能 | RH | p95 26〜30 ms(Phase 4E からの持ち越し) |

---

## 12. scenery polish 全体の完了(正本)

> **めぐる 2D の scenery polish は完了。最終判定 B(軽微な残りあり)だが、visual polish としては完了。**
> 残りは §11 の記録だけで、どれもゲームの進行を壊さない。完了を止めるものはない。

### 12.1 3 段階

| 段階 | PR / main | 中身 | 判定 | 記録 |
|---|---|---|---|---|
| 第1段階: 明らかな欠落・弱い景観 | #344 / `0c884dc` | ほしのおちるところ(starfall)・げれんでのうえ(snow slopetop)・ゆきやま(snow peak)に deco。いわのアーチ(rock arch)・ほねのアーチ(bone arch)を汎用 arch で | A 採用 | [第1段階](meguru-scenery-polish-audit-2026-09-25.md) |
| 第2段階: 地域差別化 | #345 / `0180172` | snow の道と雪面・memory_lake の霧・star_stop の地平線の霞 | A 採用 | [第2段階](meguru-scenery-polish-stage2-2026-09-25.md) |
| 第3段階: 13 地域の最終 visual QA | #346(この PR) | 全地域の横断確認・city のビルの繰り返し・river_lake の夜と朝のもや | B(完了扱い) | この文書 |

マージ後の main は #346 の merge commit。

### 12.2 最終状態(めぐる 2D visual)

| 項目 | 状態 |
|---|---|
| 13 地域すべての監査 | ✅ 済み(第1段階でデータ + 実画面、第3段階で横断) |
| 主要 spot 名と実画面の一致 | ✅ 名前が約束するものが画面にある(第1段階の 5 か所を含む) |
| 地域差別化 | ✅ ラベルなしで 13 地域を見分けられる(§3) |
| density | ✅ city / forest / jungle は密だが読める。snow / desert / star_stop / memory_lake の空白は意図どおり |
| mobile | ✅ 390×844 / 375×667 / 360×640 |
| performance | ✅ 回帰なし(3 段階とも描画命令 ±数個、props はアーチ・deco の分だけ) |
| counts / collision / gate / discovery / save / corridor / なかま / 住民 / DistantFeature 37 | ✅ 3 段階とも不変 |

### 12.3 Release Hardening / post-4E backlog へ送るもの(実装はしていない)

| 項目 | 由来 |
|---|---|
| forest.fallslook(たきのみはらし)の solid bigtrunk | 当たり判定の変更が必要で、visual-only の範囲外 |
| なかまが障害物にめりこむ既存バグ(RH-7) | Phase 4E 完了時 |
| forest / mountain に着くときの描画コスト | Phase 4E 完了時 |
| city 系のふだんの描画コスト(p95) | Phase 4E 完了時 |
| jungle の夜の暗さ | 第3段階 YELLOW |
| star_stop の軽微な 2 件(地平線の下のうすいもや / ていりゅうじょの看板) | 第3段階 YELLOW |

forest の幹と枝の重なり(LOW)は、間引き不要の判断のまま記録のみ。

### 12.4 Three.js

**不要の判断を維持**。2D Canvas で完成品質(13 地域の個性・遠景・歩いて越える移動・mobile 3 サイズ)に達している。Three.js は将来の PoC 扱い。

### 12.5 この後

このタブ(飾り付け)は scenery polish の完了で閉じる。新しい visual polish・collision の修正・Release Hardening の実装・なかまの障害物・region registry・Three.js には進んでいない。
