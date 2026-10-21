# 124 保存履歴からのターン終了証明と独立再開 設計

状態: 123後の横断監査。対象は122の4件の同一停止state/hash。正本01・06・64、既存107/114/116/119/121/123を変更せず適用する。

## 入力と観察結果

122 stop rawと二重hash、117初期state/再生event 0〜3、120各event後の保存state 4〜7/5、122の判断/event/snapshot 6〜9/7を、既存validatorとraw bytesで検証する。4経路ともR1ターン終了入口で予約・pending trigger・activation zoneが空。117は初期そだち双方20、全snapshotで20、120はorder-01-a-firstの`E-first-date`即時解決後にA25、ほか20、122はそだち不変。117の配置対象はcard IDでP-cat_ceoまたはC-chameleon。P-cat_ceoは交際開始時、C-chameleonはセカイがある間の継続補正であり、終了時能力ではない。`E-first-date`は即時ドロー/+5だけで期限や予約を作らない。

123がfalseとしたのは、122の**単一最終state**に期限provenanceと100到達/中断履歴がないため。保存済みの連続event/snapshotを検証してこの2点を証明する一般のprovenance adapterが必要である。これは新裁定ではなく過去に保存された出来事の読取専用接続である。4経路すべて同じ欠落で、card copy/path固有の原因はない。

## 履歴adapterと情報境界

`derive_turn_end_provenance(verified_event_stream, verified_snapshots, text_registry)`は、初期stateから現在stateまでseqが連続し、event前後hashがchainし、snapshotとgame/continuation両hash、117→120→122のsource SHAが一致することを先に検証する。途中1件でも欠けたら全体のintegrity error。すべてのevent action typeと公開された発動card IDを本文分類registryへ照合し、各分類は「即時/期限あり/予約/100変化を起こし得る」を本文参照とともに持つ。未登録action/card ID、当該event内の中間そだち変動を証明できない効果、非公開情報が必要な分類はunknownとしてその経路を真正停止する。registryはcard ID/action typeを軸とし、path/order/card copy IDを条件にしない。

各snapshotの両者のそだちを初期20から時系列で記録し、効果内の中間増減はhandlerの実処理と本文から照合する。保存stateの最終値だけから「100に到達していない」と推測しない。期限・予約は初期空から、各eventに分類された作成/消費と保存stateを突き合わせる。公開盤面を全件分類し、相手のhandと双方deck順は意思決定に渡さない。再生のintegrity専用に既存保存bytes内のprivate領域を照合することと、候補判断に使うことを分ける。検査が通ったprovenanceだけを123の12条件へ投入し、保存`turn_end_set_complete`を入力に使わない。

## 123の手順と遷移

現在の4 stateでは、123の6手順について、(1) 空response閉鎖、(2) 期限到来予約0、(3) 公開盤面の終了時誘発0/response不要、(4) 期限切れ効果0、(5) 期限切れ由来trigger0、(6) R1かつ到達履歴なしにより早期勝利なし、を上記provenanceから全件再導出できた場合のみ`turn_end_set_complete=true`とする。後攻終了ならラウンド期限も同様に評価する。1件でもunknownならその経路だけ理由と最終seq/両hashを保存して動かさない。

完全性trueになった場合だけ、01/06/64の終了時刻を一度進め、期限・誘発・予約/勝利判定後に次プレイヤーのターン開始へ進む。event/snapshotごとにstate/hash/seqを保存し、ターン開始の期限・時回復・通常ドロー・たまご交換・開始予約/誘発は別の現在stateとして独立再監査する。既存正本でhandler・選択候補の完全性またはstate中間値を証明できない時点でその経路を真正停止する。通常行動は121で毎回再列挙し、107/114を適用、必要時のみ116。responseは119、次のターン終了は再び123+履歴adapterを使う。途中経路を完了/balanceとしない。

## 成果物、禁止事項、保存

専用の124 adapter/validator/testと4経路独立restart builder、固定source SHA付き計画/evaluation/必要なら新stop artifact、124報告、README、PR本文を作成する。JSONはUTF-8 indent 2 LF 末尾改行1件、再生成bytes直接一致。保存boolean、比較結果、以前のauditの借用を禁じる。120/121/122/123と112/116/117/119の保存物、本編、カード本文・数値・登録区分、452/477は読み取り専用。117旧テスト1件を修正しない。Draft PR #259をopen/unmergedに維持し、各安全区切りをGitHubから再取得する。

124の期待値を「4完了」に固定しない。4件の独立続行で証明できた範囲のevent/decision/snapshotだけ保存し、新しい共通不足には一般contract stop、既存正本で一意でない裁定にはユーザー確認を要求する。
