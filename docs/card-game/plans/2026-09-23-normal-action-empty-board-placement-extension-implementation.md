# 125 詳細TDD実装計画

**設計:** `2026-09-23-normal-action-empty-board-placement-extension-design.md`。先に各Taskの失敗を確認し、最小実装後に専用GREENを確認する。

## Task 1: 空inventoryと現state再投影

RED: 124の4新stopで121が`missing_exclusion_reason`、現在state由来の6 family inventoryが空盤面を0件・参照field付きで説明できないことを固定。owner board有/無、空hand、unknown state fieldの故障注入。GREEN: 121の公開投影と114 templateを使い、空familyに`no_board_source`/`no_hand_source`を検証付きで追加。121保護ファイル非変更。commit。

## Task 2: 117人物配置IDと121の12条件

RED: 空盤面だけを補った4経路で`missing_candidate_id_grammar`を確認。合法な時0人物配置と不合法な満員・1ターン制限、born main、pass、response別ID、ID衝突・target不一致・改ざんbooleanを検査。GREEN: 121のsource/variant/target/採否を現在stateから再構築し、117で実在する人物配置grammar2件だけ接続。12条件を独立再計算するvalidator。共通に扱えない作用はcontract stop。commit。

## Task 3: 独立4経路再開

RED: 124の各raw/両hash/seqを再検証し、各判断は125がcompleteのときだけ107/114/必要時116へ進む。人物配置後のresponse/期限/triggerを現在stateから再監査。1経路未知なら他経路を継続。GREEN: 117の時0人物配置と既存119 response handlerのみ適用。state変更ごとに監査し、不明ならその経路を真正停止する。対象経路/card copy ID専用分岐を作らない。commit。

## Task 4: canonical成果物と保存

RED: 欠落JSON、1 byte差、event/hash/decision改ざん、fallback/balance矛盾を失敗にする。GREEN: builder再生成bytesの直接比較、独立validator、125 plan/evaluation/必要なstop、報告、README、専用gate。125・124・123・122・121等の専用検査と全proxyを実行。既知117旧テスト1件は分離。変更だけcommitし、Draft PR #259の同一branchへ非force保存。remote HEAD/treeと全成果物再取得、PR状態、workflow/statusを確認する。

## 自己監査

6 family/12条件/17+empty2理由/10 stop、114 templateと117 ID、passとresponse-pass、owner/public境界、state変更後再列挙、121/124と112/116/117/119/120/122/123保護、カード本文・裁定非変更を確認する。未知効果または汎用handler追加が必要なら当該routeで止める。
