# 427 — 通常coin発動・砂漠サソリのタイミング接続

426 HEAD `3e3a07cde0ffbd4a4a13134182c3f8b29496a5aa`、tree `52d908f8e02b6736e0073c9ee0698c28744f3daa`から再開。fresh PR259はDraft/open/unmerged。

## 接続した既存契約

通常coinは06の宣言・支払・発動手順と、170の支払い/link生成、119の追加発動・双方pass、176の解決を接続した。元の通常選択wrapper・normal ID・resolution modeは保持する。内部timing projectionの前後hashは実際のnormal stateへ戻し、開始反応は発動者優先・index1・after_normal_action・実発動seqにする。山札の内容を判断や発動時に先読みしない。効果は双方pass後にだけ解決し、支払は1回だけ。未知の盤面trigger/cost源・予約は支払前に停止する。

砂漠サソリの盤面源は133の公開本文・候補表検査を再利用して通常行動ではない終了triggerと分類する。通常候補器へscopeで接続し、検査後registryを復元する。終了時は93に従い、持ち主がたまごなら新規能力発動を止める。非たまごでの終了時効果はまだ未接続なので停止する。次ターン開始では74の終了時能力を開始trigger集合からだけ除外する。実盤面のpartnerは保持し、次の手札候補・装備対象には元の盤面を渡す。

## 実測

|経路|旧426→427停止seq|新426停止seq|新427停止seq|新427の残る処理|
|---|---|---:|---:|---|
|01-A|131→131|20|20|メイン配置後の通常候補|
|01-B|140→140|10|10|メイン配置後の通常候補|
|02-A|77→77|9|25|I-bowtieの装備実行|
|02-B|103→103|4|30|メイン配置後の通常候補|

新02-A/02-BはR2に到達。8経路を135からfresh生成し、各々を独立再実行した。完了0、停止8、未実施0。旧4の到達したcanonical event/state/normal decisionは保存履歴と一致。新規到達を強度・balance標本にしない。winnerを補完しない。

旧4の停止原因を調査したところ、過去の盤面projectionによりI-bowtie/I-bond1の装備targetが候補から除外されていた。候補を隠した互換profileにはせず、`trajectory-checkpoint-427/scope-investigation.json`へpath・seq・両hash・source/raw hash・保存候補・fresh候補・増えた対象を保存した。旧／新方針の効果として数えない。114や過去監査を書き換えない。

専用37/37 PASS（66.205秒）。通常coin5件と盤面/終了/開始5件を含む。npm test exit0、最終Node部分406/406 PASS。既定設計検査errors0、空白検査成功、原本505 raw変更0。RED/GREENと最終ログをverificationへ保存。全proxy回帰は未実施。

## 保存と残件

全fresh結果は427 `manifest.json`と`paired-delta.json.gz`へ保存。426と同じv2形式で、署名付き424 paired.json.gzをbaseとし、replace/append操作を適用する。result_index/run_id、appendのbase_length、base/delta/reconstructed hashesを照合する。ensure_ascii=false、sort_keys=true、indent2、末尾newlineで復元したbytesとfresh bytesの完全一致を実測した。保存表現の差分であり独立実行のcacheではない。

Task 5は継続中。次はメイン配置後の候補列挙・人生移動の系統証明と、装備実行の既存状態表現を監査する。旧4の装備target scope差は別の再現・候補完全性問題として保持する。Task 6評価、Task 7統合・全proxy回帰、最終独立レビューは未完了。414仕様・114正本・過去結果・112未実施・独立balance標本0を維持。PR259 Ready化・main merge・新方針正本化はしない。
