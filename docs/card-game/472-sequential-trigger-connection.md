# 472 承認Aの逐次誘発契約と共通runtimeへの条件付き接続

471後のユーザー承認Aに従い、現在の全合法な次発動action（現物・対象・コストを含む）と残群見送りを逐次選ぶ別版を追加する。部分集合・全順序の先行抽選は行わない。旧版・保護正本は変更しない。

## 契約・接続

- 各stepは現在stateから再列挙し、完全性を示すadapter証拠、合法候補、選択／見送り、比較未解決の理由、116乱数証拠、前後envelopeとledger、event・snapshot・hashを保持する。validatorは供給adapterを再実行して全fieldをcanonical比較する。
- 比較不能な順序／残存資源は未知のまま116へ委譲する。戦略的同値、未知の0点化、カード優先順位、新しい価値は導入しない。116による判断は戦略未解決・除外、463〜465の限定policy適格性へ移さない。
- 必須の唯一発動・現在発動不能になった残群の閉鎖はルール処理として区別する。乱数を生成せず、戦略的解決や対戦適格性を主張しない。
- 471開始source契約のC-chicken/I-bowtie、既存登場／終了handlerの9種を共通群契約へ接続する。既存468loop、119反応、既存効果を使い、別の対戦loopは実装しない。強制区分・任意区分を維持する。
- 実際の次手番開始eventの中間envelopeからsourceを捕捉する。対応する既存handlerの登場／発動／解決eventも観測する。過去originを後のeventで補完せず、同じoriginを重複発生させない。解決中の観測は連鎖終了まで繰り越す。
- 開始／終了の効果後に反応機会を戻す処理は、既存実行器のresolution adapterを通じて履歴再検証にも適用する。終了時の証拠をイベントの自己申告だけから作らない。
- 発動参照receiptを伴うコスト・回数runtime変化は、現在合法候補と実発動handlerの再実行によって照合する。receiptだけでは許可しない。停止時は追加journalを巻き戻し、不正入力でも共有lockを残さない。

## 証拠の限界・未完了

これは新しい条件付き接続入口であり、400戦entryの完了版ではない。初期proofは供給値を再検証するが、実入力からの真正なorigin認証を主張しない。`origin_authenticated=false`、`opportunity_completeness_proven=false`、`ready_for_execution=false`、`balance_admitted=null`、独立balance標本0。

既存adapter外のsourceは未証明として残す。全107sourceの正条件handler、全発動機会の網羅、群発動・効果の全体entry replay、再登場個体／期限・予約、100到達維持の認証は未完了。部分的な候補完全性を全対戦へ一般化しない。終了provenanceや未接続の正条件に達した場合は既存guardを維持する。

固定旧115入力と明示的ゼロrootによる合成再構成は独立入力ではない。途中版のR10再構成では群判断0件だったため、その完走は群選択の検証として数えない。複数source・対象・不成立・見送り・forced singleton・hash改変は別の専用検証で扱う。過去結果の補完ではない。

## 検証・保存

専用19件PASS。population関連133件PASS（レビュー修正前の集計）、レビュー修正後は該当5件と専用19件を再検証。npm406件PASS、設計データerrors=[]。独立レビュー1cycleはCritical0／Important1／Minor0、同originの強制発動再提示を既存使用済み判定で修正し、独立再確認後の残件0。全proxy回帰はこの保存時点の完了検証には含めない。直列の試行は分割実行へ切り替えるため中断し、全体PASSとして数えない。分割回帰の完了結果は別途保存する。計画：`plans/2026-10-06-population-trigger-sequential.md`。ログ：`data/proxy-population-trigger-sequential/verification/`。seed生成・400入力固定・400戦開始は行わない。新方式未採用、旧116除外、予定集合からの事後除外禁止を維持する。
