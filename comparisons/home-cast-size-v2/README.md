# 28体のホーム　最終確認

[本人限定で最終版を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/?mode=final) ／ [320pxで差が出た森の初期配置を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/?mode=final&region=forest&count=28&time=day&paused=1)

本人が選んだ **主人公120%・恋人120%・仲間105%** で表示する。比較の基準は、それぞれが現行ゲームで同じ人数・奥行きに立ったときの大きさ。主人公の既存110%を反映済みの姿に対し、表示時の補正を一度だけ適用する。[採用記録](DECISIONS.md)

最終版の通常の入口は、みずべ・昼・28体で自律移動を再生する。「設定」で住民数（1・4・10・20・28体）、地域（13地域）、時間帯（朝・昼・夕・夜）を選べる。「現在の実寸を測る」はその瞬間の画面上のCSS pxで、原画の透明余白・装備を除いた本体の幅と高さを表示する。仲間はグループの中央値。「仲間ごとの実寸」を開くと各人の名前と寸法も表示する。地形や他の住民に隠れた面積は画像による別の検証で測った。

| 表示 | 主人公／恋人／仲間 | 配置と操作 |
|---|---|---|
| [現行サイズ](https://naotocchi-cast-size.kerzion214.chatgpt.site/?mode=current&region=forest&count=28&paused=1) | 100／100／100% | 元の初期配置と通常表示。#570で比較した現行サイズ |
| [採用サイズ・元の配置](https://naotocchi-cast-size.kerzion214.chatgpt.site/?mode=adopted&region=forest&count=28&paused=1) | 120／120／105% | #570の手動採用案 |
| [採用サイズ・最終配置](https://naotocchi-cast-size.kerzion214.chatgpt.site/?mode=final&region=forest&count=28&paused=1) | 120／120／105% | 最終確認用。初期配置を調整。「みんなを見る／いつもの表示」と84%切替を廃止 |

最終版と以前の配置を行き来すると同じ住民を読み直す。「固定」で揃えた初期状態を観察し、再生すると移動・接触・会話・ドラッグを試せる。住民の座標は正式ホームの地形と移動モデルが決める。V1の比較画面、A/B/手動の明示リンク、比較画像も保存した。[以前の比較ページ](https://naotocchi-cast-size.kerzion214.chatgpt.site/v1/)

## 本人確認で見てほしい場面

320×568の森で、4画素以上重なった組数は現行19組、#570の採用サイズ25組、最終配置9組。恋人の見える面積は採用サイズ・元配置の70%から100%になった。みずべは19組から13組、とかいは18組から11組、おうちは27組から5組。地形のマスクを通した実画面で比較した。390×844のみずべでは主人公38px、恋人28px、仲間の中央値22.5pxで、恋人の足元は主人公の約57px左奥にある。[4地域の比較画像](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/placement-320.webp) ／ [ペアの等倍画像](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/resident-pair.png) ／ [幅・人数別の実寸と重なり](VISIBILITY.md)

森と街の短い縦画面は、V5が立ち位置を決める帯と、原画の手前の芝生・舗道がずれている。画面中央で木や柵に足元が重なる場面が残る。採用サイズの確認後にこの接地を改善するには、地形の投影を原画に重ね、歩ける範囲と操作座標を一緒に確かめる工程が必要になる。今回の初期配置は経路や接触判定に介入しない。[操作・13地域の背景・セーブ復元](INTERACTION.md) ／ [移動V5・原画・環境・旧比較版の保護](PROTECTION.md)

320×568の森を28体のまま自律再生し、およそ15秒ごとに7回、画面に投影した原画の輪郭を数えた。#570の採用サイズで21〜24組（中央値23）、最終配置で18〜21組（中央値20）。最終版では約91秒で11回の移動開始・11回の到着を観察した。経過時間・経路は各1試行で異なり、住民は再び集まる。こちらは地形・画面端のマスクを通す前の推定で、上記の固定時の実画面とは測り方が異なる。旧配置の最終サンプルは共用機上で予定時刻を約39秒過ぎたため、この試験から停止原因や速度は判断できない。[従来配置の歩行記録](evidence/walking-adopted.json) ／ [最終配置の歩行記録](evidence/walking-final.json)

28体で起きる秒単位の停止は残る。390pxのみずべを使った短時間のChromium試験では最終版の最長間隔は約1.13秒。Linux WebKit・320pxの森では最終版が約1.84秒で、旧配置の採用サイズの約1.43秒を上回った。実機Safariでの見た目、入力の感触、長時間の応答を本人確認に残す。[住民更新・経路探索・描画・入力の測定条件と結果](PERFORMANCE.md)

比較ページには実際に地形と住民が描画されるまで待つ読込表示がある。Linux WebKitの共有CPUで他の計測が重なった回では、最初の背景描画に約67秒、操作準備に約79秒を要し、別の1回は120秒の試験期限を超えた。CPUを分けた再試験では4幅とも比較・設定・再生・旧版の復元を完了した。本人限定サイトを実機で初めて開く際の待ち時間は未測定。[Chromiumの比較操作](evidence/shell-chromium.json) ／ [WebKitの比較操作](evidence/shell-webkit.json)

320pxの森でV5の出口に短くドラッグすると、主人公を選択して実際に移動・到着することを確認した。足元から28 CSS px離れた任意の近傍7点では経路を受理しなかった。375pxの街、390pxのみずべ、430pxのおうちでも、実際のドラッグ後に歩いたことを記録した。[入力記録と地形による制限](INTERACTION.md) ／ [元配置と最終配置での短いドラッグの比較](evidence/short-drag-320.json)

## 検証と再現

完全なリポジトリを用意する。#569の基準チェックアウトから#570の保存版を再構築した後、V2を生成できる。出力先はリポジトリの外とし、各試作が生成時に基準データのハッシュを検証する。

```sh
git fetch origin refs/pull/569/head
git worktree add --detach ../leaf-reference 28628cf336a8ed92efe4e9e197ca03298b798a1e
node comparisons/home-cast-size-v1/build.cjs /tmp/naotocchi-v1 --reference-checkout ../leaf-reference
node comparisons/home-cast-size-v2/build.cjs /tmp/naotocchi-v2 --baseline /tmp/naotocchi-v1
node --test comparisons/home-cast-size-v2/*.test.*
python -m http.server 8202 --bind 127.0.0.1 --directory /tmp/naotocchi-v2
```

本番ゲームの配布対象と構成はmainの状態を維持する。#570で以前の比較データを作成した保存コミットは `e7d881b825622efddac61857075c2c1658da706f`。試遊にはその場だけのセーブを使う。

本人用サイトの保存バージョン3は `3e2b58fa494c4b2a9923f2eeb0a78b68d35d344d`。検証したゲーム・比較ページ3,900ファイルを試遊用の配布物とバイト単位で照合した。サイトの許可対象は所有者1名。匿名のリクエストでは入口・ゲーム・旧比較・比較画像の計6件すべてが401（要ログイン）になった。
