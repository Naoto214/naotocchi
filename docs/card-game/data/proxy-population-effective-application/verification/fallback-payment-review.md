# 共通zero-immediate helperの複数frontier支払記録

基準07ab4496637074170730f323fcabde52488e9c7f。docs/card-gameのみ。

## 変更・根拠

既存departure.select_verified_zero_immediateは全候補の上位4operandを比較してから116 frontierを作るが、複数frontierではその比較行が保存されずpayment_operandsから検査できなかった。uniqueに既存のupper_priority_problemがあることを再利用し、fallbackにはfallback_priority_problemを保存。置換/paid draw/回収の指定3contractについて記録必須、全legal idsとの1対1対応、候補生成predicateの支払・残りtimeを照合。frontierから除外した候補も含む。選択計算/値/旧116除外は変更しない。

## 検証・review

- 初回RED2FAIL（比較記録なし・actual入口で欠落を拒否しない）。fallback-payment-red.log。
- 関連初回27PASS1.996s、process exit0。fallback-payment-green.logはその時点（追加テスト/review修正前）。
- 独立review1回: C0/I1。partial existing116経路へ別fallback記録を混ぜても検査しないI1。foreign_route改変をRED1FAILで再現し、partial側も競合fieldを拒否。actual入口改変テスト追加、再レビューなし。reviewer別実行3PASS。
- 最終32PASS33.190s、process exit0。docs/card-game再帰Python1070件の前後指紋一致。fallback-payment-final.log / final-summary.json / source-fingerprints.json.gz。新しい乱数/本番入力/標本0。

## 限界と次

支払記録の由来だけを結合した。上位/成長operand、全履歴起点、全判断機会、全情報利用の証明ではない。operand_provenance_verified=false、policy_eligible/balance_admittedは未昇格。preflight-ready=false、external_approval gate閉鎖。次は変更3bundleの既存115/零root結合確認（復元目的の再実行ではない）、その後P09自動dispatchとP11上位operandの残工程。旧完全結合原本は上書きしない。
