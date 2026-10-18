# 428 — 資源価値pilotの実測評価・統合検査

427 HEAD `2da75554f2d5ec6cf0ba3c68e7a093200acea714`から再開。414仕様・114正本は維持。PR259 Draft/open/unmerged。

## 実測評価

fresh shadowは予定110 IDすべてを保存。93局面を比較、17局面は過去の候補scopeとの差でunsupported。比較可能局面の選択差56/93（60.2%）。旧fallback・戦略比較不能4/93、新88/93（94.6%）。真正構造不備17/110と戦略比較不能88/93を別の母数にする。候補集合比較差0/93、seed context差88/93で、seed変更と候補変更を別集計した。これは強度・最適戦略の証明ではない。

|経路・方針|通常判断の有効/到達|真正停止|fallback|初回メイン配置|完了手番|
|---|---:|---:|---:|---|---:|
|legacy_107_114_116:probe-01-a-first|21/22|1/22|1/21|{'A': None, 'B': None}|14|
|resource_value_pilot_v1:probe-01-a-first|4/5|1/5|3/4|{'A': None, 'B': 1}|1|
|legacy_107_114_116:probe-01-b-first|22/23|1/23|1/22|{'A': None, 'B': None}|15|
|resource_value_pilot_v1:probe-01-b-first|2/3|1/3|2/2|{'A': None, 'B': 1}|0|
|legacy_107_114_116:probe-02-a-first|12/13|1/13|1/12|{'A': None, 'B': None}|8|
|resource_value_pilot_v1:probe-02-a-first|3/4|1/4|1/3|{'A': None, 'B': None}|2|
|legacy_107_114_116:probe-02-b-first|16/17|1/17|1/16|{'A': None, 'B': None}|11|
|resource_value_pilot_v1:probe-02-b-first|5/6|1/6|3/5|{'A': None, 'B': 2}|2|

共通で完了した手番は01-A R1/A、01-Bなし、02-A/BともR1/A・R1/B。比較対象の手番終了snapshotだけで成長・枠占有・残り時を記録する。その他の手番は相手方針をnullとし、停止時の観測そだちは最終値と分離。全8経路の最終そだち差・winnerは欠測。配置event、手札プレイ、盤上/準備発動、効果解決、予約の変更/ピーク、個体遷移を別欄にする。同じ札の発動と解決を二重にプレイへ数えない。

新版はメイン配置へ到達した一方、fallbackが増え、メイン候補証明・装備adapterの未対応へ早く到達した。通常候補の完全性と資源価値の優劣を証明できる範囲が限られるため、新方式の改善とは断定できない。旧4の停止は候補監査のscope差であり方針効果として扱わない。

## Task 5の区切り

Ruling: Task 5の完了契約は「8 IDを同じ初期入力から実行し、未知handlerは真正停止で残し、独立再生と旧到達prefixを検証する」と解釈する。414/415は全8の完走を必須にしていない。427以降のcard別adapter追加をこのpilotの必須範囲にしない。誤っていれば処理coverageが不足するが、欠測・停止理由を公開し、採用判断は保留する。

今turnのfresh8 run＋各独立再実行は427の全raw bytesを完全再現（SHA256 `da96502819911c579bd5895116192524398a6b7b5db4a673b29319d3dee39d71`）。完了0/停止8/未実施0、旧4の到達prefix一致。メイン系統証明、装備先state表現、旧監査scope差は未対応のまま保持。Task 5のrun/replay adapterとTask 6の指標を完了扱いにする。

## 検査と保存

評価11テスト、統合6テストはRED→GREEN。専用全pilotテストの最終結果はverification/pilot-green-428.logへ保存。npm test exit0、catalog/既定検査errors0、原本505 raw変更0、空白検査成功。AST908は静的inventoryでPASS数ではない。歴史190/221/263とproxy_test_count263は保持。

fresh shadowの圧縮原本とraw/gzip署名、427 signed deltaの完全復元、評価JSONを保存。統合validatorは欠落/重複ID、評価改変、署名、selection証拠、505/参照原本、promotion/balance除外を検査し、設計検査へ接続する。旧結果を変更しない。

Task 7の全proxy回帰・remote照合と最後の独立レビューは次工程。全回帰前の復旧checkpointとして428を保存。112 fixtureは未実施、独立balance標本0、114正本変更/Ready/main mergeなし。

[評価JSON](data/proxy-resource-value-pilot/evaluation-checkpoint-428/evaluation.json) / [署名manifest](data/proxy-resource-value-pilot/evaluation-checkpoint-428/manifest.json) / [fresh shadow圧縮原本](data/proxy-resource-value-pilot/shadow-checkpoint-428/shadow.json.gz)
