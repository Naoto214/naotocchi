# P14–18 現行editionの準備証拠と運用入口の合成

実装順序: current-preflight-composition Task4。既存承認済みGitHub account/API＋保存editionを実際に実行するoperatorの信頼範囲で、保存された最終検証と既存運用認証を結合する。新しい比較意味論、本人代理承認、汎用の署名認証を追加しない。

## 準備と実行の分離

新current_preflightは生成物を作らず、既存履歴から新標本を算入しない。現在のPython版とsource集合、全必須責務、最後の関連試験、既存入力による全結合、設計検査、保護正本、独立レビューを一つの保存済み証拠へ結合する。試験成功やcaller boolだけではreadyにならない。準備のreadyと全対戦の適格性は別であり、116除外/上位unknown/全体結論nullを変更しない。

証拠はコードを固定したcommitと、その子孫のevidence保存commitを分ける。試験後に許す変更はverification出力の追加と既存進捗3文書だけ。元の全source blobは不変、Pythonの追加/削除/変更は一つでも拒否。最終検証後の変更に過去PASSを流用しない。証拠の自己参照hashを作らず、実行editionへ最終reportと原log/指紋/結合原本を含める。

## 共通運用gate

external_approval.require_operation_readyはstageと実repository/editionを受けて、保存済みcurrent準備証拠・全source/Python一致を検査する。証拠未作成/欠落/別版/未解消失敗では従来どおり閉鎖。ここで返るのは既存の各stage認証へ進むための準備条件だけであり、承認やentropy利用・対戦開始の許可を返さない。

生成入口はその後、既存generation_authorizationで本人の生成request・claim-only commit・fresh remoteを確認し、metadata保存後にも既存editionを照合してからOS材料収集へ進む。開始入口は既存完全7artifact package・生成claimからの直接親子関係・結果前の別launch claim・固定400順を照合する。開始の承認は生成の承認と別。worker前後のedition、単独worker起点、重複/欠落/中断時全400/200予定保持、retry/resume禁止を再利用する。

OS由来と時系列は、承認済みoperatorが保存editionを実行する信頼仮定の下で、この順序を通過した運用記録に限る。保存JSONだけからOS乱数を独立観測したと主張しない。過去remote巻戻し不存在や未観測取消の不存在を新しくtrueにしない。

## 実装前の否定試験

- 準備証拠なし/false、試験失敗/不完全log、欠落component、別Python指紋、別source/版、未完走結合、未解消レビュー、設計errorを拒否。
- stage取り違え・生成承認の開始流用・別request/package/publication・改変editionを副作用前に拒否。
- 条件付き正常経路は既存115/合成資料とmockを使用し、entropy返却前・実worker前に停止する。本番seedは生成しない。
- 最終版を保存して関連試験/完全結合/設計/保護照合を行い、独立レビュー1回。修正があればRED→GREENで固定版証拠を更新。

現在は設計記録のみ。新current_preflight module/readiness reportはまだ未作成、本番gate閉鎖、preflight-ready=false、生成/固定/400戦0。
