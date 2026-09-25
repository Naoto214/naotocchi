# Phase 4E-4 Preflight — 10 本の walk corridor 横断監査

日付: 2026-09-24 ／ 対象: main `f273748`(#338 Phase 4E-3 マージ後)／ 前提: [Phase 4E 設計](meguru-phase4e-continuous-corridor-world-2026-09-23.md)・[4E-1](../handoff/meguru-phase4e1-corridor-geometry-2026-09-23.md)・[4E-2](../handoff/meguru-phase4e2-home-forest-poc-2026-09-23.md)・[4E-3](../handoff/meguru-phase4e3-corridor-preload-2026-09-24.md)

**この文書は監査だけです。コードは 1 行も変えていません。**
残り 9 本への continuous walk の展開・corridor の入口の最適化・global collision・住民の地域間移動・save schema の変更・Three.js には進んでいません。

---

## 0. 結論(先に)

| 問い | 答え |
|---|---|
| 10 本すべてに今の 4E-2 / 4E-3 のしくみがそのまま使えるか | **使える。** 計測用コピーで許可リストだけ 10 本にして、20 方向 × (初回・2 かいめ・引き返し・しっぱい) を実際に歩いた。全方向で preload → commit(二重 build 0)、引き返しで aborted・出発地域の正本のまま、しっぱいで 4E-2 の着き方、save の key は同じ、はっけん(link)も記録された |
| 着く側の `buildWorld` は forest より重い地域があるか | **ない。** walk の着く側でいちばん重いのは forest(Node 117 ms、ブラウザ CPU 4 倍 75 ms 単体 / 歩きながらの preload で 98〜126 ms)。forest より重いのは jungle(99 ms)だが jungle は walk corridor を持たない。4E-3 の「出発 world を着くまで持つ(案 D)」はそのまま |
| しきい 0.7 は 10 本に合うか | **9 本は A。`countryside\|forest` だけ C**(道が 5 段 2250 と短く、着く側が最重の forest)。2 かいめ countryside→forest で絵のしたく(warm)が着くまでに終わらず、暗転 383 ms。**開始を「のこり 810(= 0.3 × 2700)」の距離で決める**と、6 段の 9 本は今と同じ 0.70、5 段は 0.64 になり解ける(§5) |
| corridor に入った frame(140〜186 ms)は何か | **けしきの絵を はじめて画面に出すときの 1 回きりの重さ**(1 frame に 1 こだけ 75〜111 ms。絵のデコード / ラスタライズ)。なかまの人数には よらない(1 / 8 / 27 人でほぼ同じ)。2 かいめは 13〜50 ms。10 本の初回で 39〜63 ms が 8 本、**`home\|forest` 149〜187 ms と `city\|sea` 148〜153 ms の 2 本が重い**(§6) |
| 4E-4 の前に直すべきか | **入口の重さは 4E-4A と同時に直す(先に独立 PR にはしない)**。重いのは初回の 1 回だけで、見えるつまずき(1 frame 150 ms 級、CPU 4 倍)。直し方は 4E-3 と同じ「さきに絵を読む・見えないところで したく する」で、暗転を長くする案は最後の手段(§6.6) |
| あたらしく見つかったこと | ① ready のあとの warm(着く側の立て看板のしたく)が初回に 110〜118 ms の frame を出す(→mountain・→countryside)(§7) ② 端の段の色(palette)が出発地域と合わない corridor が 4 本(city 側 3 本・countryside 側 1 本。ビル街から いきなり草原と家になる)(§8) ③ 湖・川ぞいの shore が 砂浜・海の水平線・🌴 になる(2 本)、背景が段ごとに行ったり来たりする(4 本)(§8) ④ 着いた直後になかまが障害物にめりこむ(今の transition でも同じ。corridor で悪くはならない)(§12) |
| 曲がり | めやす 30°/s を初回で超えるのは `countryside\|forest` だけ(32.1°/s)。2 かいめ(1.4 倍)では 5 本が超える。**直し方は「曲がる区間を道の全長にのばす + 2 かいめの速さを本ごとに上限」**(§9) |
| 新しい絵(asset)が要るか | **要らない。** 11 種の地面はすべて定義ずみ。足りないのは「どの地域の色・言葉を借りるか」の選び方だけで、各地域にある既存の構造物・絵文字で足りる(§8) |
| 展開のしかた | **3 つに分ける: 4E-4A(LOW 4 本)→ 4E-4B(MEDIUM 3 本)→ 4E-4C(HIGH 2 本)**(§22) |

---

## 1. 方法

- **main `f273748`** をそのまま使った。repo の worktree は触っていない(計測後に `git status` がきれい)
- 計測用のスクリプトと、**許可リストだけを 10 本にした計測用コピー**(`CONTINUOUS_WALK_ALLOWLIST` を上書きできる 1 行 + 時間を測る印)は scratchpad に置き、repo には入れていない。ゲームのしくみ(corridor の形・preload・fallback)は main のまま
- 実画面: Playwright + Chromium、390×844・DPR 3、**CPU 4 倍おそく**(CDP)と ふだんの速さ。なかま 1 / 8 / 27 人。1 本ごとに 1 ページで A→B(初回)→ B→A(2 かいめ)→ A→B(2 かいめ)
- Node: `tests/helpers/runtime-harness.cjs` で `buildWorldSteps` のくぎりごとの時間・world の同一性・ヒープ・corridor の形・gate・10 本 × 両方向の歩き
- 数字は CPU 4 倍の 1 回ずつ(ばらつきは ±20% くらい)。傾向と順位を見るためのもので、合格線は §24 で決める

---

## 2. 10 本の一覧(special 3 本と memory_lake は入らない)

| corridor | 段 | 長さ | 初回 / 2 かいめ | 曲がり | 分類 | 最大の曲がる速さ 初回 / 2 かいめ(°/s) | 幅(段ごと) | 地面(a → b) | 両端の land 一致 | 着く側 buildWorld(Node) | リスク |
|---|---:|---:|---|---:|---|---|---|---|---:|---|---|
| `snow\|mountain` | 6 | 2700 | 10.4 / 7.4 s | +131° | sharp | 18.9 / 26.4 | narrow ×6 | snow snow snow rock slope ridge | 5/6 | mountain 72 / snow 42 | LOW |
| `forest\|mountain` | 6 | 2700 | 10.4 / 7.4 | +156° | sharp | 22.5 / **31.5** | normal 2・narrow 4 | forest forest slope rock slope ridge | 5/6 | mountain 72 / forest 117 | MEDIUM |
| `mountain\|river_lake` | 6 | 2700 | 10.4 / 7.4 | +172° | uTurnLike | 24.8 / **34.8** | narrow 2・normal 4 | slope river rock river river shore | 4/6 | river_lake 68 / mountain 72 | MEDIUM |
| `desert\|mountain` | 6 | 2700 | 10.4 / 7.4 | −49° | gentle | 7.1 / 10.0 | normal 4・narrow 2 | dry dry dry rock dry ridge | 6/6 | mountain 72 / desert 46 | LOW |
| `countryside\|forest` | 5 | **2250** | 8.7 / 6.2 | +178° | uTurnLike | **32.1** / **44.9** | wide 2・narrow 1・normal 2 | urban-edge field slope forest forest | 3/5 | forest 117 / countryside 73 | **HIGH** |
| `home\|forest`(4E-2/3 済) | 6 | 2700 | 10.4 / 7.4 | +75° | wide | 10.9 / 15.2 | wide 3・normal 3 | urban-edge field field forest forest forest | 4/6 | forest 117 / home 13 | 済 |
| `home\|river_lake` | 6 | 2700 | 10.4 / 7.4 | +43° | gentle | 6.2 / 8.7 | wide 2・narrow 2・normal 2 | urban-edge field slope slope river shore | 3/6 | river_lake 68 / home 13 | LOW |
| `city\|countryside` | 6 | 2700 | 10.4 / 7.4 | −173° | uTurnLike | 25.0 / **35.0** | wide 3・narrow 3 | urban-edge field slope ridge slope field | 4/6 | countryside 73 / city 73 | **HIGH** |
| `city\|sea` | 6 | 2700 | 10.4 / 7.4 | −162° | uTurnLike | 23.3 / **32.7** | normal 4・wide 2 | river road urban-edge river shore shore | 6/6 | sea 37 / city 73 | MEDIUM |
| `city\|desert` | 6 | 2700 | 10.4 / 7.4 | −60° | wide | 8.7 / 12.2 | wide 2・normal 4 | urban-edge dry dry road dry dry | 6/6 | desert 46 / city 73 | LOW |

- 長さ 2700 が 9 本、2250 が 1 本(`countryside|forest`)。所要は初回 8.7〜10.4 秒、2 かいめ 6.2〜7.4 秒
- 幅クラス(corridor 全体)は narrow 4 / normal 6。段 59 は narrow 20 / normal 25 / wide 14
- 地面 11 種(slope 9 / dry 8 / forest 7 / river 6 / urban-edge 6 / field 6 / rock 4 / ridge 4 / shore 4 / snow 3 / road 2)は **すべて見た目の表(`CORRIDOR_TERRAIN_LOOK`)に定義ずみ**
- 4E-1 の表と同じ値(形のデータは 4E-1 から変わっていない)

---

## 3. `buildWorld` 13 地域(着く側の重さ)

### 3.1 Node(harness、7 回の中央値。くぎり = `buildWorldSteps` の yield と yield のあいだ)

| 地域 | 合計 ms | くぎり | 最大のくぎり ms | p95 くぎり ms | 4 ms で何 frame | props | 障害物 | world JSON KB | ヒープ KB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **forest** | **116.5** | 246 | 11.3 | 2.2 | 19 | 1230 | 469 | 504 | 455 |
| jungle(walk なし) | 98.9 | 202 | **14.8** | 3.7 | 16 | 1297 | 552 | 588 | 163※ |
| city | 73.5 | 219 | 10.1 | 1.1 | 13 | 1013 | 390 | 432 | 379 |
| countryside | 73.2 | 217 | 10.3 | 1.2 | 13 | 653 | 286 | 356 | 320 |
| mountain | 71.9 | 194 | 10.4 | 1.8 | 12 | 747 | 336 | 397 | 340 |
| river_lake | 68.3 | 176 | 12.7 | 2.0 | 13 | 677 | 294 | 329 | 311 |
| deepsea(walk なし) | 58.3 | 174 | 9.2 | 1.4 | 10 | 762 | 296 | 416 | 328 |
| desert | 46.0 | 180 | 7.1 | 1.0 | 8 | 496 | 261 | 376 | 317 |
| snow | 41.8 | 168 | 7.1 | 1.2 | 9 | 470 | 230 | 285 | 265 |
| sea | 37.4 | 169 | 5.0 | 1.2 | 8 | 460 | 221 | 292 | 251 |
| star_stop(walk なし) | 36.0 | 164 | 6.2 | 0.5 | 7 | 468 | 133 | 253 | 233 |
| memory_lake(walk なし) | 24.7 | 106 | 4.9 | 1.2 | 5 | 317 | 141 | 160 | 151 |
| home | 12.6 | 79 | 1.6 | 0.8 | 3 | 236 | 75 | 105 | 101 |

※ jungle のヒープは GC のゆれで小さく出ている(JSON は最大)。

### 3.2 実ブラウザ(Chromium、ふだんの速さ / CPU 4 倍、5 回の中央値)

| 地域 | 1 倍 合計 ms | 1 倍 最大くぎり | 4 倍 合計 ms | 4 倍 最大くぎり | 4 倍 p95 くぎり | くぎり数 | 4 ms で何 frame(4 倍) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **forest** | **16.9** | 3.4 | **75.4** | 15.2 | 1.2 | 246 | 13 |
| jungle(walk なし) | 12.2 | 1.7 | 63.9 | 11.6 | 1.7 | 202 | 12 |
| city | 14.4 | 10.8 | 58.3 | 14.9 | 2.0 | 219 | 11 |
| countryside | 14.4 | 3.6 | 45.8 | 16.2 | 1.2 | 217 | 10 |
| river_lake | 8.8 | 3.9 | 44.3 | **18.7** | 1.5 | 176 | 8 |
| mountain | 10.1 | 2.5 | 42.7 | 10.9 | 1.1 | 194 | 8 |
| deepsea(walk なし) | 7.4 | 1.2 | 33.1 | 4.6 | 1.1 | 174 | 8 |
| desert | 8.9 | 1.5 | 24.6 | 5.1 | 0.8 | 180 | 6 |
| snow | 5.5 | 1.4 | 24.0 | 4.1 | 0.9 | 168 | 6 |
| sea | 5.5 | 2.4 | 22.0 | 2.9 | 0.9 | 169 | 5 |
| star_stop(walk なし) | 4.3 | 0.8 | 17.5 | 3.3 | 0.7 | 164 | 5 |
| memory_lake(walk なし) | 2.7 | 0.5 | 11.4 | 1.6 | 0.8 | 106 | 3 |
| home | 1.9 | 0.5 | 9.2 | 2.5 | 0.9 | 79 | 2 |

- これは「めぐるを開いていない画面で、13 地域を続けて組んだ」ときの値(JIT が温まっている)。**実際に corridor を歩きながら組むと重くなる**: preload の `buildMs` は CPU 4 倍で forest 98〜126 ms・16〜20 frame、mountain 60〜90 ms、countryside 63〜129 ms、city 61〜88 ms、river_lake 62〜89 ms、desert 38〜51 ms、sea 37〜58 ms、snow 51 ms、home 11 ms(描画・GC と同じ frame を分けあうため)
- 順位は Node と同じ(forest > city ≒ countryside > river_lake ≒ mountain > desert ≒ snow ≒ sea > home)。**walk の着く側で forest より重い地域はない**

### 3.3 いちばん重いくぎり

最大のくぎり(Node 10〜15 ms)は どの地域も次の 5 か所のどれか:

| くぎり(`buildWorldSteps` の中) | 重い地域 |
|---|---|
| 道をかこむ大きなもの(frame: ビル・岩壁・大木) | jungle 16.3・forest 12.0・river_lake 12.2 |
| みはらしの spot の景色(view) | river_lake 13.8・mountain 12.3・countryside 11.5 |
| 群生(field)のかたまり | jungle 13.4・forest 8.9 |
| 地面のもよう(marks) | star_stop 10.4・river_lake 7.6 |
| 障害物(120 こごと)と当たり判定の格子 | forest 11.3・city 6.3 |

4E-3 の 1 frame 4 ms は「4 ms を超えたら次の frame」なので、1 frame の最大は 4 ms + 最大のくぎり。実ブラウザ CPU 4 倍の最大のくぎりは river_lake 18.7・countryside 16.2・forest 15.2・city 14.9 ms で、forest とほぼ同じ幅。10 本の実測で組む 1 frame は 13〜34 ms(4E-3 の forest 21〜33 ms と同じ幅)で、**10 本に広げても 1 frame の最大は大きくならない**。4E-4 で くぎりを細かくするなら、上の 5 か所のループの中に yield を足すだけでよい(4E-3 と同じやり方。world の同一性は §4 のテストで縛れる)。

---

## 4. 出来上がる world の同一性

13 地域すべてで「`buildWorld` を 1 回で」と「`buildWorldSteps` を くぎって、5 くぎりごとにほかの地域の `buildWorld` をはさむ」の JSON が 1 バイトも同じ(md5 一致)。4E-3 のテスト 2 と同じ結果を main で再確認した。

---

## 5. しきい 0.7 は 10 本に合うか

### 5.1 実測(CPU 4 倍・なかま 8 人・30 回)

| 向き | 初回? | ready % | 組む ms / frame | 組む 1 frame 最大 | 余裕 ms | warm 済み | 暗転 ms | 歩く p95 |
|---|---|---:|---|---:|---:|---|---:|---:|
| snow→mountain | 初回 | 74.6 | 75.7 / 13 | 23.1 | 2899 | ○ | 267 | 20.9 |
| mountain→snow | 2 かいめ | 76.2 | 51.3 / 10 | 23.9 | 1860 | ○ | 233 | 16.9 |
| snow→mountain | 2 かいめ | 75.9 | 77.2 / 11 | 33.7 | 1890 | ○ | 200 | 16.7 |
| forest→mountain | 初回 | 75.3 | 89.9 / 15 | 28.1 | 2826 | ○ | 233 | 24.7 |
| mountain→forest | 2 かいめ | 82.7 | 112.4 / 19 | 25.4 | 1393 | ○ | 267 | 20.6 |
| forest→mountain | 2 かいめ | 75.7 | 69.2 / 10 | 32.4 | 2038 | ○ | 200 | 17.2 |
| mountain→river_lake | 初回 | 74.1 | 88.6 / 12 | 30.1 | 2841 | ○ | 267 | 16.6 |
| river_lake→mountain | 2 かいめ | 76.4 | 78.4 / 13 | 24.1 | 1808 | ○ | 183 | 17.5 |
| mountain→river_lake | 2 かいめ | 75.3 | 64.5 / 10 | 72.5 | 1916 | ○ | 217 | 15.3 |
| desert→mountain | 初回 | 75.3 | 89.4 / 13 | 29.3 | 2821 | ○ | 300 | 20.3 |
| mountain→desert | 2 かいめ | 73.5 | 38.1 / 8 | 16.4 | 2064 | ○ | 217 | 15.7 |
| desert→mountain | 2 かいめ | 74.4 | 60.5 / 9 | 24.4 | 1995 | ○ | 200 | 17.1 |
| countryside→forest | 初回 | 79.7 | 119.8 / 19 | 25.8 | 1977 | ○ | 300 | 22.3 |
| forest→countryside | 2 かいめ | 77.4 | 72.8 / 12 | 24.8 | 1480 | ○ | 217 | 17.9 |
| countryside→forest | 2 かいめ | 82 | 98.4 / 16 | 27 | 1256 | **×** | 383 | 18.9 |
| home→forest | 初回 | 78.9 | 117.7 / 19 | 22.4 | 2447 | ○ | 233 | 24.4 |
| forest→home | 2 かいめ | 71.2 | 11.1 / 3 | 13.5 | 2244 | ○ | 250 | 18.6 |
| home→forest | 2 かいめ | 81.1 | 109.8 / 17 | 26.8 | 1727 | ○ | 183 | 22.3 |
| home→river_lake | 初回 | 73.5 | 66.7 / 11 | 20.5 | 2866 | ○ | 250 | 22 |
| river_lake→home | 2 かいめ | 71.2 | 11.6 / 2 | 18.1 | 2206 | ○ | 200 | 16.6 |
| home→river_lake | 2 かいめ | 74.4 | 61.6 / 10 | 23.7 | 1945 | ○ | 200 | 16.8 |
| city→countryside | 初回 | 76.2 | 94.9 / 15 | 31.3 | 2833 | ○ | 283 | 24.9 |
| countryside→city | 2 かいめ | 76.6 | 69.3 / 13 | 19.4 | 1817 | ○ | 200 | 18.7 |
| city→countryside | 2 かいめ | 73.5 | 62.7 / 8 | 27.4 | 2233 | ○ | 200 | 14.8 |
| city→sea | 初回 | 74.5 | 57.5 / 10 | 24.9 | 2917 | ○ | 217 | 19.3 |
| sea→city | 2 かいめ | 74.8 | 70.7 / 11 | 19.7 | 1979 | ○ | 217 | 18.6 |
| city→sea | 2 かいめ | 75.7 | 46.4 / 9 | 17.9 | 1905 | ○ | 217 | 14.6 |
| city→desert | 初回 | 73 | 51.2 / 9 | 16.5 | 2921 | ○ | 200 | 21.6 |
| desert→city | 2 かいめ | 75.7 | 60.7 / 11 | 20.7 | 1870 | ○ | 233 | 19.1 |
| city→desert | 2 かいめ | 75.3 | 44.8 / 10 | 16.8 | 1909 | ○ | 183 | 15.4 |

ふだんの速さ(CPU 1 倍・なかま 8 人・10 本の初回): ready 70.5〜71.1%、組む 12〜32 ms を 3〜6 frame、組む 1 frame 最大 6.6〜13.7 ms、余裕 2564〜3082 ms、暗転 200〜217 ms、歩く p95 3.9〜5.2 ms。

- **余裕**(ready から着くまで): 初回 1977〜2921 ms、2 かいめ 1256〜2244 ms
- **ready の位置**: 71〜83%(中央値 75%)
- **組む 1 frame の最大**: 13〜34 ms(1 回だけ 72 ms。この frame の組む時間は 17 ms で、のこりは GC と描画)
- **fallback 0 / 30、組みかけで着いた(late)0 / 30**
- **warm(着く側の立て看板のしたく)が着くまでに終わったのは 29 / 30**。終わらなかったのは **countryside→forest の 2 かいめ**(余裕 1256 ms)で、暗転の下で 1 まいえがくことになり(48.5 ms)、暗転 383 ms。なかま 27 人でも同じ(余裕 1507 ms・暗転 383 ms)

### 5.2 分類(余裕 = 2 かいめの最小)

| 分類 | きまり | corridor |
|---|---|---|
| **A** | 2 かいめも ready + warm が着く 1 秒以上まえに終わる | 9 本(`snow\|mountain` `forest\|mountain`※ `mountain\|river_lake` `desert\|mountain` `home\|forest` `home\|river_lake` `city\|countryside` `city\|sea` `city\|desert`) |
| B | 間に合うが 1 秒を切る | なし |
| **C** | 2 かいめに warm が間に合わない | **`countryside\|forest`(countryside→forest)** |

※ `forest|mountain` の mountain→forest は余裕 1393〜1544 ms で A のはし(warm は終わっている)。

### 5.3 しきいを変えるか

| 案 | 中身 | 判定 |
|---|---|---|
| 0.7 のまま | 9 本は十分。`countryside\|forest` だけ C | × |
| 本ごとの値 | `countryside\|forest` だけ 0.6 など | △(値が散らばる) |
| **のこり距離で開始(推奨)** | 「のこり 810 world(= 0.3 × 2700)」で開始、すてるのは「のこり 1485(= 0.55 × 2700)」より もどったとき。6 段の 9 本は 0.70 / 0.45 のまま、5 段は 0.64 / 0.34 | **◎**。いまの 9 本の結果を変えずに C を解く。数は 2 つのまま |
| 速さで変える(speed-aware) | 2 かいめは 1.4 倍なので「のこり時間」で開始 | ○ だが のこり距離とほぼ同じ効果で、ふだんの速さ・CPU によらない距離のほうが単純 |
| `expectedBuildMs` で開始 | 地域ごとの重さの見つもりから開始位置を逆算 | △(端末差を見つもれない。いまは不要) |

**推奨: 4E-4A で開始・破棄を「のこり距離」に置きかえる**(`CORRIDOR_PRELOAD` の値が 2 つのまま、意味だけ「割合」→「距離」)。`countryside|forest` は 4E-4C なので、それまでに入れておけばよい。

---

## 6. corridor に入った frame(4E-3 で残った 140〜186 ms)

### 6.1 何の重さか(CPU 4 倍)

CPU 4 倍・なかま 8 人。単位 ms。

| 向き | 初回? | gate の frame(うち景色 world を組む) | 暗くする frame | corridor をはじめてえがく frame | その frame の立て看板 / 地面 / 細部 | 作った立て看板 |
|---|---|---|---|---:|---|---:|
| snow→mountain | 初回 | 37.6(15.1) | 20.9 | 39.3 | 20.6 / 4 / 6.5 | 6 |
| mountain→snow | 2 かいめ | 6.3(4.2) | 2.5 / 11.8 | 21.9 | 8.6 / 2.4 / 8.6 | 1 |
| snow→mountain | 2 かいめ | 6.1(3.7) | 13 | 26.1 | 14 / 2 / 6.4 | 0 |
| forest→mountain | 初回 | 29.6(14) | 16.5 | 42.2 | 22.5 / 2.4 / 11.4 | 9 |
| mountain→forest | 2 かいめ | 1.7(0.9) | 34.2 | 30.2 | 13.6 / 3.1 / 10.2 | 1 |
| forest→mountain | 2 かいめ | 10.6(6.4) | 12.1 | 19.4 | 4.6 / 2.1 / 10.3 | 0 |
| mountain→river_lake | 初回 | 28.3(12.5) | 10 | 43.4 | 27.2 / 2.8 / 9.1 | 12 |
| river_lake→mountain | 2 かいめ | 10(5.3) | 24.1 | 24.7 | 8.5 / 3.2 / 10.1 | 2 |
| mountain→river_lake | 2 かいめ | 5.3(3.2) | 8.1 / 9 | 13.4 | 4.4 / 1.3 / 5.9 | 0 |
| desert→mountain | 初回 | 31.5(12.6) | 14.2 | 62.9 | 48.1 / 2.2 / 7.1 | 9 |
| mountain→desert | 2 かいめ | 6.8(4.3) | 34 | 28.3 | 19.4 / 2.4 / 4.4 | 6 |
| desert→mountain | 2 かいめ | 6.5(4.4) | 15.4 / 2 | 22.4 | 6.5 / 7.7 / 6.3 | 0 |
| countryside→forest | 初回 | 28.5(13.9) | 24.1 | 49.9 | 33.1 / 2.3 / 9.8 | 14 |
| forest→countryside | 2 かいめ | 1.7(1) | 26.8 | 24.9 | 10.3 / 4 / 8.1 | 5 |
| countryside→forest | 2 かいめ | 7.3(4.5) | 18.6 | 18.9 | 8 / 1.9 / 6.7 | 0 |
| home→forest | 初回 | 26.7(12.4) | 37.6 | **186.7** | 172.3 / 2.9 / 7.1 | 15 |
| forest→home | 2 かいめ | 7.7(5.4) | 12.7 / 8 | 43.8 | 30.8 / 1.3 / 10.1 | 10 |
| home→forest | 2 かいめ | 4.8(2.7) | 20.3 | 26.9 | 15.5 / 2.3 / 7.3 | 1 |
| home→river_lake | 初回 | 27(12.1) | 26.8 | 54.3 | 46.3 / 0.5 / 6.3 | 16 |
| river_lake→home | 2 かいめ | 6.1(5.1) | 4.9 / 5 | 40.2 | 20.5 / 2.9 / 8.7 | 8 |
| home→river_lake | 2 かいめ | 6.3(3.2) | 20.3 / 14.2 | 21.9 | 10.2 / 3 / 5.8 | 2 |
| city→countryside | 初回 | 31.8(16.7) | 43.8 | 45.4 | 27.7 / 3.1 / 9.3 | 18 |
| countryside→city | 2 かいめ | 8(6.1) | 25.3 | 34.3 | 21 / 1.3 / 9.7 | 11 |
| city→countryside | 2 かいめ | 7.2(4.3) | 27.7 | 18.3 | 8 / 1.6 / 4.2 | 0 |
| city→sea | 初回 | 28.5(8.7) | 41.2 | **148.3** | 132.8 / 2.9 / 5.2 | 18 |
| sea→city | 2 かいめ | 6.5(4.6) | 49.5 | 27.6 | 18.6 / 2.1 / 5.1 | 13 |
| city→sea | 2 かいめ | 6.1(3.7) | 27.2 | 14.3 | 3.5 / 1.7 / 7.1 | 0 |
| city→desert | 初回 | 34.4(15.2) | 55.4 | 37.7 | 25.3 / 5 / 5.6 | 18 |
| desert→city | 2 かいめ | 7.7(5.2) | 21 | 38.5 | 24.1 / 3.1 / 8.2 | 8 |
| city→desert | 2 かいめ | 6(4.4) | 46.7 | 18.7 | 8.3 / 3 / 5.6 | 0 |

- 入る frame は 3 つ: ① gate を越えた frame(`createCorridorWalk` = chart + 景色の world を組む。**初回 9〜17 ms、2 かいめ 1〜6 ms**、描画なし)② 出発地域を少し暗くする frame(出発地域の絵、1〜2 まい)③ **corridor の景色をはじめてえがく frame**(いちばん重い)
- ③ の中身: 立て看板(items)がほとんど。地面・遠景・空・背景は合わせて 5〜10 ms
- **立て看板 1 こずつの時間を測ると、重い frame では 1 こだけが 75〜111 ms かかっている**(ほかは どれも 1〜7 ms):

| frame | その 1 こ | ms(CPU 4 倍) |
|---|---|---:|
| home→forest の corridor をはじめてえがく frame(137 ms) | 🍂(大きさ 77、画面上 0.18 倍) | 75.8 |
| city→sea の同じ frame(140 ms) | 🌷(69) | 91.7 |
| city の出口の手前の frame(184 ms、corridor の外) | 🐾(71) | 95.4 |
| desert の出口の手前の frame(157 ms、corridor の外) | 🌵(138) | 111.5 |
| forest→mountain の warm の 1 回(155 ms) | 🌼(64) | 105.4 |
| desert→mountain の warm の 1 回(119 ms) | 🌼(100) | 98.6 |
| city→countryside の warm の 1 回(94 ms) | 🌱(78) | 81.3 |

- 重いのは 小さな花・葉・足あと など どれも画面上では小さいもの。立て看板(glyph)を作る時間そのものは 1 こ 0.1〜4 ms(glyph 1 こずつの実測)。**その絵をはじめて画面に出すときの 1 回(絵の画像の はじめての デコード / ラスタライズ。けしきの絵は SVG か 大きな画像)** と見るのがいちばん合う: 1 frame に 1 こだけ・どの絵かは そのとき次第・2 かいめには出ない・corridor の外(出口の手前の region)でも同じ形で出る
- つまり **corridor の入口の重さは「corridor に入ったこと」ではなく「まだ画面に出していない けしきの絵が はじめて出る」こと**。corridor は最初の 2 段で 新しい絵(🌷 🌼 🍂 🌾 🏡 …)を一度に出すので、入口に集まる

### 6.2 初回 / 2 かいめ

| | 初回 | 2 かいめ |
|---|---|---|
| corridor の中の最大 frame | 39〜63 ms(8 本)、**`home\|forest` 149〜187 ms・`city\|sea` 148〜153 ms** | 13〜50 ms |
| その frame で作った立て看板(glyph) | 6〜18 こ(入口のまわり全体で 8〜64 こ) | 0〜11 こ |

2 かいめで軽くなるのは、絵のデコードが済んでいて、立て看板も地域をこえて使いまわされるから(glyph cache。上限 400)。

### 6.3 なかまの人数(1 / 8 / 27)

| corridor | 1 人 | 8 人 | 27 人 |
|---|---:|---:|---:|
| home→forest 初回 | 149.4 | 186.7 | —(4E-3 で 140〜186) |
| city→sea 初回 | 153.2 | 148.3 | — |
| city→countryside 初回 | — | 45.4 | 147.6 |
| forest→mountain 初回 | — | 42.2 | 52.6 |
| countryside→forest 初回 | — | 49.9 | 61.2 |

**人数ではきまらない。** 重くなるのは「その frame で、まだ画面に出していない絵が入ったか」(city→countryside は 8 人のときは その絵が 出口の手前の frame で先に出ていて、そちらが 184〜204 ms になった)。

### 6.4 出発地域による差

入口の重さは「出発地域で まだ作っていない絵」が corridor の最初の 2 段にどれだけあるかで決まる。`home` と `city` からの corridor は最初の段が urban-edge(🏠 🏡 🌷 🪴 fence)で、home 以外の地域ではほぼ新しい絵になる。`home|forest` は urban-edge の家の絵(大きい)と field の絵が一度に入る。

### 6.5 分類(A〜E)

| | 中身 | 入口の重さへの寄与 |
|---|---|---|
| **A. けしきの絵を はじめて画面に出す(絵のデコード / ラスタライズ)** | 1 frame に 1 こ 75〜111 ms(CPU 4 倍)。glyph を作る時間は 1 こ 0.1〜4 ms | **主因** |
| B. 景色の world を組む(`createCorridorWalk`) | 初回 9〜17 ms(gate の frame。描画とは別の frame) | 小 |
| C. 地面・空・遠景・背景 | 5〜10 ms | 小 |
| D. なかまの描画 | 人数で変わらない(§6.3) | ほぼ 0 |
| E. DOM(ヒントの文字)・GC | 数 ms、ときどき | 小 |

### 6.6 4E-4 の前に直すか / どう直すか

- **4E-4 の前に単独では直さない。4E-4A の中で直す。** 理由: 初回の 1 回だけで、2 かいめは 13〜50 ms。10 本に広げると初回の入口は 10 本 × 両方向で 20 回起きうるので、展開と同時に入れるのがよい
- **見えるつまずき**: CPU 4 倍で 1 frame 150〜190 ms は見える(ふだんの速さ = CPU 1 倍でも、初回 7.6〜35.8 ms。`home|forest` 35.8・`city|sea` 33.1 は 60 fps の 2 frame ぶん)。入口の暗くする時間は 0.06 秒なので、その下には隠れない
- 直し方の候補(効く順):
  1. **出口 spot に近づいたら(gate の手前)、corridor の景色で使う絵を先に読みこみ、画像のデコードを非同期で済ませておく**(`decode()` / `createImageBitmap`)。そのあと 見えない renderer で立て看板を作る(4E-3 の warm と同じしくみを入口にも使う)。デコードが済んでいれば 1 こ 1〜4 ms
  2. corridor の最初の段の飾りを **出発地域の絵から選ぶ**(§8 の「端の段は出発地域の色と言葉」と同じ直し。作る立て看板そのものが減る)
  3. 景色の world を gate の手前で組んでおく(B の 9〜17 ms を歩いている frame に分ける)
  4. (最後の手段)入口の暗くする時間をのばす。暗転がのびるのは体験が悪くなるので使わない

---

## 7. warm(着く側の立て看板のしたく)のつまずき — あたらしく見つかった

- ready のあと、着く側の world の立て看板を 24 回に分けて見えない canvas でえがく(4E-3)
- 初回で 1 回に作る絵が多い地域だと、その 1 回が重い: **forest→mountain 118 ms、desert→mountain 110 ms、city→countryside 114 ms**(CPU 4 倍・なかま 8 人)。歩いている途中(75〜82%)なので **見える**
- 2 かいめは 22〜64 ms
- warm の重い 1 回も **1 こだけ**が重い(🌼 105 ms・98.6 ms、🌱 81 ms)。§6.1 と同じ「絵をはじめて出す 1 回」が、見えない canvas でのしたくの途中に来ている(warm は 4×4 の canvas にえがくが、絵の立て看板を作るときに絵のデコードが起きる)
- 直し方: warm を「数」ではなく「時間」で区切っても、重い 1 こ(80〜110 ms)は分けられない。**絵のデコードを 先に・非同期で済ませる**(ready で読みこみを始めるときに、使う絵の画像を `decode()` / `createImageBitmap` で待つ)のが本筋。これは入口(§6.6)と同じ直しなので、4E-4A でいっしょに扱う。絵の読みこみ(script.js の `prepareIllustrations`)に手が入るので、4E-4A の中でも独立したコミットにする

---

## 8. 地面と景色の言葉(terrain / scenery vocabulary)

### 8.1 定義の網羅

11 種すべてに `CORRIDOR_TERRAIN_LOOK` がある。10 本 × 両方向の景色 world はすべて組めた(飾り 79〜96、JSON 22〜27 KB、組む時間 Node 2.5〜5.5 ms)。**新しい絵は要らない。**

### 8.2 合わないところ(見て確かめた。§8.4 の見本帳)

| 問題 | どこ | 中身 | 直し方(既存の絵だけ) |
|---|---|---|---|
| **端の段の色が出発 / 到着地域と違う** | `city\|countryside` `city\|sea` `city\|desert` の city 側、`countryside\|forest` の countryside 側 | urban-edge は いつも home の色(`palette: 'home'`)。city を出ると 最初の段が home の芝生色と家になる。`city\|sea` の city 側は river で river_lake の色 | 端の段(最初と最後)は **その端の地域の palette** を使う |
| **湖・川の岸が海になる** | `mountain\|river_lake` `home\|river_lake` の river_lake 側(shore) | shore は `palette: 'sea'` → seahorizon の背景と 🌴 | shore は **着く側が river_lake なら river_lake の palette**(lakehills・reedclump・🪷) |
| **背景が段ごとに行ったり来たり** | `mountain\|river_lake`(peaks ↔ lakehills 4 回)、`desert\|mountain`(mesas ↔ peaks 3 回)、`city\|desert`(hills ↔ mesas 3 回)、`city\|sea` | 背景(backdrop)は その段の palette の地域のもの。段の境目で切りかわる | 背景は **出発側 → 到着側 の 1 回だけ**(t = 0.5)にし、段ごとには変えない(4E-2 の region 名の切りかえと同じ) |
| 言葉がうすい段 | rock / ridge / snow / dry(飾りが 1〜2 種) | 🪨 だけ、🌵 だけ が続く | 各地域の既存の構造物を足す: snow = snowbank / snowdrift / icepillar、mountain = ledgerock / cliffwall / cairn、desert = sandcrest / dunewall / 🏺、city = 🏢 / shopblock / 🚲 / 🚦 |
| urban-edge の中身 | city 側の「そうこがい」「いちばの はずれ」 | 家(🏠 🏡)と花 | city 側の urban-edge は city の構造物(building・shopblock・🚲)に |

### 8.3 地域ごとの既存の言葉(`buildWorld` の props 上位。借りられるもの)

| 地域 | 背景 | 多い飾り |
|---|---|---|
| city | neonskyline | 🏢 guardpost building 🏬 🌳 🪧 shopblock 🚲 💡 🚦 |
| countryside | farhills | 🌳 ricestalk farmhouse 🪧 woodfence 🪵 hayroll |
| forest | treeline | 🌲 bigtrunk branch 🌳 🌿 🍄 bigrock 🪵 |
| mountain | peaks | 🌲 ledgerock cliffwall bigrock pinewall 🥾 cairn |
| snow | snowpeaks | 🌲 pinewall snowbank snowdrift icepillar ❄️ snowfence |
| sea | seahorizon | 🌴 palmfrond searock duneridge 🐚 driftwood |
| river_lake | lakehills | 🌳 riverwood reedclump 🌿 💧 riverrock 🪷 reed |
| desert | mesas | 🌵 sandcrest mesa dunewall 🏺 ruinwall |
| home | hills | hedge 🌳 fencerail 🏠 planter 🌷 🪧 |

### 8.4 見本帳(10 本 × 出発 → 入口 3% → 段のまんなか → 97% → 着いた、ふだんの速さ・なかま 8 人・390×844)

実画面で撮って並べた(画像は repo に入れない。手順は付録 A)。見て分かったこと:

| corridor(向き) | 見え方 | 判定 |
|---|---|---|
| `city\|sea`(city →) | 灰色のビル街 → **いきなり緑の草原と赤い屋根の家**(「みやこがわの かわぞい」「そうこがい」が いなか の景色)→ 75% から砂浜と海 | **× 入口の段差がいちばん大きい** |
| `city\|countryside`(city →) | ビル街 → 緑の平地と家(「まちの そとがわ」)。峠の段(42〜75%)は灰色の岩場と山なみで よい | × 入口 |
| `city\|desert`(city →) | ビル街 → 緑の草原と家(「いちばの はずれ」)→ 砂とメサ(25%)→ **緑の草原にもどる(58%、road の段が home の色)** → 砂 | × 入口 + 行ったり来たり |
| `mountain\|river_lake`(mountain →) | 灰色 → 緑(25%)→ 灰色(42%)→ 緑 + 🌴(58〜75%)→ **92〜97% が砂浜・海の水平線・ヨット**(「みずうみの きし」)→ 着くと緑の湖 | × 背景の行ったり来たり + 湖が海 |
| `home\|river_lake`(home →) | 畑 → 灰色の坂(42〜58%)→ 🌴 → **92〜97% が砂浜と海**(「かわぎしの ひろば」)→ 着くと緑の川ぞい | × 湖・川が海 |
| `desert\|mountain`(desert →) | 砂とメサ → 灰色の岩(58%)→ **砂とメサにもどる(75%)** → 灰色(92%) | × 行ったり来たり |
| `countryside\|forest`(countryside →) | 出発地点は「ちんじゅのもり」(木の多い spot)→ **明るい集落と家**(home の色)→ 灰色の山道(50%)→ 森 | △ 入口の段差 |
| `snow\|mountain`(snow →) | 雪原と 🌲 → 58% から灰色の岩場(雪が急に消える)。飾りは 🪨 がほとんど | △ 言葉がうすい |
| `forest\|mountain`(forest →) | 森 → 灰色の坂と岩。自然 | ○(岩場は 🪨 だけで単調) |
| `home\|forest` | 4E-2 のとおり(いえなみ → 畑 → 森) | ○ |

- どの本も JS エラー 0、なかま 8 人は帯の中に並ぶ
- 「端の段は端の地域の palette」「shore は着く側が river_lake なら river_lake の palette」「背景は 1 回だけ切りかえ」の 3 つで、× の 6 本はすべて直る見こみ(どれも既存の地域の色と言葉)

---

## 9. 曲がり(bend 43〜178°)

### 9.1 今の値

- 曲がりは「段 1 の後ろ半分 〜 最後の段の前半分」(= (段 − 1) × 450)で、両はし 2 割で上げ下げ(4E-1)
- 初回でめやす 30°/s を超えるのは `countryside|forest` だけ(32.1)。2 かいめ(1.4 倍)では 5 本が超える(`countryside|forest` 44.9、`city|countryside` 35.0、`mountain|river_lake` 34.8、`city|sea` 32.7、`forest|mountain` 31.5)
- いちばん小さい曲がりの半径は `countryside|forest` の 464(帯の半幅 最大 260 より大きいので、帯の内側は重ならない)
- harness(50 ms 刻み)でカメラの向きの速さを測ると、10 本とも spec の 1.28 倍で一定(刻みの影響。順位と超える本数は spec と同じ)。4E-2 の実画面では `home|forest` のカメラは spec と一致している

### 9.2 `countryside|forest`(178°、5 段)

- 段ごとの曲がり: 8.7 / 52.4 / 55.5 / 52.4 / 8.7°。1 段(450、初回 1.7 秒)で 55° 回る
- 景色: しゅうらく → はたけの けはい → やまみち → すぎの こだち → ふかい もり(countryside から)。**ほぼ U ターンの山道**。地理的には「村の裏から山道を登って、尾根で折り返して森へ下りる」
- 両端の land の一致 3 / 5(のこり 2 段は両側で呼び名が違う: やまみち / こけのかいだん)

### 9.3 直し方の比較(°/s、初回 / 2 かいめ)

| 案 | `countryside\|forest` | `city\|countryside` | `mountain\|river_lake` | `city\|sea` | `forest\|mountain` | 副作用 |
|---|---|---|---|---|---|---|
| いま | 32.1 / 44.9 | 25.0 / 35.0 | 24.8 / 34.8 | 23.3 / 32.7 | 22.5 / 31.5 | — |
| ① 曲がる区間を全長に(はじめと終わりの半段のまっすぐをやめる) | 25.7 / 35.9 | 20.9 / 29.2 | 20.7 / 29.0 | 19.4 / 27.2 | 18.8 / 26.3 | 出口の向きの一致が「はしの 1 点」だけになる(handoff の向きは 4E-1 のテスト 10 でしばれる) |
| ② ramp 0.2 → 0.1 | 28.5 / 39.9 | 22.2 / 31.1 | 22.1 / 30.9 | 20.7 / 29.0 | 20.0 / 28.0 | 曲がりはじめが少し急 |
| ①+② | 22.8 / 31.9 | 18.5 / 26.0 | 18.4 / 25.8 | 17.3 / 24.2 | 16.7 / 23.4 | 上の 2 つ |
| ③ 2 かいめの速さを本ごとに上限(ピーク ≤ 30°/s) | 32.1 / 30(×0.94) | ×1.20 | ×1.21 | ×1.29 | ×1.33 | 2 かいめの時間がのびる(`countryside\|forest` 6.2 → 9.2 秒) |
| ④ 長さをのばす(2 かいめ ≤ 30 に必要な長さ) | 3145 | 3078 | 3057 | 2900 | 2815 | 段 × 450 がくずれる。時間ものびる |
| ⑤ カメラの追いかけを遅くする | 見た目の回転はへるが、道とカメラがずれる | | | | | 酔いやすさの本質は変わらない |

**推奨: ① + ③**。① だけで 5 本すべて初回 26°/s 以下、2 かいめも `countryside|forest` 以外の 4 本は 30°/s 以下(26.3〜29.2)になる。のこる `countryside|forest` だけ ③ で 2 かいめの速さを ×1.17 に止める(ピーク 30°/s、2 かいめ 7.4 秒。いまの 6.2 秒より 1.2 秒のびる)。③ は「ピーク × 速さ ≤ 30」の式なので本ごとの表は要らない。② はまだ入れない(① + ③ で足りる)。
地面の形・段の数・land は変えない。① は 4E-4B(2 かいめに 30°/s を超える MEDIUM 3 本のため)、③ は 4E-4C(`countryside|forest`)で入れる。

---

## 10. 幅となかまの並び

### 10.1 幅ごとの並び(`partyFormationSlots(n, { maxHalf: uMax × 0.9 })`)

| 幅 | uMax | 1 人 | 8 人 | 16 人 | 27 人 |
|---|---:|---|---|---|---|
| wide | 238 | 1 段・横 80 | 3 段・横 200・奥 230 | 4 段・横 214・奥 295 | 4 段・横 214・奥 295 |
| normal | 168 | 1 段・横 80 | 3 段・横 151・奥 230 | 5 段・横 151・奥 320 | 8 段・横 151・奥 530 |
| **narrow** | 108 | 1 段・横 58 | 3 段・横 97・奥 230 | 6 段・横 97・奥 385 | **8 段・横 97・奥 530** |

- どの幅でも並びは帯の中(横の最大 ≤ uMax)。自分が帯のはしにいるときは、はみ出すぶんを帯の中へ止める(27 人で 14 人)
- narrow で 27 人は 8 段・奥 530。**道の 1.2 段ぶんの長さ**に並ぶ。見た目は「細い山道を 1 列に近い形で続く」で、4E-2 の実画面(normal)と同じしくみ
- harness で 10 本 × 両方向を 27 人で歩き、帯からのはみ出し 0

### 10.2 27 人の描画の重さ(重い 3 本、CPU 4 倍)

| 向き(27 人) | 初回? | 入口の最大 frame | 歩く p50 / p95 | そのうち描画 p50 / p95 | 段の切りかわり 最大 | 暗転 | 着いたあと p95 |
|---|---|---:|---|---|---:|---:|---:|
| forest→mountain | 初回 | 52.6 | 11.3 / 21.1 | 9.4 / 17.3 | 14 | 267 | 42.5 |
| mountain→forest | 2 かいめ | 36.5 | 11.1 / 20.5 | 9 / 14.8 | 16 | 250 | 39.5 |
| forest→mountain | 2 かいめ | 18.5 | 10.2 / 18.1 | 8.3 / 13.9 | 12.6 | 233 | 36.3 |
| countryside→forest | 初回 | 61.2 | 12 / 24.9 | 10.2 / 18.3 | 20.7 | 267 | 38.4 |
| forest→countryside | 2 かいめ | 25.9 | 12.6 / 21.4 | 10.3 / 17.3 | 16.7 | 200 | 36.4 |
| countryside→forest | 2 かいめ | 16.6 | 11.4 / 18.2 | 9.4 / 15.5 | 18.3 | 383 | 39.2 |
| city→countryside | 初回 | 147.6 | 14.2 / 40.9 | 12.7 / 29 | 44.4 | 350 | 77.8 |
| countryside→city | 2 かいめ | 40.9 | 12.6 / 22.5 | 10.1 / 18.3 | 18.5 | 233 | 47.3 |
| city→countryside | 2 かいめ | 28.2 | 11 / 18.6 | 9.1 / 15.6 | 15.1 | 200 | 40.5 |

- 27 人の corridor を歩く p95 は 18〜25 ms(city→countryside の初回だけ 41 ms。絵をはじめて出す frame を含む)。描画だけなら p95 14〜29 ms
- 8 人のときの p95(15〜25 ms)より 1〜3 ms 重い。4E-2 §17 の LOD・cache が 10 本でも効いている
- `city|countryside` の初回は 27 人で入口 148 ms・段の切りかわり 44 ms・暗転 350 ms と いちばん重い(8 人では 45 / 21 / 283)
- 「着いたあと p95」(36〜78 ms)は region を 27 人で歩く重さで、corridor とは別(4E-2 §17 と同じ region 側のもの。27 人・CPU 4 倍の forest / mountain / countryside / city)

---

## 11. 当たり判定・障害物

- corridor の当たり判定は 4E-2 のまま: 帯の左右のはし + 段ごとにいし 1 こ(帯のはし、通行帯の外)。10 本とも `maxObstacleCount` 12〜20(上限 24)の中
- region の collider は corridor に持ちこまない(4E-2 と同じ)
- harness で 10 本 × 両方向、u の上限こえ 0

---

## 12. 着いた位置となかまのめりこみ

- 着いた位置は入口 spot の中心から 0〜24(spot 半径 160〜280 の中)。自分のめりこみ 0(20 方向すべて)
- **なかまのめりこみ(着いて 1.5 秒後、27 人)**: 0〜7 人(forest→mountain 3、mountain→river_lake 3、home→river_lake 3、river_lake→home 4、desert→city 7 など)
- **同じ出口を今の transition で越えても起きる**(`home|forest` を除く 18 方向の合計: transition 39 人(着いて 3 秒後)、corridor 30 人(1.5 秒後))。corridor で悪くはならない。原因は「着いた地域で なかまを 自分の後ろ(= 出口の外がわ)に並べる」ときに、そこが崖・壁・木の中になること
- 4E-4 の条件にはしない。別の小さな直し(着いたときの並びを `standClear` で押し出す)として記録する

---

## 13. 行きと帰り(reverse symmetry)

- 形は 1 つを逆に使う(4E-1)。10 本すべて両方向で歩けた
- 両端の land の一致: 6/6 が 3 本、5/6 が 2 本、4/6 が 3 本、3/6 が 1 本、3/5 が 1 本。一致しない段は 両側でちがう呼び名(例 `city|countryside` の「ながい のぼり / ながい くだり」)で、意味として正しい
- 帰りは preload の重さが地域で変わる(→home 11 ms・2〜3 frame、→forest 98〜126 ms・16〜20 frame)

---

## 14. 出口が 2 つある spot(multi-gate)

- walk の出口が 2 つある spot は **`home.bigtree` だけ**(`home|forest` priority 0 と `home|river_lake` priority 1、向きは 90° ちがい、どちらも「おく」がわ)
- 10 本を許可した計測用コピーで、bigtree から river_lake の向きへ歩くと `home|river_lake` の corridor、forest の向きなら `home|forest` になった(harness と実画面)。`resolveGate` の決め方(向き → spot の中の位置 → priority)はそのまま使える
- ほかの 9 地域の出口 spot は出口が 1 つ

---

## 15. はっけん・初回 / 2 かいめ・save / reload

- 初回か: `S.worldLinks()` + はっけんした spot から出す link + このセッションで越えたか(4E-2)。10 本とも 1 回越えると link が記録され、帰りは 2 かいめ(1.4 倍)になった
- save: 20 方向とも save の key は同じ(`lifetime.meguru` を含む)。`regionId` が変わるのは着いた frame の 1 回だけ。途中の reload は出発地域から(4E-2 / 4E-3 と同じしくみで、本ごとの違いはない)
- 世界地図・探索率の分母は corridor では変わらない(corridor は spot / path / zone を記録しない)

---

## 16. メモリ

| | 値 |
|---|---|
| world 1 つ(Node ヒープ) | home 101 KB 〜 forest 455 KB(§3.1) |
| corridor の景色 world | 22〜27 KB(JSON)、Node ヒープ 約 50〜60 KB |
| いちばん多いとき(出発 + corridor + 着く側) | forest→mountain / countryside→forest / mountain→forest で 約 0.85 MB(Node) |
| 実画面の JS ヒープ(CPU 4 倍、その 1 回の出発まえとの差) | ready のとき +0.34〜0.90 MB、着いて 1.5 秒後 +0.13〜1.24 MB(初回は立て看板・絵の読みこみを含む。2 かいめは +0.13〜0.65 MB) |
| たまるか | 組んだ world・わたすものが残らないことは 4E-3 のテスト 9(`home\|forest` 10 往復)と、今回の harness(10 本 × 両方向 × 行き・帰り・引き返し で `held` false・handoff の hits = offers)で確かめた。10 本を続けて何往復もする実画面の長時間計測は 4E-4A で行う |

**出発 world を着くまで持つ(案 D)で足りる。** 最大 0.9 MB で、iPhone で危ない増えかたではない。10 本を往復するテストは 4E-4 のテストで 1 本ずつではなく「全 10 本を 1 往復ずつ + 1 本を 10 往復」にする(§25)。

---

## 17. しっぱい・fallback・transition の網羅

- harness で 10 本すべてに「組むとちゅうでこける」を入れた: 10 / 10 が歩きつづけて着き、fails 1・fallback 1・commit 0(4E-2 の着き方)
- 引き返し(ready のあと 90% で うしろへ): 20 / 20 が出発地域へもどり、aborted、`held` false、save は出発地域
- 今の transition(`transitionPlan`)は 10 本とも そのまま残る。corridor にならないとき(reduced motion・perfTier 2・失敗後)はこれを使う

## 18. reduced motion / perfTier 2 / special / 世界地図

- `corridorMode` が 1 か所で決める(4E-1)。reduced motion と perfTier 2 は本によらず transition(4E-3 のテスト 11 で `home|forest` を縛っている。4E-4 では 10 本に広げる)
- special 3 本(`jungle|sea` ふね、`deepsea|sea` もぐる、`countryside|star_stop` のぼる)と memory_lake は `not-walk` で transition のまま
- 世界地図: corridor の線は描かない(4E の設計どおり)。たび・ちずのボタンは corridor の中では使えない

---

## 19. 遠景(DistantFeature)と背景の混ざりかた

- 遠景は 4D-2b の 37 こ。corridor では t < 0.4 出発側、0.4〜0.6 両方、> 0.6 着く側(4E-2)。本によらない
- 背景(backdrop)は段の palette で決まり、§8.2 のとおり段ごとに行ったり来たりする本がある。指定された本ごとの見立て:

| corridor | 背景の切りかわり(出発 → 到着、%) | 見立て |
|---|---|---|
| `city\|desert` | hills → mesas(17)→ hills(50)→ mesas(67) | × 行ったり来たり。city の背景(neonskyline)が出ない |
| `mountain\|snow`(snow→mountain) | snowpeaks → peaks(50) | ○ |
| `mountain\|river_lake` | peaks → lakehills(17)→ peaks(34)→ lakehills(50)→ seahorizon(84) | × 行ったり来たり + 湖で海の水平線 |
| `home\|river_lake` | hills → farhills(17)→ peaks(34)→ peaks(50)→ lakehills(67)→ seahorizon(84) | △ 湖で海の水平線 |
| `forest\|mountain` | treeline(canopy)→ treeline(17)→ peaks(34) | ○ |
| `snow\|mountain` | snowpeaks → peaks(50) | ○ |
| `city\|countryside` | hills → farhills → peaks(34)→ farhills(84) | △ city の背景が出ない(峠の peaks はよい) |
| `city\|sea` | lakehills → hills(17)→ lakehills(50)→ seahorizon(67) | △ city の背景が出ない |
| `desert\|mountain` | mesas → peaks(50)→ mesas(67)→ peaks(84) | × 行ったり来たり |

直し方は §8.2(背景は 出発 → 到着 の 1 回だけ、端の段は端の地域の palette)。

---

## 20. 道の長さ・テンポ・たびの役わり

- 1 本 8.7〜10.4 秒(初回)。遠い地域へは 2〜3 本つなぐので、初回で 20〜30 秒、2 かいめで 14〜22 秒
- **「たび」は そのまま残す**: たびは地域えらびで一気に移動する(corridor を通らない)。corridor は「歩いて隣へ行く」ときだけ。遠くへは たび、隣へは 歩く、の役わけ
- **corridor を飛ばす(skip)**: 2 かいめは 1.4 倍で 7.4 秒。飛ばすボタンは今は作らない(たびで同じことができる)。4E-4 のあとで、2 かいめの時間が長いという声があれば「3 かいめ以降は transition」を検討する
- 入口と到着、どちらが体験の山か: **初回は入口**(150〜190 ms のつまずきが見える)、**到着は 4E-3 で解けている**(暗転 中央値 217 ms、30 回中 23 回が 250 以下、最大 383 は §5 の C のとき)

---

## 21. しくみの一般化・テスト・構造の制約

### 21.1 本ごとに違うコードはあるか

- なし。`continuousWalkMode`・`createCorridorWalk`・preload・warm・着き方・引き返しは すべて spec(4E-1)から動く。`home|forest` に固有なのは **許可リスト 1 行だけ**
- 本ごとに変えたいもの(§5 開始距離、§8 端の palette・背景、§9 曲がり・2 かいめの上限)は どれも「spec から導出する規則」にでき、本ごとの表は要らない(`countryside|forest` の 2 かいめ上限も ピーク ≤ 30°/s の式で出る)

### 21.2 許可リストや文字列に依存するテスト(4E-4 で直すもの)

| テスト | いま縛っていること |
|---|---|
| `meguru-phase4e2-test` 74 行・`meguru-party-lod-test` 250 / 257 行 | 許可リスト = `['home\|forest']`、ほかの walk は `not-allowed` |
| `meguru-phase4e3-test` 11(ほかの出口) | `home\|forest` 以外は corridor にならない |
| `meguru-phase4e1-test` 336 行 | `allow: ['home\|river_lake']` で not-allowed(意味は「許可リストの引数が効く」なので残せる) |
| 4B / 4C / 4D-1 / 4D-2 / 4E-1 の「消しても変わらない」テスト | export の並び `CONTINUOUS_WALK_ALLOWLIST, … createCorridorWalk,` を正規表現で消す。**export の並びを変えるときは この 5 本を同時に** |

### 21.3 構造の制約

- `meguru.js` の分割は 4E が終わるまでしない(今回も触らない)
- 4E-4 で足すものは 4E-2 / 4E-3 のブロックの中にとどめ、renderer は変えない(入口の warm は 4E-3 の `warmR` を使う)

---

## 22. 展開のしかた

### 22.1 一度に 10 本か、グループか

**グループ(3 回)。** 一度に 9 本足すと、入口・warm・palette・曲がり・しきい の直しが 1 PR に全部のり、どれが効いたか分からなくなる。1 本ずつ(9 PR)は多すぎる。

### 22.2 リスク分類

| リスク | corridor | 理由 |
|---|---|---|
| **LOW** | `home\|river_lake` `city\|desert` `desert\|mountain` `snow\|mountain`※ | 曲がり < 30°/s(2 かいめも)、余裕 A。直すのは palette(端・shore)だけ |
| **MEDIUM** | `forest\|mountain` `mountain\|river_lake` `city\|sea` | 2 かいめの曲がりが 30°/s を少し超える。warm の山(→mountain)、入口の山(city→sea) |
| **HIGH** | `countryside\|forest` `city\|countryside` | U ターン級、2 かいめ 35〜45°/s。`countryside\|forest` はしきい C、`city\|countryside` は 27 人で入口 148 ms・歩く p95 41 ms |

※ `snow|mountain` は曲がり 131° だが ピーク 18.9 / 26.4°/s で めやす内。

### 22.3 4E-4A / B / C

| 段 | 中身 | 本 |
|---|---|---|
| **4E-4A** | 共通の直し: ① けしきの絵のデコードを先に・非同期で(入口 §6.6-1 と warm §7 の両方)② 入口の最初の段は出発地域の絵(§6.6-2)③ 開始・破棄をのこり距離に(§5.3)④ 端の段の palette・shore・背景 1 回(§8)。そのうえで LOW 4 本を許可 | `home\|river_lake` `city\|desert` `desert\|mountain` `snow\|mountain` |
| **4E-4B** | 曲がり §9.3 ①(曲がる区間を全長に)。MEDIUM 3 本を許可 | `forest\|mountain` `mountain\|river_lake` `city\|sea` |
| **4E-4C** | 2 かいめの速さの上限(§9.3 ③、`countryside\|forest` だけ ×1.17 になる)。HIGH 2 本を許可。`countryside\|forest` の しきい(のこり距離)と曲がりの確認、`city\|countryside` の 27 人 | `countryside\|forest` `city\|countryside` |

---

## 23. 受け入れ基準(4E-4A / B / C それぞれ)

1. 許可した本すべてで、両方向・初回 / 2 かいめ に歩ける。preload → commit、二重 build 0、fallback 0(CPU 4 倍・なかま 8 人・各 3 回)
2. 着く側の ready + warm が 2 かいめでも着く **1.0 秒以上まえ**(§5.2 の A)
3. 暗転: 中央値 ≤ 250 ms、最大 ≤ 300 ms
4. corridor の中の 1 frame: **入口をふくめて ≤ 60 ms(CPU 4 倍、初回)**、2 かいめ ≤ 40 ms。warm の frame も同じ
5. 歩く p95 ≤ 25 ms(なかま 8 人)/ ≤ 30 ms(27 人)
6. 曲がる速さ: 初回 ≤ 30°/s、2 かいめ ≤ 30°/s(4E-4B / C)
7. 引き返し・reload・しっぱい・reduced motion・perfTier 2 は 4E-3 と同じ結果
8. save の key・`travelToRegion()`・世界地図・分母は変わらない
9. iPhone 3 サイズで はみ出し 0・JS エラー 0
10. 景色: 端の段が端の地域の色、湖に海の水平線が出ない、背景の切りかわりは 1 回

## 24. 性能の予算

| | 予算(CPU 4 倍) | いま(10 本、なかま 8 人) |
|---|---|---|
| 入口の 1 frame(初回) | ≤ 60 ms | 39〜63 ms、`home\|forest` 187・`city\|sea` 148 |
| warm の 1 frame | ≤ 60 ms | 最大 118 ms |
| 組む 1 frame | ≤ 35 ms | 13〜34 ms(1 回 72 ms は GC) |
| 着く 暗転 | 中央値 ≤ 250 / 最大 ≤ 300 | 217 / 383 |
| 歩く p95 | ≤ 25 ms | 14.6〜24.9 ms |
| 段の切りかわり | ≤ 35 ms | 10〜30 ms(27 人の city→countryside 44 ms) |
| ヒープ(いちばん多いとき) | ≤ +1.5 MB | +1.24 MB |

**入口の目標(§6)**: 初回 ≤ 60 ms、ふだんの速さで ≤ 16 ms。

---

## 25. 実画面の確かめかた・テストがふくらまないように

### 25.1 実画面

- 今回の計測スクリプト(1 本 1 ページで A→B→A→B、入口・preload・warm・暗転・ヒープ・着いた位置を 1 行の JSON に)を 4E-4 の PR でも使う(repo には入れない。handoff に手順を書く)
- iPhone 3 サイズ × (許可した本の 初回 1 往復 + 引き返し 1 + reload 1)。27 人は HIGH の本だけ

### 25.2 テスト

本ごとに 4E-3 の 11 本をコピーすると 9 本 × 11 = 99 本になる。そうしない:

- **表でまわす 1 本**: 許可した本 × 両方向で「corridor になる・preload → commit・save の key・link」(harness。今回の計測と同じ形で 20 方向 約 2 分)
- **しくみのテスト**(引き返し・reload・しっぱい・10 往復)は `home|forest` のまま 1 本ずつ。しくみは本によらない(§21.1)ので、ほかの本は表のテストで「同じしくみに乗っている」ことだけ見る
- 規則のテスト: のこり距離の開始(2250 と 2700)、端の palette、曲がりのピーク ≤ 30°/s を 10 本すべて
- わざと壊す: 許可リスト外の本が corridor になる / 5 段の本で開始が 0.7 のまま / 端の palette が home のまま

---

## 26. 変わらないもの(今回の確認)

| | 値 |
|---|---|
| 分母 | spot 471 / path 654 / zone 118 / secret 107、世界地図の数える地域 11 / link 12 / tier1 17 / zones 103(4E-1 テスト 17・4E-2 のテストで縛る。main で `npm test` 1318 / 1318) |
| connection / gate / corridor | 14 / 13 / 13(walk 10、special 3) |
| DistantFeature | 37 |
| 許可リスト | `['home\|forest']`(main のまま) |
| save・`travelToRegion()`・世界地図 | 変えていない |

## 27. 今回やっていないこと

- 残り 9 本への continuous walk の展開
- corridor の入口の最適化の実装(§6.6 は候補だけ)
- global collision・住民の地域間移動・save schema の変更・Three.js
- コードの変更(この PR は文書だけ)

---

## 付録 A — 再現

- Node: `buildWorldSteps` の yield ごとに `process.hrtime`、13 地域 × 7 回の中央値。同一性は `JSON.stringify`(Map は配列、関数は 'fn')の一致
- 実画面: `installNaotocchiMeguru` の戻り値を init script でつかまえて module を読む。計測用コピーでは `CONTINUOUS_WALK_ALLOWLIST` を `globalThis.__mgAllow` で上書きできるようにし、renderer.draw の中(空・背景・遠景・地面・細部・立て看板)と glyph 1 こずつの時間を記録
- 1 本のページ: `regionId` を出発地域にした save で めぐるに入り、出口の 40 手前に置いて 上 を押しつづける。A→B(初回)→ B→A → A→B
- CPU 4 倍は `Emulation.setCPUThrottlingRate`。ヒープは `performance.memory.usedJSHeapSize`(gc のあと)
- 曲がりの案: ピーク = |turn| / ((1 − ramp) × 曲がる長さ) × 260 × 速さ

## 付録 B — 進みぐあい

| 段階 | 状態 |
|---|---|
| 4E-3 preload | **完了**(#338、main `f273748`。npm test 1318 / 1318、Runtime smoke・Home layout 緑) |
| 4E-4 Preflight(この文書) | **完了**(#339、main `c7705d8`。Runtime smoke 緑) |
| 4E-4A(LOW 4 本) | **完了**(#340、main `134e210`。npm test 1328 / 1328、Runtime smoke・Home layout 緑)。[handoff](../handoff/meguru-phase4e4a-low-corridors-2026-09-24.md)。判定 A、入口 ≤ 45 ms・暗転 ≤ 300 ms(CPU 4 倍) |
| 4E-4B(MEDIUM 3 本) | Draft PR(マージしない)。[handoff](../handoff/meguru-phase4e4b-medium-corridors-2026-09-24.md)。曲がりを 道 ぜんぶへ ひろげる(turn spread)で 2 かいめ ≤ 28°/s |
| 4E-4C | まだ |
