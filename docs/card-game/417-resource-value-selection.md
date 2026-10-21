# 417 — 別版選択wrapperと116接続

415 Task2を実装。比較器が返す非一意frontierを116へ委譲し、完全合法集合・抽選部分集合・seed証明・runner-upを既存validatorで検査する。新policyと比較証跡はwrapperへ分離し、116のstrict schemaを変更しない。一般frontierのchoice kindは承認済み414どおりで、旧contextとの違いを保存する。

専用8/8、既存116の現在36/36 PASS。計画にある34は116当時の歴史的数で、今回既存testを削らず36件を実行した。Task1の13件も保持。専用RED→GREENログ、改変検出、object分離、上位一意時の抽選なしを確認した。

114正本・414仕様・原本505 JSON・112未実施・過去結果は不変。新規対戦/event/decision0、独立balance標本0。旧／新パイロット結果は未実測、全proxy回帰は未実施。PR259 Draft/open/unmergedを維持。次は可視情報adapterとshadow比較。

保存前検査：npm test成功、catalog／既定設計検査errors0、原本505 JSON不変、空白検査成功。
