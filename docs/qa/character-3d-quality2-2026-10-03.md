# Character 3D — Human QA 第2回修正版

**Draft・Human QA未承認。main merge／Ready／full rolloutは行わない。**

1. [修正版QA gallery](character-3d-quality2-2026-10-03/index.html)
2. [iPhone Meguru Character 3D](https://rawcdn.githack.com/Naoto214/naotocchi/d6608d393a76aa452c04eaa85253df2a21e5fe2d/index.html?meguru3d=1&char3d=1&perf=1)
3. [同条件2D](https://rawcdn.githack.com/Naoto214/naotocchi/d6608d393a76aa452c04eaa85253df2a21e5fe2d/index.html?meguru3d=1&perf=1)
4. [2D原画／前修正版／今回修正版の代表比較](character-3d-quality2-2026-10-03/representative-comparison.jpg)
5. [performance before / after](#performance-before--after)

計123画像：28対象の4方向比較、26 stageの5表情×idle/locomotion、全26 stageのMeguru front/back、環境・回帰画像、犬/柴犬の同画面カラー/黒silhouette、綿毛の拡大/通常距離、代表比較。綿毛の通常距離前後は別run撮影でactor配置・数が異なるため、負荷比較には使わない。

停止地点：**技術検証と資料保存まで完了。Human QA待ち**。新しい造形・仕様を追加せず、main merge／Ready／full rolloutなし。画像保存commit `edb485dceb2145528150360498829b8cc7ee428e`。最終資料commitはこれを継ぐdocs-only変更で、検証したproductionコードはd6608d3と同一。

## 正本と比較条件

- 開始時remote: `8b19ecc44c162455f3a2f1077ef659bddcc186ca` / tree `f78d8716203479cf07f1d153985dd142e9b08aa5`。旧停止Workを復元していない。
- 第2回修正のコード: `d6608d393a76aa452c04eaa85253df2a21e5fe2d` / tree `0a254d560fbfd62a906de9cf61f4c5b59c8c2c82`。
- 前回版7モジュールを `character-3d-quality2-2026-10-03/previous/` に保存。vendor importの相対位置だけ補正し、geometry・parameters・runtimeは8b19eccと同一。
- Character Design正本は既存2D PNG。3Dから新しいデザインを起こしていない。原画に見えない背面は前面の形・模様と矛盾しない補完。
- 比較galleryと4方向sheetは同じカメラ・照明・時刻 `t=.4`。`previous`＝第1回修正版、`revised`＝第2回修正版。原画は左列。
- ローカル画像: Playwright 1.51.1 / Chromium 134 / SwiftShader。CI画像・性能: Playwright 1.62.1 / Chromium / SwiftShader。異なるbrowserのCPU・heapを直接比較しない。

## 修正した内容

| 対象 | 2Dの読み取り／今回の修正 | 共有される仕組み |
|---|---|---|
| butterfly 05 | 正面の独立した緑線を撤去。ふくらみ・節・非対称の折れを連続した外皮の起伏へ。吊り下げは感情・reaction後も枝と接続 | lathe profile + volume deformation、最終姿勢のattachment pivot補正 |
| mushroom 01 | 頭頂の突起状highlightを撤去。縦横比、非対称の丸み、向き、頬と頂点highlightへ置換 | cluster unit parameters + vertex markings |
| mushroom 08 | 大小の顔を維持。傘のprofileを滑らかにし、傘裏の浮いた細いtubeを撤去。傘裏の波と陰影へ統合、子の位置を親へ寄せる | fungus cap profile + underside volume + child attachment |
| cat_friend | 小さい頭・長い柔軟な胴、半目、非対称に寝そべる姿勢。顔と胴の三毛模様、前脚の位置、大きく曲がる尾を再構成。歩行時は既存の歩行姿勢へblend | quadruped head/body params、pose profile、patch map、hook tail family |
| dog / shiba | dogは長い脚・細い胴・伸びる遊び姿勢。shibaは広い顔・頬・短い胴・胸のcoat volume・太い巻き尾・浅めの遊び姿勢。色を消した比較も保存 | head width/cheek、coat volume、tail family、pose profile |
| dandelion 08 | 各球の42本の棒状pappusを撤去。共有128px密度textureと3枚の薄いhalo面へ置換。毛束の幅・淡さ・密度と個体ごとの輪郭位相を変える | shared soft material / DataTexture、RGBA vertex merge、softHalo secondary geometry |
| dandelion 04 | 葉の起点・高さ・重なり・手前の傾きを修正し、顔を塞ぐ葉の交差を低くする | plant leaf origin/layering parameters |
| starfish 01 / 08 | 01は丸い頂部・左右突起・下の房を再構成、中央volume維持。08は腕の輪郭samplingと小さな表面斑点の厚みを調整 | outline loft / radial profile + surface marking geometry |
| human | 髪・襟・前開き・袖・裾・靴を維持。バッグを持つ腕と杖を握る腕を曲げ、杖を手のboneへ接続 | reusable held-arm geometry、attachment parent、held-side locomotion |

厚みのない共有顔decalは `forceSinglePass` を指定し、表裏の二重描画を解消。綿毛の閉じたvolumeの単一描画案は種のoverlapが崩れたため不採用。

高密度の毛meshやspecies専用modelは追加していない。builderの対応表、canonical emotion、Motionのbase locomotion＋emotion posture＋temporary reaction、presenterのactor state解決を維持。

## 全pilot・再利用2種の監査

以下の全行について、既存2D→前回→今回を4方向で確認。silhouette → volume → proportion → pose → 接続/overlap → marking/material → faceの順で確認した。維持行も比較画像を保存している。

| 系統・stage | 監査の要点／判断 |
|---|---|
| dog 01 | 低い幼体、垂れ耳、短い脚。今回の頭部width追加のdefaultで輪郭が変わらないことを確認、維持 |
| dog 04 | 細い胴・長脚・大きい耳・前傾遊び姿勢。頭と鼻先比率を調整 |
| dog 08 | 座位、白い老齢顔、垂れ耳、太くなる胴。維持 |
| penguin 01 | 丸い灰色幼体、短い翼・脚。維持 |
| penguin 04 | 換羽の灰色/黒色、立位、片翼の挙上。維持 |
| penguin 08 | 濃い背面と白い腹、成熟した形、杖の位置。維持 |
| clownfish 01 | 小さい淡い幼魚、透ける尾と鰭。維持 |
| clownfish 04 | 3本の白帯、黒い縁、頭/尾の方向、背腹鰭。維持 |
| clownfish 08 | 長く厚い成熟体、帯の連続と尾の拡大。維持 |
| man 01 | 幼児の腹ばい姿勢、短い手足、前/横/後頭部の髪、青い服。維持 |
| man 04 | 前髪・毛束・後頭部、jacket/襟/shirt/buttons/sleeve/hem/shoes、バッグ位置。握る腕の接続を修正 |
| man 08 | 白髪・髪の分け目・背面、cardigan/襟/前開き、老齢の体型・前傾。杖と握り腕を接続 |
| butterfly 01 | 横長の分節幼虫、頭部と脚。維持 |
| butterfly 04 | 枝に下がるJ字の分節幼虫。蛹用pivot補正を適用しないことも確認、維持 |
| butterfly 05 | 板/傷状の線を廃し、包まれた連続volumeへ変更 |
| butterfly 08 | 前後翅の大小、羽軸・腹部方向、模様の表裏。維持 |
| dandelion 01 | 種と上部pappusの接続・非球状silhouette。08のhaloとは異なる原画を維持 |
| dandelion 04 | 顔を中心とするロゼット、葉の重なりと接地を修正 |
| dandelion 06 | 花弁・中央の顔・茎・背面calyx・根元の葉。葉共有処理後も顔/茎を維持 |
| dandelion 08 | 6個体の顔とseed、空気を含む淡い外周。棒からhaloへ変更 |
| mushroom 01 | 6胞子、歪み・大小・顔・頬の差。突起撤去 |
| mushroom 04 | 明るい釣鐘形capとstem、地面との接続。共有profileの滑らかさを確認 |
| mushroom 08 | 親子のまとまり、大小の顔、傘裏とstem接続を修正 |
| starfish 01 | 頂部・左右突起・下房・中央volume、透過の印象を再確認・輪郭修正 |
| starfish 04 | 5腕・片腕の曲がり、中央比率、ピンクの面。共有radial変更後を確認 |
| starfish 08 | 長い腕・腕先の絞り・中央比率・薄い斑点・5つの泡。再調整 |
| shiba | dogとの横並び、短い胴・広い顔・胸・巻き尾を強化。黒silhouette比較あり |
| cat_friend | 通常姿勢を寝姿のidentityとして扱い、半目・顔模様・尾・脚配置を変更 |

## Human QAで決める残差

- 猫の「艶やかさ・成熟感」と、顔の三毛模様の読み取りは最重要。寝姿になったことだけで合格にしない。
- dogとshibaは正面だけでなく3/4・横の黒silhouetteでも判別できるか。
- 綿毛は細い針meshをなくしたが、透過面による低コスト表現。通常距離で「ふわっ」と読めるか、重なりが白い面に見えないかはHuman QAで判断する。
- 蛹の節・包まれ感、mushroom08の傘裏と親子の柔らかさ、starfishのゼリー感は原画と並べて判断する。
- 人間の髪の束と服の厚みはstylizedな補完。握る手は簡略化されており、実写的な指・接触IKはない。杖は手に追従するが、歩行中の先端を常時地面へ固定するIKは追加していない。
- 2D一枚絵の表情とcanonical normalの目の開きは完全一致を自動保証しない。5表情と実際の動きを操作版で見る。
- 実際のiPhone Safariの速度・メモリ・熱・27体の操作感は未測定。SwiftShaderの合格で置き換えない。
- World laneとの統合後の地面高・影・遮蔽・lightingは別の統合QAが必要。今回そのlaneを変更・mergeしていない。

## 検証結果

コードを `d6608d3` に固定した最終検証。造形・仕様の追加は行わない。

| 検証 | 結果／証跡 |
|---|---|
| dedicated | 51 PASS、0 FAIL |
| remove-it | 13/13 RED（意図した破壊を検出） |
| quality mutation | 11/11 RED |
| round-two mutation | 7/7 RED |
| full npm test | **TAP 2914 + Relationship 80 PASS、0 FAIL**。[最終CI regression](https://github.com/Naoto214/naotocchi/actions/runs/37114001769/job/111177153295) |
| Home CI | **成功**。[最終コードのHome](https://github.com/Naoto214/naotocchi/actions/runs/37114004717) |
| Runtime CI | **成功**。[最終コードのRuntime](https://github.com/Naoto214/naotocchi/actions/runs/37114004703) |
| Meguru local | 全26 stageの要求stage/spec一致・live 3D確認。通常fallback 0。2D切替時live 0、復帰live 9、地域退出live 0／帰還live 9。player描画120/120 frames。意図したshiba故障時のみfallback 1、他actor維持。`local-evidence/meguru-final.json` |
| 最終CI画像・Meguru・性能 | **成功**。[quality evidence CI](https://github.com/Naoto214/naotocchi/actions/runs/37114001769)。全26 stage exact/live、player 120/120 frames、2D↔3D、fallback隔離、region cleanup復帰。CI通常は8体、地域退出0／帰還8体。性能1/5/27要求数一致・fallback 0 |

既存2D PNG／Expression PNGの差分0。Characterの最終コード以降はQAの保存処理・資料だけ。save/schema、Home、World Art Directionへ変更なし。

履歴: ローカル初回全回帰は2911 PASS / 2 FAIL（Resident Expression既存test 6/13）。最初のコードd592a59のquality regression CIは2912 PASS / 1 FAIL（既存 `meguru-test.cjs` nearest actor参照一致）。同じコードのRuntime CIは2913 + 80 PASS / 0 FAIL。初回Home CIは `chromium-landscape-safe-area: home exceeds the visible viewport` で失敗、Home source同一のf147949でHome成功。失敗を隠さず、最終コードの結果を別に記録する。

## Performance before / after

同一CI job・Node 22.23.3・Playwright 1.62.1 / Chromium / SwiftShaderで、前回8b19eccと今回d6608d3を順に測定。各条件8秒、1回ずつの標本。iPhone実機の速度・熱・メモリ合格を意味しない。CPU/heapは揺らぎがあり、統計的な性能改善とは報告しない。

| actors | Character triangles 前→後 | World calls 前→後 | presenter CPU avg ms 前→後 | JS heap MB 前→後 | 今回live / fallback |
|---|---|---|---|---|---|
| 1 | 4,062 → 4,062 | 42 → 40 | 0.748 → 0.652 | 20.5 → 18.2 | 1 / 0 |
| 5 | 18,796 → 19,144 | 90 → 85 | 2.032 → 2.108 | 23.1 → 19.3 | 5 / 0 |
| 27 | 99,335 → 103,595 | 285 → 255 | 4.455 → 4.830 | 24.5 → 24.5 | 27 / 0 |

27体はtriangles +4.3%、calls −10.5%、CPU平均 +8.4%。通常27体の平均frame時間は163.88→148.14 ms、p95は383.3→383.2 msで、SwiftShader環境ではスムーズなframe rateの合格値ではない。

綿毛stressは **dandelion08 25体＋shiba 1体＋cat_friend 1体**（27体すべて綿毛ではない）。live 27 / fallback 0、Character triangles 155,068、World calls 501、CPU avg 2.834 ms、heap 31.2 MB、平均frame 242.66 ms / p95 733.2 ms。透過の重なり負荷を含むため、一般27体のCPU値だけで安全と判断しない。

過去報告の27体値99,335 / 285 / 4.76 ms / 31.2 MBは別runの履歴。今回の表は今回のCIで前後を再測定した値。ローカルChromium134の測定は `local-evidence/` に分けた。

生データ: [前回](character-3d-quality2-2026-10-03/measurements/perf-previous.json) / [今回](character-3d-quality2-2026-10-03/measurements/perf-revised.json) / [綿毛stress](character-3d-quality2-2026-10-03/measurements/perf-puffs.json)。同じJSON内に1/5/27の2D条件、frame p95、draw時間、ロード時間、actor構成も保存。

## Preview host

rawcdn.githack.comのcompare.htmlとindex.htmlがHTMLとして表示されることをクラウドブラウザーで確認。クラウド側は `GL_RENDERER=Disabled` のためWebGL描画不可。ローカル/CIのWebGL検証と区別する。iPhone Safari実機はユーザー確認待ち。HTMLソース表示になったjsDelivrはQAリンクに使用しない。

## 他lane read-only conflict audit

main `0b0a6b30e8e098472b2fa965604f4901874942e3`、#368 `f50bd6528614d2ca8512730f4b12042c0d529407`: mechanical conflictなし。今回の変更でcanonicalの語彙や既存Motionへ変更はない。

| lane | HEAD | mechanical conflict |
|---|---|---|
| #367 | 32e3320466d57899c474b38e1d00c2854411ac7d | index.html |
| #369 | cbafd678875997ba754b5abe6bbb006db135731c | index.html / meguru-3d.mjs / meguru.js / package.json |
| #371 | 69a8857bacfa597fa65dcb433536b2f603f26b7d | 同上 |
| #374 Terrain | dc91d3e9f99c42cc337db9177c0812e91878facb | 同上 |

semantic conflict: Terrain最新の `playerVis = billboardVisible(pm, built.sc.fog.far, playerDist)` はCharacter 3Dのholder可視判定と統合が必要。機械的なconflictを解くだけではplayer visibilityの意味が合わない。terrain height、actorの地面接触、scene交換/cleanupの責務も統合時に確認する。read-onlyのmerge-treeのみ実施、他laneは統合していない。
