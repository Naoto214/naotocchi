# なおとっちカードゲーム — 設計正本

最終更新: 2026-09-24

このディレクトリをカードゲーム設計の **Single Source of Truth** とする。再開時はGitHubの最新main・作業ブランチ・関連PRを確認し、記憶だけで既決定事項を再設計しない。

## 現在フェーズと再開地点

| [167](167-board-ability-response-id.md) | 119の追加契約として盤上能力の一般response IDを確定、4機会候補完全 |
| [166](166-new-seed-start-audit.md) | 4開始時response候補を監査し、01-A盤上能力IDの未確定を記録 |
| [165](165-new-seed-egg-restart.md) | 4経路の次手番たまご交換をseeded fallbackで記録 |
| [164](164-new-seed-turn-end-restart.md) | 4経路のR1終了と次手番2枚ドローでたまご交換へ |
| [163](163-new-seed-turn-end-audit.md) | 4経路の6段階ターン終了監査で全項目真・停止コード空 |
| [162](162-new-seed-turn-end-history.md) | 4経路の全event/hash/成長履歴をターン終了入口まで検証 |
| [161](161-new-seed-end-response-restart.md) | 3ターン終了responseをpassで閉じ、4経路ともターン終了入口 |
| [160](160-new-seed-normal-restart.md) | 3通常行動をpassで再開し、02-Aターン終了入口を保持 |
| [159](159-new-seed-next-audit.md) | 3通常行動を完全監査し、02-Aターン終了入口を保持 |
| [158](158-new-seed-response-restart.md) | 4経路の現在responseをpassで閉じ、02-Aはターン終了入口へ |
| [157](157-new-seed-normal-restart.md) | 4経路の通常行動を107/114/116で選択・再開 |
| [156](156-new-seed-normal-audit.md) | 4経路の通常行動候補を完全列挙し、02-Aの盤上P-anglerfishをresponse分類 |
| [155](155-new-seed-chain-resolution.md) | 02-Bの2リンクを2 pass後に逆順解決して通常行動へ復帰 |
| [154](154-new-seed-item-chain.md) | 02-Bの選択済みI-c_coin2を連鎖へ起動し、2リンクの解決前で保存 |
| [153](153-new-seed-start-response.md) | 01の開始時responseを閉じ、02-Bは選択済みI-c_coin2の起動直前で停止 |
| [152](152-new-seed-egg-restart.md) | 3経路のR1たまご交換を116 seedで選択し開始時responseへ進める |
| [151](151-new-seed-turn-end-restart.md) | 3経路のターン終了と次手番ドローを独立再開し、たまご交換入口まで進める |
| [150](150-new-seed-turn-end-history.md) | 3ターン終了入口の保存済み全履歴を再構築し、期限・成長到達出所を証明 |
| [149](149-new-seed-turn-end-audit.md) | 3ターン終了入口の盤上誘発時点を分類し、履歴出所の不足を切り分け |
| [148](148-new-seed-response-restart.md) | 147の現在response窓を再開し、01の2経路をターン終了入口、02-Aを通常行動へ返す |
| [147](147-new-seed-normal-restart.md) | 01-A/Bのpassと02-Aのseed付き時0こいびと配置を独立再開 |
| [146](146-new-seed-normal-trigger-audit.md) | 01の盤上誘発をresponse_triggeredへ接続し、3通常行動の完全候補を再証明 |
| [145](145-new-seed-response-restart.md) | 01-A/Bの双方response-passと02-Bの終了窓passを独立再開 |
| [144](144-board-trigger-response-audit.md) | 現在の配置eventに対する盤上誘発条件を分類し、4状態の候補完全性を証明 |
| [143](143-new-seed-next-opportunities-audit.md) | 新seed4状態の次のresponse／通常行動候補を横断監査、未証明盤上familyを分離 |
| [142](142-hit-blow-start-response-restart.md) | 02-Aの宣言済みG-hit-blowを発動・双方pass・解決して通常行動入口へ |
| [141](141-new-seed-r1-normal-restart.md) | 140の3通常行動を比較・各1 event再開、次のresponseで停止 |
| [140](140-new-seed-normal-candidate-audit.md) | 138通常行動の3停止stateを既存候補契約で再監査。対戦event追加なし |
| [139](139-new-seed-stop-cross-audit.md) | 138の4停止点と既存契約を横断監査 |
| [138](138-start-response-restart.md) | 新seed開始時response候補列挙・保存4状態から独立再開 |
| [137](137-start-response-id-design-decision.md) | 開始時responseの対象なし・宣言variant候補IDの設計判断 |
| [136](136-new-seed-start-response-audit.md) | 新seedの開始時response 4停止点を横断監査 |
| [135](135-new-seed-opening-probe.md) | 新seedの初手探索・4経路のR1交換後response境界で停止 |
| [134](134-board-response-restart.md) | C-batの応答誘発分類・01の2経路独立再開 |
| [133](133-cross-stop-restart.md) | 設置道具・終了誘発・R10終局・4経路独立再開 |

| [132](132-board-active-restart.md) | 盤上起動能力・近接契約・4経路独立再開 |

| [131](131-safe-placement-mixed-restart.md) | 時0配置・異種候補比較・4経路独立再開 |

| [130](130-board-source-world-restart.md) | 盤上源除外・継続セカイ効果・4経路独立再開 |

| [129](129-conditional-growth-restart.md) | 条件付き成長の比較・4経路独立再開 |


現在は **[167 盤上能力response ID一般契約](167-board-ability-response-id.md)** の保存地点。ユーザー承認形式`response-activate-ability-{source_instance_id}`を119の原本を保持した追加契約として確定し、166の4開始時機会をすべて完全候補集合へ。01-Aは盤上C-chickenとpassの2候補。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは固定158 snapshotで458件中457 PASS・既知117旧テスト1 FAIL、新規失敗0。167 HEAD全件GREENとは扱わない。

履歴上、166は **[166 新seed開始時response横断監査](166-new-seed-start-audit.md)** の保存地点。01-AはC-chicken盤上誘発が発動可能だが、盤上能力のresponse専用stable IDが未定義で真正停止。01-B/02-Bはpassのみ、02-Aはpass＋I-c_coin2を完全証明。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、165は **[165 新seed次手番たまご交換](165-new-seed-egg-restart.md)** の保存地点。4経路の現在手札から116 seeded fallbackで1枚ずつ山札下へ戻し、開始時response入口へ。C-chickenの誘発候補は次の監査へ保持。新decision/event/snapshot各4、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、164は **[164 新seedターン終了・次手番ドロー](164-new-seed-turn-end-restart.md)** の保存地点。4経路でR1ターン終了と次手番2枚ドローを記録し、たまご交換入口へ。01-AのC-chickenは交換後の開始誘発へ保持。新event/snapshot各8、decision0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、163は **[163 新seedターン終了6段階監査](163-new-seed-turn-end-audit.md)** の保存地点。162全履歴と161の4状態を123/124へ接続し、4経路とも全チェック真・停止コード空。P-cliff_goat／P-anglerfishは74の発動時点によりターン終了誘発から除外。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、162は **[162 新seedターン終了履歴出所](162-new-seed-turn-end-history.md)** の保存地点。4経路の135〜161全event/hash/成長を現在のターン終了入口まで連結し、02-AのG-hit-blow一致+5、02-Bの不一致+0、予約・100到達なしを検証。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、161は **[161 新seedターン終了response再開](161-new-seed-end-response-restart.md)** の保存地点。01-A/B・02-Bの現在候補を完全証明し、それぞれ唯一のresponse-passで閉じた。02-Aと合わせて4経路ともターン終了入口。新decision/event/snapshot各3、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、160は **[160 新seed3通常行動再開](160-new-seed-normal-restart.md)** の保存地点。01-AはM-antlionたんじょうとpassを時残高で比較してpass、01-B/02-Bは唯一のpassを選択。3経路はターン終了前response入口、02-Aはターン終了入口を保持。新decision/event/snapshot各3、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。

履歴上、159は **[159 新seed次機会横断監査](159-new-seed-next-audit.md)** の保存地点。01-Aはたんじょう＋pass、01-Bと02-Bはpassのみを完全証明。02-Aはターン終了入口を保持。P-cliff_goatを既存response_triggered区分へ接続して通常行動から除外。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxy検査は固定158作業領域で実行中で全件GREENとは扱わない。

履歴上、158は **[158 新seed現在response再開](158-new-seed-response-restart.md)** の保存地点。01-A/B/02-Bは各2回passで通常行動へ、02-Aは1回passでターン終了入口へ。新decision/event/snapshot各7、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxy検査は固定HEAD別作業領域で再実行予定で全件GREENとは扱わない。

履歴上、157は **[157 新seed4経路通常行動再開](157-new-seed-normal-restart.md)** の保存地点。01-AはC-batの時0配置、01-BはseedでC-chicken配置、02-BはseedでP-cliff_goat配置、02-Aは唯一のpass。新decision/event/snapshot各4、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、156は **[156 新seed4経路通常行動候補監査](156-new-seed-normal-audit.md)** の保存地点。155の01-A/B/02-Bと148から保持した02-Aを合わせ、4経路すべての現在通常行動候補集合を完全証明した。02-AのP-anglerfishは74本文と06/119に従うresponse_triggered区分として通常行動から除外。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、155は **[155 新seed2リンク連鎖解決](155-new-seed-chain-resolution.md)** の保存地点。02-Bは2 passで連鎖を閉じ、I-c_coin2→G-hit-blowを逆順解決して通常行動へ戻った。01-A/Bも通常行動入口のまま。新decision2、event/snapshot各4、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、154は **[154 新seedI-c_coin2連鎖起動](154-new-seed-item-chain.md)** の保存地点。02-Bで77本文と119の既存連鎖遷移から選択済みI-c_coin2を時1で起動し、G-hit-blowに続く2リンクを保存した。01-A/Bは通常行動入口を保持。新event/snapshot各1、decision0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、153は **[153 新seed開始時response再開](153-new-seed-start-response.md)** の保存地点。01-A/Bはそれぞれ2回のresponse-passで通常行動へ戻った。02-BはG-hit-blow起動＋1回のpass後、BのI-c_coin2が合法となりseeded fallbackで選ばれたため、起動前のseq11・state/hashで真正停止。新event/snapshot各6、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、152は **[152 新seedたまご交換再開](152-new-seed-egg-restart.md)** の保存地点。151の3経路は116のseeded fallbackでR1たまご交換を選び、次手番開始response入口まで進んだ。新decision/event/snapshot各3、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、151は **[151 新seedターン終了と次手番ドロー](151-new-seed-turn-end-restart.md)** の保存地点。01-A/B/02-Bの3経路で123/124のターン終了完全性を現在stateと150履歴から再計算し、各経路ターン終了と次手番2枚ドローを処理してたまご交換選択入口に到達した。新event/snapshot各6、decision0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、150は **[150 新seedターン終了履歴出所監査](150-new-seed-turn-end-history.md)** の保存地点。135〜148の保存済みevent/snapshotを連結し、01-A/B/02-Bで成長20対20が全時点不変、予約・未処理誘発・期限付き効果0、100到達0を再構築した。ターン終了の現在完全性と遷移は次checkpointで再評価する。新event0、completed0、独立balance標本0、カード変更0。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で全件GREENとは扱わない。

履歴上、149は **[149 新seedターン終了出所監査](149-new-seed-turn-end-audit.md)** の保存地点。01-A/B/02-Bの閉じたターン終了入口3状態でC-chicken/C-batの発動時点を本文から照合し、終了時盤上誘発を除外した。残る`unresolved_expiration`・`missing_growth_reach_history`は履歴出所証明が必要であり、まだターン終了遷移は実行していない。new event 0、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、保存JSON一致、設計データerrors空。全proxy検査は実行中で全件GREENとは扱わない。

履歴上、148は **[148 新seed現在response窓の再開](148-new-seed-response-restart.md)** の保存地点。01-A/Bのpass後の相手response-passを適用してターン終了入口へ進み、02-AではP-anglerfishの現在の配置イベントに対する不発を本文で証明して2回のresponse-pass後に通常行動へ戻した。02-Bはターン終了入口を保持。新decision/event/snapshot各4、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、保存JSON一致、設計データerrors空。全proxy検査は実行中で総数・失敗内訳は未確定。全件GREENとは扱わない。

履歴上、147は **[147 新seed通常行動3機会の独立再開](147-new-seed-normal-restart.md)** の保存地点。01-A/Bはpassで終了response入口、02-Aは116 seedでP-anglerfishを時0配置して配置後response入口へ進んだ。02-Bはターン終了入口のまま。新decision/event/snapshot各3、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、全proxy43ファイル・436件中435件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。

履歴上、146は **[146 新seed通常行動の盤上誘発分類](146-new-seed-normal-trigger-audit.md)** の保存地点。01-Aはpassのみ、01-Bはたんじょうとpass、02-Aはこいびと3配置とpassを完全列挙した。C-chicken/C-batの盤上誘発は通常行動から除外し、02-Bはターン終了入口を維持。新decision/event/snapshot 0、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、全proxy42ファイル・434件中433件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。

履歴上、145は **[145 新seedresponse窓の独立再開](145-new-seed-response-restart.md)** の保存地点。01-A/Bは双方passで通常行動入口、02-BはAの一意なpassでターン終了入口に到達。02-Aは142の通常行動選択前を維持。新decision/event/snapshot各5、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、全proxy41ファイル・432件中431件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。

履歴上、144は **[144 盤上誘発responseの現在機会監査](144-board-trigger-response-audit.md)** の保存地点。01-A/Bの盤上C-chicken／C-batは今回の配置eventで誘発条件を満たさず、現在はresponse-passのみと証明した。02-A/Bの143完全候補は保持。4状態の現在機会は完全、対戦event・completed・独立balance標本は0、カード本文・数値・登録区分変更0件。専用2件PASS、全proxy40ファイル・430件中429件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。

履歴上、143は **[143 新seed次機会の横断監査](143-new-seed-next-opportunities-audit.md)** の保存地点。142の4停止state/hashを維持して、02-Aの通常行動4候補と02-Bの現在優先者のresponse-passを完全証明した。01-A/Bの手札部分はpassのみだが、盤上なかまを含むresponse全体は未証明として保持する。新decision/event/snapshot 0、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用2件PASS、全proxy39ファイル・428件中427件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。

履歴上、142は **[142 G-hit-blow開始時responseの発動・解決](142-hit-blow-start-response-restart.md)** の保存地点。141の02-A停止stateから宣言済み `partner` のG-hit-blowを時1で発動し、A→Bの連続pass後に山札上を公開して一致したpartnerを手札へ加え、Aのそだち+5。02-Aの最終有効eventは6。01-A/Bと02-Bは141の停止位置を保持する。新decision 2／event 4／snapshot 4、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。専用3件PASS、全proxy38ファイル・426件中425件PASS、既知117旧テスト1件FAIL（期待190／実測263）、新規失敗0件。全件GREENとは扱わない。次は3件の後続response完全性と02-Aの解決後通常行動候補を横断監査する。

履歴上、141は **[141 新seed R1通常行動の比較と独立再開](141-new-seed-r1-normal-restart.md)** の保存地点。140の3候補完全stateを107・114・116で比較し、01-A/Bのなかま時0配置と02-Bの通常passを各1 event進めた。02-Aはヒット&ブロー発動前停止を保持。新decision 3／event 3／snapshot 3、completed 0、独立balance標本0、カード本文・数値・登録区分変更0件。全proxyは423件中422件PASS、既知117旧テスト1件FAIL、新規失敗0件。全件GREENとは扱わない。

履歴上、140は **[140 新seed通常行動候補の監査](140-new-seed-normal-candidate-audit.md)** の保存地点。139の横断監査で、138が121旧監査器を直接参照したことによる3件の停止を発見した。140では138の4保存state/hashを維持し、通常行動へ到達した3件について125・127・128・132の既存契約で候補の12条件を再証明した。02-AはG-hit-blowの発動前停止を維持する。新しい選択・event・snapshot・完走は0、独立balance標本0、カード本文・数値・登録区分変更0件。全proxyは420件中419件PASS、既知117旧テスト1件FAIL、新規失敗0件。全件GREENとは扱わない。

履歴上、138は **[138 新seed開始時response再開](138-start-response-restart.md)** の保存地点。ユーザーが承認した137のA案でresponse専用IDを一般拡張し、135の4保存stateから独立再開した。01の2経路と02-Bは双方pass後の通常行動入口で停止、02-Aはヒット&ブローの7宣言を含む8候補からseedで宣言を選んだ後、未証明の発動・解決の手前で停止。4経路とも新規完走0、独立balance標本0。カード本文・数値・登録区分変更0件。

履歴上、135は **[135 新seedの初手基盤耐性探索](135-new-seed-opening-probe.md)** の保存地点。事前固定した新seed2組の先後鏡像4経路で初手7候補の選択とhash連鎖を検証し、交換後のresponse候補が未証明のため4経路とも真正停止。全proxyは411件中410件PASS・既知117旧テスト1件FAIL、新規失敗0件。全件GREENとは扱わない。

履歴上、134は **[134 C-batの応答誘発分類と独立再開](134-board-response-restart.md)** の保存地点。133で停止した01の2経路もR10後攻終了まで到達し、いずれもAの勝利。133の02の2経路と合わせて旧4経路すべて完了。全経路でseeded fallbackを使っているため独立balance標本は0。[134全proxy回帰検証](134-proxy-regression-verification.md)は407件中406件PASS・既知117旧テスト1件FAILで、新規失敗0件。全件GREENとは扱わない。

履歴上、133は **[133 132停止点の横断監査と独立再開](133-cross-stop-restart.md)** の保存地点。01の2経路はR9 Aの盤上源で真正停止、02の2経路はR10最終比較で引き分け完了。独立balance標本は0。

履歴上、132は **[132 盤上起動能力と近接契約](132-board-active-restart.md)** の保存地点。131の4停止state/hashから独立再開し、盤上起動能力の完全候補監査、条件付き道具比較、ターン終了の履歴分類を適用した。01はR6の設置道具、02-AはR10の盤上能力、02-BはR10終了契約で真正停止。completed・独立balance標本は0。

履歴上、131は **[131 時0人物配置と異種候補比較](131-safe-placement-mixed-restart.md)** の保存地点。130の4停止state/hashから独立再開し、全経路で安全な人物配置と応答passを処理した。次の盤上起動能力の候補分類で真正停止。completed・独立balance標本は0。

履歴上、130は **[130 盤上源の除外・継続セカイ効果と独立再開](130-board-source-world-restart.md)** の保存地点。129の4停止state/hashから独立再開し、R5/R8で新たな時0なかま配置の安全証明不足に真正停止。completed・独立balance標本は0。

履歴上、129は **[129 条件付き成長の比較と独立再開](129-conditional-growth-restart.md)** の保存地点。128の4停止state/hashから独立再開し、条件付き+5の確定性を107・114で比較した。4経路は後続の候補除外理由と未分類セカイ効果で真正停止し、completed・独立balance標本は0。

履歴上、128は **[128 R2候補分類・ID・比較と独立再開](128-r2-candidate-extension.md)** の保存地点。127の4停止stateを原本とし、盤面能力分類、対象なしID、異種候補比較を独立の一般責務で接続した。後続の条件付きそだち効果の比較証明で4経路が真正停止し、completed・独立balance標本は0。

[127 R2候補拡張と独立再開](127-r2-candidate-extension.md)では、盤面枚数条件の除外理由と単一対象IDを追加証明し、01-Bの5候補を107/114/116で比較した。126の4停止点から独立再開し、01-Aは次の相手ターンへ、01-Bは無料配置と応答へ進んだ。02-Aは対象なしセカイ配置ID、02-Bは種類の異なる候補の比較証明、01の2経路は能力なしなかまの盤面分類で真正停止した。completed・独立balance標本は0。

[122 通常行動候補契約を適用した独立再開](122-normal-action-seeded-restart.md)では120の4停止state/hashから独立再開し、各現在stateで121の候補完全性を再計算した。122の結果はcompleted 0・rules-stop 4・新decision 8・event 8・snapshot 12・独立balance標本0。保存済み120・121の証拠は変更していない。

121の[通常行動候補の列挙・完全性契約](121-normal-action-candidate-completeness-contract.md)はprotocol-only。120の4停止stateに対し6 source familyと12条件を監査した。121自身では経路を再開していない。

現在は **[120 response-window再開](120-response-window-seeded-restart.md)の保存地点**。117の4 stop artifactを同一state／hash・event seq 3から独立再開し、119のresponse-window契約を適用した。planned 4・completed 0・rules-stop 4・integrity-stop 0、decision 9・event 10・snapshot 14・winner 0・独立balance標本0。`order-01-a-first`は`E-first-date`を支払い、発動者priority、双方pass、解決、1枚ドロー、そだち+5、捨て札移動まで処理した。他3経路は双方passでresponse windowを閉じた。全経路が次の通常行動候補の完全合法性を既存正本だけでは確定できず、`incomplete_legal_candidates`で真正停止した。117・119・116・112の保護対象は変更していない。その通常行動候補契約を121で正本化し、4経路の再開は次checkpointに残す。

履歴上、[119 response-window契約](119-response-window-contract.md)はprotocol-onlyであり、119自身は117の4経路を再開していない。119のplanned 0・completed 0・stopped 0とresponse候補監査を変更せず、120から実対戦へ適用した。

[118 用語移行](118-tokiokuri-terminology-migration.md)で現行参照81ファイル・268件のゲーム用語を暫定名称「ときおくり」へ統一した状態も維持する。名称だけを暫定扱いとし、効果・処理順・数値・発動条件、ID・schema・英語の機械識別子は変更していない。

現行カタログはメイン248・なかま26・こいびと18・あそび100・セカイ13・現行アイテム26・できごと21＝452件（能力なし7を含む）。これは登録477の完成枚数ではない。未登録アイテム12を含み、旧退役24・HOLD・legacyは別管理。95の本文変更3 ID、96の4 ID改稿を維持し、97〜119は変更0 ID。118は用語だけの移行、119はresponse protocolだけの追加で、カード効果・数値・登録区分の変更0 ID。`single` 6群は103〜106で先後各1戦、計12統制記録へ接続した。108の通常意思決定2戦、109の同名2枚6戦、110の盤面併用6戦は固定線completed記録で、独立した強度標本には数えない。113は入場監査、114はprotocol hardening、115はfirst-choice監査だけでcompleted 0件。101の3条件×6群は固定completed記録へ接続済みだが、全24戦を通常の独立対戦へ数えない。

108開始時の最新main実refは `ae0a1254c55ad42217890dd508750f4f63bd486d`（PR #291）。前回`d803677`からの追加は「めぐる」の擬似3D表示で、カードゲーム正本・カードsourceへの変更はなく、本編は未マージ。

106開始時の最新main実refは `d8036775d35f21fc12c20d5bf450e93d3a2e8846`（PR #290）。f23398eから8ファイル変更され、PR #289のアイテムシール・たまご・図鑑UIと、PR #290のたまご購入・予約・取消の1操作化を確認した。カード候補を読む5 sourceのblobは一致し、script.jsだけが変更。現行452件・現行アイテム26・P97-01／02／04のカード定義への変更はなく、本編は未マージ。93時点のc77587b→f23398e差分件数は、実一覧に基づき「7」から「6ファイル」へ訂正した（94 F94-01）。

前の保存は[93 横断・境界監査](93-cross-type-boundary-audit.md)。なかま満員交代の退出先を01へ、たまごと未解決こいびと能力の確認時点を02・06へ明文化し、2048の交換を効果として08・83へ全文化した。32局面を机上確認した記録は保持する。

前の保存は[91 できごと21本文と保留13](91-event-21-card-text-draft.md)・[92 接続監査40局面](92-event-21-text-audit.md)。CARD21は既存6＋新15、未展開0。HOLD13は保留を維持。旧specialRewardTripは削除済みのため現在の特殊地訪問・ログへ接続した。性別・恋愛対象は用いない。

前の保存は[89 セカイ13本文](89-world-13-card-text-draft.md)・[90 接続監査40局面](90-world-13-text-audit.md)。既存4＋新9、通常13。とかい67全文を保持、きおくのみずうみ等を全文化。F89-01でとかいランの集計の混同、F89-02でできごとの参照先を訂正。前3軸の盤面方式は未決定。
保存直前の最新mainは `c77587b7488670d27af1e7f0fdb8a477a386e1c2`（PR #287）。GitHub compareで5d39eeaからの変更8ファイルを確認した。めぐるの景観・世界レイヤー表現と関連記録／テストの更新で、地域マスター・script.js・games.js・world-environment.jsは変更対象外。GitHub root treeでも固定した4 sourceのblob一致を確認した。アイテム・登録13場所・あそび100のsourceは不変で、本編は作業ブランチへ未マージ。snapshotは5d39eeaを保持し、followup_main_checkへ新HEADと根拠を追記する。

前の保存は[87 第5組・残り20本文](87-play-batch-5-card-text-draft.md)・[88 接続監査40局面](88-play-batch-5-text-audit.md)。main `5d39eea915d09be3900d92fa879a9e9f1ecf6091`（#285）の対象81〜100を照合。sourceは一般6・地域10・季節4。通常20、すぐつかう18／しかける2、時1が12／時2が8。地域名の個別条件、準備の翌開始予約、大物探索、二勝負の僅差を分けた。季節4枚に未決定の季節盤面を要求しない。当時の再開先はセカイ13・できごと34。

前の保存は[85 第4組](85-play-batch-4-card-text-draft.md)・[86 接続監査](86-play-batch-4-text-audit.md)。当時80/100。86 F85-01／02では、なかま時0・人物共有1人を再照合し、83どうぶつしょうぎを回収後の山札整理へ、パイプつなぎを「両者が場にいて今ターン片方を通常配置」へ改稿、84へ同期した。基本ルールは維持し、初回監査の見落としを記録した。

前の保存は[83 第3組](83-play-batch-3-card-text-draft.md)・[84 接続監査](84-play-batch-3-text-audit.md)。新19＋既存2048を接続し、当時60/100。五目ならべの減少を既存防止へ接続した。2048は08原文を保持し、支払い・不足時の境界A83-01は全体監査へ残す。

前の保存は[81 第2組20本文](81-play-batch-2-card-text-draft.md)・[82 接続監査40局面](82-play-batch-2-text-audit.md)。登録順21〜40を具体化し、当時の本文あり41/100。精密な勝利条件・装備移動・短期防衛等を保持する。

前の保存は[79 あそび第1組20本文](79-play-batch-1-card-text-draft.md)・[80 接続監査40局面](80-play-batch-1-text-audit.md)。登録100のID・category・source区分を最新mainと照合した記録と本文を保持する。

前の保存は[76 本編アイテム改良へのsource追従](76-item-source-v2-followup.md)・[77 現行26種の本文](77-current-items-card-text-draft.md)・[78 接続監査40局面](78-current-items-text-audit.md)。通常装備10・使い切り12・達成報酬4を、最新mainの定義・使用処理と照合した。名称変更3件、ラッキーコインの即時化、なおとシリーズ4品の効果変更、新しいチケット等を反映。サル本人の装備供給を具体化した。旧A/Bとペーパーの67全文は維持。新旧候補の登録整理・73 V01・75 V02・除去等の供給・実測は残る。

前の保存は[74 こいびと18候補の本文](74-partner-18-card-text-draft.md)と[75 接続監査・40局面](75-partner-18-text-audit.md)。ねこ社長・クモの全文は保持し、にんぎょ・ゆきだるまの省略文を具体化して36・08へ同期。残り14体も全文へ進み、能力本文18、能力なし0。カード側構築区分は全18体とも通常・同名3枚の第1稿として27へ明記した。タコの適正なつけ替え、サボテンとすれちがい等を接続し、交際・結婚・たまご・個体追跡・時の収支を照合。強度・除去やサルの装備供給は未解決で、75 V02にはたまご化と未解決こいびと能力の無効範囲を記録した。73 V01とともに大量プロキシ前に明文化する。

[72 なかま26候補の本文](72-companion-26-card-text-draft.md)と[73 接続監査・40局面](73-companion-26-text-audit.md)。既存6＋未展開20を具体化し、能力25＋はこの能力なし1。カワウソ・サル・たぬきの全文は保持し、ふくろう・ハリネズミ・カタツムリの省略文を全文化して35・08へ同期した。ペンギンのセカイ変更後の装備引受で、ヤドカリ②④への実在するつけ替え経路を接続。強度・操作密度・サルへの装備供給等は未検証。73 V01に、満員交代で去るなかまの行き先が初期01にも未記載であることと、明文化候補を記録した。01は今回変更していない。

[71 メイン248枚の本文横断監査](71-main-248-card-text-cross-audit.md)ではカブト②・ヤドカリ②④・いぬ⑥・かえる⑥の5本文を整理し、れんくん8枚はカード側通常・各同名3枚の第1稿として明記。追加32局面を机上照合した。山札操作密度・低段階の高い値・？？？⑦の二方向の強さも実測課題として残す。

[70 既存6代表の本文展開・56局面](70-representative-six-lines-completion.md)で48枚の全文（新規42＋既存6）を保存し、[68 ほし／？？？16枚](68-mystery-two-lines-card-text-draft.md)・[69 36局面](69-mystery-two-lines-text-audit.md)と合わせて未展開58枚を具体化した。能力本文242枚＋能力なし6枚、未展開0枚。裁定完備・大量模擬・強度確定を意味しない。

公開情報・発動文の修正は[62](62-public-information-and-activation-text-fixes.md)。61のU01・U06を、表向きのプレイ／盤面参照、探索の公開、発動した能力の解決時の実適用、対象・選択の明記で修正した。メイン26枚＋カワウソ・あたらしいであいの28候補が対象。能力の成立範囲を調整しており、強度の再試験は残る。

通常行動・支払い・反応は[63](63-action-payment-response-proposal.md)。カブト④を支払い時の任意軽減と移動終了後の禁止へ改稿し、15・31・08を同期。さけ③⑦の通常セカイ配置、ヒトデ⑤のアクション軽減を明記し、シルクハットの支払い時点を注記した。個別処理19局面と共通手順8局面を整理し、第4節は2026-09-14にユーザーの「確定で」により採用した。

[64 開始／終了・予約・勝利判定](64-turn-boundaries-and-victory-timing.md)では初期01の開始順を復元し、自分の時回復→通常ドロー→たまご交換→予約→誘発・反応、終了前の反応→終了予約・誘発・反応→期限切れ→判定へ接続した。01・02・06へ反映し、23の③は本文を維持して残り時の確認時点を注記。28局面を手作業で照合した。

[65 ちょうせんの参加個体・本文表記と終了](65-challenge-participants-and-resolution.md)。おとこのひと⑥・ヒトデ⑥・フェニックス⑤の自分から／受ける時を明記し、ぬいぐるみ⑦とともに4カードを改稿。15・54・08へ反映し、02へ表記を接続した。共通裁定は2026-09-14のユーザー提示文「これで」により確定し、01・02・06へ反映済み。**勝負は宣言時に開始し、比較前の参加メイン離脱で途中終了する。宣言回数・支払済みコストは戻さず、適用済みの終了時・終了後効果は条件どおり処理する。比較・勝敗の成立が必要な効果は、途中終了では働かない。** 初回36＋追加6の42局面を机上確認し、「終了」と比較・結果決定を経た「完了」を区別した。

[66 交際0開始・誘発と本編恋愛情報との分離](66-relationship-start-and-romance-profile.md)では、01の0開始に旧05を合わせ、0→1・1→2・2→3は進行時、3→結婚は結婚時として01・02・05・06へ接続。ねこ社長・おはなの本文を08・36・37へ同期した。ユーザー確定文により**固定情報方式は不採用。各メイン・こいびとに性別・恋愛対象を割り当てず、交際成立条件にも使わない。必要な組み合わせ条件だけ個別のカード能力へ明記する。** 本編の恋愛実装は資料として保持し、カード側へ移植しない。初回21＋確定後6の計27局面を机上確認し、列挙したU05は対応済み。

[67 旧A/B試験カードの機能・追跡・コピー・使用枚数](67-legacy-test-card-function-and-tracking.md)。クモの次の準備プレイ軽減、トイレットペーパーの除去発動への反応、サクラ⑥／たぬきの発動に伴う領域移動の追跡、サルの能力取得と別発動、とかい固有の2枚集計を明文化した。次回試験用Bはたぬき1枚を2枚目のふくろうへ差し替え、旧B40枚と対戦ログは保存。列挙したU07へ対応し、46局面を机上照合した。全カードの裁定完備・強度確定やA/Bの再対戦ではない。

**以下は91以前の再開メモ。できごとCARD21は91で本文接続済み、現行の供給監査は94〜96を参照する。** 本編アイテム改良はユーザー連絡後に76〜78へ反映済み。旧24の採否・新12の正式登録・シール商品のカード化単位は区別して整理する。当時未解消だった相手メイン除去、ゆきだるま、73 V01・75 V02は後続93〜96へ接続済み。U05の性別・恋愛対象を使わない方針、63〜65の確定事項は再質問しない。

作業ブランチは `design/card-pool-master-20260914`、[Draft PR #259](https://github.com/Naoto214/naotocchi/pull/259)。再開時は保存されたHEADを実際に照合し、正本の現在地を優先する。

## 本編アイテム改良への追従（確認・反映済み）

2026-09-17、ユーザーから「アイテム改良しました、最近のアイテムを確認してから続けてください」と連絡を受けた。main 4ed128d31405267e4ee032fe36fbb589b4bc634b（#286マージ後）のアイテム実装と、#274・#281・#284・#286の履歴を確認した。通常装備10・使い切り12・達成報酬4の現行26、旧38との14共通／24退役／12新規を76に記録し、77に全文、78に40局面を保存した。本編は作業ブランチへ未マージ。

保存直前の最新mainは `5d39eea915d09be3900d92fa879a9e9f1ecf6091`（PR #285、ミニゲーム調整）。4ed128dとの差分9ファイルとscript.jsの変更を確認した。固定した7 sourceのうち6ファイルのblobは同一で、script.jsもゲーム説明・操作ヒントの区間外はテキストが一致し、アイテム定義・処理の変更はない。source snapshotは4ed128dを保持し、追加確認をJSONのfollowup_main_checkに記録した。あそび本文の展開時には最新ゲーム実装を改めて参照する。

登録済み477はこれまでの母集団で、現行本編アイテム総数ではない。旧24の記録を保持し、新12は未登録sourceの本文案として別管理する。CATALOG27（テーマシールパックを含む）と画像27（通常シールパックを含む）も同じ集合ではない。シール商品のカード化単位は未確定。旧A/B・legacyを黙って削除せず、今後の実際の変更にも同じ手順で追従する。

## 全体プールと保留事項

登録済み母集団は **477候補 = CARD 463 + HOLD 14**。できごとは34候補（21/13）。これは完成カード数・発売枚数ではない。未展開のじかん・てんき・きせつ等はまだ総数に含めない。31の16枚はメイン248候補の内数なので総数は増えない。

| 棚卸し区分 | 候補数 | 現在の扱い |
|---|---:|---|
| メイン | 248 | 31種×8段階。全件に本文案または能力なしを指定。強度は未確定 |
| なかま | 26 | 72で能力本文25＋能力なし1、73で接続監査第1周。強度は未確定 |
| こいびと | 18 | 74で能力本文18、75で接続監査第1周。通常18・同名3の第1稿。強度は未確定 |
| あそび | 100 | 一般86＋地域10＋季節4。79〜88で本文あり100、未展開0。全裁定・強度は未確定 |
| あいてむ（初回登録） | 38 | 現行sourceと共通14は77で全文、退役source24は履歴保持。別に未登録source12の全文案 |
| できごと | 34 | 91でCARD21本文、92で接続監査。HOLD13は保留を維持 |
| ばしょ | 13 | 89で13本文・未展開0、90で40局面。通常13の第1稿、強度・裁定は未確定 |

77の現行26本文は、上表のあいてむ38すべてを完成させた意味ではない。既存14＋未登録12であり、退役source24は全文化し直していない。旧A/Bで試した本文も保持する。

- [33](33-world-four-axis-inventory.md)で **じかん4 → てんき4 → きせつ4 → ばしょ13** のsourceを整理済み。じかん／てんき／きせつを、ばしょと同じ盤面のセカイカードにするかは未決定。カード総数・盤面を勝手に確定しない。
- `E-naoto`、表示名「なおと」、暫定種類「できごと」は候補として維持。
- [32](32-play-source-map.md)・[39](39-play-100-role-draft.md)のあそび100本の対応と役割を維持。2048は現行sourceへ接続済み。スノーボード／うそつきしょうぶ／キャッチボール／かくれんぼはlegacy候補として履歴を残し、現行sourceがないだけで削除しない。
- 65確定反映時に確認した最新mainは `bf0ee0c56fad251464241f2e87e801ecdd7286d9`（PR #262）。先のPR #261で追加されたquickは内部15→30種へ増え、`quick-run` に加えて単独モード `quick-solo` も追加された。32・39の未棚卸しsource記録を更新。従来の100本は維持され、新sourceのカード化単位・役割は未登録で477のCARD/HOLDへ自動加算しない。作業ブランチへ本編変更は未マージ。最新mainと異なるscriptのquick接続を確認し、今回のちょうせん裁定への影響はない。
- 66のユーザー確定反映時の最新mainは `16a053397bf4ceb516e2e8bab20ee7ed43ca0698`（PR #263）。前回mainとの差分を確認し、quick内部30→50種、読み上げ・単独一覧等の変更を32・39へ追記。恋愛処理・アイテム処理、キャラクター／環境マスター・`games.js` は前回確認から変更なし。追加20内部IDも未棚卸しsourceで、100本・477候補には未加算。本編は作業ブランチへ未マージ。
- 68再開時に確認した最新mainは300d2aeeb93e61b6b2ff586e7a4ee83ab897c89b（PR #264）。前回との差分7ファイルはquickの音声・表示等。キャラクターマスター・script.js・games.js・world-environment.jsは変更なし。quick内部50種の未棚卸し状態、100本・477候補、本編未マージを維持。
- 71で確認した最新mainは`3ec3a9ba030999a15a34b93d35bc6405ff676ed1`（PR #265・#266）。300d2aeからの23ファイル差分は全画面ムービー・鏡の⑧表示・指輪配置等。script.jsと本編仕様書の実差分も読み、アイテム定義・交際成立判定の変更ではないことを確認。キャラクターマスター・games.js・quick.js・world-environment.jsはこの比較で変更なし。E-mirrorとquickの未棚卸し状態を保持し、本編変更は未マージ。
- 72再開時もmainは同じ`3ec3a9b`、作業ブランチは71保存の`3b312b5`。実ref・PRを確認し、本編マスターの通常18／レア8なかまと実装の登場文を読み直した。アイテム改定やquickの追加登録は行っていない。
- 74再開時もmainは同じ`3ec3a9b`、作業ブランチは72・73保存の`3cbbf58`。実ref・PRと本編18件を確認し、マスター全体・恋愛主要5区間が確認mainと作業ブランチで一致。アイテム改定やquickの追加登録は行っていない。
- 74・75保存直前の最新mainは`3780497b8a9fc7e72a651ba6206543e47314f89d`（PR #268）。3ec3a9bからの11ファイル差分は「めぐる」の散策画面・住民台帳・本体接続等。マスター・恋愛主要5区間・アイテム定義に変更なし。games.js・quick.js・world-environment.jsも不変。32・39へ未棚卸しsourceとして記録し、100あそび・477候補へ未加算、E-naoto表示「なおと」・本編未マージを維持。
- 76〜78で確認した最新mainは4ed128d31405267e4ee032fe36fbb589b4bc634b（#286）。アイテムV2・なおとシリーズの確定効果・画像統一を実装から照合。source snapshotと現行26本文を保存。本編変更は未マージ。あそび100・quick・めぐるの登録をこのアイテム追従へ混在させない。
- 第0弾は72〜80種、現状80種寄りの未確定案。全体プールから後で選抜する。

## 本文設計の進捗

| 正本 | 現在地 |
|---|---|
| [34](34-full-pool-role-map-1.md)〜[40](40-place-13-role-draft.md) | 全種類の役割地図。完成本文と混同しない |
| [41](41-main-31-species-life-theme-map.md)〜[49](49-mystery-two-lines-first-pass.md) | 全31種の同属性差別化・人生テーマ・仮数値の第1周 |
| [50](50-main-248-numeric-cross-audit.md) | かめとの同一曲線を避け、ヤドカリをちえ寄りへ修正。現行31種で完全同一の8段階数値曲線なし |
| [51](51-human-woman-ren-card-text-draft.md) | おんなのひと／れんくんの各8枚の本文 第1稿 |
| [52](52-beast-cat-card-text-draft.md) | ねこ8枚の本文 第1稿 |
| [53](53-waterside-three-lines-card-text-draft.md) | ペンギン／かめ／さけの各8枚の本文 第1稿 |
| [54](54-ocean-four-lines-card-text-draft.md) | ヤドカリ／クラゲ／ヒトデ／サンゴの各8枚の本文 第1稿 |
| [55](55-insect-three-lines-card-text-draft.md)・[56](56-insect-three-lines-text-audit.md) | ちょう／セミ／アリジゴクの各8枚の本文 第1稿と局面監査 |
| [57](57-plant-four-lines-card-text-draft.md)・[58](58-plant-four-lines-text-audit.md) | タンポポ／ハエトリグサ／キノコ／世界樹の各8枚の本文 第1稿と局面監査 |
| [59](59-fantasy-three-lines-card-text-draft.md)・[60](60-fantasy-three-lines-text-audit.md) | りゅう／かみさま／おばけの各8枚の本文 第1稿と局面監査 |
| [61](61-full-rules-and-card-text-audit.md) | 01〜60・代表稿・本編sourceの全体点検。修正済みF01〜F06、未解決U01〜U08、再検証の局面と読取専用検査 |
| [62](62-public-information-and-activation-text-fixes.md) | 61記載のU01・U06を個別本文へ反映。28候補の公開情報・発動・対象等を修正し、25局面を確認 |
| [63](63-action-payment-response-proposal.md) | U02のメイン4本文を改稿し、帽子の支払いを注記。19局面と共通手順8局面。行動機会・反応手順は確定、01・02・06・07へ反映済み |
| [64](64-turn-boundaries-and-victory-timing.md) | U03の開始／終了・予約・期限と勝利期限を確定し、01・02・06へ反映。28局面 |
| [65](65-challenge-participants-and-resolution.md) | U04の個別4本文を改稿。途中終了と終了／完了の区別をユーザー提示文で確定し、01・02・06へ反映。42局面 |
| [66](66-relationship-start-and-romance-profile.md) | U05対応。0開始・進行・結婚を接続し、性別・恋愛対象をカードへ割り当てず交際条件にも使わない方針を確定。ねこ社長・おはなを同期、27局面 |
| [67](67-legacy-test-card-function-and-tracking.md) | U07の6本文を改稿し、次回試験用Bはたぬき→ふくろう2枚目へ。旧A/Bと対戦ログを保持し、46局面を机上照合 |
| [68](68-mystery-two-lines-card-text-draft.md)・[69](69-mystery-two-lines-text-audit.md) | ほし／？？？各8枚の本文第1稿と36局面。49の数値を維持し、2枚は能力なし |
| [70](70-representative-six-lines-completion.md)・[representatives](representatives/README.md) | 既存6代表48枚の全文（新規42＋既存6）と56局面。Aの3省略本文を完全化、本編形態の対応を整理 |
| [71](71-main-248-card-text-cross-audit.md) | 全248本文の横断監査第1周。5本文を個別改稿、れんくん通常・同名3を明記。追加32局面と実測へ残す課題 |
| [72](72-companion-26-card-text-draft.md)・[73](73-companion-26-text-audit.md) | なかま26候補の全文（能力25＋なし1）と40局面。既存6体のうち3省略文を全文化し、35・08と同期 |
| [74](74-partner-18-card-text-draft.md)・[75](75-partner-18-text-audit.md) | こいびと18候補の全文と40局面。既存2全文を保持、2省略文を具体化して36・08と同期。通常18を個別割当し、たまご化と未解決能力のV02を記録 |
| [76](76-item-source-v2-followup.md)・[77](77-current-items-card-text-draft.md)・[78](78-current-items-text-audit.md) | 改良後の本編26種（登録14＋未登録12）の全文と40局面。旧24の退役source履歴、名称3件・報酬4品等の更新、サルへの装備供給を接続 |
| [79](79-play-batch-1-card-text-draft.md)・[80](80-play-batch-1-text-audit.md) | あそび新20本文と40局面。既存2048を含め21/100、残79。最新main #285のsource100を照合し、ケーキ／おべんとうの役割説明を訂正 |
| [81](81-play-batch-2-card-text-draft.md)・[82](82-play-batch-2-text-audit.md) | 登録順21〜40の新20本文と40局面。既存2048を含め41/100、残59。そうこばんの押す方向とコネクトフォーの4種類参照を具体化 |
| [83](83-play-batch-3-card-text-draft.md)・[84](84-play-batch-3-text-audit.md) | 41〜60番の新19＋既存2048、40局面。本文あり60/100・残40。探索差別化とそだち減少の供給、2048境界の追従事項A83-01 |
| [85](85-play-batch-4-card-text-draft.md)・[86](86-play-batch-4-text-audit.md) | 61〜80の20本文と40局面。本文あり80/100・残20。83の人物時0／共有1人の不整合2件を個別改稿 |
| [87](87-play-batch-5-card-text-draft.md)・[88](88-play-batch-5-text-audit.md) | 81〜100の20本文と40局面。登録あそび本文100/100・未展開0、地域／季節sourceの接続と残る監査 |
| [89](89-world-13-card-text-draft.md)・[90](90-world-13-text-audit.md) | セカイ13本文・40局面、08／40同期。とかいランの集計とできごと参照先を訂正 |
| [91](91-event-21-card-text-draft.md)・[92](92-event-21-text-audit.md) | できごとCARD21本文・40局面、HOLD13維持。08／38同期、旧旅報酬sourceの追従 |
| [93](93-cross-type-boundary-audit.md) | 横断監査第1段階。V01・V02・A83-01を明文化、32局面、現行カタログ452件の範囲を区別 |
| [94](94-removal-defense-supply-audit.md) | 実在する除去・防御の供給、要追従17 ID、40局面。現行とlegacyの対象供給を分離、前回main差分件数を訂正 |
| [95](95-removal-supply-first-revisions.md) | りゅう⑥・クワガタ⑥・ボウリングの個別改稿、実在32局面。13 IDに実適用経路を接続し、期限不一致・未供給を継続管理 |
| [96](96-removal-defense-deadline-revisions.md) | ペンギン⑦・タンポポ④・ゆきだるま・ハイウェイドライブの期限／行先を個別改稿、実在28局面。95の未接続4 IDを既存供給へ接続 |
| [97](97-role-density-and-efficiency-audit.md) | 現行452件の役割密度・山札操作・予約・時収支・反復効率を分類、32局面。本文変更0件で大量プロキシの優先6群を固定 |
| [98](98-proxy-pool-layers-and-replay-schema.md) | 新12・旧24・HOLD14・legacy4の採否層と再現記録schema v1を固定。40枚×2人の未実施fixtureで入力形式を検査、本文変更0件 |
| [99](99-proxy-record-validator.md) | schema v1の開始入力・参照・状態hash validatorと8テスト。再登場時の新個体生成は未対応として分離、本文変更0件 |
| [100](100-card-copy-and-instance-identity.md) | 物理カードIDとゲーム個体IDを分離し、再登場transition・旧個体予約の非移行を12テストで固定。本文変更0件 |
| [101](101-priority-proxy-fixture-suite.md) | P97-01〜06を単独・同名2枚・盤面併用の18未実施fixtureへ固定。決定論的生成・7テスト、本文変更0件 |
| [102](102-single-seat-mirror-fixtures.md) | 101の単独6件をA後手／B先手へ座席だけ反転。デッキ順・初手・現物／個体IDを完全維持、計12テスト、本文変更0件 |
| [103](103-controlled-p97-03-pilot.md) | P97-03先後2 fixtureを統制completed記録へ固定。各41 event・42 snapshot、状態hash連続と再生成を6テストで検査。強度・先後差の結論ではなく、本文変更0件 |
| [104](104-p97-06-reservation-pilot.md) | P97-06先後2 fixtureの既存40枚を順序だけ派生し、予約の消費・R10後失効をcompleted記録へ固定。43／42 event・44／43 snapshot、8テスト。強度・先後差の結論ではなく、本文変更0件 |
| [105](105-p97-05-reentry-pilot.md) | P97-05先後2 fixtureの既存40枚を順序だけ派生し、満員交代→回収→通常再配置をcompleted記録へ固定。各46 event・47 snapshot、`#1→#2`各1回、8テスト。架空予約なし、本文変更0件 |
| [106](106-remaining-single-pilots.md) | 残るP97-01／02／04の先後6 fixtureをcompleted記録へ固定。交際0、同ターン終了予約、とかいランの異種2枚取得を42／46 eventで記録、7テスト。本文変更0件 |
| [107](107-normal-decision-match-protocol.md) | 通常意思決定の候補列挙・優先順位・理由語彙・停止条件・評価項目を固定。既存A/B各40枚と先後鏡像を保つ未実施fixture 2件、8テスト。completed対戦0、本文変更0件 |
| [108](108-normal-decision-match-pair.md) | 107の先後2 fixtureを通常意思決定completed記録へ接続。46／45判断、67／66 event、A 45対35／40対35。独立した強度標本0、本文変更0件 |
| [109](109-same-name-two-pilots.md) | 101の同名2枚6群をA先手completed記録へ接続。全群で別現物2枚、予約2本の重複と再登場2回を追跡。新規7テスト、独立した強度標本0、本文変更0件 |
| [110](110-board-combination-pilots.md) | 101の盤面併用6群をA先手completed記録へ接続。最大同時予約3、未登録source別stratum、構造的入力不足6件を分離。新規7テスト、独立した強度標本0、本文変更0件 |
| [111](111-structural-gap-disposition-and-repetition-scope.md) | 110の不足6件を短期対象2・段階経路4へ分類し、112の追加fixture要件と禁止する近道を固定。通常意思決定は初期順2組×先後鏡像の4戦を初回バッチとする。fixture・completed 0件、本文変更0件 |
| [112](112-targeted-structural-gap-fixtures.md) | 111の不足6件を現行452内の未実施fixture 6件へ固定。各40枚・7種類、card copy／initial instance IDを保持し、event空・winner null。completed・独立標本0件、本文変更0件 |
| [113](113-normal-decision-admission-audit.md) | 通常意思決定4戦の入場監査。候補範囲・nested schema・優先順位比較の3 blockerで111停止条件を適用。fixture／completed 0、予定4戦はdeferred、112の6 fixtureは未実施、本文変更0件 |
| [114](114-normal-decision-protocol-hardening.md) | 113の3 blockerを41 ID手動候補表、strict nested schema／公開情報whitelist、時収支・Pareto停止を含む比較contractで解消。fixture／completed／trace／独立標本0、4戦は115へdeferred、本文変更0件 |
| [115](115-normal-decision-first-choice-audit.md) | seed付きshuffleで独立初期順2組の全40枚manifestを固定し、先後鏡像4経路へ適用。全経路がR1たまご交換選択で停止し、3経路の時0人物対passもdownstream evidenceへ保存。対戦成果物・独立標本0、本文変更0件 |
| [116](116-normal-decision-fallback-contract.md) | 通常行動外の複数選択を`mandatory_choice`へ拡張し、SHA-256 moduloの判断単位seed抽選と安全な無料盤面化を固定。対戦成果物・独立標本0、112の6未実施fixtureと115の4停止経路を維持、本文変更0件 |
| [117](117-normal-decision-seeded-restart.md) | 同じ固定manifestで4経路を再生し、R1 mandatory choice・安全配置後の応答contract不足で全経路停止。completed 0・stopped 4・独立balance標本0、stop 4件とevaluationを保存。専用24件・全proxy 190件、112未実施と452／477／変更0 IDを維持 |
| [118](118-tokiokuri-terminology-migration.md) | 現行参照81ファイル・268件のゲーム用語を暫定「ときおくり」へ統一。効果・処理・数値・条件、ID・schema・英語識別子、117の再開地点を維持 |
| [119](119-response-window-contract.md) | response専用phase adapter、`response-pass`、4停止状態の完全候補集合、06準拠遷移、synthetic seed proofを正本化。protocol-onlyで対戦進行0、117 stop 4件・116・112未実施6件を維持。専用31件・全proxy 221件 |
| [120](120-response-window-seeded-restart.md) | 117 stop 4経路を同一state／hashから独立再開。119契約でresponseを解決後、通常行動候補の完全合法性不足により4経路とも真正停止。completed 0・rules-stop 4・decision 9・event 10・snapshot 14・独立標本0。専用42件・全proxy 263件 |
| [122](122-normal-action-seeded-restart.md) | 120の4停止点を同一state/hashから独立再開。121完全性を毎回再計算し107/114の比較で通常`pass`を選択。119反応後、未確定の終了処理で4経路真正停止。新decision 8・event 8・snapshot 12、completed・独立標本0 |
| [123](123-turn-end-completeness-contract.md) | 122の4停止点を横断監査。01/06/64の終了6手順についてsource inventory・12条件・独立validatorをprotocol-onlyで正本化。4経路再開なし |
| [124](124-turn-end-provenance-restart.md) | 117〜122保存履歴で123を独立再証明し、4経路を次の卵交換まで独立再開。121の空盤面familyに除外理由がなく4件真正停止 |
| [125](125-normal-action-extension.md) | 空盤面familyと117人物配置IDを一般契約で接続。4経路を人物配置・応答・通常passまで再開し、現在履歴provenanceで4件真正停止 |
| [126](126-current-turn-end-correction.md) | 125終了窓の不整合を125非変更の訂正証拠で記録。現在履歴から123を再証明しR2判断入口まで進行。3件候補不完全、1件選択証明不足 |
| [127](127-r2-candidate-extension.md) | 盤面枚数の除外と単一対象IDを追加、01-Bの完全5候補を比較し4経路再開。新decision 9・event 11・snapshot 15、completed・独立標本0。新たな3種類の不足で4件真正停止 |
| [128](128-r2-candidate-extension.md) | 盤面能力分類、対象なし・variant付きID、02-B異種候補比較を独立接続。127から4経路再開し条件付き効果の未証明点で真正停止 |

メイン本文案は**248枚、未展開0枚**。51〜59の160＋68の16＋既存6代表48＋おとこのひと／カブト／クワガタ24＝248。代表48にはA採用6枚を含むので再加算しない。能力本文242枚と能力なし6枚を区別する。数値曲線・通常時を維持し、15第2稿＋個別改稿、23第3稿、65のフェニックス⑤・ぬいぐるみ⑦、67のサクラ⑥を保持。いぬ②・かえる③・カクレクマノミ④の70全文を08へ同期した。全件の詳細裁定完備・非アート凍結ではない。

既知の同一本文 **かめ③／さけ②、クラゲ①／サンゴ①** は61で差別化し、53・54へ反映済み。完全同文の解消は、意味上の重複や強度まで解決した意味ではない。むしの手札交換・一戦補助・予約管理は56、くさの循環・反復への無効化・多種類条件は58、げんそうの蓄え・救済・捨て札能力・保護の重なりは60、全体の未裁定は61に残した。

## 読む順番と優先順位

1. 最新main・作業ブランチ・PR #259を実際に確認し、このREADMEと[25](25-full-card-pool-development-plan.md)、最新の番号付き正本で現在地を確認する。
2. [01 基本ルール](01-core-rules.md)、[02 メインシステム](02-main-system.md)、[06 アクション／連鎖](06-action-chain-checkpoint.md)、[07 高度ルール](07-advanced-rules-checkpoint.md)で確定ルールを確認する。必要な詳細が過去コミット参照の場合は、その履歴まで読む。
3. [03 設計原則](03-design-principles.md)、[04 代表テスト](04-representative-tests.md)、[representatives索引](representatives/README.md)、[05 横断監査](05-horizontal-audit.md)でテーマと既存試行を確認する。
4. 08〜19でテストデッキA/Bと模擬履歴、[20](20-set-zero-pool-sizing.md)で第0弾規模、21〜24でアート／生態基準と近縁差別化を確認する。
5. 26〜40で全体プール・source接続・役割地図、41〜50で31種のテーマと数値、51〜最新番号で具体本文と監査を読む。継続引き継ぎでは01〜最新番号を確認し、古い要約だけで省略しない。
6. その論点に関わる本編の最新マスター・実装・アート仕様を読む。特に `character-world-master.v1.js`、`script.js`、`games.js`、`world-environment.js` を論点に応じて照合する。古いコメント・削除済みIDだけを根拠に現行仕様を推測しない。

**ファイル番号の大小だけで優先稿を決めない。** 基本ルールは01・02、アクション／連鎖は06・07、個別カードは改稿状態と根拠を確認する。

特にカブトは[15 第2稿](15-test-deck-b-main-16-draft.md)、クワガタは[23 第3稿](23-stagbeetle-first-pass.md)が現行の移植元。62のカブト⑧の対象語彙、63のカブト④のコスト処理改稿は15・31・08へ同期済み。71のカブト②の当ターン到達条件は15・31へ同期済み。[24](24-beetle-vs-stagbeetle-simulation-1.md)はクワガタ第2稿から問題を検出した記録で、第3稿より新しいカード本文ではない。31はこの2稿をM-IDへ接続した管理文書で、移植自体による能力再設計はしていない。後続の個別改稿は各監査の根拠を読む。

07の省略されていた高度裁定は[94084f9の07本文](https://github.com/Naoto214/naotocchi/blob/94084f9b2170657dfc65728ff5f7ce7fc34c4608/docs/card-game/07-advanced-rules-checkpoint.md)から現行07へ復元済み。08の省略されていたA本文も復元した。06等の後続裁定を維持し、過去稿だけで最新裁定を上書きしない。旧監査の「破綻なし」「凍結」は当時の範囲に限られ、61の未解決事項を解消した扱いにしない。

## 維持する基準

確定事項は、模擬対戦等で明確な破綻が確認されない限り理由なく変更しない。変更が必要なら、問題 → 原因 → カード調整で直せないか → 最小限の基本ルール変更、の順で検討する。

メインの通常時コストは **①=時1〜⑧=時8**。暫定名称「ときおくり」は同種族の後段階への差分時、へんしんは別種族の変身先段階の通常時。たまごはデッキ外。盤面は3×3、メインは上段中央。8属性・ちから／ちえ・8段階はメインのみ。

デッキは40枚固定。7種類はメイン／なかま／こいびと／セカイ／あそび／あいてむ／できごと。通常ちょうせん勝利はそだち+5、条件付き能力の追加+5は可。時軽減は0まで。「1ターンに1回」はカード個体ごと、同名全体制限は本文に明記する。適用済みの期限付き／遅延効果は発動元が離れても指定期限まで残る。

A/Bは[19](19-test-decks-a-b-cross-audit.md)の比較基準として保持する。カブト⑦は10/4・能力なし、クワガタ⑦は9/5・条件付きの反撃と追加そだち。棚卸しの都合で作り直さない。

第0弾72〜80種（80種寄り）は全体プールから選抜する方針で、最終枚数は未確定。CARDは設計対象、HOLDは保留候補で、どちらも最終効果・収録を確定した意味ではない。イラストはPROXYを維持する。

## 代表テストと履歴の扱い

8属性の代表第一周は完了済み。ひと＝おとこのひと、けもの＝いぬ、みずべ＝かえる、うみ＝カクレクマノミ、むし＝カブトムシ、くさ＝サクラ、げんそう＝フェニックス、ふしぎ＝ぬいぐるみ。今後も代表テストは1属性1ファイルを維持する。

過去の試行錯誤・旧チェックポイントを消さない。ただし、その末尾の「次の作業」は当時の記録であり、現在の再開地点はこのREADMEと最新の本文・監査を優先する。確定ルールや個別カードの優先稿を、番号だけで上書きする意味ではない。

## この後の順序

U01・U06は62、U02は63、U03は64、U04は65、U05は66、U07は67で列挙事項へ対応済み。個別本文を現行稿として保存したことと、実戦の強度確定を区別する。

1. 本編アイテム改良は76〜78へ反映済み。現行26本文を土台に、新12の正式登録・旧24の採否・シール商品のカード化単位を区別して整理する。サルへの装備供給は具体化し、除去と関係終了の起点は継続する。
2. あそび100は87・88までで本文接続済み。セカイ13も89・90で接続済み。できごとCARD21も91・92で接続済み、HOLD13は保留を維持。次は全種類横断監査。93で2048を08・83へ全文化し、旧原文は93と履歴に保持。73 V01・75 V02も01・02・06へ接続済み。これを全種類の裁定完備とは扱わない。
3. 95の未接続4 IDは96で既存供給へ接続し、97で全452件の役割重複・山札操作／予約密度・時収支・反復効率を分類した。98で採否層とschema v1、99で開始入力・参照・状態hash validator、100で物理カードIDと再登場個体IDの分離・予約の非移行、101で優先6群×3条件の18未実施fixture、102で単独6件のA後手鏡像を固定した。103でP97-03、104でP97-06、105でP97-05、106で残るP97-01／02／04を先後completed記録へ固定し、`single` 6群12統制記録を揃えた。105のsingleには実在する対象予約がないため架空予約は作らず、100の非移行unit testを維持する。107で通常意思決定の手順と未実施先後2 fixtureを固定し、108でその2戦をcompleted記録へした。109で同名2枚6群をA先手completed記録へ接続し、別現物2枚、予約の重複、再登場を追跡した。110で盤面併用6群をA先手completed記録へ接続し、最大同時予約3と、固定40枚で届かない6効果を構造的入力不足として分離した。111で不足6件を短期対象2・段階経路4へ分類し、112で現行452内の未実施fixture 6件へ固定した。113は通常意思決定4戦の前に3 blockerを検出し、fixture・completedを作らず停止した。114で対象41 IDの手動候補表、strict nested schema／公開情報whitelist、passを含む107順序の比較contractを固定して3 blockerを解消した。115で固定seedから全40枚manifestを作り4経路へ適用したところ、すべてR1たまご交換選択で停止し、3経路には時0人物対passの二次blockerも確認した。116で通常行動外の複数選択を`mandatory_choice`へ拡張し、比較不能な完全候補集合へ判断単位のseed抽選を固定した。安全な時0人物配置は`pass`より上位とし、複数候補はseed抽選へ送る。117で4経路を再生し、completed 0・stopped 4・独立balance標本0を保存した。R1たまご交換と安全配置を通過した後、応答窓の候補／phase／stable ID contract不足で停止した。118ではゲーム用語を暫定「ときおくり」へ統一しただけで、この進行状態を変更していない。119でresponse-window契約を正本化し、4経路の最初の候補集合を監査したが、117の4経路は再開していない。専用31件・全proxy 221件を固定し、次checkpointで同じstop artifact・state・hashから4経路を独立再開する。先に112へ進まず、112の6未実施fixture、117 stopped 4、116 fallback contractを保持する。カード効果・数値・登録区分の変更は0件である。Aは現行08、Bの新しい試験は67の1枠改訂を識別して使い、旧試行と分ける。第0弾の選抜案も検証する。
4. 非アート部分を凍結。
5. 最後にカード専用イラスト。

大きなゲームルール・世界観・カード総数の確定・盤面構造の変更が必要な場合だけ確認する。それ以外の本文作成や点検は、正本を検索して安全に進める。

区切りごとに正本へ保存し、次の論点へ入る前に保存後の最新版を読み直す。
