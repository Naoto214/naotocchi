# 猫の表情パイロット QA（2026-09-15）

対象は成長段階 `assets/characters/cat/06.png` のホーム画面メイン個体だけ。通常顔は元画像を使い、喜び・つらい・すねるの3画像を追加した。通常ゲームのセーブ、ゲームルール、ケア判定、ほかの姿、なかま・こいびとの画像は変更していない。

## 画像の検証

|用途|ファイル|SHA-256|寸法・形式|アルファ|不透明色数|
|---|---|---|---|---|---:|
|元画像|`assets/characters/cat/06.png`|`8f6beedbfd82135cfc17c24d3aa5ea1869c9344f65b0a21e3950995c5768c6da`|128×128 RGBA|0 / 255|63|
|喜び|`assets/characters/expressions/cat/06-happy.png`|`98c1b745b65ce17aaace98cc210de623f238563f4bbcab59bd0afebfb60074f8`|128×128 RGBA|0 / 255|52|
|つらい|`assets/characters/expressions/cat/06-strained.png`|`66c8e780bd8365b45676d60c6d4be762a025976694b58963be649b293509c7aa`|128×128 RGBA|0 / 255|52|
|すねる|`assets/characters/expressions/cat/06-sulky.png`|`72ff579e670c081fe888c26dfee5181fb16d04aab3508ef9c2ad0f2b4a07e0ba`|128×128 RGBA|0 / 255|53|

ルート提供の正規化記録によると、3画像は元の成猫画像から個別生成され、シート切り出しは行っていない。各出力は ImageMagick でアルファ50%しきい値、透明余白の trim、元画像と同じ96×112の不透明範囲への最近傍リサイズ、128×128透明キャンバス中央配置、透明色を含む64色量子化、PNG32エンコードを行った。全画像の不透明範囲は `[16, 8, 112, 120]`。元画像は上記ハッシュのまま変更されていない。生成画像はルートが姿と表情を目視確認済みだが、胴体のピクセルは元画像と完全一致しない。

自動テストは PNG signature、IHDR（128×128、8-bit RGBA、非インターレース）、展開後のアルファ値、個別ハッシュ、3ファイルの相違、元画像ハッシュ、ランタイム allowlist の全パス実在を確認した。

## 使い捨てプレビュー

生成コマンド:

```sh
node tools/cat-expression-preview.cjs cat-expression-check.html hungry
```

`buildPreview({preset='hungry'}={})` は現在の `index.html` と `tests/helpers/runtime-harness.cjs` の `freshState()` を使い、25歳・`cat`・stage index 5 の個体を作る。`normal`、`hungry`、`sick`、`tired`、`sulky`、`critical` のリンクはページ内で子ゲームだけを再初期化し、URL値と選択値はこの6種類だけを受け付ける。既定は、食事後の回復と最新状態への復帰を確認しやすい `hungry`。

ゲームは操作欄の下の全幅 iframe で動き、子文書の利用可能な高さを使う。子文書内で最初のゲームスクリプトより前に、新しい `Map` ベースの `localStorage` を設置する。初期値はメモリ上の `naotocchi-save-v1` だけで、通常保存領域を読み書きしない。VM検査では、生成した実物の bootstrap を外部ストレージ sentinel とともに実行し、外部の読取・書込が0件で、sentinel内容も不変であることを確認した。通常の `index.html` はこのツールを読み込まない。

未対応の姿や不明な表情は `assetFor` が元画像を返す。表情画像の読込失敗時は成猫の元画像へ戻り、その元画像も失敗した場合だけ既存の絵文字フォールバックへ進む。

## 自動結果

|コマンド|結果|
|---|---|
|`node --test tests/pet-expression-assets-test.cjs tests/cat-expression-preview-test.cjs`|8成功、0失敗|
|`node --test tests/pet-expression-test.cjs tests/pet-expression-integration-test.cjs tests/emotion-state-test.cjs tests/emotion-integration-test.cjs tests/care-status-integration-test.cjs tests/cast-motion-test.cjs tests/time-pause-test.cjs`|115成功、0失敗|
|`npm run bump`|成功、`index.html` の2トークン更新|
|`npm test`|smoke / dialogue / visual QA 成功、Node 665成功、0失敗、0 skip|
|`git diff --check`|成功、出力なし|

## iPhone 実機確認

この作業ではブラウザ・実機を操作していないため、次の全項目はユーザー確認待ち。

|項目|状態|
|---|---|
|通常顔と3表情（喜び・つらい・すねる）の見分けやすさ|未確認|
|空腹 → ごはん → 喜び → 最新状態への復帰|未確認|
|じゃれる成功と連打時のすねる表情|未確認|
|病気への正しい薬と、健康時のまちがった薬|未確認|
|一時表情終了時に古い状態でなく最新状態へ戻ること|未確認|
|危険状態が喜びより優先されること|未確認|
|視差効果を減らす設定で静止した表情切替が残ること|未確認|
|なかま26体で元の配置を保つこと|未確認|
|使い捨てプレビューの操作欄が年齢表示・ケアボタンを覆わず、通常保存へ影響しないこと|未確認|

## 実機動画からの修正：切り替え待ちと実績通知

ユーザー動画では、状態リンクごとにホスト画面全体の読み込み待ちが発生し、表示後に25歳の実績通知が表情を通常顔へ戻していた。確認ページのリンク操作をページ内で処理し、使い捨ての子ゲームだけを再初期化するよう変更。成猫の初期データでは10歳・25歳の既到達実績を取得済みにして、起動時の通知を防ぐ。通常ゲームの実績判定や保存形式は変更していない。

回帰テストは、実際の起動時saveStateで通知が顔を隠す失敗（RED）と、リンク操作で上位ページへ遷移せず選択状態を子ゲームへ渡す失敗（RED）を確認し、修正後は7件成功。`npm test` は前段チェックおよび667件成功、0件失敗。修正後のiPhone表示は再確認待ち。
