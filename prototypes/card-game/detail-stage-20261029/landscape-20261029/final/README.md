# 最終微調整：横画面の「＋ 拡大」ボタン削除・状況表示の1行化（2026-10-29）

本人の iPhone Safari 確認（評価「結構いい」）を受けた最終微調整です。変えたのは次の2点だけです。

1. **横画面の「＋ 拡大」「－ 縮小」ボタンを出さない。** カードを押すと拡大し、もう一度押すと全体表示に戻ります（従来どおり）。縦画面のボタンはそのままです。
2. **状況表示の文言から、同じプレイヤー名の繰り返しをなくす（縦横共通）。**
   - 「Aのターン・Aの選択待ち」→「Aのターン・選択待ち」
   - 「Bのターン・Bの選択待ち」→「Bのターン・選択待ち」
   - ターンの持ち主と操作する人が違う時は省略しません（例「Bのターン・Aの応答待ち」「Aのターン・Bの効果選択待ち」）。
   - 「Aの通常行動」「対戦終了」は従来どおりです。
   - 同じ文言は、カード詳細の上部、操作パネルの見出し、2人対戦の交代画面、応答できない理由の説明で使われます。

変更したファイル: `ui-presentation.mjs`（`turnStatus`）、`ui-viewport.mjs`（横画面ではボタンを隠す）。CSS は変えていません。

## 状況表示（修正前 → 修正後）

測定は Chromium（タッチ・モバイル表示、2倍密度）です。[before.json](before.json)・[after.json](after.json)

| 画面 | 場面 | 修正前 | 修正後 | 拡大ボタン |
|---|---|---|---|---|
| 844x390 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → なし |
| 844x390 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 844x390 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 844x390 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → なし |
| 852x393 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → なし |
| 852x393 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 852x393 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 852x393 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → なし |
| 932x430 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → なし |
| 932x430 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 932x430 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 932x430 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → なし |
| 667x375 | choice | Aのターン・Aの選択待ち（2行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → なし |
| 667x375 | response | Bのターン・Aの応答待ち（2行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 667x375 | declare | Aのターン・Aの応答待ち（2行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 667x375 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → なし |
| 736x414 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → なし |
| 736x414 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 736x414 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → なし |
| 736x414 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → なし |
| 390x844 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | なし → なし |
| 390x844 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | なし → なし |
| 390x844 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | なし → なし |
| 390x844 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | なし → なし |
| 320x568 | choice | Aのターン・Aの選択待ち（2行） | **Aのターン・選択待ち**（1行・12px） | ＋ 拡大 → ＋ 拡大 |
| 320x568 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | なし → なし |
| 320x568 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | なし → なし |
| 320x568 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | ＋ 拡大 → ＋ 拡大 |
| 375x667 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | なし → なし |
| 375x667 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | ＋ 拡大 → ＋ 拡大 |
| 375x667 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | ＋ 拡大 → ＋ 拡大 |
| 375x667 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | なし → なし |
| 430x932 | choice | Aのターン・Aの選択待ち（1行） | **Aのターン・選択待ち**（1行・12px） | なし → なし |
| 430x932 | response | Bのターン・Aの応答待ち（1行） | **Bのターン・Aの応答待ち**（1行・12px） | なし → なし |
| 430x932 | declare | Aのターン・Aの応答待ち（1行） | **Aのターン・応答待ち**（1行・12px） | なし → なし |
| 430x932 | normal | Aの通常行動（1行） | **Aの通常行動**（1行・12px） | なし → なし |

- 状況表示と拡大ボタン以外の測定値（盤面・カードの大きさ・位置・本文の大きさ・ボタン）は、9画面×6場面の54件中 **54件が修正前と同一**でした。
- 修正前は、667×375 と 320×568 で「Aのターン・Aの選択待ち」が2行に折り返していました（本人の実機では 844×390 でも折り返し）。修正後は全件1行です。
- いちばん長い「Aのターン・Bの効果選択待ち」も、横画面の全条件（アドレスバー・セーフエリアの模擬を含む）で1行に収まりました。
- 文字の大きさは12pxです。667×375 でアドレスバーが出た時だけ10pxで、これは従来の低い画面向けの規則によるものです（今回は変えていません）。

## 検証

| 確認 | 結果 |
|---|---|
| 横画面の盤面・詳細のスクロールなし表示、アドレスバー・セーフエリア、拡大と復帰、拡大で保存が変わらない、状況表示が1行、拡大ボタンが出ない（[../checks.json](../checks.json)） | **195/195 PASS** |
| 横画面4サイズ（844・852・932・667）で実際に操作：たまごの手札交換、3択、応答中のパス、4つの装備先、宣言、連鎖中の応答、開閉・拡大と復帰（[stage-ops-landscape.json](stage-ops-landscape.json)） | **50/50 PASS** |
| 従来の3サイズ（320×568・390×844・844×390）の操作QA（[stage-ops-default.json](stage-ops-default.json)） | **42/42 PASS** |
| node テスト（状況表示の単体テスト1件を追加）・`browser.cjs`・`release-entry-browser.cjs`・`tests/pages` | すべて成功 |

## 比較画像（左: 修正前、右: 修正後）

| 画面（場面） | 修正前 | 修正後 |
|---|---|---|
| 844x390（choice） | ![](before/844x390-detail-choice.jpg) | ![](after/844x390-detail-choice.jpg) |
| 844x390（response） | ![](before/844x390-detail-response.jpg) | ![](after/844x390-detail-response.jpg) |
| 844x390（target） | ![](before/844x390-detail-target.jpg) | ![](after/844x390-detail-target.jpg) |
| 852x393（choice） | ![](before/852x393-detail-choice.jpg) | ![](after/852x393-detail-choice.jpg) |
| 852x393（response） | ![](before/852x393-detail-response.jpg) | ![](after/852x393-detail-response.jpg) |
| 852x393（target） | ![](before/852x393-detail-target.jpg) | ![](after/852x393-detail-target.jpg) |
| 932x430（choice） | ![](before/932x430-detail-choice.jpg) | ![](after/932x430-detail-choice.jpg) |
| 932x430（response） | ![](before/932x430-detail-response.jpg) | ![](after/932x430-detail-response.jpg) |
| 932x430（target） | ![](before/932x430-detail-target.jpg) | ![](after/932x430-detail-target.jpg) |
| 667x375（choice） | ![](before/667x375-detail-choice.jpg) | ![](after/667x375-detail-choice.jpg) |
| 667x375（response） | ![](before/667x375-detail-response.jpg) | ![](after/667x375-detail-response.jpg) |
| 667x375（target） | ![](before/667x375-detail-target.jpg) | ![](after/667x375-detail-target.jpg) |
| 390x844（choice） | ![](before/390x844-detail-choice.jpg) | ![](after/390x844-detail-choice.jpg) |
| 390x844（response） | ![](before/390x844-detail-response.jpg) | ![](after/390x844-detail-response.jpg) |
| 390x844（target） | ![](before/390x844-detail-target.jpg) | ![](after/390x844-detail-target.jpg) |
| 320x568（choice） | ![](before/320x568-detail-choice.jpg) | ![](after/320x568-detail-choice.jpg) |
| 320x568（response） | ![](before/320x568-detail-response.jpg) | ![](after/320x568-detail-response.jpg) |
| 320x568（target） | ![](before/320x568-detail-target.jpg) | ![](after/320x568-detail-target.jpg) |
