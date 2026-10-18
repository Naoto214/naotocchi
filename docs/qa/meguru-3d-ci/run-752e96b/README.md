# World facade checkpoint — 自動検証成立、Human QA未承認

Product752e96b205f95930a19119c5c658e79372e8a494 / tree0fc8beb7fcc89ba29db0b073ea2afbf24ae22f46。BEFORE65da1f9ae58abd695610c98cfc9c46538af6a625。[CI37340751953](https://github.com/Naoto214/naotocchi/actions/runs/37340751953)。

小住宅で入口・窓枠・窓台が重なる状態を、既存の壁とドアから求める共通の配置幅で整理。狭い壁は窓を1つにし、出窓がある場合はその屋根の幅を予約する。通常ガラスは壁上端に収まる範囲で14→24、ドアは低いひさしのない住宅のみ52→58。ひさし付き・物置は従来52、納屋の規則も維持。レビューで出窓とひさしの2問題を発見・修正し、REDと中間FAILも保存した。

農家では横に連結して見えた窓が分離し、各開口が読みやすくなった。singleでは出窓の背後に重なる通常窓を除いた。2階建ては上下の窓の間隔が明確になった。一方、小住宅・shopの細長さ、上部の広い無地壁、ポーチと窓の窮屈さは未解決。全体の構図・植生・橋・水・小物まで改善したとは判定しない。

## 検証

- 無変更のnpm test：2874＋80 PASS、FAIL0、exit0。Node24。生ログ・終了値・一致するsource SHA256を ../../meguru-3d-openings に保存。
- CI full package pipeline：2874＋80 PASS、FAIL0、exit0。Node22、test concurrency4。ローカルnpmとは区別。
- World関連87PASS、独立再レビュー Critical/Important0。極端に狭いfacadeのsynthetic fixture不足は軽微残件。
- 13地域の2D・canonical3D・collision・object数不変。93parts削減（home26/city15/countryside22/sea30）。静的float4/bury18を維持。
- smoke13地域／27party、問題0。corridor8方向、全到着、問題0。
- visibility2832samples、fully hidden0、partial1。step1000、yaw0/1.2/-1.2/3.14。実機視認性の承認ではない。
- 仲間のx/z円形障害物重なり最大5.684341886080802e-14。地形めり込みではない。過去0.002591405357044607等は履歴に維持。
- 35同条件World／入口view：draw calls全て不変。trianglesは14viewで減少、21view同値、増加0。city130476→130406／50calls、home35272→35132／42、countryside119248→119108／54、sea70000→69804／50。jungle172794／62、forest147752／60は不変。
- 新しいmaterial・transparency・shape・per-frame処理なし。instance更新やadaptive resolutionのruntimeは変更なし。静止撮影はframe pacing benchmarkではない。
- 全5artifactのZIP SHA256、source、commit、exit照合済み。原データと撮影recipeをこのフォルダに保存。

修正前5d9ebd4のCIは2873＋80PASS。ローカル旧runはレビュー指摘で中断130として保存し、GREENへ読み替えていない。過去17c1bdbの2858PASS／1FAILも元資料に残る。

## 比較資料

[55組BEFORE／AFTER](compare.md) · [Claude Geometry→初期Astra→最新31場面](lineage.md) · [13地域](representatives.jpg) · [建物family](closeups.jpg) · [home/countryside・forest/jungle・湖比較](regional-identity.jpg) · [橋と水際](water-bridges.jpg) · [山の夏冬](mountain-seasons.jpg)。

Claudeが構築した地形・水系・橋・runtimeの上で、Astra段階は光と接地、入口・庭・植物配置、今回の開口を改善してきた。31sceneの保存recipeは画像名以外一致するが、actor animation phaseは固定していない。画像は再生成したClaude実行結果ではなく、当時の保存画像と最新撮影を比較する。

夏冬はmtvillage／yaw0／dz-250／dist620／day／sunny共通、seasonのみ変更。夏に全面積雪はない。2Dの正本データ一致は確認したが、最新2Dスクリーンショットは今回未撮影。

## Preview / Human QA

外部到達性未確認：[3D＋perf](https://rawcdn.githack.com/Naoto214/naotocchi/752e96b205f95930a19119c5c658e79372e8a494/index.html?meguru3d=1&perf=1) · [通常3D](https://rawcdn.githack.com/Naoto214/naotocchi/752e96b205f95930a19119c5c658e79372e8a494/index.html?meguru3d=1) · [2D比較](https://rawcdn.githack.com/Naoto214/naotocchi/752e96b205f95930a19119c5c658e79372e8a494/index.html?meguru3d=1&m3d2d=1)。

iPhoneのghost／残像／player消失／stutter／p95・p99・>60ms／adaptive resolutionとprobe・実表示の一致は未承認。最終的な奥行き・構図・家の魅力・橋の読みやすさ・水の自然さ・地域識別・箱庭の魅力もHuman QAが必要。automated GREEN ≠ Human QA approval。

PR374はopen/Draft、base69a8857b、main0b0a6b30をfresh確認。main merge/import、Ready、production Pages、save/schema、Character3D、Resident Expression変更なし。Worldは未完成。[完全な継続手順](../../meguru-3d-openings/continuation.md)。次は同じ窓を磨き続けず、scene depth／植生の層／水際と橋／低品質propを監査する。
