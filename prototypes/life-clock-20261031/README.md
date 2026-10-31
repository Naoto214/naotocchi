# 人生の時計 — 本人評価用デザイン試作

正式CARD GAMEの青銀の植物紋章裏面を回収し、丸型A/B・角型C/Dの4案を制作。**未採用・発注前・本番非変更**。

- [比較ページのソース](dist/index.html)
- [4案比較画像](evidence/four-designs.jpg)
- [原本照合画像](evidence/originals-comparison.jpg)
- [ゲーム中の使用例](evidence/game-use.jpg) / [3本の重なり](evidence/hands-overlap.jpg)
- [通常時計の室内イメージ](dist/assets/normal-interior.png)
- [原本の特定・デザイン・製造検討](REPORT.md)
- [検証結果](evidence/static-verification.json) / [画面幅QA](evidence/width-qa.json)

生成画像は意匠検討用。文字盤の正確な数・角度・3色の同径円・針の長さは `dist/clock.mjs` の操作図で比較。生成画像は目盛り間隔・装飾・針長・色に微差があり、量産用版下ではない。

## 起点と保護

- Repository: `Naoto214/naotocchi`
- 起点remote main: `7c1f18c77b902d06159157899c36104e5d8c4a8d`
- 起点tree: `a7428ff33b5d74a8776ede91fa2d24e2ec22905f`
- Branch: `design/life-clock-20261031`
- 差分はこの新規ディレクトリ内のみ。正式裏面・452枚・CPU・ルール・セーブ・Pages allowlist・本編は不変。
- `node prototypes/life-clock-20261031/tools/verify.mjs` で原本同一性、実rendererの非公開分岐、図の幾何、保護範囲を検証。

本人限定Sitesは専用ソースcheckoutへdistをコピーして配信する。本番GitHub Pagesとは別。Site情報と最終保存情報は `PUBLICATION.md` を参照。
