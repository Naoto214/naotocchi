# めぐる 3D QA(browser・headless Chromium)

3D Foundation v2 の browser QA。`?meguru3d=1` の 3D を SwiftShader で 起動し、数字と しゃしんを 出す(実機の GPU 時間の 目安には ならない)。
`NODE_PATH=./node_modules` で 実行(repo の node_modules を つかう。Playwright の Chromium は `/opt/pw-browsers/chromium` か `PLAYWRIGHT_CHROMIUM`)。

- `regions-smoke.cjs <root> <outDir> [regions,...]`: 13 地域 ぜんぶ。3D 起動 / 4 方向 あるく / 27 にん / めりこみ / calls / tris / JS / player ok / ghost / errors / fallback。`regions-smoke.json` + 地域ごとの しゃしん
- `corridor-qa.cjs <root> <outDir> [a|b|from,...]`: corridor(地域の あいだの 道)を 3D で 歩きとおす。出発 → corridor → 到着 の あいだ ずっと 3D か・player が 見えて いるか・ghost・errors。`corridor-qa.json` + 道の 途中の しゃしん
- `shot.cjs <root> <outDir> '<json>'`: 任意の 地域 / spot / むき / 環境の しゃしん(`[{ region, spot|x,z, yaw, dx, dz, dist, env:[time,weather,season], perf, name }]`)
