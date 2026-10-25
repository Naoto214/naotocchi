# v16 最終検証記録

## 最終実装の実行結果

`full-final.log` はキャッシュ整合修正後に開始し、最後までexit 0で完走した `npm test`。Node testの集計は202 + 26 + 24 + 3225 + 138 + 9 + 15 = **3,639成功、0失敗、0skip**。同じnpmチェーン内のsmoke/dialogue/visual QAスクリプトもexit 0。以後、ゲーム実装・CSS・index・allowlistの変更なし。

- CARD GAME: 412成功、0失敗 (`card-game.log`)
- なおぽよ。各プロトタイプ: 526成功、0失敗 (`naopoyo-final.log`)
- Pagesの保護テスト: 16成功 (`pages-tests.log`)
- v13〜16重点テスト: 32成功 (`focused-final.log`)、asset integrity: 6成功 (`asset-integrity-final.log`)
- 配布物: 4,062ファイル、静的参照1,695、動的参照2,954、カード452／画像904、除外経路7の404確認、欠落0、hash不一致0 (`package-report.json`, `http-report.json`)
- 自動ブラウザー: 22条件・403表示サンプル、問題0 (`matrix-final.json`)。1/3/13/28体×320×568、320/375/390/430×844、追加の水辺／都会28体。
- 同じ7領域の位置・高さ、42px／76px、9メーター／9操作、横はみ出し、移動bounds、44px以上の選択ボタンを検査。通常質問を回答し、返答を記録。28体では仲間イベントも共通欄内で確認。

## 途中の失敗を最終結果と分離

- `red.log`: 機能追加前の期待どおりの3失敗。
- `review-red.log`: 遅れて解析されるdialogを取り込めない回帰1失敗。修正後の `review-green.log` は14/14。
- `full-before-cache-fix.log`: 実装後だがcache token修正前に開始。asset-integrityの2失敗。これを全体成功として扱っていない。
- `naopoyo.log`: 疎checkoutで正式manifestが未取得の1失敗。正本復元後526/526。
- `matrix-first-errors.json`: iframeの高さ568→844変更の完了前に基準寸法を測ったため、2条件で206差分。初期リサイズの完了待ちを追加し、同じ検査・同じ22条件を再実行して0。許容誤差や検査対象を弱めていない。
- QA runnerのiframe切替待ちと会話終了待ちも修正。これらは試験ページだけで、ゲームの処理は変更していない。

## 視覚QA

- [左右の修正前後](zzz-before-after.png)
- [0〜3600msと起床](zzz-sequence.png)
- [左右の軌跡の重ね合わせ](zzz-trajectory-overlay.png)
- [8成長段階](zzz-stages.png)
- [通知と会話の同文比較](text-before-after.png)
- [28体・390×844](home-28-390x844-game.png)
- [28体・320×568](home-28-320x568-game.png)
- [仲間選択肢・320×568](exchange-28-320x568-game.png)
- [通常3択](choices-normal-game.png)／[長文3択](choices-long-game.png)

`captures.json`に実DOMのpath、矩形、話者画像、本文を保存。元の全画面JPGと加工前のゲーム領域PNGも保存。画像の合成は `tools/home-v16-evidence.py`。キャラ画像を生成し直していない。

左右とも、本体座標に対する最初のZの位置差は x=0、y≈0.000015px、幅／高さ差0 (`anchor-comparison.json`)。画面絶対座標は本体の既存の呼吸モーションによる0.85pxの差があるため、本体基準で比較した。ZのSVG pathは同一、path変換はtranslateのみ。頭部位置・文字形状を変えていない。

短文のHey!は14→20px、おやすみモードは従来の小さい全幅表示から18pxのコンパクト表示へ。長い日本語は14px、英語は内容と幅により17／14px。長文質問は全文を欄内スクロールして3つ目を選択できた。仲間の質問・回答も実操作で確認。

全画面スクリーンショットで、背景、正式画像、主役中心の配置、5＋4操作・メーター、話者表示、文字の折返しを確認。小画面では既存の縦スクロールを使用する。iPhone実機のセーフエリア、指スクロール、長時間性能は本人QA待ち。

## 公開の制約

Draft #426を維持。本人限定Sitesのみ同URL更新。main merge／GitHub Pages本番更新はしない。GitHubの修正後HEADとCI状況、Sites source/version/deploymentはPR説明と最終報告に記録する。実機QA未完了を「正式採用済み」と扱わない。
