# 固定入力再結合の公開・承認順序（現行契約を維持）

## 目的と今回の監査

承認request作成後の証拠保存でPR HEADが動く再発を防ぐ。承認ガード、実行コード、ゲーム裁定、固定入力、旧request・旧承認・消費履歴・停止原本を変更しない。

33c1017fd0d406183f59715bb45c92050a6208c8（tree d866e10ab4665744b3f61721681f718c5fadd34b）から208d97bfb899b94f46fdf8ecd8bda20970821ee1（tree 0ae3cd83eb7a744b77dfa272082a8bca86668ec1）への差分はentry-history-launch-20261014配下7ファイルの追加だけ。既存全5993 Gitエントリーのmode/type/blobは一致。現在のCARD GAME 5181ファイルのローカルbytesをGit blobと照合した。Python1097ファイル、binding/manifest、固定400入力、保護正本、旧停止原本に変更なし。詳細はaudit.json。

旧execution editionは99eceff1ed7af8c7405dab7f9ed544cc20ebfa00。旧binding SHA-256 b0564168c600baa396e4f2621c7794cbedb98893d7e34daae03d2cedfb184bfd、旧manifest SHA-256 37cab5faa0d6edf54aa9f45475fccae0842fa3cd2da729b9d9c2480293c38270。これらを上書きしない。

原因はrequestのpublication.commit=33c1017fを確定した後、request・承認本文・公開監査等を同じブランチの208d97bfへ追加したこと。内容が不変でもverify_liveはHEAD完全一致を要求する。さらにbinding.auditはeditionの直接の子・bindingとmanifestの2ファイル追加だけを要求し、approval_publicationはその公開commitの直接の子・承認消費記録1ファイル追加だけを要求する。request.publicationを現在HEADへ書き換えるだけではこの契約を満たさない。

## 比較した方法

| 方法 | 契約変更 | 効果・制約 |
| --- | --- | --- |
| A: 証拠を先に保存→新edition→2ファイルのみ公開→HEAD固定→requestをブランチ外で提示 | なし（今回採用） | 既存のexact HEAD・直接の親子関係・追記集合を全て維持。新edition/hashになるが実行コード・固定materialは同一。 |
| B: 不変内容のbinding receiptと、別の承認用publication anchorを明示分離 | 必要、今回は未実装 | 新request schemaと両者の完全拘束・保存証拠の許可差分検証が必要。承認直前のanchor固定は残る。契約変更の事前確認、TDD、独立レビュー、新editionが必要。 |
| C: 承認後の証拠追記を検証可能なcommit列として許容 | 必要、今回は未実装 | HEAD不一致を無条件許容せず全commit/ファイル差分を証明する新契約が必要。最も複雑で、許可範囲拡大の危険があるため非推奨。 |

Aでは承認対象内容と公開HEADを新schemaで分離せず、公開後に生成される証拠の保存先をブランチから分離する。自己参照を解くためrequest本体を自身のpublication commitへ含めない。現在HEADの巻き戻し・旧request書換え・既存承認再利用を行わない。

## 一般手順

1. remote HEAD/tree、PR Draft/open/unmerged、local cleanをfresh確認。対象変更の監査、手順、既存テスト証拠を先に保存する。既存preflightでは追加証拠はverification配下・非Pythonに限られるため、この範囲に保存する。
2. 保存済みcommitを新edition Eとして既存capture/verify/preflightへ通す。以前のeditionから実行Python全件・Python版が同一であることを確認する。新しい実行コードがあれば、この手順で検証済みと代用しない。
3. 既存buildで旧生成来歴・保護正本を再監査し、既存の固定materialから新しいbinding/manifestを新規パスへ作る。source_versions以外のmanifest全体完全一致、200群/400行と順序・seed不変を要求する。
4. Eの直接の子Pへbinding.jsonとmanifest.jsonの2ファイルだけを公開する。非force・expected_sha付きで保存し、remote/local HEAD/tree一致・clean・PR状態を確認する。Pが異なれば停止する。
5. Pのreceiptから既存rebinding_requestで新requestを生成する。公開後binding再構成、edition/preflight、request各hash、400行・512step・retry/resume禁止・出力先不存在を検証する。**この後は同じブランチに報告書・request・監査結果をcommitしない。** requestと承認本文はブランチ外の永続ファイルと会話で提示する。
6. 新本人承認を待つ。旧コメント6159627980および旧request df230d6cbae39a7e55bc96a7ea0ea38f90e456ca3d566e134f30d5a6a4da985eは保持し、今回も将来もこの手順で再利用しない。コメント6127373548は既存消費済み記録のまま維持する。
7. 別途実行が承認された時だけ、P固定と新本人コメント真正性・未消費・未実行をfresh確認する。既存consume_liveで排他的claimを作り、Pの直接の子Cとしてclaim1ファイルだけを保存する。claim自体が新request全文と承認証拠を保持する。公開後に既存audit_committed_consumptionを通す。今回はこの段階を行わない。
8. 実行時の既存supervisor/workerもCのexact remote HEADを検証するため、稼働途中の任意commitは行わない。既存契約が許す停止・完了後に証拠を保存する。環境消失・不明状態は停止とし、自動resume/retryしない。保存checkpointを理由に別attemptへ切替えない。

P固定後にどの理由であれブランチが進んだ場合、そのrequestで開始しない。単なる祖先関係を完全一致の代用にしない。必要な追加証拠を先に保存し、手順1から新edition/再結合/別本人承認を準備する。

## 再現・引き継ぎと検証範囲

requestを失ってもPのbinding/manifestは不変Git blobとして取得できる。binding.new_edition.commitの既存captureでcertificateを再構成し、P/path/blob/canonical_sha256から2receiptを再構成してbinding.auditを通す。512stepと提示した出力先でrebinding_requestを再構成し、提示済みrequest hashとの完全一致を要求する。異なるrequestを同一とみなさない。

新出力先はdocs/card-game/data/proxy-population-400-publication-order-run-20261014とする。旧予定出力先も変更・作成しない。生成器・乱数・入力順・予定集合を変更しない。同じ固定入力なので独立balance標本の追加は0。

実行Pythonを変更しないため既存の909件回帰・8件専用・非本番結合の保存証拠を既存preflightで検証する。これらを今回の再実行として報告しない。今回行うのは公開差分・内容指紋・preflight・旧生成来歴・再結合・公開再構成・request整合検証。新本人コメントは未取得なのでexternal approvalをPASSとしない。実行・retry/resume・実承認消費は行わない。
