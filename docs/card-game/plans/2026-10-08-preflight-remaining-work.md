# 400戦 preflight残課題台帳

基準: aeeca7f0f21e583355401467269d12738f73cd0e / tree5641cee980ce9119bdb19c71fc9dba514dfaf7b4。2026-10-08開始時live exact-ref一致、PR259 Draft/open/unmerged。変更はdocs/card-game内。

**preflight-ready=false。** この台帳の分類は作業順と完了条件であり、既存admissionの未証明を解除しない。生成準備完了、生成/固定の承認、完全manifest保存、400戦開始承認は別の段階。今回、生成・固定・本番対戦は一切行わない。

## 判定基準

- **必須**: preflight-ready宣言前に実装・条件付きfixture検証・入口結合が必要。実際の本番値やユーザー承認は生成/開始の各最終確認へ残す。
- **条件付き**: 107固定80枚から到達可能なら必須。除外するには正本・状態生成/遷移に基づく到達不能の証明が必要。静的カード一覧や過去試走に現れないだけでは免除不可。
- **本番開始後可**: 事前に仕様と保存方法が確定しており、実結果がなければ評価できないもの。実装不足をこの分類へ逃がさない。

## 全体一覧

| ID | 分類 | 現状・既存接続先 | 完了条件 |
|---|---|---|---|
| P01 | 必須 | 次勝利消費81: f7dc4d1で供給遷移の監査保存済み | 実compare経路で差2/他差、引分、中止、敗者、別対象、複数効果、成長100を検証。消費と追加報酬を分離し不正receipt/残存を拒否 |
| P02 | 必須 | 挑戦終了65: f7dc4d1で供給遷移の監査保存済み | 閉じた終了入口・結果一致、当該challenge stat全消去、turn stat/条件報酬/その他状態保持を実finishと改変テストで検証 |
| P03 | 必須 | 通常main移動時の対象離脱07: f7dc4d1でtransform監査保存。再登場のreceipt結合とbirth/time_skip枝も検証済み。歴史起点は別gate | 旧対象stat/conditional消去、他対象と次回変身の別寿命を保持。birth/time_skip/transform、再登場個体との結合を区別 |
| P04 | 必須 | typed効果生成: 既存10routeの生成行/不生成/保持/receipt監査を全eventへ接続。activation/choice/全効果意味は別gate | 全生成routeのsource/actor/target/parameter/時系列/一意ID/正本数値/実差分を実入口に結合。生成しない条件と外側の効果保持も証明。receipt存在だけで認証しない |
| P05 | 必須 | payment/stat/conditionalのその他消費: source74同一partner交際軽減の消費を接続。対象外eventのfamily別保存則も接続。歴史起点/全効果意味は別gate | 現行scopeの全descriptorと生成/消費/離脱/失効の対応を閉じる。E-fateful-transformだけで全payment消費済みとしない |
| P06 | 条件付き | 旧reservations: reservation_pilot・既存legacy forcedを再利用。開始・終了guardは空予約を要求する場合あり | 107からの生成可否を全sourceについて証明。到達可能な予約は宣言/受け/勝利/終了/終了後/turn期限・不遡及を閉じる。到達不能なら根拠を記録 |
| P07 | 必須 | 全効果/自動handler: batch_runner.forced_body、legacy _forced、chain_resolution、recovery、start/trigger/equipment等が既存 | 各dispatch優先順位・条件・意味差分・全出力を対応表と実遷移に結合。automatic_bindingは出力構造、resolution_choicesは選択義務の証明に限る |
| P08 | 必須 | 通常/response/誘発の現在predicate、候補展開・公開source列挙は接続済み | 全源・phase・早期除外の意味監査を合成し、未対応source/条件をゼロ件として無視しない。107からの生成/再登場も含む到達可能集合を証明 |
| P09 | 必須 | 機会閉包: latching/starts/existing/sequential/coverage/order、供給済みledgerとの実行一致は接続済み | 全ルール由来の予約・自動・任意/強制機会の発生、最初の機会、失効、見送り、deferredの生成元と実順序を独立に結合。静的一覧と同じexecutor再現のみでは不可 |
| P10 | 必須 | 許可情報の実使用: visible/public_history等あり、predicateの一部は公開情報のみを検証済み | 実候補列挙・比較・選択が許可projectionだけを使うことを経路ごとに示す。相手伏せidentity・未公開山札等のアクセス/非干渉検証と実入口結合 |
| P11 | 必須 | 比較operand: selection_basisは114/116/119の計算だけを検証、operand_provenance_verified=false | sourceと実状態/履歴から各operandへ根拠を結合。挑戦statsの供給状態上の印刷値/補正/最終0下限を接続済み。過去生成/状態認証、費用・成長・優先値を含む。未知を0に置換せず未証明を保持 |
| P12 | 必須 | mandatory指定policy: 463/465 journal・origin・機会結合済み。指定外は116 | 指定範囲を維持し、事前policy rootsと入力lockに結合。通常/response/指定外を昇格しない。全判断への網羅・未証明/除外伝播を検証 |
| P13 | 必須 | 外部承認認証: generation_entry/attempt_runner/supervisorの非空approval_referenceは認証しない | 生成承認と開始承認の別対象・権限主体・改竄検出・再利用防止・失効と入口の拒否を定義/実装。信頼元の選択は既存正本だけでは未確定。実承認は今回取得しない |
| P14 | 必須 | 入力生成provenance/結果前順序: material protocol/registry/journal/packageあり、provenance/ordering=false | OS生成と保存・失敗時停止・過去履歴除外・seedとpolicy seed分離・生成前edition・結果前全400行確定を信頼可能な証拠鎖で認証。今回テスト用既存/合成材料のみ |
| P15 | 必須 | 本番lock/remote: input_lockはlocal immutable binding、remote_publicationはfresh exact-ref、editionは実装済み | 完全generation packageのremote commit/tree/blob・edition・承認対象・時系列を共通gateへ結合し、不足1項目でも生成/実行を拒否。fresh remote単体を承認/lockへ昇格しない |
| P16 | 必須 | 実行gate合成: entry/attempt_runner/supervisorは存在。readiness460は歴史的静的証明、admissionは現在も明示未証明 | 現行edition用preflightを既存基盤へ追加合成し、全必須/到達条件の証拠と否定ケースを結合。旧460/manifest/hashは不変。準備完了でも実開始には別承認 |
| P17 | 必須 | 停止/再開・全予定保持: supervisorは未完了/不正行で停止、再試行false、400行固定 | 生成・保存・worker中断/重複/欠落/版変更時の保存証拠とfail-closedを共通gate付きで検証。新しい再開/再試行方針を勝手に導入しない |
| P18 | 必須 | 最終edition検証: 関連/結合・設計検査・476保護・独立review・remote保存 | 固定Pythonで最終関連/結合、未解消の回帰失敗を明示。source/tree/local一致。レビュー修正はRED→GREEN。過去npm406を今回の全proxy結果としない |
| P19 | 条件付き | 新しいhandler・裁定・情報境界不足が検出された場合 | 既存正本から一意ならTDDで接続。不明なら停止理由と具体的な選択肢/影響を記録し、値/優先順位/先読みを創作しない |
| P20 | 本番開始後可 | 実400行のcompleted/excluded/unproved・対群・勝率等 | 承認済み固定集合の全行を保持して算入判定。除外/未証明があれば全体結論null。subsetは診断専用、独立balance標本への自動昇格なし |
| P21 | 本番開始後可 | 実行時間/実際の中断/観測頻度 | 事前に定めたログを結果と保存。結果を理由に追加・削除・差替えしない。将来の比較方式/カード調整は別承認 |

## route inventoryの読み方

[data/preflight-route-inventory.json](../data/proxy-population-effective-application/preflight-route-inventory.json)は107の80物理カード/41種類を列挙した読取結果。登録済みhandlerの存在・選択種別と、全意味/全機会証明を分けた。source分類器だけではG-animal-shogiが未分類に見えるが、既存recovery.scopeが登録している。再実装する課題ではない。non-choice一覧が空でも、placement・指定policy・旧選択・別分類器のrouteを無視してhandler不在と判断しない。

## 増減履歴

- 2026-10-08 初版: 引継ぎの「生成/消費・全機会・情報/operand・承認lock」をP01〜P21へ分解。これは21個の新規仕様追加ではなく、既存必須gateの完了条件と依存関係の可視化。
- P03をP01/P02と同一bundleへ前倒し。通常main移動は既存batch.transitionから消去対象が一意で、payment監査の同じ境界を再利用できるため。
- P05を明示: E-fateful-transform以外にpositive scopeが追加するpayment/statの寿命があるため。「次回変身消費完了」を全typed寿命完了と誤認しない。
- P13〜P16を分離: API名/非空参照/local Git/fresh remoteの各証拠が別々の不足を残すことを実コードで確認。新しい承認を要求する時点は準備完了時。信頼元未確定を済扱いしない。
- 初期テストfixtureはbasketballが各側3枚と誤認し、別対象に現mainを選んだ。実107 fixtureのカード/個体を確認してテストのみ修正、失敗ログ保持。ルール変更やhandler不具合の解消として数えない。

## 継続順

P01〜P03レビュー・最終検証・保存 → P04/P05生成と残る消費 → P06/P07/P09の正本/dispatch機会閉包 → P08/P10/P11/P12判断・情報・根拠 → P13〜P17認証/入力/gate → P18最終準備照合。並べた順は実装依存順であり、残件が一定工程数で終わる保証ではない。新発見は上表へID付きで追記し理由を残す。

### 初回bundleレビューと追加発見

- 独立review C0/I1/Minor1。P01の比較後に宣言回数/時等の不正復元を許す漏れを実abort遷移・5改変でRED再現し、許可差分以外のenvelope完全一致へ修正。再レビューなし。
- MinorはP03のtime_skip対象効果付き/birthの枝テスト不足。今回のreview修正対象に追加せず未完了条件として保持。
- **P05追加の具体的不具合**: aeeca7fのpayment_consumptionは全nonmovement receiptを拒否するため、既存P-cliff_goatの実relationship_progress（payment_time0、消費あり）を誤拒否する。正本の新判断は不要。次bundleで既存relationship handlerの正例と偽消費の拒否をTDD接続する。課題増加理由は別寿命routeを実処理で横断確認したためで、handler再実装は不要。

### 生成・交際消費bundle

- P04: 既存typed10sourceの生成行監査をcoverageへ接続。手札6/挑戦盤上2/正の盤上2。発動/選択権威・効果全体・全機会の証明へ拡張しない。
- P05: P-cliff_goatの実交際軽減消費を接続。review C0/I1/Minor0のI1（既存の成長100境界拒否を監査が保持していない）をRED→GREEN修正。新しい100到達ルールは追加しない。
- **P03具体化**: 既存Connection.finishによるmain再登場の実出力A-009#2を、before手札#1にないとして前監査が誤拒否すると再現。次に既存incarnation receipt/metadataと源を結合する。増加理由は固定初期個体だけでは現行全routeを覆えないことを実再登場で確認したため。
- P05残り: 指定生成/消費/離脱/期限外eventでのtyped行保存則が未独立結合。単に新ID生成がないだけでは既存行の不正変更/消去がない証明にならない。

### 再登場・保存則bundle

- P03: 実再登場の誤拒否を解消。隣接世代・物理ID・metadata・exact receipt・所在を結合。time_skip/birth枝の前Minorも解消。過去のseen-field認証や全機会は済扱いしない。
- P05: 非生成/非消費eventの既存typed行の編集/消去を拒否。許可された寿命変更も各専用監査がexact結果を検査。新しいルール追加なし。
- 課題増加なし。前bundleで具体化した二つの欠落を閉じた。独立review C0/I0/Minor0、関連41/結合19/npm406PASS。P06以降の全意味/機会/情報/operand/入力認証は残る。

### 挑戦の公開数値根拠・全handler/gate監査

- P11: lifetimeがreceiptの数値を信用していたため、両側+7の自己整合した偽比較を受け入れるREDを再現。107のmain10種印刷値、typed行、deepsea手札数、chameleon両worldを独立に再構成して実compareへ結合。供給状態上の算術の証明であり、過去生成/初期状態/全判断operandの認証ではない。
- **P11追加発見**: 独立review I1により、正本02「最低0、上限なし」に対して既存challenge.statsも負値を返す漏れを発見。病気+エアホッケーでA=-2/B=2となり、差2報酬15を5に誤る実経路をRED再現。全typed/継続補正後に最終0下限を適用し、実handlerと独立監査を修正。早すぎる丸めを拒む正の継続補正併用も確認。課題増加の理由は、receipt保持監査から正本数値根拠へ横断したことで既存実処理の漏れが可視化されたため。新裁定ではない。
- [handler・validator・入力条件対応表](2026-10-08-preflight-handler-and-gate-audit.md)に全41種類の実入口と固有の完了条件、共通未証明、入力gateの現在の検査範囲を記録。
- P08/P19: I-poop1の置換発動境界は明示拒否が残る。107の敵main除去起点を全source/dispatchから非到達と証明するか、到達時のhandlerを正本から接続する条件付き実装課題。現時点で不在を0件/成功と数えない。
- P13: 信頼主体・承認の認証方式は既存正本から未確定。非空referenceとfresh remoteを承認認証へ読み替えない。実seed/lock/開始は未実施。

- P18補足: 初回の下限修正は歴史nativeファイルを直接変更したため、runtime468の固定source検査が関連2件/結合3件で拒否した（ログ保持）。旧source/hash/manifestを更新せずnativeを元に戻し、現行接続scopeへ下限adapterを設けた。scope解除時の復元と歴史anchor一致も検証。最終結果は `challenge-operands-final-scoped-*` のみを参照する。
