# 盤上能力の時支払結合・伏せ現物ID非干渉（2026-10-11）

基準HEAD8471f5d52cdc21e015131ba411e459cb8ab7584c、tree5edcd1ad3ffea3cb674e69dd9bd42b57ffecf379。fresh PR259 Draft/open/unmergedを確認。475と過去結果は不変。P10/P11の既定責務を継続し、P13の認証方式は未承認のまま。

## 根拠と責務

55のM-antlion-02は自分の伏せ札1枚、M-antlion-08は異なる捨て札2枚を山札下へ支払う。72のC-cat_friendは盤上の本人を山札下へ支払う。既存132の盤上能力登録と既存executorはいずれも時支払0。正本hash付きboard predicateが現在のsource、対象、現物支払代替、使用回数を再検査したadmitted行だけにpayment_time=0を付ける。main能力の明示base_time_costは整数0であることを要求。未対応source・除外行を0と推定しない。時0は現物支払の価値0を意味しない。

payment_operandsはcore/handに加えてこの既存board predicateをfresh計算し、比較行の時支払と残り時を結合する。実際のselector/executor、比較値・優先順位、116の除外を変更しない。比較自体がないfallbackに比較証明を付けない。新テストの比較projectionは監査入力用の条件付きfixtureであり、実selectorが比較した記録とは扱わない。

伏せ札ID非干渉は既存の通常/response入口でE-boss/G-hit-blow/I-c_coin2を使用。相手の未公開I-poop1の現物IDだけをowner prefixを保って置換し、公開view・全decision（別途照合した完全state hash1fieldを除く）・evaluation不変、元入力不変を検査。107の新入力、異種の合法伏せ札置換、全readの証明、履歴起点認証ではない。107に同ownerの交換可能な別I-poop1現物はなく、単なるdeck交換ではこの検査にならない。

## 実装と検証記録

新2件RED（payment_timeなし、board行未結合）。初回実装はsource hash辞書の重複keywordにより1ERROR。修正コマンドのcwd相違で未適用のまま関連17件中8ERRORを記録。絶対pathで修正後、関連17PASS8.841s。失敗log名にgreenが含まれていてもPASS証拠とはしない。情報制約10PASS5.593s。初期探索でpaid.scopeを欠く局所fixtureは候補不一致で停止したが、production実入口の不具合とは扱わない。

独立レビューと固定結合の最終結果は追補する。preflight-ready=false、seed生成/本番入力固定/400戦開始0、policy promotion=false、独立balance標本0、全体結論null。全機会・情報実使用・全operand履歴由来、P13〜18の認証/lock/gateは残る。

独立review1回: 重大指摘なし。レビュー担当が新board-payment/prepared-information9件を実行し9PASS2.909s。正本55/72、実入口再利用、alias/reference/型・0/物理支払との分離、証拠限界を確認。再reviewなし。

最終固定結合57PASS166.369s/exit0、tools直下Python1030ファイルの前後fingerprint一致。設計errors=[]、番号付き正本477不変。実行module・終了値・全logを保存。最新全proxy回帰や全情報使用の証明ではない。
