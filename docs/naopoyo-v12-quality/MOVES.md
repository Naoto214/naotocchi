# VERSION 12追加 — 通常プレイの手数表示

2026-10-30 JST。[Draft PR #482](https://github.com/Naoto214/naotocchi/pull/482)。

## 実装と正本

ステージ名の右側に13pxの控えめな「42手」を表示する。桁幅を安定させるtabular-nums、手数の折返し禁止、ステージ名の省略処理を使用。既存のタイトル行・盤面領域・ボタン・safe-area paddingを維持する。新しいボタンや保存項目は追加していない。

既存の`q.state.moves`を描画するだけで、手数の算出処理は変更しない。1マスの合法な移動につき1手。合体・分裂・交換・救出が同時に起きても1手、自動落下や連鎖では追加しない。選択、不成立入力、メニュー、おてほんは加算しない。

1回のUndoは従来どおり一筆書き全体を復元する。42手から5マス進むと47手、Undo1回で42手になる。通常ボタンは「もどす」のまま。旧案内「1手戻しました」を「ひと筆ぶん戻しました。そのまま続けられます。」へ訂正した。白いpause被覆や再開操作は発生させない。

保存・再読込・クリア済み盤面は既存のstate.movesを保持し、リトライでは既存resetによって0に戻る。保存スキーマ、履歴単位、クリア／開放記録に変更なし。ランキングや評価は追加していない。

おてほんの「3 / 97手」などの表示は独立。前回の再生位置保持・解答識別・変更時リセット、11〜20の全解答はbyte単位で不変。通常プレイの手数をおてほん操作から書き換えない。

- 更新前HEAD: `b69953bae4d65f05e1f40c208debc1eada375cd7`。
- 配信実装HEAD: `4dfa17df30640253468f07bf95873ae784138344`。
- 配信実装tree: `2e8dd5e17a8c54d96b262798701bb111135c2195`。
- base: PR436の`feat/naopoyo-chapter2-gravity-pilot-20261024`、HEAD `ab937a22e2ae246b87b58932815dad2c4e8a2d87`。
- 最新main照会: `46349c362fae4bae99fbaddd2f94d10e7179479d`。
- 並行の同種族8＋8／A/Bモーション比較は[PR483](https://github.com/Naoto214/naotocchi/pull/483)として独立していることを確認。contact-v2実験は取り込んでいない。
- 変更先は`feature/naopoyo-v12-quality`のみ。PR436、並行する物理／モーション実験、main、本番Pages、V11 Siteには書き込んでいない。

## 自動テスト・ブラウザーQA

- 表示追加前、新規2テストがundefined≠0手/42手で失敗することを確認。実装後、重点22/22成功。
- 実アプリの入力ハンドラーで、ドラッグ中5手・指を離す前は履歴未確定、指を離すとUndo1件を確認。42→47→Undo42→Undo40→次移動41も検証。
- 全10面の新旧解答を維持し、全操作でmovesが1ずつ増加。合体・分裂・余剰・交換・救出・落下を網羅。クリア時と保存復帰時のmovesが解答長に一致することを確認。
- 第1章・第2章・Insight・World・v2・Rescue: ローカル949/949成功。
- Pages単体16/16成功。
- 独立レビューCritical/Importantなし。レビューの提案に従い、指を離す前の表示アサーションを追加し、横向きのタイトル折返しを防止した。
- Chrome実ページの機能13チェック成功（`moves-functional.json`）。5マス一筆書き、選択／不成立入力、Undo後0、同じゲーム画面、次の移動、リトライ、保存再読込、おてほん独立性を含む。
- 320×480、375×667、390×650、430×750、844×390。上下47/34pxのsafe-area相当余白あり／なし、0・42・47・999999・9007199254740991手を組み合わせた50条件で成功（`moves-layouts.json`）。文字重なり・画面外はみ出し・スクロールなし、桁数変更による盤面サイズ変化なし。最小画面＋余白時の盤面は既存レイアウト制約で237px。
- ネイティブのマウスドラッグでも、ステージ20の5マス連続入力→5手、Undo1回→0手を確認。画像は`moves-five-390.jpg`と`moves-undo-390.jpg`。

QA初回には、前のQAタブが残った状態での保存復帰不一致、通常時間が進む状態での生の保存JSON比較、非同期resize/描画が終わる前の寸法比較で失敗した。以前の自分のQAタブを閉じ、保存比較はpause状態をそろえ、寸法計測は実際のviewport/表示値の更新を待って再実行した。これらのために製品の保存・物理コードは変更していない。QAハーネスはGitHub資料として保存し、公開Siteには含めない。

## CI

[Naopoyo Chapter 2 Pilot / 40916684628](https://github.com/Naoto214/naotocchi/actions/runs/40916684628)は配信実装4dfa17dfを対象とする。全3ジョブcompleted/success。パズル949/949、CARD GAME494/494、本編Runtimeは単一npm testで32＋24＋3289＋159＝3504/3504、smoke/dialogue/visualも成功。fail/skip/cancel0。2026-10-30 02:26 JSTに完了。`moves-ci-summary.json`に集計した。CI合成HEAD `32167d114517eee4f22c88ed351c29b8e3db8eaa` のtreeは配信実装treeと同一。Runtime/CARDは完全checkoutのCIで検証し、前回ローカル環境で未展開fixture等により失敗したテストを成功扱いにしない。

## 本人限定配信

[VERSION 12本人限定試遊](https://naopoyo-v12-quality-20261030.kerzion214.chatgpt.site/prototypes/naopoyo-chapter2/qa.html)

- 同じSiteの保存番号2、ゲームVERSION表示は12のまま。
- Site source: `7aa9d2279c676680a70bddbce2c943fef7d5f577`。
- Deployment: `appgdep_6ae37bb296ac8191878c2a7d0cb6ca5f`、2026-10-30 02:00:47 JST成功。
- 配信sourceCommit: `4dfa17df30640253468f07bf95873ae784138344`。
- 本人1名、外部0、グループ0を維持。
- 全85ファイルが認証HTTP200/SHA-256一致、未認証qa.htmlは403。照合結果は`moves-delivery-hashes.json`。

最終PR HEAD/treeはPR説明欄と最終回答に記載する。配信実装以降は検証資料のみを追補し、コード・テスト・workflowを変更せず[skip ci]とする。

## 未確認

iPhone Safari/WebKit実機と実指操作は未確認。Chromeのiframe寸法・余白は実機検証と同一ではない。公開URLの認証後のブラウザー実操作は未確認で、開発プレビューの操作確認と配信全ファイル照合を組み合わせた検証。本人の実セーブを取得・変更していない。既存のlocalStorage全体拒否時の初期化制約、別Workの今後の物理変更は今回の対象外。
