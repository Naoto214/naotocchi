# 405 Bターン再開とR10到達

正本はremote HEAD `a78d0263732e202695b0c7157dc1c9d927cc2af0`、tree `e5d2174e500144c570e815d2eca850de5dab3bc6`。PR #259はDraft/open/未マージ。404のstate raw SHA256 `567fc388da16f10b7cc036e78dfb78cf7842d9b700e066aa68e9279d0000bdc2`と正準再生成を照合する。400へ巻き戻さず最新保存済み404から再開する。

1. 専用テストREDを確認する。
2. 全経路を独立にB交換から再開。完全集合には107→114→116を最後まで適用する。応答優先者が相手側でも、全候補・元のresponse context・本人既知情報を保持する。
3. 開始窓で1pass後の空連鎖コイン起動を既存170/142/176の支払い・遷移・解決へ接続する。開始時なかま能力は実際のegg event seq/actorで出所を検証する。
4. 401終了監査に任意の監査handlerを注入可能にし、既定動作を維持する。R10では01/06/64の先手続行・後手最終比較だけを接続し、未解決の予約・効果・履歴を無視しない。
5. 新規R10のE-final-time候補に遭遇した場合は、不完全な合法集合をseed抽選しない。最後の有効state/hashを保存して各経路を独立に継続する。
6. 専用GREEN・401〜404再生成・変更helper関連回帰・全proxy・npm testを区別して記録。保存後remote HEAD/treeとstate blob/hash、PR状態を再確認する。

実施: 2件の初回REDを確認。405で20 event/snapshotを保存、01-A/02-AはR10のA交換へ。01-B/02-BはR10応答のE-final-time対象別候補・stable ID/同名使用履歴/効果解決の不足で真正停止。新設R10 handlerは合成テストで先手・後手・同値・未解決trigger拒否を検査したが、保存対戦での最終比較はまだ未到達。completed0、独立balance標本0、112未実施6件・過去state/hash・カード本文/数値/登録区分を保持する。

Ruling: 405を完走4戦とはせず、到達済み局面の進行と新たな不完全候補を記録する — E-final-timeはR10ならたまごでも条件可と91本文に明記されるため、単に除外すると合法候補を落とす — 誤りの場合は候補contractと保存局面の再監査が必要。

検証結果: 405専用3PASS、401〜404計9PASS、170計2PASS、本編npm test exit0、差分空白検査exit0。全proxyは180秒上限でexit124/4件経過、全結果未取得。catalogは119件数1・120件数2の既知error計3でexit1。R10実対戦完走は未実施。

Final review: Important（R10 helperの入力履歴消去/境界不検証）を7改変caseのRED→GREENで修正。最終400〜405関連14PASS、本編npm test exit0。未修正Critical/Important・保留Minor0。Rulingは上記1件のみ。
