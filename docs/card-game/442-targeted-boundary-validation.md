# 442 — 112対象検証の共通境界補修と追加経路

開始正本441 `44b3fcdc6ccfbd0075cc487b9bec9b77e97e5fa8` / tree `863e3f6476952002377bf946f7c3689aaab507d6`。remote一致、PR259 Draft/open/unmergedを確認。対象はdocs/card-game/のみ。114・414・505原本・過去結果・元112 fixtureは変更しない。採用判断は行わない。

## 共通不足と既存の根拠

| 責務 | 441で不足していた処理 | 442の処理 | 根拠 |
|---|---|---|---|
| 支払い現物の選択 | 同名を2回指定すると同じ現物を再取得して拒否 | 選択済み現物を除外。同名の別現物2枚を宣言順で支払う。card_id＋instance_idによる明示指定も照合 | 59りゅう⑧の「アクション2枚」、01/06の支払い |
| 対象の追跡 | 対象が一度別領域へ移り元の領域へ戻ると再び適正とみなす | 物理カードhandleを維持しつつ、離脱した対象への旧参照を失効。使用済み状態も旧カード単位で廃棄 | 07⑩領域移動 |
| 予約の寿命 | 保護対象が先に離れた時の失効がない | 対象離脱でinvalidated。発動元だけの離脱では予約を維持 | 96ペンギン⑦、07⑩ |
| 複数防止・置換 | 登録順の先頭を暗黙適用し、それ以降を再確認しない | 影響を受ける側の選択を必須とし、書換え後に再評価。選択不足・不適用・重複・余分な選択はtransaction全体を拒否 | 07⑤置換・⑥防止 |

処理は対象runner共通のfind/moved/resolveに置く。軌跡ID・カード現物ID専用分岐は追加しない。通常policy・候補順位・完全合法候補列挙へ接続したとは主張しない。複数防御の順序は新ルールではなく07の既存規定を適用する。

## 実行範囲

[16経路の保存実行](data/proxy-boundary-validation-442/variants.json.gz)は、元112 fixtureの40枚・初期順・80現物を維持し、441の明示commandから構成する。

| variant | 件数 | 検査 |
|---|---:|---|
| baseline | 6 | 441元経路再現。元の全execution record一致 |
| decline | 6 | 対象能力を使わない。未解決の誘発機会があれば明示的に閉じる。防御未使用時の相手除去は捨て札へ |
| expired | 2 | 防御後の攻撃を次の自分開始より後まで遅らせる。予約は開始ドローより前に失効し、相手除去は捨て札へ |
| explicit_defense | 2 | 保護される側が適用予約を明示し、防止／手札置換を実行 |

計583イベント。全16件は保存JSONから独立再生し、event/snapshot/前後hashを検査する。防御の有無・失効で攻撃側の時3・手札・準備の先払いを返さない。通常方策の試合・勝者・新規R10完走・独立balance標本は0、policy_promoted=false。

同名2現物の支払い、対象離脱後の再帰、同じ対象への複数防御競合は**隔離された契約単体入力**で検査する。これらを合法な初期fixtureから構築した対戦や追加のbalance標本には数えない。上記16経路と混同しない。全カード／全相互作用の対応を意味しない。

## 比較と保存互換性

旧方式の比較241・未対応72（47/21/4）は維持。114の比較範囲を拡大せず、実ゲーム停止へも加算しない。440/441の保存成果物は一切上書きしない。441の6execution recordは新runnerでも全一致する。一方、runtimeソースを補修し追加moduleもあるため、新manifestは442へ保存し、441のruntime manifestを現在のsourceであるかのように更新しない。

## 検証

契約単体テストは修正前に6 failure・8 errorを確認し、既存分を含め30件PASS。追加variant専用3件PASS。最終専用34件・関連結合111件PASS。npm testはexit0（smoke/dialogue/visual検査とNode38 test files成功）、design errors0。保存gzipの16件再生一致、独立2回生成でvariants/summary/manifestの3成果物byte一致。旧72件監査も441保存byteと一致。

全proxy1,147件の全ID検証は441の履歴証拠。442では対象runnerを参照する全テストと、関連する支払い・予約・112/114/116の結合を実行する。変更されない旧軌跡全回帰を再度実施したとは記録しない。

独立レビュー1回はCritical0・Important1・Minor0。明示selectorのinstance_id=nullが自動選択へ化ける指摘を対象・支払いの両方で再現し、RED→GREENで修正。指摘0とは記録しない。

既存2,438 trackedファイルのうち、変更を許した対象runnerとREADME索引以外の2,436ファイルは全byte一致。旧test source、通常policy、505・114/414・112原fixture・過去dataを維持。

[再現スクリプト](data/proxy-boundary-validation-442/reproduce.py) / [集計](data/proxy-boundary-validation-442/summary.json) / [最終検証](data/proxy-boundary-validation-442/verification/final-checks.json) / [独立レビュー](data/proxy-boundary-validation-442/verification/independent-review.md)
