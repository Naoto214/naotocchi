# なおとっち E3+　葉・雪・雨の動作比較

[本人限定の比較ページを開く](https://naotocchi-e3-falling.kerzion214.chatgpt.site/)

左が#567のE3、右が落下モーションを調整したE3+です。中央の境界を動かすと、一つの背景と同じ住民の位置で両案を見比べられます。「分割比較」で単体表示に切り替えられます。スマートフォンでは右上の「設定」で重点場面と調整項目を開けます。

## 重点場面

| 場面 | 標準設定で見える違い |
| --- | --- |
| [もり・秋・昼](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=forest-leaves) | 20枚まで。原画の9か所の枝先から葉が離れ、表裏を返して落下します。隣の樹冠へ風が移ると、一部の葉が短く浮き上がります。 |
| [もり・春・昼](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=forest-petals) | 花びらは浅い椀形に開閉し、秋の葉より長く空中を漂います。落下と回転の速さ、左右の揺れの位相を変えています。 |
| [ゆきぐに・冬・昼](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=snow-day) | 降雪時は40片まで。奥は細くまっすぐ、手前は大きく、枝に吹く風で広い弧を描きます。 |
| [ゆきぐに・冬・夜](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=snow-night) | 同じ降雪が家の灯りの前を横切ります。窓のすぐ近くの雪だけに暖色が乗ります。 |
| [いなか・秋・夕](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=country-leaves) | E3は夕方に葉を描いていません。E3+には樹木と畦から疎らに6枚まで加えました。草と葉が同じ方向に風を受けます。 |
| [うみ・夏・昼・雨](https://naotocchi-e3-falling.kerzion214.chatgpt.site/?scene=sea-rain) | 雨筋は23本まで。1滴ごとに降り始めの風で傾きを決め、着水まで直進します。岸の波と水面8か所の雨輪は各自のリズムを保ちます。 |

4つの落下設定は標準100%。粒子数は0〜150%、大きさは50〜200%、落下速度は25〜200%、風は0〜200%。0%の粒子数で背景の揺れや水面だけを観察できます。住民は1・4・28体、再生速度は通常・低速から選べます。地域は全13地域。おうちの窓雨はガラス面を伝い、しんかいの泡や星空・きおくのみずうみの浮遊光はそれぞれのE3演出を保ちます。試遊条件はURLに記録されます。

## モーションと検証

葉と雪は、原画中の放出位置で横風の履歴を積分し、個体ごとの揺れを重ねています。通過した風の強さと落ち葉の向き・表裏の回転を組み合わせ、風が過ぎると落下を続けます。風のサンプルは軌道ごとに固定長の配列に蓄えます。再生時計を戻すと同じ動きになります。雨は落下中に方向を変えません。

- 180秒の森で、樹冠の曲がりが大きかった4,632サンプルすべてで、秋の葉の風による横流れと枝の風向きが一致しました。20枚のうち9枚で短い上昇を観測しました。上昇は観測の0.66%です。花びらの平均落下速度は秋の葉の約65%、回転速度は約56%でした。[軌道検証](fall-motion.test.mjs)
- 雪の半径中央値は遠景1.87、中景2.94、近景4.17原画px。左右速度の絶対値の中央値はそれぞれ5.82、9.90、15.06原画px/秒。海の雨は無風時に鉛直、標準風では3分間の観測の76%が鉛直±2度、最大の傾きは10.71度でした。[降水検証](precipitation.test.mjs)
- #567の別ビルドと52背景を比較しました。晴れ・曇りのフェード途中・雨・雪・雪の低減設定の計260条件で、V6内の基準E3のCanvas画素が全件一致しました。重点6場面で30・60・180秒の両案、分割の両端、各スライダーの変化も照合しました。[画素比較](evidence/reference.json)
- 比較案やスライダーを切り替えた後も28体すべてが同じ住民要素を使い、停止時の画像・位置・サイズ・前後関係が一致しました。「動きを減らす」で落下を止め、幅320・375・390・430pxをLinux WebKitで確認しました。[住民と保存](evidence/bridge.json)・[画面幅と操作](evidence/controls-wpe.json)
- パッケージ中の3,863ファイルが固定したmainのGitオブジェクトとバイト一致しました。試遊用ホームの4ファイルには生成時に比較接続を加えています。独立したカード図鑑の拡大画像452点は固定コミットの原画像を参照します。[配信物照合](evidence/packaging.json)
- 住民数別のフレーム間隔・内部更新・描画時間、28体の停止とiPhone実機での未検証事項は性能報告にまとめています。[性能・操作検証](QUALITY.md)

## 再現

基準E3は#567の `fae83a21915f9ada92f4ac13ac1aaacd397e333d`、ゲーム本体はmainの `38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053`。このDraftはmainから分岐し、比較フォルダーと専用の読み取り専用CIを追加します。ゲーム本体のアセット許可リスト、移動モデル、キャラクター、BGM、保存形式は保護対象です。

完全なチェックアウトで以下を実行します。出力先はリポジトリの外に置きます。

```sh
node --test comparisons/home-beauty-v6/*.test.mjs
node comparisons/home-beauty-v6/build.cjs /tmp/naotocchi-fall-preview --fresh
python -m http.server 8196 --bind 127.0.0.1 --directory /tmp/naotocchi-fall-preview
```

Chromiumの基準照合では別のチェックアウトで#567の `comparisons/home-beauty-v5/build.cjs` を使い、8195番ポートで配信します。以下はPlaywright for Pythonを使用します。

```sh
python comparisons/home-beauty-v6/verify_reference.py http://127.0.0.1:8195 http://127.0.0.1:8196 /tmp/falling-reference.json
```
