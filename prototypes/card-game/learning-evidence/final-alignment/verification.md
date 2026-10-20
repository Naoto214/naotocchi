# PR #403 最終UI調整 検証記録

実施日: 2026-10-20。対象はメインカード共通レイアウトとチュートリアル表示のみ。

## 開始点

- PR: https://github.com/Naoto214/naotocchi/pull/403 （open / draft / unmerged）
- HEAD: `66bd7e3b80c869c5588773afaceb766bea11d59e`
- tree: `d533829ec089890a6c4fb18415556c874ab5a538`
- remote main: `db9ea8e8d86c632a68ed8ab4880968803f78a243`
- mainとの直接差分: 63 files, +4774/-26。浅いcheckoutのため三点差分の共通祖先は取得せず、二点比較とPR情報を使用。
- 開始時CI: Pages runtime package failure、Runtime smoke/Home layout in progress、World pending。Pagesの既存allowlistにlearning-ui.mjs/rulebook-content.mjs/learning.cssがない件は今回の変更前から存在。

## カードの原因と修正

原因は静的画像でなくCSS共通テンプレート。240pxカードで分類バッジの高さ11.4375pxに対して行が9.84pxしかなく、タイトルと約0.8px重なる。左右のアイコン群・数字の円はtop:8%基準で、タイトル帯中央より約4px上にずれていた。

分類行と種族行を固定寸法で確保し、バッジを行内中央へ配置。左右はタイトル帯の50%を基準に中央配置し、枠線・影が外にはみ出さない寸法に統一。基本文字サイズ7.2cqw、タイトル17cqw、自然な2行分割を維持。個別カード補正なし。

比較対象は巣作りアリジゴク②、丸いあかちゃん①、子がめ③（1行）、よごれたぬいぐるみ④（2行）。丸いあかちゃんは「丸い／あかちゃん」の2行を維持。240px詳細、100px通常、48pxコンパクトを確認。

全4カードのタイトル帯・イラスト・能力・効果・署名の外枠座標は前後で一致。240px時の y/height は、タイトル帯10.59375/67.75、イラスト81.71875/128.828125、能力213.921875/33.875、効果251.171875/84.703125、署名339.25/10.15625。

- [カード比較（上:前／下:後）](cards-comparison.jpg)
- [変更前の測定（12件の不整合）](cards-red.json)
- [変更後の測定（合格）](cards-green.json)
- 再現用: `cards.html` を静的サーバーで開く。測定モジュールは `tests/ui-final-layout.browser.mjs`。

## チュートリアルの原因と採用方式

固定高さのダイアログ内に説明・CPU盤面・自分盤面・操作・手札を詰め、盤面ラッパー内でもスクロールする構造だった。変更前の自分盤面ラッパーはclientHeight約214pxに対し内容222pxで下段がクリップ。盤面の下端644.28pxに対して操作パネルが642pxから始まっていた。

A/B/Cを併用。操作パネルは通常フローで盤面の後に置き、盤面内のスクロールを廃止。説明はSTEPと見出しを残して詳細を折りたたみ、説明展開状態を再描画で維持。全体を単一の縦スクロールにし、手動スクロール位置を保持。「次の操作へ」で対象を表示し、手札が閉じていれば開く。操作後の誘導も対象が画面外の場合のみnearest/instantで行い、不要なジャンプ・アニメーションを避ける。

自分盤面は通常対戦同等の最小260pxを確保。CPUは縦132px、横は双方280px。自分側カード86px・手札48×72pxを保持。操作パネルは盤面の8px下、手札はさらに下。対面配置・中央メイン・正立・内部IDは変更なし。CPUのメイン以外のカードは縦画面で従来のサムネイル＋名前を維持（レビューで検出し修正）。

- [盤面比較（左:前／右:後）](tutorial-comparison.jpg)
- [CPU全体と自分盤面](tutorial-after-top.jpg)
- [説明展開](tutorial-expanded.jpg)
- [幅320pxの準備枠と手札](tutorial-320.jpg)
- [横画面の自分3×3全体](tutorial-landscape-board.jpg)
- [横画面の操作と手札](tutorial-landscape-hand.jpg)

## 検証結果

| 検証 | 結果 |
| --- | --- |
| Chromium・同一origin iframe 390×844 | CPU9枠、自分9枠、準備3枠、非重複、手札操作、説明開閉 合格 |
| 320×568 | 横はみ出しなし、準備3枠すべて表示可能、操作対象誘導 合格 |
| 844×390 | 双方280px、縦スクロールで自分9枠を同時に確認、手札へ誘導 合格 |
| 390×700への高さ変更 | 盤面・パネル非重複、内側クリップなし 合格 |
| 詳細カード表示・閉じる | 盤面復帰と対象操作 合格 |
| blur→再開 | 練習一時停止・再開 合格（実機アプリ切替とは別） |
| チュートリアル | DOM操作で9STEP完走。合法CPU行動、保存分離、途中復帰、再開 合格 |
| 単体・UI回帰 | 175/175 pass、0 fail（focused.log） |
| DOM回帰 | learning / tutorial-board / collection / menu / my-decks CPU / my-decks hotseat 全成功 |
| 非公開情報 | hotseat引き継ぎ、CPU手札の秘匿、学習保存分離の既存テスト成功 |
| 新規差分テスト | 手札を閉じた状態の誘導をRED→GREENで確認。実ブラウザでカード・盤面矩形のRED→GREEN確認 |
| reduced-motion | 新規誘導は常にinstant。既存のreduced-motion CSSを維持。OS設定での実機試験は未実施 |
| 独立レビュー | CPU非メイン表示の指摘を修正後、再レビューで残存指摘なし |

実行した単体テストはui-*.test.mjs、learning、tutorial-match、cpu-ui、cpu-policy、cpu-session、collection、my-decks、art-cpu-integration。DOMテストはJSDOM_PATH=/tmp/collection-dom/node_modules/jsdomで実行。my-decksはTEST_MATCH_MODE=hotseatも実行。

**実機未確認:** iPhone Safari/WebKit、Safariバー開閉そのもの、非ゼロのsafe-area inset、実際のOSアプリ切替。390×844→390×700は可視高さ変化の代替検証であり、Safari実機合格とは扱わない。既存のenv(safe-area-inset-*)余白は維持。本人の最終実機QAが必要。

## 保護範囲・公開

実行時変更はstyle.css・learning.css・learning-ui.mjsの3ファイルのみ。452枚の専用アート、カード定義・名称・数値・効果・ID、正式ルール、CPU判断、response/chain、たまご、デッキ・453種コレクション、保存形式、Python、固定400戦資産、他ゲーム・3Dは無変更。全452枚の再監査・400戦の再実行はしていない。FUN_ITEMS不整合は別件。

本人専用試遊版は既存URL・所有者限定のまま更新。配布対象959ファイルがGitHub作業ツリーとbyte一致、既存root redirectを加え960ファイル。QA fixtureは配布しない。mainマージ・GitHub Pages更新は行わない。公開の確定情報はpublication.json参照。
