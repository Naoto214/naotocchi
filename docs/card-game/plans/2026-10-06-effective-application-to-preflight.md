# 承認Bから400戦preflightへ

正本：474（ユーザー承認）、473保存7ce93b62。docs/card-gameのみ。過去版を保持し、seed生成・入力固定・400戦は最終確認まで禁止。

1. 発動／解決／実効的適用の追補を正本化。共通の三値適用証拠とbounded growth、既存native効果のreceipt生成をTDDで接続。実増加0と他部分適用、条件不成立、未知、hash改変を検証。
2. M06/M07の適用根拠を共通証拠へ接続。challengeの宣言・逐次誘発・既存効果・比較・終了まで、既存loopで接続。旧116 pure frontierを統合し除外は維持。
3. 100履歴・既存終了6段階・次手番・勝利へ接続。既存正本の意味で一意の範囲のみ。guardの機械的削除や私的な低成長stateで優先度を偽装しない。
4. 全判断機会／全体replay／真正な初期入力と469lock／実行入口を統合。結果観測前固定は実行許可後、準備時に実験seedを作らない。
5. 大きな安全区切りで関連検証・必要な回帰・npm・設計検査・保護検査・独立レビュー1回をまとめる。GitHub保存後も判断不要なら継続。最終preflight-readyで実行確認。

Interface audit: native効果の既存receiptは指示量と実増加を混同しうる。新scopeは既存handlerの結果を既存本文に照合し、bounded結果・全hash・snapshotを再構成し、旧版defaultへ影響させない。M06の現在receiptとM07の履歴receiptは同じ適用分類を使う。最終全体entryは供給receiptでなくadapter再実行を要求する。

## 進行記録（未完了・継続中）

- 474承認B追補、三値適用契約2件RED→GREEN。native growth handler再利用3件（上限0・部分増加・別部分draw・M06/M07・source drift・独立adapter再実行）PASS。過去defaultは保持。
- 472loopに観測event集合のopt-in設定口だけを追加。default集合不変。challenge_declaredと既存M07/P-anglerfishを新scopeで接続し、通常判断→群→比較→challenge終了を検証。途中rootだけの試験は終了時に履歴欠落を正しく拒否。
- 既存115固定入力と既存test-onlyゼロpolicy rootによる合成結合で、80step／100event／10回の手番終了を通過しR6へ到達、stop=null。独立入力・新規balance対戦ではなく固定unit prefixの接続診断。
- この結合でlegacy native手札発動linkのsource_zone省略が個体監査と不整合になることを再現。明示use_item/use_play/use_eventの旧形式だけ移動元handとして扱い、他の未知形式は拒否するよう補修。カード個体や本文に固有の分岐は追加しない。
- 468のopening／manifest行結合／policy機会journalをそのまま利用し、新backendへつなぐ条件付き入口を追加。全tools fingerprint前後一致、全出力canonical再実行を検証。入力lock・全機会・適格性の完成を主張しない。
- population関連回帰を実行中。独立レビュー・最終preflightは未完了。次は100/終了/勝利と全入力真正性・機会網羅の残ゲート。

- 関連179件PASS完了。以後のchain/latching/entry結合22件PASS（101.337s）。R10最終比較までの固定unit接続を達成、これは部分入力の接続検証であり独立標本ではない。
- 3種類のquick top-linkを共有し、既存native hit/first-dateを利用。完全な外側chain保持、bounded growth、公開／drawと適用なし、現在incarnation対象／retired対象、終了正規化と履歴再照合を接続。
- 独立レビュー1回の指摘をverification/review.mdへ記録。source読込lock leakと終了復帰をRED→GREEN修正。challenge reward上限をnative比較後の実増加・結果・hashへ接続（新規価値付けなし）。以後の変更は最終関連検証でまとめる。

- 100到達後のbundle: challenge報酬・W-countryside・結婚のbounded実増加、typed当ターン効果失効、実到達／維持履歴と終了6段階を接続。通常選択の未知上位値はNoneのまま、既存114で証明できた劣位だけ除外し、残りを116へ委譲。paid/recoveryの適用再照合も現在の共通selectorへ接続。専用RED→GREEN、関連29件PASS、population203件PASS（234.890s）。100履歴の終端テストには条件付きhistoryとmockを含み、真正な新400入力や100到達対戦を検証した主張ではない。
- 横断監査: current107全41カードの本文sectionと能力classificationを照合。静的一覧をcurrent107-source-routing.jsonへ保存。これはhandler実行／判断機会網羅の証明ではない。通常／response、開始、登場、quick発動、効果適用、セカイ変更、challenge宣言、終了、継続補正、支払軽減、置換を別責務として扱う。
- 一意な不足を発見: 91のfirst-dateは段階0を解決条件と明記し他段階の発動を許すが、既存列挙器が0限定。87のhit-blowは空山札で分岐不実施を定めるが旧responseは候補を除外。保護114 table／旧adapterは変更せず、現行別版へ合法性を接続するRED→GREENを開始。旧responseの固定+5を新規合法範囲へ流用しない。新しい点数や解決済みの主張ではなく119未解決fallback／116除外を維持する。
- 誘発台帳を手番変更前・最終完了時にarchiveし、pending/deferredを残した破棄を拒否。RED→GREEN、関連7件PASS。02のpartner出来事時たまご抑止はsource hashと陰性捕捉を追加し7件PASS。
- 新bundle独立レビューC0/I0/Minor1（test名の未検証部分、threshold-review.md）。npm406PASS。全proxy回帰実行中。次の全機会監査では、C-chameleonの過去の場在籍を配置event名だけで再構成しないことを確認する。実snapshotからの公開継続適用照合を/tmpにTDD試作中（未接続、今回Git保存に含めない）。

## 公開適用・義務照合から全体審査への接続

9c56保存後、公開なかま適用を全event/snapshotの実在籍から検証する別版を接続。C-chameleonが去った後のセカイ配置で過去在籍を復活させない。公開fieldのみを判断へ返し、解決receiptの不明をfalseにしない。旧defaultは保護。条件付きfixtureは合法な対戦全体の証拠ではなく、旧event名推定の偽陽性を再現するunitである。

`proxy_population_trigger_coverage`は記録eventのうちdriverが観測対象にしたものだけを母集団にせず、各実state遷移へ既存source producerを適用し、開始captureからの義務と合わせ、全閉鎖台帳・残存台帳へ照合する。余分／欠落／複数手番への重複とjournal改変を拒否・報告。existing executor内の対象誘発に限定し、初期proof真正性、別実装ルール検証、全判断網羅、戦略的解決、標本算入を独立gateとして残す。固定R10結合は2件PASS（110.795s）。

全体審査は459/463の既存仕様を別版で接続する。callerのeligible/verifiedを根拠にせず、現行のmanifest結合entryから再構成した判断・遷移だけを審査する。旧schema/過去runの遡及算入は拒否。旧116を確認した判断は除外とし、同時に未証明gateを保持。指定MRPの戦略未証明は維持し、局所乱数一致だけでpolicy_eligibleへ上げない。対戦の未完走、機会不足、input lock欠落は未証明。鏡像の片側欠落、予定400行の欠落、複数attempt不一致を残し、全体結論は全gateが揃うまでnull。

次のTDDは、未知schema/自己申告、真正な旧116、指定MRPと指定外の分離、途中対戦、片側欠落、全予定行保持、再試行による除外消去拒否、0分母、過去record拒否をまとめて扱う。実験seed/manifestは作らず、既存の不適格in-memory test doubleで構造・保留動作を検証する。
