# V7 B案 — 弦の音質・接続比較

基準は PR #547 / `25c69a0a78e7f72351ffad1836ec4932760f0552`。Bの編曲を保持したホーム4曲のみの試作。旧V7-A/BとV6の原盤・ゲーム本体は変更しない。

試聴: https://naoto214.github.io/naotocchi-playtest/bgm-v7-strings/

- **A（現在のB案）**: `/audio/v7/b/` の原盤を直接参照。元のV7-Aとは別の呼び方。
- **B1**: VSCO 2 CEの弱奏バイオリン＋チェロ・セクション。録音の安定区間、実測した固定音程補正、フレーズ接続、離音を改善。
- **B2**: B1のバイオリン＋Karoryfer x bigcatのソロチェロ。別録音への交換はチェロのみ。別の奏者・編成人数なので、品質だけでなく響きの個性も比較対象。

全体−23 LUFS、弦だけの短い比較−26 LUFS。再生位置と音量つまみは共通。朝62秒、昼49.8秒、夕56.8秒、夜25秒から比較可能。乾いた弦は比較用の再構成バスであり、旧原盤から分離した音ではない。原盤のフルミックスは再生成しない。

## 調査と対処

V7-Bは人工的なサンプルループを使用しておらず、ループ境界のノイズという原因は確認されなかった。生録音の立ち上がりが遅いサンプル（約0.5〜0.6秒）と、各音の先頭からの再発音・固定の離音が、フレーズ内の深い音量低下につながっていた。96隣接音のうち57組が調査用の低音量条件に該当したが、意図的な休符も含むため「57不良音」とは扱わない。

`performance.py`で楽曲ごとに接続するフレーズを指定。104音の発音位置・音高・楽譜音価をそのままに、83か所のフレーズ内接続を整えた。異なる音の受け渡しは120〜140ms。同音は同一録音の連続位置を使い、相関する波形を重ねて音量が膨らまないカーブにする。フレーズ末は音価に応じて減衰させ、フレーズ間休符は保持。

バイオリンの安定区間を個別に指定し、C4録音の中心音程約+21.8centなどを定数補正。録音本来のビブラートは残し、合成ビブラート・時間引伸ばし・人工ループを追加しない。音域はサンプルから最大2半音、B2チェロは最大1半音の範囲。ゆっくりした録音レベル変動だけを±3dB以内で校正し、V6の曲全体の強弱曲線はそのまま使用。高域EQ、ノイズゲート、残響増量で覆い隠す処理は使わない（従来相当の低域ハイパスは保持）。

より強いVSCOバイオリン8録音も調べたが、今回の音域で改善を裏付けられず採用しなかった。ビオラ13録音は調査対象のみで、現行Bにビオラ声部はないため追加しない。非調波成分の測定値は弓の自然な音も含み、ノイズ品質や聴感の優劣を直接証明するものではない。`source-audit.json` / `violin-layer-audit.json`を参照。

## 保護・検証

主旋律3158音、32曲ID・曲名、配置50行は基準ファイルをそのまま保持。BのMIDIはバイト一致でコピー。ピアノはSHA256照合済みのV6成分を使用し、夜の前半は同じピアノのみ。最終平均音量のため全体への一定ゲインは許容し、各receiptに記録する。新しい木管・鈴・シェイカー・ギターは追加しない。

音量、true peak、クリップ数、モノラル、AAC/FLAC、ループ接続、録音末尾超過、素材ハッシュを検証する。音質の最終判断は試聴が必要。Linux WebKit/Chromiumの動作検証はiPhone実機の聴感確認ではない。以前利用者が本体スピーカーで確認した `speaker-check-1` の出力経路・再接続・独立HTMLAudioElement確認機能を継承する。新音源のiPhone確認は利用者の試聴待ち。

## 音源と権利

- VSCO 2 CE / Versilian Studios、CC0 1.0。固定コミット `440300901dfe9275fd84e0b7763af1f8443ae62e`。https://github.com/sgossner/VSCO-2-CE
- Karoryfer x bigcat cello / Karoryfer・bigcat instruments、チェロ奏者 Kamila Borowiak、CC0 1.0。固定コミット `6fd75fbfc1dbb3109bf26220ba1adea46188a18b`。https://github.com/sfzinstruments/karoryfer-bigcat.cello / https://shop.karoryfer.com/pages/free-samples

ライセンス本文を同梱。CC0は商用・非商用の音楽制作、改変、再配布を許諾する。使用ファイルのURL・SHA256・音域・使用案は `samples.json` に固定。B2は柔らかい上げ弓の6録音を使用。ファイル名のオクターブ表記と実測の根音が1オクターブ異なるため、実測周波数（例C2ファイル約130.9Hz=MIDI48）に従ってマップした。

ピアノと原曲の権利情報は基準の `../bgm-v7-20261114/README.md` を継承する。新たな商用音源・権利不明素材は使わない。

## 再現

Python: numpy/scipy/soundfile/mido、FFmpegが必要。リポジトリの旧V2〜V7制作コードも依存する。

```sh
export VSCO_DIR=/path/to/VSCO-2-CE
export KARORYFER_DIR=/path/to/karoryfer-cello
export V7_WORK_DIR=/path/to/verified-v6-piano-stems
python prototypes/bgm-v7-strings-20261114/tools/download_samples.py
python prototypes/bgm-v7-strings-20261114/tools/performance.py
python prototypes/bgm-v7-strings-20261114/tools/test_strings.py
python prototypes/bgm-v7-strings-20261114/tools/render_strings.py
```

ピアノ成分の作成は基準V7の `tools/piano_stems.py`、期待ハッシュは `piano-preservation.json`。全入力を照合し、制作コードと入力・出力ハッシュが一致した音源は再生成しない。短い比較音源もキャッシュ照合対象。
