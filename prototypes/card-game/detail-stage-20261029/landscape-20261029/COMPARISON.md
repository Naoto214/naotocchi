# 横画面の修正前後の比較（2026-10-29）

左が修正前（PR #477 `b340f80c`＋main取り込み）、右が修正後。同じ保存場面・同じカード・同じ画面サイズ（Chromium、タッチ・モバイル表示、2倍密度）で撮影しました。

縦画面（320×568・375×667・390×844・430×932）は、修正前後で測定値24件がすべて一致し、スクリーンショット32枚もバイト単位で同一でした（修正後の縦画面画像は同一のため保存していません。[before/](before/) を参照）。

測定値: [before.json](before.json)・[after.json](after.json)、追加確認: [checks.json](checks.json)・[checks/](checks/)

## 基本盤面

| 画面 | 修正前 | 修正後 |
|---|---|---|
| 844x390（target） | ![](before/844x390-board-target.jpg) | ![](after/844x390-board-target.jpg) |
| 844x390（choice） | ![](before/844x390-board-choice.jpg) | ![](after/844x390-board-choice.jpg) |
| 852x393（target） | ![](before/852x393-board-target.jpg) | ![](after/852x393-board-target.jpg) |
| 852x393（choice） | ![](before/852x393-board-choice.jpg) | ![](after/852x393-board-choice.jpg) |
| 932x430（target） | ![](before/932x430-board-target.jpg) | ![](after/932x430-board-target.jpg) |
| 932x430（choice） | ![](before/932x430-board-choice.jpg) | ![](after/932x430-board-choice.jpg) |
| 736x414（target） | ![](before/736x414-board-target.jpg) | ![](after/736x414-board-target.jpg) |
| 736x414（choice） | ![](before/736x414-board-choice.jpg) | ![](after/736x414-board-choice.jpg) |
| 667x375（target） | ![](before/667x375-board-target.jpg) | ![](after/667x375-board-target.jpg) |
| 667x375（choice） | ![](before/667x375-board-choice.jpg) | ![](after/667x375-board-choice.jpg) |

## カード詳細

| 画面・場面 | 修正前 | 修正後 |
|---|---|---|
| 844x390（target） | ![](before/844x390-detail-target.jpg) | ![](after/844x390-detail-target.jpg) |
| 844x390（many） | ![](before/844x390-detail-many.jpg) | ![](after/844x390-detail-many.jpg) |
| 844x390（choice） | ![](before/844x390-detail-choice.jpg) | ![](after/844x390-detail-choice.jpg) |
| 844x390（response） | ![](before/844x390-detail-response.jpg) | ![](after/844x390-detail-response.jpg) |
| 844x390（declare） | ![](before/844x390-detail-declare.jpg) | ![](after/844x390-detail-declare.jpg) |
| 844x390（normal） | ![](before/844x390-detail-normal.jpg) | ![](after/844x390-detail-normal.jpg) |
| 852x393（target） | ![](before/852x393-detail-target.jpg) | ![](after/852x393-detail-target.jpg) |
| 852x393（many） | ![](before/852x393-detail-many.jpg) | ![](after/852x393-detail-many.jpg) |
| 852x393（choice） | ![](before/852x393-detail-choice.jpg) | ![](after/852x393-detail-choice.jpg) |
| 852x393（response） | ![](before/852x393-detail-response.jpg) | ![](after/852x393-detail-response.jpg) |
| 852x393（declare） | ![](before/852x393-detail-declare.jpg) | ![](after/852x393-detail-declare.jpg) |
| 852x393（normal） | ![](before/852x393-detail-normal.jpg) | ![](after/852x393-detail-normal.jpg) |
| 932x430（target） | ![](before/932x430-detail-target.jpg) | ![](after/932x430-detail-target.jpg) |
| 932x430（many） | ![](before/932x430-detail-many.jpg) | ![](after/932x430-detail-many.jpg) |
| 932x430（choice） | ![](before/932x430-detail-choice.jpg) | ![](after/932x430-detail-choice.jpg) |
| 932x430（response） | ![](before/932x430-detail-response.jpg) | ![](after/932x430-detail-response.jpg) |
| 932x430（declare） | ![](before/932x430-detail-declare.jpg) | ![](after/932x430-detail-declare.jpg) |
| 932x430（normal） | ![](before/932x430-detail-normal.jpg) | ![](after/932x430-detail-normal.jpg) |
| 736x414（target） | ![](before/736x414-detail-target.jpg) | ![](after/736x414-detail-target.jpg) |
| 736x414（many） | ![](before/736x414-detail-many.jpg) | ![](after/736x414-detail-many.jpg) |
| 736x414（choice） | ![](before/736x414-detail-choice.jpg) | ![](after/736x414-detail-choice.jpg) |
| 736x414（response） | ![](before/736x414-detail-response.jpg) | ![](after/736x414-detail-response.jpg) |
| 736x414（declare） | ![](before/736x414-detail-declare.jpg) | ![](after/736x414-detail-declare.jpg) |
| 736x414（normal） | ![](before/736x414-detail-normal.jpg) | ![](after/736x414-detail-normal.jpg) |
| 667x375（target） | ![](before/667x375-detail-target.jpg) | ![](after/667x375-detail-target.jpg) |
| 667x375（many） | ![](before/667x375-detail-many.jpg) | ![](after/667x375-detail-many.jpg) |
| 667x375（choice） | ![](before/667x375-detail-choice.jpg) | ![](after/667x375-detail-choice.jpg) |
| 667x375（response） | ![](before/667x375-detail-response.jpg) | ![](after/667x375-detail-response.jpg) |
| 667x375（declare） | ![](before/667x375-detail-declare.jpg) | ![](after/667x375-detail-declare.jpg) |
| 667x375（normal） | ![](before/667x375-detail-normal.jpg) | ![](after/667x375-detail-normal.jpg) |

## 拡大表示（修正後、カードを押した状態）

| 画面 | 拡大 |
|---|---|
| 844x390 | ![](checks/844x390-zoom.jpg) |
| 852x393 | ![](checks/852x393-zoom.jpg) |
| 932x430 | ![](checks/932x430-zoom.jpg) |
| 736x414 | ![](checks/736x414-zoom.jpg) |
| 667x375 | ![](checks/667x375-zoom.jpg) |
