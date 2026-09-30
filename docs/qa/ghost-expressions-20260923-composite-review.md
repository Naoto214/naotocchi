# おばけ80表情 独立合成レビュー

全80を制作・配置の当該担当以外が目視し受理。01〜06は07〜08の画像担当、07〜08は02の画像担当が独立確認。主担当も全8合成を実見。全2160マーク/1296汗動作範囲の検査はissues0。

# Ghost 01–06 独立合成レビュー

対象：ghost-gallery/ghost01.png〜ghost06.png、計60状態。レビュアーは07〜08生成担当であり、01〜06の生成には関与していない。各6ページの10カードをすべて目視し、ghost-inspect/originals.pngの原キャラクター意匠と比較した。

結論：現版60/60を合成表示として受理。顔、身体、元の飾りとマークの有害な衝突なし。全段階で1体1顔を確認。

状態マークは全段階で同じ語彙を保持：happy=金星2個、strained=灰色ジグザグ1個、hungry=黄の思考丸3個＋魚1個、sick=緑の横線4本＋左右汗2個、tired=紫丸2個、sulky=水色雲1個、weak=桃色下矢印2本、critical=赤色下矢印2本、wantsPlay=橙放射3本、sleeping=青Z3個。矢印の下向き、放射の外向き、魚・Z等の向きも全段階で一致。

表情の意味：喜びは笑った目と口、つらいは苦しい目眉、空腹は期待/懇願する目口、病気は重い目と不快な口、疲れは眠そうな目、すねるは細い目/への字、弱りは垂れた目口、危険は強く苦しむ目口、かまっては大きい目と開いた口、睡眠は閉じた目で表現。極小の顔では不調系の相互識別が弱いカードもあるが、マークとの合成で各状態を区別できる。

## 段階別確認

### 01 — 10/10受理

小さなたましい：上へ曲がる青い尾の方向、白い球状身体、青縁を保持。全10状態で1体1顔。マーク・病気の左右汗は顔・尾に重ならない。

合成PNG SHA256: `2f3dcf9a1cd9f528577f4dbfe59da042e3cf1f16fc4bc8cde9fd02d1973f48ae`
当該10表情PNG連結SHA256（ファイル名昇順）: `ab7b7e6d0910acbccc4922bc7897d4fcd1770fbec3cdce9eb5861bd4f8fc5ec1`

### 02 — 10/10受理

ちびおばけ：白紫の丸い身体と左へ流れる尾を保持。全10状態のマークは外側にあり、顔と尾を遮らない。

合成PNG SHA256: `7f2e48224379479954df50ce373fc944e7a4700b52125732dcda545e1731786c`
当該10表情PNG連結SHA256（ファイル名昇順）: `125dc9ef091098166a4aa7e161e529c893d16646d01ef6f1d867d98e39c5b3e3`

### 03 — 10/10受理

いたずらおばけ：白紫の身体、左右の手、元の桃色の頬、左へ流れる尾を保持。頬は追加の汗・涙ではない。全状態のマークは頬・手・顔と分離。

合成PNG SHA256: `fa3a62c46ddf57f0bbface88ce64dd7bc3409c1eb4cc4a07c1c9128b6ced90af`
当該10表情PNG連結SHA256（ファイル名昇順）: `e1bbd4bf0926604cd7c1fa7242253744b6f1dc521efb0e415d8d4c1d681d8fe8`

### 04 — 10/10受理

おばけ：白紫の身体、丸い両手、下に分かれる尾、青い輪郭を保持。全10状態の外付けマークは身体・手・顔を遮らない。

合成PNG SHA256: `ad2ee80722915c453d417072a399677b60d648f436a15a4691117fb307e01c7f`
当該10表情PNG連結SHA256（ファイル名昇順）: `5f43d7b1a9a7f16407c0b8f922d158da4ece5fea27eca36c784c5fc0c7770201`

### 05 — 10/10受理

大きなおばけ：上で左へ曲がる頭の先、広げた両腕、左上の青火1個と小さい火の先を保持。病気の左汗と元の青火は近接するが重なっていない。金星や放射も青火・頭の先から分離。

合成PNG SHA256: `de9d01445793af48ff4b729f672834245cc63d194e1aa137006258cb60e8050d`
当該10表情PNG連結SHA256（ファイル名昇順）: `5474cf645c5c01d5d0c17fff376e6ebafc852c943355da44cdf499e533147def`

### 06 — 10/10受理

昔からいるおばけ：長くうねる頭の先、ひだ状の身体・尾、左1右2の青火3個、左下の小さい光を保持。病気の汗は頭の上の空間に配置され青火・顔を覆わない。wantsPlayは修正後の開いた目と口を確認し、橙の放射3本と頭の先の分離を確認。

合成PNG SHA256: `fc3c810ab172ddda026ef951f3367334b10ce2ae4871f719178357464632dfee`
当該10表情PNG連結SHA256（ファイル名昇順）: `3289c481cb1c3433229fb920b006dfc0dcdc7f539bffd3d7b321dde575a939e3`

## 確認範囲と制約

レビュー画像はゲームの画像・色・座標を用いた2倍表示の静止合成で、実機スクリーンショットではない。病気の汗は静止した近似表示であり、動作中の軌道・重なり・点滅はこのレビューでは検証していない。背景・動き・実際の画面幅は省略されている。原寸128pxでの最終視認性や端末の拡縮条件には制約があり、本報告は原寸実機検証済みを意味しない。元意匠・マークの個数・色・向きの保持は見た範囲の視覚判定で、バイト完全同一性の主張ではない。


# Ghost 07–08 independent composite review

Reviewer: ghost_02, author of stage 02 assets only; not author of stage 07/08 PNGs or any placement values. Read-only review of both full sheets using view_image; all 20 cells individually inspected. This accepts static composites, not live browser behavior or movement.

Sources:
- `ghost-gallery/ghost07.png`, SHA256 `c39e3c26a4cc2329351b417bd0e27a681af319f3ec47ddcd828db600e4f3e80f`
- `ghost-gallery/ghost08.png`, SHA256 `bcc89776d6bf6e3c394d00193b15cea222deffb1b68faf07b15a982cd4b63046`

|State|07|08|
|---|---|---|
|happy|Accept: smiling face, gold state sparkles distinct from halo and four blue flames.|Accept: cheerful face, gold state sparkles read separately from original small star pattern.|
|strained|Accept: tense face, gray zigzag above-left avoids face/halo.|Accept: distressed face, gray zigzag above-left avoids halo and face.|
|hungry|Accept: pleading open face, yellow fish/thought bubbles clear above-right.|Accept: eager hungry face, yellow fish/thought bubbles clear of halo and decorative stars.|
|sick|Accept: drooped ill face; green bars above, two green sweat drops outside flames and body.|Accept: ill face, green bars above halo, green sweat drops outside stars/body.|
|tired|Accept: lowered lids/open weary mouth; purple bubbles away from face/halo.|Accept: weary face; purple bubbles above-right clear of original stars.|
|sulky|Accept: angry/pouting face; blue cloud above-right separated from flame.|Accept: lowered brows; blue cloud above-right separated from halo/stars.|
|weak|Accept: drooping face; smaller pink down arrows clear of halo/right flame.|Accept: faint drooping face; pink arrows distinct from original stars.|
|critical|Accept: more distressed face; large red arrows above-right, clear of flame/face.|Accept: distressed face; large red arrows clear of halo and face.|
|wantsPlay|Accept: bright eyes/smile; orange invitation rays centered above halo.|Accept: eager eyes/open smile; orange rays above halo without concealing decoration.|
|sleeping|Accept: peaceful closed eyes/small mouth; blue ZZZ above-right clear of flame.|Accept: peaceful closed eyes/relaxed mouth; ZZZ above-right clear of halo and stars.|

All 20 retain the single main face and body; 07 retains joined hands, one halo and four blue flames; 08 retains slender luminous body, long tail, halo and surrounding stars. No extra face appears in decorations. Shared marks remain separate from PNG art, and no face duplicates or doubled state marks were seen. No clipping, unreadable face overlap, or mark/body collision was visible at the sheet's 2× render. Sick sweat is a static approximation, so animation clearance remains a checker/live-preview matter.

Verdict: **20/20 static composites accepted**. Critical/Important/Minor findings: none. No regeneration or placement change requested.


