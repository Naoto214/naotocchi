# なおぽよ。v2 — 重力とひと筆

独立試遊。足し算合体、8超過の余剰分離、1取り出し分裂、重力連鎖を同じドラッグで操作。
正式版12面、#422の追加12面、先行#427、既存セーブ・画像は変更しない。

- [確定仕様・裁定](../../docs/naopoyo-v2-gravity-20261023/SPEC.md)
- [検証と実機手順](../../docs/naopoyo-v2-gravity-20261023/QA.md)
- [最終配信結果](../../docs/naopoyo-v2-gravity-20261023/DELIVERY.md)
- 保存キー `naopoyo-v2-gravity-20261023`、version 3。以前の保存とは別。
- `node --test prototypes/naopoyo-v2/tests/*.test.mjs`
- `node prototypes/naopoyo-v2/build-preview.mjs <別の出力ディレクトリ>`
- `qa.html` の保持ボタンは合成PointerEvent。キャプチャshimはQA iframe内だけ。通常画面のnative dragも別途確認する。
