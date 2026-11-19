# 海・森の実画面検証

比較の対象は海の夏・晴れ・夕方と森の夏・晴れ・昼。強度100%、通常速度、同じ保存フィクスチャを使った。実ホームの結果と元絵に対する背景合成だけの結果を区別している。

## 環境条件とアクセシビリティ

Linux WebKit 26.5 の Canvas で、実際の4枚の時間帯原画に各地域の描画関数を適用した。2地域 × 4案 × 4時間帯 × 4季節 × 4天気の512通りが描画できた。160×240画素で RGB のいずれかが4階調以上変わる画素を数えた。

- 32組の地域・案・時間帯すべてで、強度0の原画との差は0画素。100%と200%には各組で可視差が出た。
- 「動きを減らす」では、描画器へ23.25秒と57秒を明示的に渡しても32組すべてで差は0画素。住民の自律判断、機器の表示リフレッシュ、原画自体の時間帯切替を含まない測定。
- 海E3の季節単独の差は、時間帯ごとに最大64～105画素。天気単独では最大5,878～8,074画素。森E3は季節184～2,353画素、天気1,661～2,597画素。比較時刻23.25秒における晴天・夏との条件別差で、該当物のある部分にだけ季節が出る。

[条件別の画素集計](evidence/conditions-webkit.json)・[検証に使った合成処理](verify_conditions.js)

## 再現方法

ローカルの比較ビルドを用意し、Python の Playwright・Pillow と Chromium または Playwright Linux WebKit を用意する。

```sh
python verify_v4.py http://127.0.0.1:8194 duration
python verify_v4.py http://127.0.0.1:8194 ui --engine webkit
python verify_v4.py http://127.0.0.1:8194 conditions --engine webkit
python verify_v4.py http://127.0.0.1:8194 matrix
python verify_v4.py http://127.0.0.1:8194 matrix --engine webkit
python verify_v4.py http://127.0.0.1:8194 switch
```

Linux WebKit のiPhone相当幅は、タッチ対応・DPR 2のLinuxブラウザーを用いた。iPhone Safari実機のタッチ遅延、パネルへの表示完了、発熱、電池消費は未検証。
