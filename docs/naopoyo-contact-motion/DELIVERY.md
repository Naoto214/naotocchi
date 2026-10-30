# 配信・最終確認記録（2026-10-30 JST）

以下は初回公開の記録。更新版2の修正・全78ファイル照合・CIは[続行報告](FOLLOWUP-20261030.md)を参照。

- 独立Draft PR: https://github.com/Naoto214/naotocchi/pull/483
- 独立本人限定A/B: https://naopoyo-contact-motion-20261030.kerzion214.chatgpt.site
- 実装HEAD: `b09b1866c101ae97e4c2af2e86a6003a45bbf02d`
- 実装tree: `db2933918a33eae758c372f189f8d25cf4fba553`
- CI合成HEAD: `234b00c398117b14c05f6625b9637fd77af0211c`。APIで両親PR436 ab937a22/実装b09b1866とtree一致を確認。
- Sites source: `d119c52b5877599ba27f4fff698cb7c8c0ac6432`
- deployment: `appgdep_6ae37baa50788191b12dafc0bad73b36` / succeeded / 保存版1
- 本人1名、外部0名、グループ0、権限revision1。匿名HTTP403。
- 全78ファイルHTTP200・SHA-256一致（distribution.json）。version.jsonは検証済みGitHub実装HEAD/treeを記録。公開appもリポジトリとSHA一致。

## 動作確認
Chrome管理プレビュー：A同種族8+8 swap / B同種族8+8 merge overflow8。4+8/8+4/mixedのeventを画面で確認。390pxの実座標ドラッグが成功し、8+8は合体。320/375/390/430幅iframeで1操作・横はみ出し0・操作44px。ブラウザーiframeでの寸法検査であり、実iPhoneとは区別する。

追加の実画面操作40件：Bの8+8・4+8・8+4・異種族を各8方向、Aの8+8を8方向。すべて合法で、B同種族はmerge、B異種族とA8+8はswap。表示されたイベントをbrowser-directions.jsonへ保存。重力なしの比較場面であり、支持・ゲート等の合法性は別の自動テストで検証。

11面おてほんを全5手で完走、閉じると通常0手に戻る。20面のおてほんは156/156手まで実画面で送り、全員救出表示を確認（browser-stage20.jpg）。前後・自動・停止・手動送りを併用。バックグラウンドでの自動再生速度に依存するため、自動のみの156手完走とは扱わない。

管理プレビューでは一時的なおてほん読込失敗があった。診断用catchログを配信していないローカルプレビューだけへ追加後、リロードで読み込め、11面/20面を完走。失敗原因は確定していない。診断はcatch内だけで、成功時のロジックは公開物と同一。診断差分は復元済み、Site sourceはclean。公開配信78ファイルの正常取得とは分けて記録。

公開先の認証後ブラウザー表示とiPhone Safari実機は未確認。本人限定設定を緩和しない。

## CI
CIは実装treeと一致する合成HEADで実行。各検証結果はci-evidence.jsonとPR本文を参照。
- パズル 1484/1484、fail/skip/cancel0。
- CARD GAME 494/494、fail/skip/cancel0。
- Pages単体16/16、比較パッケージ・10,112接触候補監査成功。
- 本編Runtime 3504/3504（32+24+3289+159）、fail/skip/cancel0。npm test内のsmoke/dialogue/visual-qaも完走。
- 関連5ワークフローすべてsuccess。Chapter2 run40916925927、Contact Experiment run40916925625、Chapter1 run40916925791、World run40916925328、Insight run40916925566。
- 最終追記は証跡・文書のみ（skip ci）。製品コード・テスト・workflow・公開配信ファイルは上記検証済み実装から変更なし。

## 並行作業の保護
PR436はab937a22のまま。V12 PR482は別Workによりb69953ba→4dfa17dfへ進行。差分7ファイルは手数表示/テスト/計画で、エンジンと全解答は無変更とcompare APIで確認。今回検証した312手の内容は最新V12でも同一。V12やPR436へのwriteなし。main merge/本番Pages更新なし。

## 判断と限界
1. 下8の静止重力接触は従来の支持として維持（IDだけを毎回合体させる循環を避け、V11ステージの物理を保護）。手動8+8は合体・余剰。もし自動の静止接触も毎回演出する意図なら別途物理仕様の判断が必要。
2. contact-v2は実験でだけ有効。既存保存を変換しない。V12統合時はルール識別子をおてほん再生位置識別に追加し、全解答を再検証する。
3. 短絡解法の監査はV11解答の全途中盤面に隣接する10,112候補。全到達状態の最短性を証明していない。
4. 軽微な未対応：後半の合体リングが初めから大きいこと、単体「falling remainder」テストが支持壁を置いており実落下を検査していないこと（全手再生では落下を含む）。操作・数字・IDに関する検証成功と区別する。

詳細な15項目の内容はREPORT.md、rules/ID/解答/保存/モーション/CI/公開の各項に記載。正式統合は本人評価後。
