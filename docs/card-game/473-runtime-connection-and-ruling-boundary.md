# 473 共通runtime接続bundleと上限時の適用裁定境界

472承認Aの逐次誘発方式を維持し、現在stateの合法候補と残群見送りを選び、実遷移後に再列挙する。部分集合や全順序の一括抽選は追加しない。本保存は接続bundleと新しいゲーム裁定の判断境界であり、400戦preflight完了ではない。

## まとめて接続した範囲

- M02/M08の通常行動・responseの有料発動、全現物コスト候補、共通回数制約を119と既存draw handlerへ接続。回収scopeによる選択器上書きを修正し、既存114／116の比較証拠と実行時再照合を共通化。
- M03／M06／C-bat／P-cliff_goatの正条件発生を実際の前後stateから捕捉し、現在のコスト・対象を再列挙。新しい効果実行器を作らず既存発動・型付き効果処理を使用。M06のコストは手札のセカイ公開→山札下。同一こいびとに属するヤギ軽減は別個体へ移さない。
- 100／105の現物と個体の区別を、実際の再登場・満員なかま交代・セカイ・準備配置・メイン・こいびとへ接続。過去個体メタデータ・予約・使用履歴を残し、現在の入場だけ新世代IDにする。今回発生した登場eventと必須義務は新個体に結び、過去参照は書き換えない。
- 119の情報view、465の限定mandatory-choice処理、468のcallback、472の逐次loopを再利用。ローカル検証用のactive個体投影と全state証拠を分離し、乱数root・機会アドレス・1/N・allowlistを変更しない。
- 実際に選択された遷移だけのlifecycle hash列を、仮想候補を含む条件付きcacheから分離。全envelope前後hash・契約IDとlegacy game／continuation hashを照合。不一致時はcacheへ登録しない。
- 既存114で上位以外を除外でき、上位候補の全比較が未解決、かつ安全配置との混合がない場合に限り、既存116のpure frontierへ接続するopt-in scopeを追加。通常loopへの統合は未完了。新比較や未知資源の0点化はしない。判断は旧116除外のまま。
- そだち100の到達・維持・相手手番開始を扱う条件付き公開履歴componentを追加。これだけで早期勝利を許可せず、既存100境界guardを残す。

## 限界と残工程

供給された途中stateからの条件付き接続である。`origin_authenticated=false`、`opportunity_completeness_proven=false`、`ready_for_execution=false`。部分的に複数decision／responseへ進む検証は、全107判断機会・複数turn完走・入力真正性の証明ではない。

challenge宣言からの全誘発接続、legacy中間snapshotの再登場対応、100／全終了段階／勝利処理の統合、指定外・退場済み参照の必須選択、未接続resource frontier、全体entry replay、469の実入力真正性／lock／最終preflightは残る。不明を候補なし・適格・完走へ変換しない。設計資料にある400戦計画は変更しない。

## ゲーム裁定が必要な境界

そだち100で、条件成立・無効化なしの「じんとり」を解決し、唯一のそだち増加が上限で0になった場合、「効果の適用」と数えるか。

| 案 | 分類 | アリジゴク⑥⑦への影響 |
| --- | --- | --- |
| A | 指示を正当に処理したので適用あり | 他条件を満たせば⑥の誘発・⑦の当ターン履歴の根拠になる |
| B | 実増加も他の適用部分もないので適用なし | この解決は⑥⑦の適用根拠にならない |

01・06・07・55・56・67・71・85・86を横断確認し、独立レビューでも一意に導けないと確認した。発動可能性・解決した事実と適用判定は別。状態不変の効果全般へ一般化せず、値付けや乱数で裁定を代用しない。詳細とsource hashは`data/proxy-population-incarnation/ruling-boundary.md`とverificationに保存。どちらも未採用。旧正本・過去結果は不変。

## 検証・独立レビュー

固定baselineの全proxy1498件PASS、追加11件を含むpopulation関連171件PASS、修正後incarnation専用13件PASS、npm406件PASS、設計データerrors=[]。472時点の既存3955ファイルはgit blob一致、baseline812 toolsも不変。検証最終集計は`data/proxy-population-incarnation/verification/final-summary.json`参照。positive bundleの独立レビュー1cycleはCritical0／Important1／Minor0（selector shadowingをTDD修正）。別責務のincarnation／normal bundleの独立レビュー1cycleはCritical0／Important2／Minor0（登場個体ID、全envelope hashをTDD修正）。今回修正後の独立再レビューは行っていない。

全proxy回帰はffa7dfc6時点の1498テストを固定したmanifestで実行し、その後追加された接続テストを含む関連回帰は別途実行する。両者の範囲を混同しない。途中で消失したcheckoutによる中断回帰はPASSに数えない。過去artifactを再生成上書きせず、テスト内再構成と比較を行う。

seed実生成・400戦入力固定・新対戦開始0、独立balance標本0、新方式未採用。旧116 fallbackは引き続き除外し、463以降の指定mandatory-choice policyを通常／response／任意誘発へ拡張しない。除外・未証明を落とした予定集合全体のbalance結論を出さない。
