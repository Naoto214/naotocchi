# World planting / deck checkpoint — 自動検証済み、Human QA未承認

Product `c03dc729e714a7f66177ac50443a128ddc7d5f56`, tree `14595b3b6c08531becb76480462019b17c71bd7d`。BEFORE `f7ffdff2951722a272122748750da4c3170a46e6`。

農家の花が縁側から生えて見える状態を改善。既存の花は群のまま、低木は各株を最大60以内で移動し、道路・collision・spot・玄関導線・花壇・飛び石の余白を確保できない群は元の位置に残す。共通のbuild-time配置処理で7地域に適用。形状・個数・material・per-frame処理は追加していない。

前回の静的配置監査では425partsを移動、地上植物と低いsolid boxの平面干渉345→77。残る77を解決済みにしない。監査の詳細一時ログは保存前の環境整理で失われたため、この数値は前回観測として明記。今回、保護snapshotとgeometryを再生成。13地域の2D／canonical3D／collision・object／part数を既存保存baselineと再照合。

[CI run37239232398](https://github.com/Naoto214/naotocchi/actions/runs/37239232398)は成功。全5artifactのZIP SHA256、commit、source SHA256、exitを再確認し、このフォルダに原データを保存。

- CI full package pipeline：2871＋80 PASS、FAIL0、exit0。Node concurrency4。
- unmodified `npm test`も前回2871＋80 PASS／exit0とソースhash一致を確認。ただしローカル生ログは保存前に消失。CIをunmodified npm実行と読み替えない。
- 関連84PASS、独立レビュー重大・重要0は前回確認。今回コード変更なし。初期REDログも失われたため、再作成したとは扱わない。
- smoke：13地域／27party、errors／fallback0。
- corridor：4組・8方向、全到着、3D／player visibility正常。
- visibility：2832samples／fully hidden0／partial1。step1000、yaw0/1.2/-1.2/3.14。実機表示の保証ではない。
- 仲間のx/z円形障害物重なり最大5.684341886080802e-14。地形めり込みではない。過去の0.002591405357044607等は元資料に保持。
- 35同条件World／入口viewのtriangles／callsは全てBEFOREと同一。city130476/50、jungle172794/62、forest147752/60、home35272/42、countryside119248/54。

## 画像・自己監査

[全55組BEFORE／AFTER](compare.md)／[13地域代表](representatives.jpg)／[建物close-up](closeups.jpg)／[山の同camera夏冬](mountain-seasons.jpg)。原画像、撮影recipe、ログはcaptures内。夏冬はmtvillage／yaw0／dz-250／dist620／day／sunny共通、seasonのみ変更。

農家では花が床の前の地面へ分離し、縁側の面が読める。物置は入口の花の重なりが減る。一方、固定gallery cameraでは移動後の花が画面端にかかる。建物の細長さ、花の相対サイズ、残る干渉は未解決。今回Depth／地域の構図／照明／水・橋の完成を主張しない。既存Claude→Astraの全体比較は過去のrunとVisualQuality資料を維持。

独立レビューの軽微残件：home:15 part29付近で花冠同士の小さな重なり候補（中心23.57／合計半径25）。synthetic testは道・spot・庭の個別境界fixtureが不足し、実world監査を併用。小物では車・tractor等の箱状silhouetteが残る。

## 固定preview・Human QA

外部preview到達性は未確認：[3D＋perf](https://rawcdn.githack.com/Naoto214/naotocchi/c03dc729e714a7f66177ac50443a128ddc7d5f56/index.html?meguru3d=1&perf=1)／[normal3D](https://rawcdn.githack.com/Naoto214/naotocchi/c03dc729e714a7f66177ac50443a128ddc7d5f56/index.html?meguru3d=1)／[2D比較](https://rawcdn.githack.com/Naoto214/naotocchi/c03dc729e714a7f66177ac50443a128ddc7d5f56/index.html?meguru3d=1&m3d2d=1)。最新2D screenshot自体はこのrunで再撮影していない。

iPhoneのghost／残像／消失／stutter／p95・p99・>60ms／adaptive resolution／probeと目視の一致、最終的な奥行き・構図・家・橋・水・地域識別・箱庭の魅力は全て未承認。RAF停止画像はperformance benchmarkではない。

PR374 Draft維持。main merge／Ready／production Pages／save／schema／Character3D／Resident Expression変更なし。Worldは未完成。次はBuilding massing／rooflineとscene depth、vegetation layering、water-bank／bridge、小物品質へ進む。証跡復元だけでlaneを終了しない。
