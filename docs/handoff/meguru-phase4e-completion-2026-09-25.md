# Phase 4E 完了 — continuous corridor(めぐる 2D)

日付: 2026-09-25 ／ 最終 main: **`671fa90`**(Merge PR #342、Phase 4E-4C)／ 設計: [Phase 4E 設計](../design/meguru-phase4e-continuous-corridor-world-2026-09-23.md)・[4E-4 Preflight 監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md)

> **Phase 4E continuous corridor は完了。**
> walk の 出口 10 本 × 両方向 を、暗転の transition では なく あるいて こえる(continuous corridor)。special 3 本(ふね・もぐる・ゴンドラ)と memory_lake は いまの transition の まま。
> 性能 2 点(森 / 山 に 着く 暗転 の 最大・city\|countryside の p95)と、なかま が 障害物に めりこむ バグ は **Phase 4E の blocker に しない**(ユーザー 判断、2026-09-25)。Release Hardening へ 送る(§4)。

---

## 1. 段階ごとの 完了

| 段階 | PR / main | 中身 | 判定 | 記録 |
|---|---|---|---|---|
| 4E 設計監査 | #335 / `a564730` | corridor = 向きだけ global の 一時 chart。正本(地域・セーブ)は 着く まで 出発 地域 | 完了 | [設計](../design/meguru-phase4e-continuous-corridor-world-2026-09-23.md) |
| 4E-1 corridor geometry | #336 / `6191f76` | 10 本 の walk corridor spec / state(pure data)。曲がり・幅・段・両はし の むき | 完了 | [4E-1](meguru-phase4e1-corridor-geometry-2026-09-23.md) |
| 4E-2 home\|forest PoC | #337 / `13bd8bf` | Canvas で あるく しくみ・commit は 着いた とき 1 回・fallback = transition | 採用 | [4E-2](meguru-phase4e2-home-forest-poc-2026-09-23.md) §1〜§14 |
| party formation / LOD | #337(同上) | なかま の ならび・大人数(27)の LOD / cache・暗転中 は えがかない | 採用 | [4E-2](meguru-phase4e2-home-forest-poc-2026-09-23.md) §15〜§17 |
| 4E-3 preload | #338 / `f273748` | 着く がわ を とちゅう から わけて 組む(`buildWorldSteps`)・状態機械 | A 採用 | [4E-3](meguru-phase4e3-corridor-preload-2026-09-24.md) |
| 4E-4 Preflight | #339 / `c7705d8` | 10 本 横断 監査。A / B / C に わける | 完了 | [監査](../design/meguru-phase4e4-preflight-audit-2026-09-24.md) |
| 4E-4A LOW 4 本 | #340 / `134e210` | のこり きょり の preload(810 / 1485)・さきどり デコード・入口 の したく・景色 | A 採用 | [4E-4A](meguru-phase4e4a-low-corridors-2026-09-24.md) |
| 4E-4B MEDIUM 3 本 | #341 / `742a406` | turn spread(曲がり を 道 ぜんぶ へ)・端の いろ・まち の 運河 | A 採用 | [4E-4B](meguru-phase4e4b-medium-corridors-2026-09-24.md) |
| 4E-4C HIGH 2 本 | #342 / `671fa90` | 一定 曲率(level 3)・村の はし・walk 10 / 10 | B 条件つき 採用 → 条件 は RH へ | [4E-4C](meguru-phase4e4c-high-corridors-2026-09-25.md) |

main `671fa90`: npm test **1343 / 1343**(worktree)・Runtime smoke 緑・Home layout 緑。

## 2. 最終 チェック

| 項目 | 結果 |
|---|---|
| **walk 10 / 10** | ✅ 20 出口(10 本 × 両方向)が corridor。gate 表(13 地域 26 出口)を テスト で 1 行ずつ しばる |
| **special 3** | ✅ ふね `jungle\|sea`・もぐる `deepsea\|sea`・ゴンドラ `countryside\|star_stop` は transition(許可リスト に いれても `not-walk`) |
| **memory_lake** | ✅ 出口 なし・かわらず |
| **save** | ✅ 形 かわらず(`script.js` の セーブ / `travelToRegion()` / 世界地図 は Phase 4E で かえて いない)。corridor の じょうたい は セーブ しない。正本 は 着く まで 出発 地域 |
| **reload** | ✅ 組みかけ / ready の どちら で やめても 出発 地域 から。組んだ もの は のこらない |
| **fallback** | ✅ 組む / デコード / 着く ときの たしかめ で こけても 移動 は とまらない。reduced motion・perfTier 2 は transition |
| **party** | ✅ なかま 27 にん: corridor の なかで とばない・帯 の そとへ 出ない・着いて かさならない。U ターン も 正常 |
| **preload** | ✅ のこり きょり 810 で 組みはじめ、10 本 × 両方向 で commit・二重 build 0・fallback 0。2 かいめ でも ready は 着く 1.6 秒 いじょう まえ |
| **scenery** | ✅ 道の はし は 端の 地域 の いろ・背景 は まんなか で 1 回・地域 × 地形 の 表(まち の 運河・村の はし)・湖 に 海 を 出さない・星 / ゴンドラ の もの を もらさない |
| **turn** | ✅ 10 本 とも 2 かいめ(1.4 倍)≤ 28.75°/s。はやさ の 上限(speed cap)なし |
| **performance** | ✅ 入口 最大 54.1 ms(≤ 60)・ready margin 最小 1.65 秒(≥ 1.0)・組む しごと ≤ 41 ms・ヒープ 60.8 MB・デコード 18 MB(atlas 3 まい)・CPU 1 倍 は 入口 9 ms / 暗転 ≤ 217 ms。**RH へ 送る 2 点 は §4** |
| **mobile 3 sizes** | ✅ 390 × 844・375 × 667・360 × 640 で 各 段階 PASS(4E-4C: HIGH 2 本 6 / 6) |

## 3. めぐる 2D の 現在地

### 3.1 機能 の 完成度

| 領域 | 状態 |
|---|---|
| 13 地域(12 + memory_lake)・spot 471 / 地区 654 / みち 118 / しるし 107 | 完成(Phase 3 で 地理 を 正本 化) |
| 出口(gate)・たび・世界地図・分母・はっけん | 完成 |
| 地域 の あいだ の 移動 | **完成**: walk 10 本 = あるいて こえる(corridor)、special 3 本 = transition |
| 遠景(DistantFeature 37)・backdrop | 完成(4D-2) |
| 当たり判定(地域 の なか)・住民 の 生活 AI | 完成(地域 ごと) |
| なかま(ならび・大人数 LOD) | 完成(障害物 に めりこむ 既存 バグ は RH-7) |
| セーブ・reload・fallback・reduced motion・perfTier | 完成 |

→ **2D めぐる は 機能 として 成立 して いる**。のこる のは 見た目 の 仕上げ(§3.2)と 性能 / 既存 バグ の 堅牢化(§4)。

### 3.2 のこって いる 見た目 調整(→ 飾り付け / scenery polish タブ へ 返す)

Phase 4 本線 では あたらしい scenery polish を はじめない。以下 は 既存 の 飾り付け タブ へ 返す(**機能 変更 を まぜない**):

- のこり の 景観 F 系 候補
- viewpoint(見晴らし spot)の 見た目 改善
- 地域 ごと の 空白感(corridor の とちゅう の 段 や、地域 の ひろい ところ)
- 地域らしさ(地域 ごと の 決め手 の 絵・色)
- 装飾 密度(飾り の 数 と ばらつき。例: city\|countryside の 尾根 の いし が 灰色 の 多角形 で おおく 見える)
- 最終 visual polish

## 4. Release Hardening へ 送る もの

| RH | 中身 | 根拠 |
|---|---|---|
| RH(renderer 性能) | **forest / mountain に 着く ときの 描画 コスト**: CPU 4 倍 で 暗転 が まれ に 300 ms を こえる(4E-4C 60 回 中 3 回、最大 417 ms。マージ ずみ の forest\|mountain・mountain 着 でも 同じ)。着いた 地域 の ふだん の frame(forest p50 34.5 / p95 48.7 ms)と はじめて えがく 小さな 立て看板 が 原因。corridor の しくみ(preload / ready / commit)は 正常 | [4E-4C §4.3](meguru-phase4e4c-high-corridors-2026-09-25.md) |
| RH(renderer 性能) | **city 系 の ふだん の 描画 コスト**: city\|countryside の corridor p95 26〜30 ms(目標 25)。まち がわ の ビル と 尾根 の いし。city 地域 自体 も p50 30 / p95 44 ms | [4E-4C §4.4](meguru-phase4e4c-high-corridors-2026-09-25.md) |
| RH(renderer 性能) | corridor の なか で まれ に 60 ms を こえる frame(あるく frame の 約 0.2 %、4E-2 の home\|forest にも ある) | [4E-4C §4.4](meguru-phase4e4c-high-corridors-2026-09-25.md) |
| **RH-7** | **なかま が 障害物 に めりこむ 既存 バグ**: 着いた ところ で 1〜2 にん が 障害物 に かさなる。**transition で 着いても 同じ**(corridor 固有 で ない) | [4E-4C §6](meguru-phase4e4c-high-corridors-2026-09-25.md) |

どれも CPU 等倍 では 小さい(CPU 1 倍: 入口 9 ms・p95 4 ms・暗転 ≤ 217 ms)。

## 5. マージ 後 の main

- main HEAD: `671fa90`(Merge PR #342。親 `742a406` + `de11d51`)
- npm test: 1343 / 1343(マージ 後 の main を worktree で)
- CI: マージ 後 の main で **Runtime smoke 緑・Home layout 緑**

## 6. Three.js

Phase 4E を おえても **2D Canvas で 十分 成立 して いる**(あるいて こえる 移動・遠景・なかま 27・3 サイズ)。Three.js へ は 進まない。**将来 の PoC 扱い**(Phase 4E 設計 §21 の まま)。

## 7. やって いない こと(この タブ では もう 進まない)

- あたらしい scenery polish(→ 飾り付け タブ)
- Release Hardening の 実装(RH-4 〜 RH-7 を ふくむ)・なかま の 障害物 バグ の 修正
- region registry の 整理・global collision・住民 の 地域間 移動・セーブ の 形 の 変更
- Three.js
