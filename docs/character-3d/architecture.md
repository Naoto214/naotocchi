# Character 3D System — architecture / Full Rollout v0

状態: **Full Rollout v0 制作中**。2026-10-04のHuman QAでPilotから全量展開へ進むことを承認。全量採用・Ready・main mergeの承認ではない。Pilot正本 `d12ad70550b29c125f44ac2b32d7195905fb15f0` / #372を保持し、#376（Draft、base=Pilot）で展開する。
現在の正本: [Full Rollout設計](full-rollout-v0/design.md)・[Visual Translation Rules](full-rollout-v0/visual-translation-rules.md)・[checkpoint](full-rollout-v0/progress.md)。以下のPilot仕様・測定はreference implementationの記録であり、Full Rollout完了値ではない。
QA 記録: [`docs/qa/character-3d-pilot-2026-10-01.md`](../qa/character-3d-pilot-2026-10-01.md)

## 1. Goals / Non-goals

**Goals**
- 既存の なおとっち 2D 画像(`assets/characters/**`)だけを デザインの 正本に した、再利用できる Character 3D architecture。
- 「既存の なおとっちを 知っている 人が、3D でも『同じ 子だ』と 感じる」ことを 最優先。
- 少数の archetype builder + species / stage の 数字 + attachment + 共有 material で 全量へ ひろげられる 形。
- 既存の Expression System(canonical emotion)を そのまま 入力に する(3D 専用の 感情体系を つくらない)。
- めぐる の 同じ actor state を 2D billboard / 3D model の どちらでも presentation できる(状態は 複製しない)。

**Non-goals(Pilot時点。全量展開の開始承認は上記へ更新)**
- Pilotは8系統に限定した。現在はarchetype wave方式で全speciesへ展開する。
- セーブ / schema / 2D 画像 / Expression PNG / Home・Relationship の runtime の 変更。
- World 3D の Art Direction(ひかり・きり・カメラ)の 変更。未 merge の World lane(#367 / #369)・#368 の 取りこみ。
- 外部の 3D asset(ライセンス 不明の model)。Blender 前提の 制作(この 環境に Blender は ない → `NOT_RUN`)。

## 2. Data flow

```
species ─► body archetype ─► species parameters ─► stage parameters ─► attachments
   (spec.js: PLAYER_LINES / PILOT)      (spec.js の 数字と 2D 由来の 色)
        ─► material(共有 頂点色 Lambert)─► rig(bone = THREE.Group)─► locomotion(archetype ごと)
        ─► canonical emotion(#368 の 8 語)─► EXPRESSION_3D(顔 / からだ の 数字)─► presentation renderer
                                                                         (runtime.mjs presenter → meguru-3d.mjs / gallery)
```

| file | 役割 |
|---|---|
| `character-3d/spec.js` | 正本データ(UMD・three なし)。全 species inventory・archetype・pilot の species / stage 数字・canonical emotion → 3D 表情 adapter・actor → spec key |
| `character-3d/geometry.mjs` | 形の 道具。変形球 `blob`・回転体 `lathe`・太さが かわる `sweep`・格子面 `sheet` / `fan`・法線の 継ぎ目 ならし・頂点色・顔の 投影(raycast) |
| `character-3d/rig.mjs` | 共有 material・`Rig`(bone)・目の 形の ライブラリ・顔 atlas(canvas)・顔の 3 方式(A / B / C) |
| `character-3d/archetypes.mjs` | archetype builder(12 個)。species 専用の 関数は ない |
| `character-3d/animate.mjs` | locomotion + emotion posture + reaction の layer・まばたき・reduced motion |
| `character-3d/runtime.mjs` | presenter: lazy template cache・actor ごとの instance・fit(2D の 絵の 大きさ)・fallback・cleanup・stats |
| `character-3d/gallery.html` | QA 専用 gallery(セーブを つかわない) |
| `meguru-3d.mjs` | `&char3d=1` の ときだけ runtime を dynamic import し、pilot の actor を 3D、それ以外を 立て看板で |

## 3. Full species inventory(実データ)

master(`character-world-master.v1.js`)の 31 player line × 8 段 + なかま 26 + こいびと 18 + 作者 1 = **293 行**(`SPEC.inventory()`)。
変態する species が ある ので **archetype は 段ごと**(例: ちょう 01-04 larva → 05 pod → 06-08 winged_insect)。

| archetype | 行 | pilot builder | おもな species |
|---|---:|---|---|
| quadruped | 56 | ✅ | いぬ・ねこ・かめ(甲羅)・かえる成体・りゅう(つばさ)・しば・ねこ・たぬき・パンダ・うし・クマ・シカ・ワニ … |
| humanoid | 45 | ✅ | 人(man / woman / ren)・天使・ぬいぐるみ・サル・ロボ・ねこ社長・にんぎょ(尾)・ゴリラ・作者 |
| arthropod | 29 | planned | カブト / クワガタ成虫・セミ・アリジゴク幼虫・ヤドカリ・クモ・サソリ |
| blob | 22 | ✅ | おばけ・？？？・ぷにゅ・みているなにか・ヒトデ幼生・サンゴ 01・光の子 |
| fish | 21 | ✅ | サケ・クマノミ・おたまじゃくし・チョウチンアンコウ・アザラシ(陸) |
| avian | 20 | ✅ | ペンギン・火の鳥・ふくろう・オウム・ニワトリ・ワシ |
| plant | 14 | ✅ | タンポポ・ハエトリグサ・ひまわり・サボテン |
| tentacled | 13 | planned | クラゲ・ポリプ・サンゴ枝・菌糸・タコ |
| pod | 12 | ✅ | たね・さなぎ・まゆ |
| larva | 11 | ✅ | いもむし・幼虫・カタツムリ(殻) |
| celestial | 10 | planned (special) | ほし(星雲・太陽)・神々しい光・灰の 火の鳥 |
| tree | 9 | planned | サクラ・世界樹 |
| cluster | 8 | ✅ | 胞子・わたげ・サンゴの 森・サクラの 花 |
| radial | 7 | ✅ | ヒトデ・クラゲの エフィラ |
| winged_insect | 6 | ✅ | ちょう・ウスバカゲロウ |
| fungus | 6 | ✅ | キノコ |
| object | 4 | planned | せきぞう・とけい・はこ・ゆきだるま |

**必要 archetype 数 = 17**(builder 12 は pilot で 実装ずみ = 293 行 中 228 行 78%。残り 5: arthropod / tentacled / tree / object / celestial)。
監査で わかった こと:
- **serpentine は いらない**(master に へびが いない。ワニ・カメレオン・竜は quadruped の 数字で たりる)。
- 「4 足 / 2 足」より **「段ごとの トポロジー」** が 効く(昆虫・植物・クラゲ・サンゴ・キノコは 段で archetype が かわる)。
- celestial(星雲・太陽)は 形より 光。3D 化より 2D billboard + 光の 演出を すすめる(Human QA で 判断)。
- 甲羅・殻・つばさ・尾は **attachment**(turtle / hermit_crab / snail / dragon / mermaid)。archetype を ふやさない。

## 4. Archetypes(pilot で つくった 12)

| archetype | 形(primitive に しない ための くふう) | rig(bone) | locomotion |
|---|---|---|---|
| quadruped | 胸 → 腰で 太さが かわる 変形球の 胴・首の すいーぷ・頬が ふくらむ 頭 + 鼻づら・たれ / 立ち 耳・まき / ふさ / ながい 尾 | body・head・earL/R・legFL/FR/BL/BR・tail | quadWalk(対角歩)+ idle 姿勢(ふせ / おすわり / 立ち) |
| avian | うえへ すぼまる たまご形・腹の 白い だ円・顔の マスク・ひなの ふわ毛(頂点 noise + 冠羽)・換羽の まだら | body・head・wingL/R・footL/R(+cane) | waddle(左右に ゆれ、足を 交互) |
| fish | 輪を こまかく した 流線形(頭は まるい superellipse)・しま + 黒ふち・背 / しり びれ の 帯・扇の 尾 / 胸びれ | body・tail・finL/R | swimHover(地面から うかぶ・尾を ふる) |
| humanoid | 2 頭身前後・生えぎわ の ある かみ(顔の 部分を 頭へ しまう)・とがり / やわらか / ちょこん の かみ・服の 色分け・リュック / つえ | body・head・armL/R・legL/R(+cane) | humanWalk / crawl(01 は はいはい) |
| larva | 節の くびれ つき 1 本の すいーぷ(玉の ならびに しない)・腹の 色・横の 斑点・腹脚 | seg0-2・head(+branch) | inchCrawl(しゃくとり)/ hangSway |
| pod | さなぎ: 5 本の 稜の ある 回転体 + 枝 / たね: 下ぶくれ + くちばし + わた毛 | body(+branch / pappus) | hopSway / 枝で ゆれる |
| winged_insect | 扇の 面の はね(中心 → ふちで 色)+ ふちの 白い 点・頭・触角 | body・head・wingL/R | flutter(うかんで はばたく) |
| plant | のこぎり歯の へら形の 葉の ロゼット / くき + 花びら 2 層 + がく | leavesA/B・body or stem・head | plantSway(ゆれ)+ 移動は 小さく はねる |
| fungus | 稜の ある え・かさ(円すい / ひらたい)+ ひだ・土の もり + 小石 + 草・子キノコ | dirt・body・cap(+child) | squashHop(つぶれ / のび) |
| cluster | 顔つきの 子 3〜6(胞子 / わたげ) | u0..u5 | clusterBob(ばらばらに ゆれる) |
| radial | 5 本 うでの 星(うでは 先へ ほそく・すこし 前へ まがる・あつみ)・ぽつぽつ・あわ | body(+bubbles) | radialShuffle(2 本の うでで 左右に ゆれ あるく) |
| blob | 左右 2 つずつ ふくらむ すけた 体 + 光る 芯 | body | blobFloat |

**原画に ない 腕・足を 足さない**(植物・キノコ・魚・ヒトデ は 足なしの うごき)。

## 5. Species parameters / stage parameters

- species / stage の ちがいは `spec.js` の 数字だけ(例: いぬ 01 / 04 / 08 = 胴の 長さ・太さ・胸 / 腰・脚の 長さ・頭の 大きさ・鼻づら・耳の 種類 と 長さ・尾の 種類・idle 姿勢・色)。
- **一様な 拡大縮小で 成長を 表さない**: 01 → 08 で 比率(頭 / 胴・脚)・部品(たれ耳 → 立ち耳 → たれ耳・胸毛)・姿勢(ふせ → 立ち → おすわり)が かわる(テスト 6・remove-it B / M で しばる)。
- **トポロジーが ほんとうに かわる 段だけ** archetype を かえる(ちょう 01/04 larva → 05 pod → 08 winged_insect、タンポポ 01 pod → 04/06 plant → 08 cluster、キノコ 01 cluster → 04/08 fungus、ヒトデ 01 blob → 04/08 radial)。
- pilot に ない 段は `pilotStageFor` が **おなじ archetype の いちばん ちかい 段**を つかう(archetype が ちがう 段へは にげない)。全量化の ときは 8 段 すべての 数字を 書く。
- 大きさ: `fitScale` が template の 箱を **2D の 絵の art box(cast-bounds)と ACTOR_SIZE** に あわせる。2D の 段ごとの 大きさの ちがいが そのまま 3D にも 出る。
- 2D に ない side / back は 2D の design language から 補完し、`PILOT[id].designFill` に 記録(QA doc にも)。

## 6. Attachments / sockets

pilot の attachment: つえ(penguin 08 / man 08)・リュック(man 04)・枝(ちょう 04 / 05)・わた毛(タンポポ 01)・土の もり / 子キノコ(キノコ)・あわ(ヒトデ 08)。
**装備の socket 監査**: いまの 2D 装備(アイテム)は キャラの 絵に かさねない(装備の 表示は HUD / アイテム絵)。3D でも 今は socket を つかわない。
将来の ため の 予約名: `head`(あたまの うえ = 顔 frame の up)・`body`(body bone)・`held`(armR の 先 / 4 足は 口)・`accessory`(body の 背)。
pilot では bone 名を そろえて おく だけ(2D の 装備仕様は かえない)。

## 7. Expression adapter(canonical emotion → 3D)

- 入力は **canonical emotion**(#368 `resident-expression.js` の `EMOTIONS` と 同じ 8 語: normal / positive / dislike / tired / sleeping / strained / wantsPlay / sick)。
- `EXPRESSION_3D[emotion]` = 目(round / happy ^ / droop 半目 / squeeze >< / flat / content ︶)・まゆ(角度)・口(smile / open / pout / wavy / small / frown)・ほお・しるし(sick の 青い たて線)・からだ(bounce / droop / lean / turn / shiver / tempo / squash)・あたまの うえの accent・reaction。
- 意味の 正本は Home の Expression PNG: positive = happy(^ ^・ひらいた 口)/ dislike = sulky(まゆ・とがった 口)/ tired = 半目 / sick = > < + 青い 線(`REFERENCE_EXPRESSION`、#368 の `EXPRESSION_FOR.stage` と 同じ)。
- めぐる での 入力: `a.expr.emotion`(#368 が merge されると 住人に つく)→ なければ `canonicalEmotion(a.emotion, window.NaotocchiResidentExpression)`。
  #368 が ない あいだ だけ `PRE368_LIFE_EMOTION`(#368 の LIFE_EMOTION の 写し)で つなぐ。**#368 の runtime は 複製しない**(テスト 12 / 27 が 写しの 一致を しばる)。
- 2D の stage 画像の なかには 「ふつう」が とじ目(犬 01・ペンギン 01・人 08・キノコ 08 …)の ものが ある → `normalEye: 'content'` で normal だけ 2D に あわせる。

## 8. 顔の 方式(A / B / C を 実物で 比較)

| | A texture atlas | B geometry | C hybrid(第一候補) |
|---|---|---|---|
| 原画への 忠実度 | ◎ 2D の 線を そのまま かける | △ 立体の 口・まゆ は 2D より かたい | ○ 目は 立体(光・奥行き)、口・まゆ・ほお・しるし は 2D の 線 |
| 表情の 質 | ○ 平面的(横から 見ると うすい) | ○ | ◎ 横からも 目が 見える |
| iPhone 可読性(通常距離) | ○ | △ 口が 小さい と 消える | ◎ |
| 性能 | ◎ decal 1 draw | △ 目 2 + 口 6 + まゆ 2 + ほお 2 = 最大 12 mesh(B は 三角形も 多い) | ○ decal 1 + 目 2 |
| asset 容量 | atlas 1 枚 / style(canvas で 実行時に かく = repo 0 byte) | 0 | atlas 1 枚 / style(同上) |
| 全量展開 | ◎ | ○ | ◎(目の 形は 6 種を 全 species 共有) |
| 保守 | ○ | △ species ごとに 口の 位置 調整が 多い | ○ |

cluster(胞子・わたげ)は 子の 数 × 目 の draw call を ふやさない ため A を つかう(`forceMode: 'A'`)。
比較画像: `docs/qa/character-3d-pilot-2026-10-01/face-modes.png`。**採用は Human QA で きめる。**

## 9. Rig / animation

- skinning なし。bone = `THREE.Group`、bone ごとに 部品を 1 mesh へ merge(1 bone = 1 draw call)。休みの 形は `userData.rest`。
- animation clip ファイルは ない。layer: **base locomotion**(archetype ごと)→ **emotion posture**(spec の body 数字)→ **temporary reaction**(hop / huff / yawn / wobble、イベント 1 回)→ まばたき。
- reduced motion(めぐるの `setAnimLevel(0)` = prefers-reduced-motion): bounce / sway / shiver / reaction / まばたき を とめる。あるく 足 / およぐ 尾 の うごきは 半分 のこす(移動と species が わかる ため)。
- 既存 Motion System(`cast-motion.js`・めぐるの `a.bob` / `behavior`)は **意味だけ** つかう: うごいて いるか(player は `a.moving`、ほかは 位置の かわり)、うごく 速さ。2D の 上下 bob は 3D では つかわない(足が ある ので)。

## 10. Runtime(めぐる)

- flag: `index.html?meguru3d=1&char3d=1`(`&c3dface=A|B|C` で 顔方式)。URL だけ。セーブ / localStorage に かかない。flag が ない ときは module を よまない(2D billboard と 1 byte も かわらない 経路)。
- 同じ actor(player / party / 住人)を、pilot に ある species なら 3D、ない なら 立て看板 で えがく。位置・むき・移動・パーティ・住人の 生活・きもち・会話・セーブ は めぐる の まま(presenter は actor を 書かない — テスト 16)。
- むき: `yaw = π − heading`(表示だけ なめらかに)。足もと = y 0、浮く species は `hover`。
- かげ: 既存の かげ instanced mesh に、model の 足あと の 大きさで のせる(浮く ものは 小さく)。
- あたり: 既存の actor collider の まま(visual mesh を physics に しない)。
- LOD: 住人は player から 1500 まで 3D、それより 遠くは 立て看板。player と party は いつも 3D。
- player: frustum culling しない・住人の あとで えがく。木の うしろ は World の 既存 occluder fade(すかし)と 協調(キャラ自身を 透明に しない)。
- QA まど(セーブしない): `renderer.setChar3D(on)`・`setChar3DForce(e)`・`setChar3DFace(m)`・`char3dHooks({ failUpdate, failBuild, standIn })`・`char3dPresenter.stats()`。

## 11. Fallback

- module の 読みこみ失敗 → その あそびの あいだ 2D billboard(world は 3D の まま)。
- template が 組めない(build / parse / 未対応)→ **その species の actor だけ** 立て看板。
- actor の 更新で 例外 → **その actor だけ** `broken` に して 立て看板(以後 ちらつかない)。present は throw しない → hybrid renderer の `fail()`(world 全体を 2D へ)に つながらない。
- fallback 後も 位置・むき・移動・きもち・会話・セーブ は 同じ actor の まま(2D の 経路は 既存 code)。

## 12. Cache / loading

- template(species × stage × 顔方式)は はじめて 必要な ときに 組む(lazy)。**1 frame に 組む 数は 1(buildBudget)**、まだの actor は 立て看板 → ヒッチを 分散。
- 共有: geometry(template と 全 instance)・material(頂点色 Lambert 1〜3 個・顔 atlas の 表情 material は style × 8)・目の 形 6 種・accent atlas 1 枚。
- actor ごと: bone の transform・anim state・表情 だけ。表情を かえても texture を 再 decode / 再 upload しない(atlas の clone = source 共有・material を 差しかえる だけ)。
- LRU: pilot 26 template で 1〜2 MB 程度(三角形 2.4〜4.6 k / template)。**LRU は いまは 不要と 判断**(全量 300 template でも 1 region に 出るのは 数十)。全量化で 計測して 再判断。
- 片づけ: その frame に present されなかった actor の 3D は `endFrame` で はずす。地域の きりかえ(scene 作りなおし)は `reset`。2D↔3D は `reset`。立て看板も 出なかった actor の ものは はずす(以前は 隠すだけで のこって いた)。

## 13. Asset policy

- 3D の 形・色・顔は すべて code(`character-3d/*.mjs`)と 2D 画像 由来の 数字。**repo に 3D の binary asset は 置かない**(テスト 29)。
- 外部 3D asset なし。three.js は 既存の `vendor/three-0.170.0`(MIT)。GLB 比較の ための GLTFExporter / Loader は tool だけが 外から よむ(vendor に 入れない)。
- 既存 2D 画像・Expression PNG・`pet-expression.js`・`relationship-expression.js`・`emotion-state.js`・`meguru.js` は 変更なし(テスト 30 が main の digest と 一致を しばる)。

## 14. Performance(→ QA doc の 表)

1 / 5 / 27 体 で draw call・三角形・texture・material・bone・presenter の CPU・JS frame・メモリ・build 時間を 2D baseline と ならべて 記録。
headless は SwiftShader(ソフトウェア GPU)なので **GPU 時間は iPhone の 値では ない**。iPhone 実機は Human QA で `&perf=1` を 見る。

## 15. Rollout strategy

1. **Character 3D Pilot**(この branch)→ 2. **Human QA**(iPhone)→ 3. **architecture 確定**(採用 / 条件付き / 不採用)→ 4. 後日 **full rollout**。
Pilot Human QAによる全量展開開始承認済み。Full Rollout v0完成後は全量Human QAで停止し、Ready/main merge/Quality Pass v1へ自動で進まない。

## Full Rollout v0追加契約

- `tools/character-3d/inventory.cjs`がlatest masterと全PNGを交差監査する。current masterは293 active designs。旧routing表の数字をcoverageの証拠にしない。
- `rollout-spec.js`に原画分析済みのexact stageを追加し、`spec.js`が展開済みfamilyを優先する。`PILOT` / `STAGE_KEYS`は歴史的referenceとして不変。live galleryは`ROLLOUT_STAGE_KEYS`を参照する。
- 展開済みfamilyに欠けたstageがあればnull。近い年齢へ置換してexact成功としない。未展開Pilot familyの旧動作は段階的移行中のみ保持し、全量coverageは`exact`のみ数える。
- `tools/character-3d/coverage.cjs --require-full`はexact stageまたは保存4方向が欠けている限り失敗する。spec-readyはHuman QA採用済みを意味しない。
- 新しい共通parameter: quadrupedの左右ear profile、持ち上げた前足、水平に伸びた遊び姿勢、身体を回り込むtail family、avianの左右wing pose。既存parameterがない場合のPilot挙動を保持する。
- canonical emotion / actor state / Motion意味論 / save / Worldは変更しない。新poseはpresentation内でidle→locomotionへblendする。
- memory/cacheの全量上限判断、未実装family、新archetype、最終実機QAは未完了。現在のcheckpointを全量完成と扱わない。

### Humanoid rollout presentation parameters

- `humanoid-spec.js` supplies all24 exact man/woman/ren stages. Optional wardrobe/skirt/hood/number, long/swept/tied hair, hat/hand-prop and per-arm pose profiles reuse the builder; Pilot man01/04/08 data stays unchanged.
- A neutral per-eye shape may differ left/right; non-normal canonical expressions still use the shared emotion parameters. No new emotion vocabulary.
- Optional articulated knees and seated cloth/support blend from signature resting pose to existing human locomotion. Chair is presentation support only, not World furniture/state. Held animals build via shared quadruped geometry, merge nonwalking secondary meshes, and retain a projected canonical face in the same actor.
- QA candidate specs are overlaid only in the QA HTTP/Node harness before promotion; production spec files and saves are never rewritten by that harness.
