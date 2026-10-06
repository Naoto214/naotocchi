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
