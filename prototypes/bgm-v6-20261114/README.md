# なおとっち BGM VERSION 6

V5の録音差補正を保ち、32曲それぞれの既存フレーズに沿って表情を設計した版。主旋律の音高・発音順序・時刻・長さは変更しない。

`profiles.json` の小節座標（0始まり）は曲別に指定した表情の目印。なめらかな補間で既存音の強さを変え、木管・弦・対旋律の前後を整える。新しい音符を自動生成しない。V5の音を削除せず、不要な重なりは控えめに演奏する。V4/V5のペダル・リリース・残響・音色を引き継ぐ。

## 再現

Python 3.12、numpy/scipy/soundfile/mido、FFmpeg 7.1.5。VSCO_DIRにV2のsamples-manifest.jsonと一致するサンプルを置く。

```
python prototypes/bgm-v6-20261114/tools/arrange_v6.py
VSCO_DIR=/path/to/vsco python prototypes/bgm-v6-20261114/tools/render_v6.py --stage 1
python prototypes/bgm-v6-20261114/tools/verify_v6.py --home
# 続いて --group 2, 3, 4, 5 （各7曲）
```

音源ハッシュに加え、楽譜・描画コード依存関係・固定サンプルマニフェストの指紋を検証し、完成済み曲は再生成しない。各グループをGitHubに保存する。

`profiles.json` は全32曲の9項目の**楽譜分析と編曲意図**。自動計測や楽譜分析だけで美しさの聴感を保証するものではない。検証値と試聴確認を混同しない。実機iPhoneでの最終試聴は別途必要。
