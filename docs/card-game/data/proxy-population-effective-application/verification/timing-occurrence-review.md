# 4source事象条件付き誘発の発生照合

基準67111f23b79adc511253e9d4b64f37cbfe62a25f。新timing_occurrence監査は55/72/74のM-antlion-03/06・C-bat・P-cliff_goatを、発生直前main/partner/companionsと実イベントから別に照合する。既存107 catalogとsource pin、state/hashの表現を再利用するが、capture/current_actionsは呼ばない。費用・対象・回数は後段の現在合法性と分離し、発生時に不足しても発生機会を落とさない。

positive_window.rememberでは手札G-air-hockeyを追加する前に4source集合を照合し、coverageでは全実イベントの既存full-delta監査後にも照合。M06は現行typed effect_applied boolを必須とするが、その値自体の真実性をこの監査単独では証明しない。効果実差分は既存別責務。G-air-hockey・開始・登場・終了など他の機会をこの4source検査で完了扱いにしない。

新2RED: module欠落、およびproducer/replay双方がM06の機会を一貫して省略した場合に実入口が受理することを確認。実装後関連13PASS7.823s、関連24PASS4.425s。後者はテストクラスimportによる既存2件の重複実行を含むため、新規条件24個とは数えない。最終ではmodule importへ直して重複を除いた。

独立read-only reviewは1回、Critical0/Important0。4source本文、分類source hash/occurrence多重集合、入口/coverageの接続順、typed applicationと全差分の境界を確認。独立6PASS0.497s（上述の重複2件を含む）。ファイル編集・seed・対戦なし。

最終固定結果はtiming-occurrence-final-exit.jsonとtiming-occurrence-final.log、再帰Python前後hashはtiming-occurrence-python-fingerprints.json.gzに保存する。条件付きの保存115/zero-root20ターンを含み本番400戦ではない。

preflight-ready=false、本番gate閉鎖、seed生成/入力固定/400戦0、policy promotion=false、独立balance標本0、全体結論null。全proxy回帰・全read・全機会・起点認証の証明ではない。

最終固定54PASS168.040s/exit0、再帰Python1066ファイル前後hash一致。design errors=[]、番号付き正本477不変。旧115/zero-root20ターンの完走・機会順・連鎖を含む。最新全proxy回帰完了ではない。
