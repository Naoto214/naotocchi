# なおぽよ — 最終統合・監査・マージ・iPhone試遊準備（2026-10-14）

## 結論
総合監査とマージ前CIに合格したため、ユーザーの条件付き承認に従ってPR #380をmainへマージした。GitHub Pagesへの配信を確認済み。**iPhone実機Human QA、正式バランス採用、最終完成判定は未実施・保留。** BGM・効果音の音源制作も未完了。

## 1. 正本・統合
作業開始時に両ブランチ、main、PR #380、CIをfresh確認。最新remoteを正本とした。

| 対象 | HEAD | tree |
|---|---|---|
| UI元成果 | 2b76133c7abb118203692fe70bf34ef3cae5c653 | d2e872b7a72d74b959836bbf37c04f85546b9871 |
| 比較元成果 | d88dd6c62a8844046795f074b4043067ac150065 | f6208fd2afb4a50cc80e907a95c807c3b88d9f4d |
| 統合前main | 095fe36f1d752635ab20c0e330cef7a932a13d28 | ddfe0969c408b286185dcb6572e9c41720b56fe3 |
| 統合PR HEAD | 369c8cd1cc431da445fbe601a27890776762b502 | 97d9a836daf44fbcf023aab1bbf9c843aa55892a |
| マージ後main | cee3e8726ef3078e9b349e300c976e831786bbf0 | 97d9a836daf44fbcf023aab1bbf9c843aa55892a |

比較69ファイルと最新mainを統合。重複箇所の差分を確認し、競合なし。比較4アーカイブ・512試行ログの全サイズ/SHA-256を照合して一致。測定結果は再生成していない。force pushなし。保存済みUI・測定・QA証跡を維持した。

## 2. 総合監査
ソース確認、専用テスト、DOM、mutation、ブラウザ操作を組み合わせて以下を検証。

| 領域 | 結果 |
|---|---|
| ゲームルール | 6×12、5系統選択、20体バッグ、NEXT3組、同種同段階接続、下左進化位置、重力、自動連鎖、08同種寿命消滅、04〜07の卵報酬・使用・再獲得、両へんしん、得点・波倍率を維持 |
| UI・操作 | 主要11画面、ボタン・ジェスチャー、2段パネル、接地600ms、卵2×2、共通ゲージ、候補プレビュー、連鎖・08演出を確認 |
| 保存・記録 | 自動停止→手動再開、途中保存・復帰、Web Locksによる複数タブ所有、08クリア後の同盤面エンドレス、3カテゴリー、直近100履歴と累計分離を確認 |
| キャラクター | 初期5系統、図鑑読み取り専用追加解放、未解放非表示、01〜08、既存2D画像を維持。図鑑逆登録なし |
| 本編保護 | 導線追加はindex.html/ui.cssのみ。本編save/schema、3D、カード、Quickを含む既存ゲームのロジック無変更。実際のメニューから起動し、なおぽよプレイ中も本編保存不変を確認 |

独立レビューで「保存後に本編図鑑が増えると、復帰時の道具の系統名と番号がずれる」重要不具合を検出。保存時のspecies順を表示・操作で共有して修正し、再現テストRED→GREENを確認。新しい解放系統は次の新しいプレイから利用する。未解決の重大不具合は検出されなかった。

## 3. 検証結果
| 検証 | 結果 |
|---|---|
| 専用node:test | 130 PASS、fail/skip 0 |
| DOM | 6本PASS |
| mutation | 50/50検出、無変更対照PASS（core12、balance3、egg7、optimization6、gauge9、player10、profile3） |
| 全体回帰 | 3,144 + Relationship80 PASS、fail/skip 0、exit 0 |
| Quick単独 | 15/15 PASS |
| ブラウザ | player/flows/input/effects/offline/integration PASS |
| iPhone相当の縦画面 | Chromium 320×568、375×667、390×844、430×932。6×12の72セル、主要操作44px以上、横はみ出しなし |
| 本編導線 | 320/390幅でメニュー→なおぽよ成功 |
| 保存プロフィール | 標準と比較2/3/4の途中保存・履歴・集計分離、復帰時停止、明示的再開PASS |
| iPhone実機Safari | **未実施。PASS扱いしていない** |

ブラウザ検証には3道具・取消、6チュートリアル、勝利後継続、別タブ、ジェスチャー、3/5/6連鎖・08演出を含む。
既知のQuick「mole Lv5」は単独・統合後全体回帰とも再現せず、対象テストがPASSした。**過去の単発失敗の原因は未確定。環境要因とは断定せず、修正済みとも扱わない。** Quickコード・テストは今回変更していない。main上のWorld回帰CIでも3,144＋80 PASS、fail/skip 0を確認し、同じQuick対象テストはPASSだった。

## 4. CI・マージ
マージ前、統合HEADのRuntime（38535350789）、Home（38535350691）、Naopoyo integration（38535350736）がすべて成功。直前に最新main、PR HEAD、CI状態を再確認し、expected_head_sha付きでPR #380をmergeした。mainのtreeは検証済み統合版と一致。

マージ後mainのCIはすべて成功（最終確認 2026-10-14T09:18:26.255Z）。

| CI | 結果 |
|---|---|
| [Naopoyo integration](https://github.com/Naoto214/naotocchi/actions/runs/38538583609) | SUCCESS |
| [World visual quality](https://github.com/Naoto214/naotocchi/actions/runs/38538583404) | SUCCESS |
| [Runtime smoke test](https://github.com/Naoto214/naotocchi/actions/runs/38538583318) | SUCCESS |
| [Home layout](https://github.com/Naoto214/naotocchi/actions/runs/38538583120) | SUCCESS |
| [pages build and deployment](https://github.com/Naoto214/naotocchi/actions/runs/38538581753) | SUCCESS |

## 5. 配信・試遊URL
GitHub Pages build and deployment（38538581753）成功。公開HTML/CSS/依存ES modules/初期40キャラ画像/比較URLを含む58件がHTTP200で、取得した内容のSHA-256がマージ済みtreeと一致。mjsのJavaScript MIMEも確認。
最初のHTTP取得で502が一度あったため結果を残して再取得した。最終照合58件はすべて成功。詳細はdeployed-verification.json。

- [なおとっち本編](https://naoto214.github.io/naotocchi/) → メニュー → なおぽよ
- [標準8/24](https://naoto214.github.io/naotocchi/prototypes/growth-chain/player.html)
- [試遊比較2/6](https://naoto214.github.io/naotocchi/prototypes/growth-chain/player.html?trial=2)
- [試遊比較3/9](https://naoto214.github.io/naotocchi/prototypes/growth-chain/player.html?trial=3)
- [試遊比較4/12](https://naoto214.github.io/naotocchi/prototypes/growth-chain/player.html?trial=4)

タイトルの「試遊比較 · 開発確認用」を開き、同じタブで切り替える。通常設定とは別に配置し、タイトル・ゲーム・記録に比較表示が出る。標準は8/24のまま。比較2/6は第一候補、3/9は第二候補、4/12は第三候補。比較ごとに途中保存・記録が独立する。複数タブ同時プレイは所有ロックで防ぐ。
2/6の固定78.1%・適応65.6%はAI方策の測定値で、**人間の達成率ではない。正式採用していない。**

## 6. iPhone実機Human QA
以下を実際のSafariで確認してから正式バランスと完成を判定する。

1. 本編メニューから起動、縦画面・ノッチ・ホームバー・Safariバー開閉時の盤面/操作領域。
2. 08消滅モードとエンドレス、標準8/24と比較2/6の識別・切替。
3. ボタン、長押し、フリック、1本指/2本指操作、接地猶予と誤操作。
4. 卵・へんしん・だいへんしんの対象選択、取消、消費、再獲得。
5. 進化プレビュー、連鎖、08寿命消滅の見やすさ・速度・処理性能。
6. アプリ切替→自動停止→手動再開、再読み込み/タブを閉じた後の途中復帰、別タブ競合。
7. キャラ選択、未解放非表示、図鑑追加後の既存プレイ復帰、新規プレイで追加利用。
8. 08クリア後エンドレス継続、3カテゴリー記録、履歴、標準/比較記録の分離。
9. 2/6の難易度・上達・達成感を評価し、必要に応じて3/9、4/12と比較。

問題報告にはiPhone機種・iOS版・URL/比較設定・モード・再現操作・期待/実際・画像/動画を添え、マージ後の修正PRで対応する。

## 7. 未完成・保留
- iPhone実機Human QA、実機性能・操作感の評価。
- BGM・効果音の音源制作。音源未制作の状態を完成扱いしないが、試遊開始を妨げない。
- 正式ゲームバランス採用および最終完成判定。
- Quick mole Lv5の過去の単発失敗原因（今回非再現、回帰PASS）。

## 証跡
この報告は実装コミット内INTEGRATION-REPORT/LEDGERの「実行中・未確定」欄を最終結果で補完する。実装treeを変更しない別証跡branchに保存。
- evidence.tar.gz：643,208 bytes、35点（ログ・代表画像）。
- SHA-256：c2a39502b48e6b5dda1757d755e0cf3ce91ca264b6d8300d70bca1af36b63462
- deployed-verification.json：公開58件のHTTP/MIME/SHA-256照合。
- protection-verification.json：本編と比較成果の保護確認。
- ci-final.json：最終remote/PR/main CI確認。
