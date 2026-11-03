# VERSION 11 Implementation Plan

Goal: 最終監査80f9a7b2と2026-11-02本人指示に基づく最小修正・本人限定公開。
Spec: 本人の今回の正式配置決定＋v10-audit-20261102の監査。監査やデザイン選択はやり直さない。
Architecture: 本体3ファイル、4責務。V11属性で旧比較版と分離し、表示側だけ変更する。
Tech Stack: 既存vanilla JavaScript/CSS、Node harness、既存QA生成器、Sites。

## 制約
世界座標・歩行・接地・衝突・育成・会話本文・セーブ・正式背景は不変。Draft維持、main/Pages不変更。
42px/76px/9値/5+4、横右欄を維持。選択肢はコメント直上の一時overlay。
低画面は現在の縮尺・投影を保ち、カメラ復帰とアクセスで視認性を確保。全身不可能な条件は報告。

## Tasks
- [x] 1. script.js分類/表示管理: 上部全producerの優先queueと寿命を連携。下部storyを共通speechへ。通常雑談は破棄、重要発言と質問は保持。状態probeをRED→GREEN。
- [x] 2. home-production-layout.css: V11明色・内容幅・水平中央・名前画像2段・背景なしmeters・選択肢overlay。監査probeの色/中央/選択肢rectをRED→GREEN。
- [x] 3. home-production-touch.js: V11固定領域、スクロール/回転後のカメラ復帰。選択対象を維持し、操作中は追従を止め、終了後復帰。監査のscroll端再現をRED→GREEN。
- [ ] 4. 既存QAをV11へ展開し、縦4幅＋横2条件、短長文・連続・質問・28体操作を重点検証。独立レビュー後、PRに保存、既存owner-only SiteへV11公開。

## Review focus
1. hidden状態と実表示寿命のずれ、重要通知の消失。
2. 質問のpending状態が通常会話に壊されないこと。
3. overlayの高さ上限・操作hit・既存中央領域不変。
4. 28体探索と選択後追従、ドラッグ中のカメラ干渉。
5. lifecycle/非表示/旧比較版と現行セーブの分離。

Ruling: 本人は監査計画を選び実装と公開を明示承認済みのため、同じ設計の再承認を求めず進める。
Ruling: 本体3ファイル以外は検証・QA生成器・記録・配信provenanceの必要分に限る。全体監査・全ゲーム再実行は本人指示により行わない。

検証完了: runtime41/41、配信ガード11/11、WebKit12/12。レビュー指摘5件修正済み。PR保存・本人限定公開の完了IDはPR本文へ追記。
