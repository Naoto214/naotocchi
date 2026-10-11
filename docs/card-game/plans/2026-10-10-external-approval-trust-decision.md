# P13 外部承認の信頼主体・認証方式（方式採用・実行未承認）

基準: c75e7f1b4eebc5a7b3fe8d8a0aec4427c87ceee2。475の退場順Aとは別の、既存P13の未決事項。生成／開始の承認を求めるものではない。今回の承認取得、seed生成、本番入力固定、400戦開始は0。

## なぜ既存の文字列では閉じないか

`generation_entry.generate_after_external_approval`、`attempt_runner.run_after_external_approval`、`batch_supervisor.run_after_external_approval` は非空approval_referenceを要求するが、権限主体・対象・取消・再利用を認証しない。remote.verifyはfresh exact-refのみ、generation_packageは同commitの内容整合のみ。これらの戻り値はexternal_approval_verified/input_lock_verified/provenance_verified=falseを明示している。呼出名や本人以外が書いた「承認済み」ファイルでは代替できない。

これは2026-10-09-preflight-readiness-audit.mdのP13に明示済みの設計境界であり、テスト不足や475の未決裁定ではない。475の採用から権限委譲を導かない。

## 推奨案: GitHub本人コメントを承認の権威とする

対象repoのownerをfresh APIで確認した結果はlogin=Naoto214、数値user ID=323909980、type=User。表示名だけで認証しない。信頼方式の採用後も、生成／開始の実承認は準備完了後の別段階で必要。

- 承認主体をこの数値user IDに固定する。agent/botや他のcollaboratorによる代理承認を認めない。
- PR259の本人コメントをGitHub APIからfresh取得し、repo/PR、comment ID、author ID、本文の完全一致、created_at/updated_atを検証・保存する。URLや供給JSONだけを証拠にしない。編集・削除・取消・取得不能時は停止する。
- 生成承認対象は実装editionのcommit/tree、107/463〜465の契約、生成予定200群400行、生成先を含むcanonical request digest。まだ存在しないseedやmanifestを承認済みにしない。
- 開始承認対象は完全generation packageの公開commit/tree、全manifest digest、実行edition、400行の実行順、supervisor設定を含む別request digest。生成承認を開始へ流用しない。
- 承認後もfresh exact remote ref、全blob、editionを再確認する。別HEAD/別対象への承認流用、自動retry/resume、行の追加削除差替えを拒否する。消費記録と中断記録を保存し、同じ承認による再生成や第二回開始を認めない。
- agentは本人コメントを投稿・代筆して認証を成立させない。採用後の最終確認時に、承認対象と本人が投稿する完全な文面を提示する。

この案の信頼仮定はGitHubアカウントとAPI、保存された実行editionを実際に動かす運用者である。コメント認証だけでOS乱数由来や結果前時系列の独立証明が得られるとはしない。P14の実行記録／材料／履歴cutoff／remote固定との結合を別に実装する。上記が実装済み、またはpreflight-readyとは主張しない。

代案は、ユーザー管理の公開鍵を事前固定し、同じ対象digestへの署名を本人承認とする方式。鍵の導入・保管・失効の運用が追加で必要。単なる会話文やagent作成ファイルを自動的に第三者検証可能な署名へ変換することはできない。

## 承認後の実装・否定試験

両stageのrequestを分離し、固定authorityとfresh取得機構を生成／attempt／supervisorの共通gateへ接続する。無承認、別著者、別repo/PR、対象差替え、編集、取消、既消費、取得不能、remote変化、版差替えを副作用前に拒否する。テストには合成コメントと既存115の条件付き入力だけを使い、本番材料は生成しない。テストのmockを運用認証に使わない。

P07〜12の全dispatch／全機会／情報実使用／operand由来の未完も別に残る。P13だけが唯一のpreflight blockerであるとは扱わない。22項目台帳と旧460を維持する。


## 2026-10-11 方式採用と実装境界

直前に本人PRコメント方式の採否を明示して尋ねた応答に対する「続きお願いします」を、この具体案による準備実装の続行として受領。過去の退場順Aやそれ以前の繰り返しを遡及してP13承認にはしない。今回もseed生成・本番入力固定・実行開始は承認されていない。方式採用と個別requestへの実承認を分離する。

`proxy_population_external_approval`でgeneration/launchのcanonical requestを分離した。edition全体digest、commit/tree、107/463〜465、生成先、履歴registry、または完成manifest/receipt/package全artifactのdigest・固定400順・limit・retry/resume禁止を対象へ結合する。requestはnetwork呼出前にdeepcopyして、途中の入力変更が承認対象へ混入しない。

公開GitHub APIを固定repoへ直接GET（TLS、redirect拒否、timeout30秒、8MiB上限、重複JSON key拒否）。本人ID/type、repo owner、PR259 Draft/open/unmerged・head/branch、comment ID/PR/完全本文・created_at/updated_atを照合。全commentページを上限100ページまで検査し、上限到達/欠落/重複/取得不能で停止。最後にcommentを再取得する。取消は`revocation_text(request,comment_id)`の文面を含む本人コメントで扱い、既存ページの途中切りで無視しない。今回実APIはrepo名とowner IDのGETのみ成功確認し、実承認コメントを認証・投稿・消費していない。

`consume_live`はfresh再検証後、comment ID単位の固定localファイルをO_EXCLで記録し、同じlocal領域での二重消費を拒否する。local claimはremote保存/巻戻し防止の証明ではない。共通`require_operation_ready`は現行preflight未完を理由に常に停止し、generation/attempt/supervisorの既存本番入口を副作用前に閉じる。既存条件付きテストだけでこのgateを明示mockし、旧115/zero-root prefix・mock child・entropyを返す前の中断検査を保持する。caller boolやコメント検証結果でgateを開けない。

### 限界と残り

- GitHub APIの現在のcreated_at/updated_atが一致しても、同一秒の編集・元へ戻す編集や、観測間で作成/削除された取消の完全履歴は証明できない。`historical_edit_absence_proven=false`。観測で分かる編集/取消は拒否するが、履歴不存在を保証しない。
- API読取・local消費・remote保存は単一transactionではない。全blob/editionのfresh再照合、remote消費記録の結果前固定、P14/15の乱数由来・時系列・巻戻し境界、P16の全必須証拠合成は未完。現時点で本番入口を開かない。
- request builderは供給された証拠へのbindingであり、それ自体はedition/package真実性を認証しない。今後既存capture/audit/remote検査と共通gate内でfresh合成する。`verify_live`のtrueは「現在の本人コメントがこのrequestを承認している」範囲のみ。
- P07〜12の全機会/情報実使用/operand由来も未完。P13全体完了・preflight-readyを主張しない。生成・開始の実承認は準備完了後に具体的なrequestを提示して別々に取得する。


## 2026-10-11 消費記録だけの後続commitへの結合

承認requestが指す公開commitから消費記録を保存するとHEADが進む。任意の新HEADへ認証を移せないため、`approval_publication.audit_committed_consumption`で親が承認commitただ1つ、親tree一致、差分が`A docs/card-game/data/proxy-population-approval-consumption/<comment ID>.json`だけの後続commitを検査する。merge/別親/追加変更/更新/別名/非通常blobを認めない。現行版追補であり実消費commitを作ったものではない。

Gitのimmutable blobからcanonicalな記録を読み、元request・comment ID・承認時の公開HEAD・local消費状態・証明範囲を照合する。その後、現在の本人commentを指定child HEADのPRでfresh再認証し、保存時commentとの一致とremote exact-refを確認する。公開`verify_live`の既定は承認版HEAD一致のまま。単なる任意overrideを公開引数へ追加しない。

このauditは読取専用で、commit作成・remote更新・実承認消費・seed生成・実行を行わない。現在のremote上の消費記録結合だけを扱い、過去のremote巻戻し不存在、結果前時系列、全編集/取消履歴はfalseのまま。generation/attempt/supervisorの共通gateも閉鎖を維持。各本番入口との最終合成とP07〜12/P14〜18は未完。
