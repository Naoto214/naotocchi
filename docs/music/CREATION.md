# 新曲制作・書き出し・品質基準

既存32曲は完成原盤として固定。新曲の目的/場面から独立した旋律を作り、既存32曲の旋律をテンプレートへコピーしない。制作票は`music/templates/composition.md`。

B2＋/V7の知見：楽器数を増やすことより、適正な音域の録音・自然な接続・必要な余白を優先する。ピアノは短音用に切ったキャッシュを長音へ流用せず、必要な全長・ペダル・リリースを維持する。弦は専用legato録音の限界を意識し、和声変化をまたぐ機械的な全音重ねを避ける。音域から遠い録音の引き伸ばし、人工ループ、耳障りな弓ノイズをEQ/残響だけで隠さない。フレーズに沿うcrescendo、頂点前の静けさ、旋律と低音/対旋律の受け渡しを設計する。random velocityではなく音楽的な意図を持たせる。ピアノの余韻を保ち、不要な鈴/シェイカー/ギター刻みを自動追加しない。

使用済み音源はVSCO2CE（commit4403009、CC0-1.0）とKaroryfer x bigcat Cello（commit6fd75fb、演奏Kamila Borowiak、CC0-1.0）。固定URL・原文・サンプルSHAは`music/sources.json`と`music/provenance/samples.json`。残り28曲の実録音選択は各receiptのnativeSourceUses、ホームはpiano-sourcesとB2資料の固定リンクを参照。調査だけで使ったSalamander等は採用音源に含めない。

別音源は利用/再配布条件・帰属表示・原文SHA・固定参照を確認し、sourcesへreviewed:trueとして記録してから使用する。権利未確認のものは自動採用しない。元の2音源の記録を改変せず、新しいsource IDを追加する。

書き出しは新曲だけ。44.1kHz stereoのFLACを原盤として保存し、AAC-LC M4AとMIDIを別ファイルにする。MIDIとscore.jsonの音高・発音時刻を一致させ、移調/テンポ変更があれば制作段階で整える。FLACのframe数からdurationを記録する。AACのcodec paddingを曲尺として延長しない。

```sh
# NEW-IDを実際の新曲IDに置き換える。既存のパスを指定しない。
ffmpeg -n -i music/candidates/NEW-ID/master.flac -c:a aac -b:a 192k -movflags +faststart assets/bgm/NEW-ID.m4a
ffprobe -v error -show_streams -show_format music/candidates/NEW-ID/master.flac
```

CLIは音源の制作やリマスターをしない。必要なら新曲のDAW/レンダラーを独立作業で用意する。過去の制作コードはPR549の固定コミットに保管されており、既存曲を再生成するためには使わない。

## 音量

共通再生ゲイン0.36、個別0dB。用途別の参考範囲はpolicy.json：ホーム約−24〜−22LUFS、睡眠−32〜−29、叙情−28〜−23、ゲーム−27〜−23、ジングル−26〜−18。これらは強制正規化の目標ではない。短いジングルは尺/ピーク/役割を考慮し、音量差だけで悪いと判定しない。曲内の自然な強弱は保つ。

## 自動品質検証

FFmpeg ebur128（BS.1770 K-weighting、I:400ms/100ms、絶対−70/相対−10ゲート、M:400ms、S:3秒、LRA:相対−20）で測定。True Peak≤−1dBTP、clip0、AAC/FLAC尺差≤0.1秒、±1024sample内で位置合わせした全体相関≥0.98、RMS差≤0.5dB。loop境界差はmax(0.08,通常sample差分99.9百分位×2)以下。これらは技術的な異常検出で、音楽の美しさ/自然なloopを保証する聴感評価ではない。新曲は比較試聴とユーザー承認も必要。

原盤に宣言された調性が無い既存曲は、台帳でdeclared:nullとし、旋律pitch-classに基づく推定を別記している。推定を作者の指定と混同しない。録音サンプルだけでは連続弓圧/専用レガート遷移や楽器別マスキングの完全評価はできない。
