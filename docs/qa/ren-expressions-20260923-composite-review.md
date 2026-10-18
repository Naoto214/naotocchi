# れんくん 全80静止合成レビュー

生成非担当3名が全80を独立受理し、主担当も全8シートを実見。全8シートSHAが独立受理対象と一致。顔とマーク/汗の有意な重なりやカード切れなし。必要修正0。既存2400の再目視ではなく追加80の確認。静止汗は近似、実機操作や動的背景は別確認。

# Ren stages 01–04 independent static composite review

Reviewer: unknown_05_06. Reviewed all40 cells of ren01.png–ren04.png; these are not this reviewer’s production stages.

**Result: ACCEPT all40.** No meaningful facial obstruction, clipped sprite/mark, incorrect or clipped state label, lost pacifier/print/ball/backpack, or unwanted extra-face mark was observed. No production PNG or layout was changed.

## Method and limits

Opened all four736×1850 full stage sheets at original stored resolution (2× logical game display). Examined each state’s expression and separate marks, then viewed full-cell nearest-neighbor reductions at1× logical display. The unchanged expression-contact-sheet.cjs embeds actual expression PNGs, production accent SVG/CSS, cast-bounds floor offset, and104px logical canvas at2×. expression-review-gallery.cjs only adds ren’s display name in its current diff.

This is static SVG/PNG review, not a live browser or real-device screenshot. Animation, responsive viewport and backgrounds are omitted. Sick sweat uses the generator’s static mid-travel approximation: two rotated rounded green drops at opacity.85. This does not verify all animation positions. Small facial differences, particularly ren01 with its retained pacifier and low-energy states, benefit from the separate state marks at1×. Sleeping keeps each original body pose by specification, including ren02’s raised arms and ren03’s running pose.

All four sheets show the correct title, ten ordered Japanese labels, complete card boundaries and footer. No character, state mark or accessory is clipped in any full sheet. Native reduction montages are for sprite/mark legibility; their downsampled text is not a production typography assessment.

## Sheet SHA-256

| Sheet | SHA-256 |
|---|---|
| `/workspace/scratch/0e1d599677f2/ren-gallery/ren01.png` | `bf0e0fdca22fe8884c886f77c826bee5415a2942d14eb0299948275c759417cf` |
| `/workspace/scratch/0e1d599677f2/ren-gallery/ren02.png` | `db486e0e3a31e42323744e3babd1e96a525f5d6a598920eb910941dcc9fd437c` |
| `/workspace/scratch/0e1d599677f2/ren-gallery/ren03.png` | `a4590abe3b4b7eafbdfd9e5b4d0947c2197d0544cfb1f7663994495516d4e61e` |
| `/workspace/scratch/0e1d599677f2/ren-gallery/ren04.png` | `d51b1d08c56643371fa8473f713f612cdc4476bcce2e8495c96dc48380749fa5` |

## Stage01

| State | Individual observation | Result |
|---|---|---|
| happy | Raised closed smiling eyes above the pacifier remain readable. Gold stars remain above/right, clear of hair and face. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| strained | Tightly squeezed eyes and tense brows above the pacifier remain readable. Gray zigzag stays above/left, with separation from the hair silhouette. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| hungry | Open pleading eyes above the pacifier remain readable. Yellow food thought icon and bubbles remain above/right, clear of the head. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| sick | Drooped eyes and worried brows above the pacifier remain readable. Green bars stay above the head and both side sweat drops stay outside the face. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| tired | Half-lidded sleepy eyes above the pacifier remain readable. Purple bubbles sit above/right without obscuring hair or eyes. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| sulky | Angled displeased eyes above the pacifier remain readable. Blue cloud remains above/right, clear of the head and face. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| weak | Low eyes and raised inner brows above the pacifier remain readable. Small pink down-arrows remain upper/right, outside the head silhouette. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| critical | Nearly closed exhausted eyes above the pacifier remain readable. Large red down-arrows remain upper/right without covering face or hair. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| wantsPlay | Bright wide eyes above the pacifier remain readable. Three orange rays remain above the head with a visible gap. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |
| sleeping | Peacefully closed eyes above the pacifier remain readable. Blue ascending Z marks stay above/right with separation from hair and closed eyes. Pacifier and crawl pose remain visible; no exposed replacement mouth. | ACCEPT |

## Stage02

| State | Individual observation | Result |
|---|---|---|
| happy | Curved happy eyes and small smile remain readable. Gold stars remain above/right, clear of hair and face. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| strained | Squeezed eyes and tight frown remain readable. Gray zigzag stays above/left, with separation from the hair silhouette. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| hungry | Wide eyes and small open mouth remain readable. Yellow food thought icon and bubbles remain above/right, clear of the head. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| sick | Drooped eyes, worried brows and unwell mouth remain readable. Green bars stay above the head and both side sweat drops stay outside the face. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| tired | Sleepy eyes and tiny slack mouth remain readable. Purple bubbles sit above/right without obscuring hair or eyes. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| sulky | Angled eyes and pout remain readable. Blue cloud remains above/right, clear of the head and face. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| weak | Low eyes and downturned mouth remain readable. Small pink down-arrows remain upper/right, outside the head silhouette. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| critical | Closed strained eyes and stronger frown remain readable. Large red down-arrows remain upper/right without covering face or hair. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| wantsPlay | Wide bright eyes and open smile remain readable. Three orange rays remain above the head with a visible gap. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |
| sleeping | Relaxed closed eyes and tiny mouth remain readable. Blue ascending Z marks stay above/right with separation from hair and closed eyes. Shirt bear-like print stays a clothing motif; no extra facial state or marks were added to it. | ACCEPT |

## Stage03

| State | Individual observation | Result |
|---|---|---|
| happy | Curved eyes and cheerful mouth remain readable. Gold stars remain above/right, clear of hair and face. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| strained | Narrow tense eyes and displeased mouth remain readable. Gray zigzag stays above/left, with separation from the hair silhouette. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| hungry | Wide pleading eyes and small open mouth remain readable. Yellow food thought icon and bubbles remain above/right, clear of the head. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| sick | Drooped eyes and worried mouth remain readable. Green bars stay above the head and both side sweat drops stay outside the face. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| tired | Half-lidded tired eyes and low mouth remain readable. Purple bubbles sit above/right without obscuring hair or eyes. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| sulky | Angled eyes and small pout remain readable. Blue cloud remains above/right, clear of the head and face. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| weak | Low eyes and small frown remain readable. Small pink down-arrows remain upper/right, outside the head silhouette. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| critical | Near-closed eyes and slack open mouth remain readable. Large red down-arrows remain upper/right without covering face or hair. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| wantsPlay | Wide eyes and broad smiling mouth remain readable. Three orange rays remain above the head with a visible gap. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |
| sleeping | Closed eyes and small relaxed mouth remain readable. Blue ascending Z marks stay above/right with separation from hair and closed eyes. Jersey number, running pose and soccer ball remain visible and unobscured. | ACCEPT |

## Stage04

| State | Individual observation | Result |
|---|---|---|
| happy | Closed cheerful eyes and smile remain readable. Gold stars remain above/right, clear of hair and face. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| strained | Tense narrowed eyes and short mouth remain readable. Gray zigzag stays above/left, with separation from the hair silhouette. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| hungry | Pleading open eyes and small open mouth remain readable. Yellow food thought icon and bubbles remain above/right, clear of the head. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| sick | Drooped eyes and worried downturned mouth remain readable. Green bars stay above the head and both side sweat drops stay outside the face. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| tired | Half-lidded eyes and tiny mouth remain readable. Purple bubbles sit above/right without obscuring hair or eyes. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| sulky | Slanted eyes and pout remain readable. Blue cloud remains above/right, clear of the head and face. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| weak | Low eyes and downturned mouth remain readable. Small pink down-arrows remain upper/right, outside the head silhouette. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| critical | Nearly closed eyes and slack mouth remain readable. Large red down-arrows remain upper/right without covering face or hair. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| wantsPlay | Bright open eyes and eager mouth remain readable. Three orange rays remain above the head with a visible gap. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |
| sleeping | Relaxed closed eyes and tiny mouth remain readable. Blue ascending Z marks stay above/right with separation from hair and closed eyes. Backpack, white/navy clothing and stepping pose remain visible and unobscured. | ACCEPT |

## Evidence

- Full2× sheets: `/workspace/scratch/0e1d599677f2/ren-gallery/ren{01,02,03,04}.png`
- Native logical display montages: `/workspace/scratch/0e1d599677f2/ren-composite-inspect/{01,02,03,04}-native.png`

This acceptance applies to the four sheet hashes and static composition scope. Production PNG acceptance and live Site validation remain separate reviews.


# ren 05–06 独立静止合成レビュー

判定: **全20枚 ACCEPT**。必須修正なし。

担当独立性: 本担当はren07/08の生成者であり、レビュー対象ren05/06は制作していない。05/06通常元画像、各736×1850合成シート全体、各状態の顔・マーク部分を無拡縮で目視。PNG・配置は編集していない。

## 最終シートSHA-256

- `/workspace/scratch/0e1d599677f2/ren-gallery/ren05.png`: `492005825217839f8bab14f235d8c2197d8b52b292a66a625818fbbc2b689ed1`
- `/workspace/scratch/0e1d599677f2/ren-gallery/ren06.png`: `f65bda1186e720fb40832bd641a5e013e4016904ebe3aa838e702fe7587197dd`

## 05

05: 全10状態で若者の年齢、髪型、白いフード、青い上着とズボン、靴、リュックと肩紐、立ち姿・手の位置を保持。

| 状態 | 判定 | 所見 |
|---|---|---|
| happy | ACCEPT | 喜びの閉じ目と笑口。金色の星は髪の右上で離れ、顔を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| strained | ACCEPT | 強く閉じた目・寄せた眉・緊張した口。灰色ジグザグは髪の左上に分離。 元の持ち物を保持し、カード端の切れなし。 |
| hungry | ACCEPT | 訴える目と小さく開いた口。黄色の食べ物の思考マークと小丸は髪の右上に収まり接触しない。 元の持ち物を保持し、カード端の切れなし。 |
| sick | ACCEPT | 重い瞼・困り眉・不調の口。緑の横棒は頭上で分離し、左右の静止汗は顔・髪・肩を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| tired | ACCEPT | 半開きの重い目と小さいあくび口。紫の大小丸は右上で分離。 元の持ち物を保持し、カード端の切れなし。 |
| sulky | ACCEPT | 内側へ下がる眉・横目・小さいへの字口。水色の雲は髪の右上を避ける。 元の持ち物を保持し、カード端の切れなし。 |
| weak | ACCEPT | 垂れた瞼と控えめな口で弱り。桃色の下向き矢印は髪の右外側に離れる。 元の持ち物を保持し、カード端の切れなし。 |
| critical | ACCEPT | さらに閉じた目と困り眉・下がった口で危険状態。赤い大きい矢印は頭の右上で明確に分離。 元の持ち物を保持し、カード端の切れなし。 |
| wantsPlay | ACCEPT | 開いた明るい目と笑口で期待。橙3本は頭上に離れ、髪や顔を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| sleeping | ACCEPT | 脱力した閉じ目と小さい口。青いZ列は右上で分離し、通常の笑顔とも区別できる。 元の持ち物を保持し、カード端の切れなし。 |

## 06

06: 全10状態で大人の年齢、髪型、濃色のジャケット・ズボン、明るいシャツ、靴、肩掛け鞄と紐、立ち姿・手の位置を保持。

| 状態 | 判定 | 所見 |
|---|---|---|
| happy | ACCEPT | 喜びの閉じ目と笑口。金色の星は髪の右上で離れ、顔を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| strained | ACCEPT | 強く閉じた目・寄せた眉・緊張した口。灰色ジグザグは髪の左上に分離。 元の持ち物を保持し、カード端の切れなし。 |
| hungry | ACCEPT | 訴える目と小さく開いた口。黄色の食べ物の思考マークと小丸は髪の右上に収まり接触しない。 元の持ち物を保持し、カード端の切れなし。 |
| sick | ACCEPT | 重い瞼・困り眉・不調の口。緑の横棒は頭上で分離し、左右の静止汗は顔・髪・肩を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| tired | ACCEPT | 半開きの重い目と小さいあくび口。紫の大小丸は右上で分離。 元の持ち物を保持し、カード端の切れなし。 |
| sulky | ACCEPT | 内側へ下がる眉・横目・小さいへの字口。水色の雲は髪の右上を避ける。 元の持ち物を保持し、カード端の切れなし。 |
| weak | ACCEPT | 垂れた瞼と控えめな口で弱り。桃色の下向き矢印は髪の右外側に離れる。 元の持ち物を保持し、カード端の切れなし。 |
| critical | ACCEPT | さらに閉じた目と困り眉・下がった口で危険状態。赤い大きい矢印は頭の右上で明確に分離。 元の持ち物を保持し、カード端の切れなし。 |
| wantsPlay | ACCEPT | 開いた明るい目と笑口で期待。橙3本は頭上に離れ、髪や顔を隠さない。 元の持ち物を保持し、カード端の切れなし。 |
| sleeping | ACCEPT | 脱力した閉じ目と小さい口。青いZ列は右上で分離し、通常の笑顔とも区別できる。 元の持ち物を保持し、カード端の切れなし。 |

## 限界

静止した配置関係の確認であり、実機スクリーンショット・ライブ動作・端末幅別表示の検証ではない。シートはゲームの画像と色・マーク座標を用いた2倍表示で、病気の汗は静止近似。背景と動きは省略されている。weak/critical/sleepingの微細な差は顔に加えて既存別レイヤーマークで読み分ける。顔とマークの意味の矛盾は見られない。小さい詳細確認用切り抜きで一部マーク端が欠ける箇所は、元の全シートで完全に収まることを確認済み。


# ren 07–08 独立静止合成レビュー

2026-09-23。担当はren03/04生成者であり、07/08の生成・配置編集には関与していない。ren07.png / ren08.png の各10状態を全体の元解像度と顔周辺の最近傍拡大で実見した。PNG/配置は変更していない。

**20/20 ACCEPT。必要修正0。** 顔の状態方向と別レイヤーマークが一致する。全マークがカード内に収まり、顔・手・身体・08杖を遮らない。

|段階|状態|個別所見|判定|
|---|---|---|---|
|07|happy|喜びの閉じ目と開いた笑口。金色星2個が右上に分離して髪・顔を隠さない。|ACCEPT|
|07|strained|強く絞った目、緊張眉と波形口。灰色折れ線は左上で髪から離れる。|ACCEPT|
|07|hungry|困り眉・開眼・小開口、黄色の食事思考マーク。思考丸は右側に余白を保つ。|ACCEPT|
|07|sick|下がった眉と弱い目口、頭上の緑積層線。左右の緑汗は顔の外側で、耳・髪を覆わない。|ACCEPT|
|07|tired|半眼と小さい開口、右上の紫思考丸。紫丸は髪・顔と分離。|ACCEPT|
|07|sulky|鋭い眉、狭い目と小さい口。右上の青雲は髪端から離れ、顔が見える。|ACCEPT|
|07|weak|心配眉・垂れ目・小さな不調口、細い桃矢印2本。矢印は頭の右上で重ならない。|ACCEPT|
|07|critical|さらに弱い半閉眼と小開口、太い赤矢印2本。顔と矢印は分離し、赤矢印もカード内。|ACCEPT|
|07|wantsPlay|明るい開眼と笑口、頭上の橙3本。髪との間に余白があり、表情を遮らない。|ACCEPT|
|07|sleeping|閉じ目と穏やかな口、右上の青Z。Zは髪・顔から離れ、全身も見える。|ACCEPT|
|08|happy|高齢の顔線を残した笑い目と開口、右上の金色星。白髪・顔・杖の保持を視認。|ACCEPT|
|08|strained|強い目の絞りと眉・口の緊張、左上の灰色折れ線。髪から分離し杖も見える。|ACCEPT|
|08|hungry|困り眉・明るい開眼と小開口、黄色の食事思考マーク。頭右側に余白、杖と干渉しない。|ACCEPT|
|08|sick|下がった眉と半閉眼・不調口、緑積層線と左右の緑汗。汗は頬や耳を覆わず、杖を隠さない。|ACCEPT|
|08|tired|重い半眼と小開口、右上の紫丸。元の顔線と不調表情が見え、紫丸は髪と分離。|ACCEPT|
|08|sulky|眉を寄せた目と小さなむくれ口、青雲。顔線が残り、雲と白髪の境界も離れている。|ACCEPT|
|08|weak|下向きの眉・半閉眼・小さな下向き口、桃色矢印2本。矢印は白髪の右上に分離。|ACCEPT|
|08|critical|ほぼ閉じた弱い目と不調口、太い赤矢印2本。矢印は髪を覆わず、手と杖も見える。|ACCEPT|
|08|wantsPlay|明るい開眼と開いた笑口、橙3本。加齢の顔線・白髪を保持し、橙線は髪上方に分離。|ACCEPT|
|08|sleeping|完全な閉眼と穏やかな小口、青Z。白髪の右側に余白があり、顔・杖を遮らない。|ACCEPT|

## 入力シートSHA-256

- `ren-gallery/ren07.png`（736×1850）: `cf3bf2912cde6a0a97b6315e7c110ac26b6459d67029c9745e8aaa10fa5149c9`
- `ren-gallery/ren08.png`（736×1850）: `48a82f3b76936ef2a3e85cc4844a45d5752a3cf9ea15f3b0194f2924429005af`

拡大補助は `ren-gallery/review-07-08-07-zoom.png` / `ren-gallery/review-07-08-08-zoom.png`。切り出し上端で一部の高いマークを省いたため、クリッピングは完全な入力シートで判定した。

## 確認の限界

画像・色・マーク座標を用いた2倍表示の静止位置確認で、実機やブラウザーの画面キャプチャではない。病気の汗は静止近似であり、アニメーション中の接触、実端末の描画・レスポンシブ配置・背景・画面幅は本レビューの対象外。07/08のweak/critical等は小さな目口の差に加え、既存の別レイヤーマークを併読する。08の加齢による顔線は新たな汗や状態記号ではない。
