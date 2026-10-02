# Character 3D Quality Pass — Human QA package (2026-10-02)

**Human QA待ち。Draft維持。採用・full rollout・Ready化・mainへのmergeは行っていません。**

- 撮影・検証対象コード: `81a7d981a6cee7f7930ec297e79692c44eb382c2`。
- immutable Claude geometry / rig / animation / runtime: `e12f7208427c2f1035849ab4319c78fc31305c65`。QA専用snapshotを使い、本番runtimeには混ぜていません。
- 2D原画・Expression assets・既存actor/save処理を今回の品質修正で再実装していません。最新remoteに別作業で入ったMotion L2/v2・Resident Expression統合は保持しています。
- 採用判断は「同じ子に見えるか」「2D billboardに対して立体にする価値があるか」。技術テストのPASSをvisual approvalとは扱いません。

## 最初に開くもの

1. [revised比較gallery](https://cdn.jsdelivr.net/gh/Naoto214/naotocchi@81a7d981a6cee7f7930ec297e79692c44eb382c2/character-3d/compare.html)
2. [iPhone用Meguru 3D](https://cdn.jsdelivr.net/gh/Naoto214/naotocchi@81a7d981a6cee7f7930ec297e79692c44eb382c2/index.html?meguru3d=1&char3d=1&perf=1)
3. [同じWorldで変更していない2D presentation](https://cdn.jsdelivr.net/gh/Naoto214/naotocchi@81a7d981a6cee7f7930ec297e79692c44eb382c2/index.html?meguru3d=1&perf=1)
4. [Claude vs revised代表シート](character-3d-quality-2026-10-02/representative-comparison.jpg)
5. 性能before/after: 下表と保存したJSON。

CDN表示・iPhone実機は**未確認**。同じコードをActions内のHTTPサーバー＋Chromiumで描画・検証しました。iPhone性能合格や60fpsを主張する資料ではありません。

## 画像・比較範囲

[全stage画像一覧](character-3d-quality-2026-10-02/index.html)。26 player stage（8系統の01/04/08＋蝶05＋タンポポ06）、shiba/cat再利用2体。各stageに原画、Claude 4方向、修正版4方向、Meguru正面・後ろを保存。5表情×idle/locomotionは3/4方向で両revisionを保存。対話galleryでは全方向・全canonical emotionへ切り替えできます。

通常比較は同じカメラ、照明、背景、時刻t=.4、normal。同時刻静止を採用し、ライブiframeの時計同期は主張しません。横・後ろのデザインは原画に存在しないため自然な補完です。[A/B/C分析](../character-3d/quality-pass-2026-10-02.md)に必須・簡略化可能・補完を記載。

## 品質変更

| 対象 | 修正した点 | 共通方式 |
|---|---|---|
| human 01/04/08 | 連続した頭髪、前髪・毛束、年齢別衣服、シャツ・襟・lapel・ボタン・袖口・裾・靴底 | scalp cap、sweep locks、既存humanoid boneへ衣服部品をmerge |
| dog / shiba | 犬の細長い遊び姿勢と柴の丸い頬・短い胴・太い巻き尾、接地 | species寸法・markings＋共有playBow/contact解法 |
| penguin / fish | 頭胴・ヒレの比率、白い顔の色面、年齢別normal顔・姿勢 | 既存avian/fishのparameters・attachments |
| butterfly 05/08 | さなぎの段・折り目・縫い目、垂直の腹、前後4枚の羽、青い色面と脈 | pod profile、既存wing attachment frame、merged veins/vertex colour |
| dandelion 04/06/08 | ロゼットの起点と層、丸い花弁、6個の軽いseed halo | rosette parameters、merged filament geometry、既存cluster |
| mushroom 01/04/08 | 胞子の形・顔・色・ハイライト差、笠の裏、石、大小両方の顔 | cluster variation、lathe/gills、既存multiFace adapter |
| starfish 01/08 | 上・横・下の輪郭、透明感、細い腕と小さい中心、泡の位置 | reusable outlineLoft、radial parameters・markings |

canonical emotion 8語と、locomotion＋emotion posture＋temporary reactionの3層を維持。独立したspecies専用modelやgameplay actor stateは追加していません。

### Human QAで特に見てほしい残差

衣服・髪は識別要素を増やしましたが、2Dの手でバッグを握る姿勢・杖を握る指までの再現はありません。綿毛の細さ・空気感は実機の小さい表示で判断が必要です。低polyの前提で細かい羽模様・fur・gill・pixel highlightsを簡略化しています。これらを含めて「同じ子」と感じられるかをご判定ください。

## 検証

| 検証 | 結果 |
|---|---|
| 既存Character 34 + 品質10 | 44 PASS / 0 FAIL |
| 既存remove-it | 13/13 意図したRED、復元確認 |
| 品質mutation | 11/11 意図したRED、復元確認 |
| 全npm test（branchのexact source） | SUCCESS。TAP部分2,907 + 80 PASS / 0 FAIL、先行legacy testsも成功 |
| Runtime smoke / Home layout CI | SUCCESS |
| Meguru全26 stage | exact stage / spec / 3D表示すべてPASS |
| 3D↔2D、player可視性、actor単位fallback、地域切替・cleanup | PASS |
| 1 / 5 / 27 actor測定 | 要求live数に一致、全ケースfallback / failed template 0 |
| 比較画像54枚 | 最新sourceで再撮影。保存済み画像と全SHA-256一致 |
| iPhone実機 / 外部CDNの表示 | NOT_RUN / UNVERIFIED |

[Character QA・全回帰run](https://github.com/Naoto214/naotocchi/actions/runs/37018225289) / [Runtime](https://github.com/Naoto214/naotocchi/actions/runs/37018232079) / [Home](https://github.com/Naoto214/naotocchi/actions/runs/37018231218)。Node v22.23.3、Playwright 1.62.1。raw TAP・mutation・全回帰ログ・source記録をこの資料と同じディレクトリに保存。

追加mechanismは、髪の連続coverage、犬のbow/contact、大小キノコの複数faceと目口の可視性、6綿毛、outlineLoft形状・表裏normal、蝶の腹とreduced idle、泡位置、QAのcurrent adapter接続を専用テストで確認。remove-itは意図したテストがREDになったことと、ソースの復元まで確認します。

read-only reviewと実画像確認で、outlineの内向きnormal・犬の接地・子キノコの遮蔽を修正。最新QA adapterの再レビューでは新しいCritical/Important指摘なし。レビュー環境のsocketテストはEPERMで未実施ですが、本実行側では専用テストとmutationを実施しています。


## 性能before / after

全26 stageのtemplate合計は **77,600 → 88,580 tris（+14.1%）**、geometry typed-array bytesは **2,782,948 → 3,176,232 bytes**。最大単体はdandelion08の6,068 trisで、既存上限6,500内。人の髪・衣服、羽脈、綿毛は既存bone meshへmergeし、child faceの追加以外は部品ごとのdraw meshを増やしていません。

各セルは **Claude → revised**。全ケースでlive数が要求値に一致し、actor fallback / failed templateは0。

| actors | World calls | World tris | Character tris | meshes（accent込み） | body materials | face atlases | World textures |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 41 → 46 | 102,098 → 102,818 | 4,062 → 4,062 | 13 → 13 | 1 → 1 | 1 → 1 | 16 → 18 |
| 5 | 90 → 90 | 116,556 → 116,292 | 18,740 → 18,796 | 63 → 63 | 1 → 1 | 2 → 3 | 26 → 28 |
| 27 | 279 → 285 | 187,742 → 200,095 | 86,714 → 99,335 | 252 → 255 | 1 → 1 | 8 → 10 | 75 → 78 |

| actors | templates | build合計 / 最大 ms | presenter平均 / p95 ms | JS draw平均 / p95 ms | JS heap MB |
|---:|---:|---|---|---|---|
| 1 | 1 → 1 | 66.3 / 66.3 → 55.3 / 55.3 | 0.804 / 0.2 → 0.663 / 0.2 | 12.93 / 5.3 → 9.21 / 4.7 | 18.2 → 19.3 |
| 5 | 4 → 4 | 133.3 / 55.9 → 164.6 / 69.8 | 1.722 / 2.2 → 2.038 / 0.3 | 19.63 / 44.7 → 21.74 / 47.5 | 23.1 → 24.5 |
| 27 | 10 → 10 | 405.6 / 80 → 447.6 / 75.8 | 4.196 / 33.9 → 4.76 / 48.5 | 21.16 / 54.5 → 25.22 / 72.4 | 24.5 → 31.2 |

| actors | 初期DCL ms | 初期最大frame ms | 初期最大long task ms | walk frame平均 / p95 ms |
|---:|---:|---:|---:|---|
| 1 | 311.5 → 306.4 | 1233.3 → 1316.7 | 303 → 312 | 140.97 / 483.3 → 140.74 / 400 |
| 5 | 311.7 → 297.3 | 1300 → 1099.9 | 327 → 284 | 170.23 / 499.9 → 154.99 / 533.2 |
| 27 | 406.1 → 286.9 | 983.3 → 883.3 | 665 → 644 | 158.73 / 483.3 → 158.33 / 433.3 |

[Claude全測定JSON](character-3d-quality-2026-10-02/perf-claude.json) / [revised全測定JSON](character-3d-quality-2026-10-02/perf-revised.json)。同条件2Dの1/5/27 measurementsもJSON内に保存しています。


測定条件と限界:

- Chromium / SwiftShader、同じ最新World・fixture・390×844 viewport・DPR 2・8秒walk・入力手順。旧版はCharacter geometry/rig/animation/presenterをe12f720に差し替え、現在のactorInfoだけ共用しています。旧アプリ全体との比較ではありません。
- 1回ずつのwall-clock routeで、同期したsimulation replayではありません。draw calls / render trisは測定終了時点、presenter / JS drawはrolling history、frameはwalk区間です。小さな時間差を高速化の根拠にしません。
- loadの最大frame / long taskはページ・初期scene起動時点。追加stand-inの投入前なので、27体すべてのfirst-present hitchではありません。template build合計/最大は別欄です。
- 27体はdog/penguin/clownfish/man/butterfly/dandelion06/mushroom/starfishの既定mixを代役表示する既存方式。27体すべての画面内可視性や27体の綿毛同時表示、全castを検証した数字ではありません。
- materialは共有body material cache、atlasは顔のcache数。World texturesはrenderer全体。JS heapはperformance.memoryの値でGPU/プロセス全体ではありません。別途[全26stageのgeometry bytes](character-3d-quality-2026-10-02/geometry-cost-a6.json)を保存。


## 他laneとのread-only監査

最新refsとmerge-tree出力は[conflicts-a7.json](character-3d-quality-2026-10-02/conflicts-a7.json)。read-onlyのobject計算のみで、merge/rebase/conflict解消は実施していません。

| lane / fresh HEAD | mechanical conflict | semantic integration |
|---|---|---|
| main `0b0a6b3` / #368 `f50bd65` | なし | 別セッションで既に統合済み。canonical actorInfo / Resident Expression / bitmap経路を保持して本QAを実施 |
| #367 `32e3320` | index.html | All Regionsのgate・遷移とCharacter holderのcleanupを将来の統合時に再確認。今回未統合 |
| #369 `cbafd67` | index.html, meguru-3d.mjs, meguru.js, package.json | hidden billboardを基準にしたplayer可視判定へ戻さず、3D holderを判定する。最新Expression責務も保持 |
| #371 `69a8857` | 同上 | Foundationの可視性問題に加え、lighting/materialの印象を統合後に比較。今回未統合 |
| Geometry/Terrain `17c1bdb` | 同上 | 現在もbillboardVisible(pm)を使用。3D holder可視性、terrain/ground接続、occlusionの共通World契約が必要。組合せ実行は未実施 |


## 保存地点

A1 `025f87f`、A2 `d31ef6a`、A3/A4 `ed48cf6`、A5 `7a32bac`、A6 `0c0e90f`、子キノコの遮蔽修正 `754e2fa`。別作業によるremoteのMotion merge `a1bccfa` / `5de1b49`をfresh確認し保持しました。さらに別作業のResident Expression統合 `d6f5a51` を保持し、QA側のみ現在のactorInfo adapterに接続しました。今回のセッションでmain/他laneのmergeは実施していません。
