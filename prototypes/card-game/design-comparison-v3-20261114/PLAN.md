# CARD GAME VERSION 3 Implementation Plan

Goal: ユーザー指定の B3 / B3-A / B3-B を独立比較し、名前とブランドの不要な枠を減らす。
Architecture: V2 の CSS を byte-identical な base-v2.css として保存し、新案だけに上書きを限定。既存の読み取り専用カタログ出力・操作を継承。
Tech Stack: HTML / CSS / ES modules。外部依存の追加なし。
Spec: このターンの VERSION 3 指示（2026-11-14）。正式採用ではない。

## Constraints
- PR #551 のみ。V1/V2・正式カード・PR #498・main・Pages を変更しない。
- 公式14色・マーク・画像・裏面・効果・数値・保存形式は維持。
- B3 元案のカードCSSと構造を保ち、A/Bだけタイトル背景・ブランド背景・効果欄を調整。
- 公開先は既存 owner-only Site の /v3/。

## Tasks
- [x] build.mjs / base-v2.css / design.css / app.mjs / index.html: 独立3案、全14色、追加7枚、表裏、拡大、ルビを実装。
- [x] verify.mjs / title.test.mjs: 459データ・画像SHA・28旧ファイル・B3基準CSSを確認。
- [x] Chrome UI: 320/375/390/430幅、3案、長名、全色、反転、拡大、ルビを確認。背景色の数値評価も保存。
- [x] README / verification: 限界を記録。GitHub保存→owner-only更新。

## Review focus
濃色の先頭文字、ルビと分類の距離、長名とコスト、長文の読める拡大、元B3を変えないこと。
