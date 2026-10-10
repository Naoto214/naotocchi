# P13 外部承認の信頼主体・認証方式（未承認案）

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
