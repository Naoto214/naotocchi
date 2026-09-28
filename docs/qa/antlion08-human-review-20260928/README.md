# ウスバカゲロウ08：人間目視用の最終横断比較

この資料は人間が直接判断するための一覧です。機械的な最終判定・A/B/C評価・新たな採否判断は付けていません。
画像再生成、pixel修正、追加の粒子削減、顔修正、本番置換、残り9枚の正式承認、手順5は行っていません。

## 確認リンク

| 資料 | PNG（表示用） | SVG |
|---|---|---|
| **通常基準＋10表情・本体128px（主確認）** | [body-128.png](body-128.png) | [body-128.svg](body-128.svg) |
| 本体104px | [body-104.png](body-104.png) | [body-104.svg](body-104.svg) |
| 本体80px | [body-80.png](body-80.png) | [body-80.svg](body-80.svg) |
| 本体64px | [body-64.png](body-64.png) | [body-64.svg](body-64.svg) |
| **顔周辺・11画像横一列・8倍** | [faces.png](faces.png) | [faces.svg](faces.svg) |
| 正式状態マーク104px | [marks-104.png](marks-104.png) | [marks-104.svg](marks-104.svg) |
| 正式状態マーク80px | [marks-80.png](marks-80.png) | [marks-80.svg](marks-80.svg) |
| 正式状態マーク64px | [marks-64.png](marks-64.png) | [marks-64.svg](marks-64.svg) |

[全比較HTML](comparison.html)。HTMLは各画像を自動縮小せず、横スクロールで表示します。ディレクトリ一式を取得して開いてください。GitHub上では個別PNGから確認できます。

PNG単独表示では端末やアプリが画面幅へ縮小する場合があります。128／104／80／64pxは元canvasの表示寸法で、端末上の物理寸法を保証するものではありません。ブラウザー倍率100%での比較を推奨します。64px単独の完全識別を合格条件とはしません。

## 使用した画像

Source HEAD：`7ec4bf05d4fe6693bf8dd5c80822544db531d649`

| 表情 | 使用元・候補ID |
|---|---|
| normal08（通常基準08） | `assets/characters/antlion/08.png` |
| happy | `docs/qa/antlion08-method-d-nine-20260928/candidates/happy.png` |
| **strained** | **`docs/qa/antlion08-limited-candidates-20260928/candidates/strained-face.png`** |
| hungry | `docs/qa/antlion08-method-d-nine-20260928/candidates/hungry.png` |
| sick | `docs/qa/antlion08-method-d-nine-20260928/candidates/sick.png` |
| tired | 正式採用D4：`assets/characters/expressions/antlion/08-tired.png` |
| sulky | `docs/qa/antlion08-method-d-nine-20260928/candidates/sulky.png` |
| weak | `docs/qa/antlion08-method-d-nine-20260928/candidates/weak.png` |
| **critical** | **`docs/qa/antlion08-limited-candidates-20260928/candidates/critical-particles.png`** |
| wantsPlay | `docs/qa/antlion08-method-d-nine-20260928/candidates/wantsPlay.png` |
| sleeping | `docs/qa/antlion08-method-d-nine-20260928/candidates/sleeping.png` |

限定候補のSHA-256：

- strained：`e29a94b1177350cdb7c43eb0d197f6fe565477ab3b989655fdeba681e025afe8`
- critical：`2d4f8ed516ed377bf46c990875d120d1aeb9c9cd220e0a4f309efb5d45c828f3`

全11画像のpath・SHA・一覧の構成・正式マークの参照記録は[sources.json](sources.json)。旧strained／criticalや、採用しなかった生成原本は一覧へ入れていません。

## 表示条件

- 本体は同じ180×188pxセル、背景`#e6eaed`、画像下は表情名のみ。4サイズで同じ並び順。
- 本体一覧には状態マーク・汗・空腹マークを重ねていません。
- 顔周辺は全11画像ともROI `[88,52,108,70)`、8倍の最近傍拡大。向き補正・位置合わせ・変形・顔の拡大率変更はしていません。横一列に同条件で配置しています。
- 正式マーク一覧は10表情。既存resolver、accentFor、通常基準08のart offset、既存のマーク描画色・形・位置を使用。病気併存の汗はありません。HTML用absolute配置規則をSVGのg要素には適用せず、transformで配置しています。
- 静的な比較資料です。実Homeの動作・アニメーション確認を実施したとは扱いません。

## 確認したいこと

10表情それぞれの感情の自然さ、通常基準と同じ個体・画風に見えるか、相互の区別、顔つきや身体構造の不自然な変化、粒子・軌跡と表情の目立ち方を、人間が横断して確認するための資料です。本文でも特定表情への推奨・合否は提示しません。

## データ保持と停止

元画像と本番ファイルの変更は0。開始時点の全3942 trackedファイルのGit blob hash一致を確認しました。通常08・D4・最新2候補・その他7候補・承認済み16枚・ヒトデ泡・犬03・ウスバカゲロウ07・既存QA・runtimeを含みます。

全比較SVGに埋め込まれたPNGは、source manifestに指定した原本byte列と順序を照合済み。表示用PNGの寸法も確認。これは資料の取り違え・破損防止の検証であり、表情の採否判定ではありません。[verification.json](verification.json)を参照。

今回はQA資料のみの追加なのでゲームの全体テストは再実行していません。既存CIの0件／pendingを成功扱いしません。PR #278はDraft／open／未マージのまま、main取り込み・既存競合解消を行わず、保存後の状態を最終回答でfresh報告します。

**人間目視確認待ちで停止。**
