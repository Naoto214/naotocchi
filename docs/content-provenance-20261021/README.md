# 本編・なおぽよ・CARD GAME 横断コンテンツ由来調査

2026-10-21。調査のみ。正式カード・実績・あそび・画像・ゲーム処理は変更していない。
固定main: `a037b3abe4f97b6e9bfb4838e854161c53ece6ba`。
レスキューDraft #412: `5f410591b589061c09ef12483f72adda9a2c71ed`。

## 結果

- 正式452/452枚を網羅。歴史的な由来を確認452、推定0、不明0。**由来が確定しても、今の本編と内容まで一致するとは限らない。**
- メイン248・なかま26・こいびと18・あそび100・アイテム26・できごと21・セカイ13。
- あそび由来100枚。クリア目標→報酬アイテム由来4枚。個別の91実績バッジを直接の由来とするカードは今回の資料では確認0枚（創作時の影響が一切なかったという証明ではない）。
- カード単位の差異34件：伝説の現在名／内容との差5、成長形態名の差19、本編一覧名とカード名の差10。最後の10件は意図的な題名・テーマ名の差を含み、改名漏れと断定しない。
- 本編257要素（実績91、通常あそび100、Quick2モード＋50内部ゲーム、関連活動9、クリア目標5）。実装と静的な到達経路を確認し、全実績を実プレイ達成したとは扱わない。
- なおぽよ現mainは31種族×8段階。レスキューは未マージDraftの10面・dog/fish。fishの正式種族、今後の採用キャラは未確定。

## 読む順序・成果物

|ファイル|役割|
|---|---|
|CARD-INDEX.md / cards.csv|452枚の人間向け一覧・表計算での検索|
|cards.json|452枚の多対多由来、正式効果本文、根拠、アート、現状、変更影響の正本|
|source-to-cards.json|出典IDからカードIDへの逆引き|
|MAIN-CONTENT.md / MAIN-LINKS.md|本編一覧の読み方・全要素とカードの関係|
|main-content.json / main-content-linked.json|本編の定義・条件・報酬・実行可否。本体と由来を付加した版|
|NAOPOYO.md / naopoyo-relations.json|現main・旧作・Draft・提案を分離した関係一覧|
|FINDINGS.md / findings.json|カード単位の34差異|
|CROSS-SERIES.md / cross-series-findings.json|横断論点・未確定事項。34件に混ぜず別集計|
|impact-policy.md / change-impact.json|6選択肢の比較、出典・種族・実績単位の変更影響|
|SUPPORT-ORIGINS.md / support-origins.json|E/I/W60枚の詳細由来と旧候補の除外根拠|
|summary.json / verification.json|件数と機械検証結果|
|pr-snapshot.json / pr-metadata.json|調査時open16 PRの説明・Draft/refs状態。既存PRは変更しない|
|build.mjs|正本を読み、このディレクトリ内だけを生成・検証する補助スクリプト|

## 根拠と判定方法

現在のゲーム用 `prototypes/card-game/full-catalog.mjs` が正式452枚の集合。`engine.mjs:9` がこのカタログを使う。`cards.mjs` の旧部分カタログや過去477候補/HOLDを混ぜない。カタログに記載された出典文書はファイル名や冒頭が「draft」でも、現在本文の参照元として452件すべてSHA-256が一致する。古い文書の「未マージ・未選抜」だけを現在の採用状態としない。

キャラは本編マスターのstable ID・8段階と正本のカード対応を照合。なかま・こいびとは本文に明示されたsource IDを使用。あそびは文書32のstable ID対応表を、現在のgames.js/script.js一覧と照合。E/I/Wは明示source snapshotと現本編の関数・定数・IDを照合した。名称だけでは確定しない。

由来kindはcharacter/play/event/item/achievement/place。その他・独自創作・unknownを無理に埋めない。`achievement` の4件には `subkind:goal` と `GOAL_TIER.*` を明記し、個別バッジと区別する。独立した正式イベントIDがないものは関数・定数・年齢keyを出典アンカーとして記録しており、新しい公式IDを発行したものではない。source-to-cardsの `entity_key` はこの調査の名前空間付き検索キー。

専用絵は現在のCARD_ARTとart-deliveryの452レコード・Git treeの配信ファイル存在を照合し、制作inventoryの元画像参照/固定refも保存した。原画を全452枚再ダウンロード・目視審査したものではない。元画像設定の差から生じる「意味の不一致」は再確認候補までに留める。

## 再現と検索

リポジトリルートで：

```sh
node docs/content-provenance-20261021/build.mjs --check
rg 'I-naoto_crown|goal:GOAL_TIER.dex' docs/content-provenance-20261021/source-to-cards.json
```

`--check` は出力を書き換えず、カード集合・出典hash・画像リンク・生成物の一致を確認する。引数なしはこの調査ディレクトリ内の生成物だけを更新する。手作業で確認した入力JSONは上書きしない。疎チェックアウトの場合は参照元文書・キャラマスター・アートmanifest/inventoryを先に取得する。将来mainの変化へ自動追従するものではなく、別snapshotとして再調査する。

## 残る確認

- 全91実績の実プレイ達成、全あそびの端末動作は未検証。定義ありと到達可能性を区別し、ゲームパス装備等の条件付き制約を記録。
- 全452専用絵の最新設定との目視比較、効果テーマの全件主観評価は未実施。効果は別ゲーム向けの意図的な翻案であり、本編と数値が違うだけで不整合とはしない。
- レスキューの正式キャラクター採用と世界観統一、fishの正体、旧2作品の公開停止は今回決定・実行しない。
- 古い候補全477件を現役カードへ追加しない。旧4あそび、HOLD13イベント、退役アイテムは資料上で区別し、452外と確認。
- PRは調査時のsnapshot。後続更新があればそのHEADで再比較が必要。

実績・名前・カード効果・専用絵の変更判断は、なおぽよ完成後の別作業とする。
