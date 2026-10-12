# CARD GAME 最小再開メモ

最新の正本はGitHubの `design/card-pool-master-20260914` のfresh exact-ref。本文中の固定SHAよりremoteが進んでいればremoteを優先する。

## 最新bundleの基準と再利用する検証

- 最新保存commit/treeはfresh remote exact-refから取得する。この追補の基準はc9bbaf2453e4222db0cc2e554fb497f518d43f6d / tree36f51f5f436fd256bd07ec536a0f1536d745288d。本文自己参照のため最新保存SHAを推測しない。
- PR259 Draft/open/unmerged、docs/card-game/のみ。人物/装備475A裁定は実装済み、再質問不要。
- f38d620の通常/response predicate・4source窓閉包・非fallback計算/支払/response前提gateは完了済み。後続の公開証拠hash分離、上位唯一winner比較記録、手札誘発別導出も完了。再実装しない。
- e8d55b1: 開始時source collectionのproducer/replay同時省略を拒否。関連34PASS/独立10PASS。
- c9bbaf2: ちょうせん宣言delta0を比較operandへ昇格せず116 unknownへ保持。関連32PASS/独立10PASS。
- c9bbaf2の旧115/零root完全結合: 143step/181event、7監査errors=[]、116.378s/exit0、Python前後一致。verification/start-challenge-connected-c9bbaf2-*。復元だけを理由に再実行しない。
- 最新追補: end_dispatch.require_actual_traceを初期manifest入口へ接続。未証明終了機会・欠落/重複/別境界proofを拒否。関連18PASS41.515s、独立7PASS。verification/end-dispatch-entry-*。上記完全結合はこのgate追加前であり現在版全回帰ではない。
- 停止表示原因調査はsession-stop-2026-10-11.mdに保存済み。原因確定不能を環境切断確定等へ読み替えない。

- 2026-10-12: 共有public_sourcesの列挙を両ownerの全公開盤面slotから別に照合。開始/到来producer同時欠落を拒否し、伏せidentityを読まない。public-sources-*、固定27PASS/独立22PASS。全機会/起点証明ではない。再実装不要。

- 2026-10-12追加: partial unknown frontierのproved_scoresを費用監査へ接続。分割欠落/重複・偽費用・費用根拠なしを拒否。partial-payment-*、最終23PASS/独立review I1修正済み。その後、下記の共通helper結合で複数frontier記録/費用を接続。

- 2026-10-12追加: 共通helperの複数frontier比較行をfallback_priority_problemへ保存、置換/paid draw/回収で全候補支払を実入口へ結合。fallback-payment-*、最終32PASS/独立review I1修正済み。この3bundleの固定4b520b3完全結合は下記完了。

- 2026-10-12: 固定4b520b3の旧115/零root結合143step/181event、8監査errors=[]、115.941s/exit0、指紋一致。payment-connected-4b520b3-*。その後native登録の共有欠落を拒否（native-source-scope-*、39PASS/独立C0I0M1のfixture修正）。完全結合は登録修正前、最新は関連39件/実初期10step。復元で再実行しない。次はP09自動dispatchの残り、P10全公開履歴/許可read、P11上位/成長のsource根拠、P14–18共通gate。

- 2026-10-12: 現在のいなか終了成長条件を満たすpassのdelta0比較根拠を撤回し既存116 unknown保持。pass-end-unknown-*、31PASS/独立5PASS・指摘なし。新比較時間幅/値は定義しない。次はP10伏せ札回収の公開履歴field、P11残operandとP09/P14–18合成。

- 2026-10-12: C-bat伏せ回収IDの相手公開履歴漏れを現行projectionで修正。concealed-return-history-*、最終22PASS32.549s/独立16PASS・C0I0M1負例追加、Python前後一致。raw/owner/表向き装備は保持。履歴起点認証ではない。次はP09自動dispatch条件と監査の結合、P10/P11と共通gate。

- 2026-10-12: 自動終了batchが次のresponse判断を無記録で消費する2REDを修正。各event直前の通常/反応/完了境界を検査、正規開始draw/指定eggは保持。automatic-intermediate-opportunity-*、21PASS10.672s/独立6PASS・指摘なし。その後の固定a264e37完全結合は下記完了。

- 2026-10-12: 固定a264e37完全結合143step/181event、8監査errors=[]、116.880s/exit0・指紋一致（handoff-connected-a264e37-*）。その後normal共有投影のowner source欠落を実6family照合で修正、normal-source-projection-*、26PASS17.271s/独立6PASS・指摘なし。完全結合はsource母数修正前。次は共有target expanderと実対象の対応、残るP09〜11/P14〜18合成。

- 2026-10-12: 通常hand target集合を実状態から別照合し共有expanderの装備先省略を拒否。normal-target-pool-*、31PASS18.648s/独立3PASS・指摘なし。費用全多重度/全board target証明は別。次は自動dispatch条件と全機会/情報/operandを共通gateへ合成。preflight-ready=false。

- 2026-10-12: 比較card copy IDをactual candidate sourceへ結合。comparison-copy-id-*、42PASS6.832s/独立11PASS、review I1の通常problem例外偽装を修正。上位のみの既存helperにはtie fieldを創作しない。次は共有支払options/paid costの候補母数と残工程合成。

- 2026-10-12: M01任意軽減/M02伏せ支払/M08異なる捨て札全順序を固定55/114から独立照合。independent-cost-pools-*、47PASS19.149s/独立5PASS・指摘なし、design errors=[]。通常/responseへ結合、全価値/起点とは別。次はsource閉包・全判断責務と現行共通gate合成。

- 2026-10-12: C-cat_friend回収先を72/114/公開捨て札から別導出し、共有helper省略による実response-passを拒否。recovery-target-pool-*、30PASS15.098s/独立13PASS・指摘なし。normal既存gateは維持。次は全責務と現行共通preflight合成。

- 2026-10-12: fresh実trace責務を共通入口へ結合。timing/hand/automaticの未証明3RED拒否、root8監査・全step/遷移・source80/41を照合。trace-obligations-*、23PASS70.658s/独立2PASS・指摘なし、Python1075前後一致。全情報/operand/本番gateは未完。次は保存固定版の全接続一度、P10/P11/P14–18合成。

- 2026-10-12: 固定1c48304の旧115/零root完全結合143step181event、9監査errors=[]、completed=true/stop=null、114.115s/exit0、Python1075前後一致、design errors=[]。trace-connected-1c48304-*。逐次誘発0の既存unit診断であり全source証明ではない。復元で再実行不要。次はP10/P11とP14–18合成。

- 2026-10-12: いなか配置の終了成長条件成立時もdelta0を比較証拠にせず116 unknownへ保持。world-end-unknown-*、34PASS31.655s/独立7PASS・指摘なし、Python1075前後一致。実配置は維持。次はP09–11/P14–18共通gate合成。preflight-ready=false。

- 2026-10-12: supervisorの起動直前/return後のedition検査を結合。版変更停止・全予定保持、supervisor-edition-*、26PASS29.756s/独立7PASS・指摘なし、Python1075前後一致。gate閉鎖、P09–11/P14–18共通合成は未完。

- 2026-10-12: 初回たまご交換の返却IDが相手通常inventoryへ漏れる2REDを修正。egg-private-history-*、21PASS15.279s/独立5PASS・指摘なし。raw/本人は保持、read表の初期producer見落としを訂正。次は初期manifest/最初の機会と共通gateの結合。

- 2026-10-12: 共有dealerの配札入替を初期manifestから別照合して拒否。initial-obligations-*、25PASS205.923s（既存全turn完走unit含む）/独立3PASS・指摘なし、Python1077前後一致。2root hashをtraceへ結合。外部由来/全機会/本番gateは未完。次はP09–11/P14–18共通合成。

- 2026-10-12: fresh native/start collectionを初期/全event/実開始境界へ順序付き結合。未証明/記録欠落2RED、20改変負例。collection-trace-*、34PASS50.923s/Python1077前後一致、独立1PASS/C0I0M0。既存条件判定は再実装しない。全ルール/情報/operand/共通gateは未完。

- 2026-10-12: 初期upgradeへの未生成軽減挿入1REDを修正。初期最終→v2/空typed3領域の完全境界、trace10root/両端hash結合。initial-runtime-root-*、23PASS72.000s/Python1077前後一致、独立2PASS/C0I0M0。次は実選択へ渡す公開履歴の許可項目照合と共通gate。

- 2026-10-12: 共有公開履歴投影の秘密hash混入1REDを独立許可field照合で拒否。normal実入口/traceへ結合、allowed-history-*、19PASS63.921s・Python1079前後一致。review I1のraw履歴3binding-field正規化修正済み、再reviewなし。全情報/起点/operandは未証明。次はP09/P11/P14–18共通合成。

- 2026-10-12: current-source-closure-composition.mdへ既存初期/全遷移/敵人物予約不変条件の合成範囲を整理。独立読取review C0/I0M0、コード変更・再検証なし。次は41sourceの全作用とnative外の別責務対応、P10/P11/P14–18。

- 2026-10-12: I-bowtie非開始/相手開始responseの未証明残留2REDを既存開始否定へ接続。bowtie-nonstart-*、31PASS20.922s/Python1079前後一致、独立2PASS/C0I0M0。次は自分開始時の不成立証拠を元境界から結合、41source責務対応とP10/P11/P14–18。

- 2026-10-12: 元開始境界のI-bowtie手札不成立をresponseへ結合。start-condition-history-*、30PASS13.809s/Python1080前後一致、独立5PASS/C0I0M0。現在枚数から過去条件を推定しない。次は41source責務対応とP10/P11/P14–18。

- 2026-10-12: current-source-responsibilities.mdに41sourceと追加作用の引受け先を対応。read-only review C0/I0/M2訂正、コード/再検証なし。次はP10/P11の根拠／unknownの実記録結合とP14–18。

## 再開手順

1. fresh remote HEAD/tree・PR259を確認する。checkoutが消失した場合だけこのブランチから復元し、local HEAD/tree/cleanを照合する。既存差分があれば消さずに確認する。
2. このメモとstatus.mdの最新追補を先に読む。過去の長大な履歴・関連41件・完全入口検証を、環境を復元したという理由だけで全てやり直さない。
3. P10実read経路の確認はverification/public-read-boundary-review.mdの表から再開する。runtimeで過去比較borrowが無効なことは確認済み。C-chameleon公開適用証拠のfull hashをpublic_board_sha256へ分離済み（関連19PASS、独立4PASS）。通常UNIT/ADMITTED/MAIN_TRANSITIONとresponse hand/boardのfield対応、P11その他operand、P09機会対応が次。有限検査や同じ実行器の再現を全情報利用の証明へ昇格しない。
4. 手札G-air-hockeyの発生機会別導出/実入口・coverage接続も完了（verification/hand-occurrence-independent-review.md、関連29PASS、独立15PASS）。3bundle後の旧115/零root全入口結合は完了（verification/three-bundle-connected-98a62f1-*）：143step/181event、7監査errors=[]、114.713s/exit0、docs再帰Python1068前後一致。再実行不要。開始時producer/replay同時省略の拒否も追加済み（verification/start-collection-review.md、関連34PASS、独立10PASS）。次はP09残りarrival/end/自動機会、P10 full-envelope adapterの許可field、P11上位operand根拠と最終gate合成。ちょうせん宣言delta0と比較operandの混同は現行unproved_priorityで遮断済み（challenge-unknown-review.md、32PASS/独立10PASS）。合法候補/宣言は保持、未知は116除外。上位比較唯一winnerの比較記録/支払gate接続も完了（verification/upper-comparison-entry-review.md、関連36PASS、独立19PASS）。再実装しない。P07–12の全source機会/情報/他operandとP14–18の最終合成・版固定検証を既存22項目台帳で続行する。常時閉鎖の本番gateを、局所PASSだけで開かない。

## 保存の区切り

- 一つの共通責務の修正を検証したら、次の大きな検査/別責務へ進む前にGitHub commit/refまで確定する。原本log、実exit、source指紋、未完了点を同じ単位にまとめる。
- 大きな検証前に保存する場合はpendingと明記する。プロセス参照不能・log欠落は結果不明として保持し、結果不明の処理だけ必要最小限で再検証する。
- Git Data APIでexpected_shaを指定、force=false。remote HEAD/treeとPR状態を確認し、localを一致させる。blobのみの退避はcheckpoint完了ではない。
- 各保存でこのメモの検証対象と次の一手を更新する。新commit自身のSHAを本文へ自己参照させる必要はなく、最新保存位置はremote exact-refから取得する。
- セッション終了時は実行中の有無・最後の保存HEAD・未保存差分・未完了検証を明示する。バックグラウンド継続を確認していない場合、継続中とは言わない。

## 保護と承認

preflight-ready=false。seed生成/本番入力固定/400戦開始は未実施。このメモは生成・開始の承認ではない。A裁定475・B裁定474・指定mandatory1/N・旧116除外・114/116/119/過去結果の保護を維持。未知を0/同価値にしない。全体結論null、policy promotion=false、独立balance標本0。main/フロントエンド/World/Character3Dには触れない。
