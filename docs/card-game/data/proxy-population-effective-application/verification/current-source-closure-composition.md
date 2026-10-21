# 現行107 source閉包の合成境界

固定読取基準: 1538eaaa1fea72cc13e1f638a818a9bb30f29eb7 / tree29990ef33de5352d5b75c8511feedda7d1ec095d。既存コードを再実装しない。P06/P08/P09について、本文上の条件付き非到達、実traceの検査、まだ存在しない全体証明を分ける。

## 再利用する論証

plans/2026-10-08-preflight-source-closure.md の41source本文対応を正とする。107の80物理札は外部札生成/他能力コピーを持たず、敵main除去/敵なかま移動の起点もない。I-poop1/I-bond1の置換は本文どおりの閉じた集合では非到達。107の装備の印刷時は2なのでG-asteroids-classicの印刷時3以上支払対象もない。期限付き10sourceはtyped payment2/stat7/conditional1であり旧reservationsと区別する。これだけでは実行の閉包を証明しない。

## 実初期入口に結合済みの前提

| 責務 | 現行のfresh接続 | 証明範囲 |
|---|---|---|
| 最初の配札/機会 | initial_obligations.audit → connected_entry | supplied manifest順から初手5/通常6/たまご7/返却/最初のresponseを独立導出。空board/予約も完全照合 |
| typed起点 | initial_obligations.audit_runtime_root | 上記最終envelopeにv2識別子と空typed3領域だけを追加。upgrade自身を呼ばない |
| 各eventの敵人物/予約不変条件 | source_root.check_transition → policy_journal.audit_opportunities | actorに対する敵main/companionsの不変と両者予約空を全実境界で照合。独立したsupplied_source_invariants_verifiedでありglobal_replacement_unreachabilityではない |
| 閉じた80物理札 | source_conservation.audit | 固定107カード定義・owner・全eventの実hash連鎖・100/105世代journal・全状態のlegacy予約不在 |
| 解決全出力 | resolution_semantics.audit | 各実resolveをsource固有full-delta監査へ照合。部分typed監査だけでは通さず、top link逆順と全envelopeも照合 |
| その他全出力 | nonresolution_semantics.audit | 各実nonresolveをfull-deltaへ照合。main移動はpayment/identity全領域検査と475順序を別前提にする |
| 実trace結合 | trace_obligations.require_actual_trace | 上記10root、全step/transition、normal/response/automatic/逐次群、全差分partitionを結合。保存proof辞書の自己申告を認証しない |

初期条件＋全実遷移の保存/意味検査により、**受理されたsupplied traceの中で**本文集合の外へ出たカード、旧reservations、全差分の監査がないeventを黙って受理しない。これは「全合法な未来の操作が実装済み」「全ルール上の機会が必ず発生記録された」という量化ではない。source_conservationのobserved_legacy_reservations_absentをlegacy_reservation_unreachable_provenへそのままコピーしない。

## 機会側の既存結合と残り

| 機会 | 別導出/実境界との接続 | なお分離する責務 |
|---|---|---|
| 公開source母数 | starts.public_sourcesを両ownerの実公開slotから照合 | 伏せidentityを公開sourceへ追加しない |
| native登場/交際/勝負/終了 | native9+challenge2登録集合、実source全分類、各current predicate、origin、occurrence集合を照合 | native以外のsourceをunproved_sourcesへ残すこと自体は欠落でも全機会完了でもない |
| 開始2source | 開始前captureと開始後条件から全classification/occurrenceを独立照合 | 実開始のdraw/指定egg/full-deltaと組み合わせる |
| latched4/手札1 | 各eventの独立timing監査、source履歴、ledgerへ接続 | すべての非該当sourceをこの5種へ拡張しない |
| 処理順/再提示 | opportunity_order、逐次再列挙、閉群実receipt、終了dispatch、automatic中間handoff | 同executor再現や唯一候補で選択根拠を補わない |
| normal/response | source母数、候補展開/対象/費用、全predicate、選択/実event結合 | 比較値と情報の全利用は別。通常公開履歴投影の追加監査だけではP10全体にならない |

P09の次の合成は、41sourceの各通常/継続/発動/誘発/置換/期限付き部分を上表の各責務へ漏れなく割り当て、non-native分類がどの別責務で検査済みかを明示すること。既存preflight-route-inventory.jsonのhandler登録だけをその代用にしない。旧reservations/敵人物除去/印刷時3装備の条件付き非到達を実originと全意味に結合する証拠も、この全source対応と区別する。

P10は実read経路表と公開履歴の独立照合が存在するが、比較/downstreamを含む全scopeの許可情報証拠を共通gateへ合成していない。P11の上位/成長一般根拠は未証明。114の同じ解決内という時収支範囲を他operandへ流用しない。P14–18の外部由来/結果前lock/別承認/現行edition共通gateと最終固定版検証も残る。

この文書は読取/論証整理であり新しい実行gate、ready証明、比較意味論ではない。コード変更/新しいseed/本番固定/試合生成なし。過去の完全結合を再実行しない。preflight-ready=false、全体結論null、policy promotion=false、独立balance標本0。

独立read-only review1回: C0/I0/Minor0。文書と指定実装の読取のみ、コード編集・テスト・完全結合の再実行なし。追加読取で確認した既存source_rootの各event guardを表へ明示した。新実装や新発見バグとして数えない。
