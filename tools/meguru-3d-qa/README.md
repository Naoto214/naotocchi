# めぐる 3D QA(browser・headless Chromium)

3D Foundation v2 の browser QA。`?meguru3d=1` の 3D を SwiftShader で 起動し、数字と しゃしんを 出す(実機の GPU 時間の 目安には ならない)。
`NODE_PATH=./node_modules` で 実行(repo の node_modules を つかう。Playwright の Chromium は `/opt/pw-browsers/chromium` か `PLAYWRIGHT_CHROMIUM`)。

- `regions-smoke.cjs <root> <outDir> [regions,...]`: 13 地域 ぜんぶ。3D 起動 / 4 方向 あるく / 27 にん / めりこみ / calls / tris / JS / player ok / ghost / errors / fallback。`regions-smoke.json` + 地域ごとの しゃしん
- `corridor-qa.cjs <root> <outDir> [a|b|from,...]`: corridor(地域の あいだの 道)を 3D で 歩きとおす。出発 → corridor → 到着 の あいだ ずっと 3D か・player が 見えて いるか・ghost・errors。`corridor-qa.json` + 道の 途中の しゃしん
- `shot.cjs <root> <outDir> '<json>'`: 任意の 地域 / spot / むき / 環境の しゃしん(`[{ region, spot|x,z, yaw, dx, dz, dist, env:[time,weather,season], perf, name }]`)
- `visibility-audit.cjs <root> <outDir> [regions,...] [step=220]`(env `YAWS=0,1.2,-1.2,3.14`): 道の segment を step ごとに あるき、4 方向の カメラで player の 足 / むね / あたま へ ray(`&perf=1` の 診断と おなじ rayProbe)。hidden(3 本 とも 隠れる)/ partial / 平均 ghost / tris。`vis-audit.json`。**headless の 数字は 実機の 目視の かわり に ならない**
- `geometry-audit.cjs [regions,...] [--identity] [--json out.json]`(browser なし・node だけ): 接地(浮き / 埋まり)・小川 / 川の 交わり と 橋・川の 帯の 中の 池・家の シルエット・地域の 指紋(--identity)。`tests/meguru-3d-geometry-audit-test.cjs` と おなじ `auditRegion`
- `shots-geometry-audit-v1.json`: `docs/qa/meguru-3d-geometry-audit-v1/*-ga.jpg` を つくった shot の 一覧(`node shot.cjs <root> <outDir> "$(cat shots-geometry-audit-v1.json)"`)
