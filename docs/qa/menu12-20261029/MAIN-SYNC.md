# 最新main統合・再QA（2026-10-29）

PR開始HEAD: 86bbcec286116ff30770c4b39d2814ca7e177381。
取り込んだmain: 59b3cca1fcc7ce0b1598440698107c6b4dd6fb41（旧基準から20コミット）。

index.html / package.json / tools/pages/allowlist.jsonの競合を解消。mainのgames.js・script.js採点処理・CARD GAME style.cssを保持。mainに対するscript.js差分は準備中ダイアログの戻る処理2行のみ。既存ゲーム・物語本文・署名の追加改変なし。PR #461や他PRのrefは変更しない。

## 再検証

Cloud Chrome実画面で320/375/390/430 × 480/600/740pxの12条件PASS。全条件で上47px・下34pxをQA用CSSで確保。12項目・6行2列・最下段完全表示・内容の切れなし・カード44px以上を確認。480px時カード53px。main-sync-matrix.jsonが測定値。

既存11項目を実際にクリック。せかい/あいてむ/ずかん/じっせき/シールちょう/でざいん/ゲーム一覧を表示。QuickはLv1・0/20で開始。なおぽよ。はCHAPTER01・1/10盤面へ自動遷移。CARD GAMEは対戦準備・CPU設定を表示。ものがたりは全6章・豊田直人署名を確認し、ゲームにもどる→メニューを再表示。全編プレイの試験ではない。

なおころ。は3回の開閉、Escape、背景の物語カード位置への実クリックで遷移しないこと、ブラウザーBackでダイアログのみ閉じメニューが残ることを確認。

- メニュー/overlay/time-pause/story-navigation/asset-versions: 19/19成功。
- 最新mainの採点回帰: 26/26成功。
- Pages単体: 16/16成功。初回は疎なcheckoutの資料不足、次は環境容量不足で失敗。正本の必要ファイルを復元し、別マウントの一時領域で再実行して成功。
- 配信allowlistの全パス・依存・容量・レビュー済みハッシュ検査成功。公開前にGit blob全件照合を行う。

比較画像は同じ390×600＋上下81px条件: main-sync-before-390.jpg / main-sync-after-390.jpg。320×480はmain-sync-after-320.jpg。

## 限界

iPhone Safari/WebKit実機とOS文字拡大は未確認。320×430＋上下81pxは既存測定でスクロールが必要。この物理条件を合格扱いしない。共有プレビューが別作業へ切り替わった際の404/別ページ表示は検証から除外し、復帰確認は正しいプレビューを再起動して完了した。

全体Runtimeは最新PR HEADのGitHub CIで確認。以前のHEADの成功を流用しない。Draft維持、mainマージ・本番Pages更新なし。
