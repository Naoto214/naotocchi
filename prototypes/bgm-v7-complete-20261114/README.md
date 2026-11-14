# なおとっち BGM VERSION 7 — 全32曲完成版

ホーム4曲B2＋を利用者がiPhoneで比較して正式採用。原盤FLAC/AAC、MIDI、receipt計16ファイルをHOME-LOCK.jsonで固定し、コピーのみで収録しています。元のPR #546/#547/#548を変更せず、独立Draft PR #549へ保存。保護タグ: `bgm-v7-home4-b2plus-approved-20261114`（元コミットc9c4b82）。

最終試聴: https://naoto214.github.io/naotocchi-playtest/bgm-v7-complete/

32曲を順に再生し、最終曲で停止。ホーム4曲は採用原盤のみ。残り28曲はV6と同位置・共通音量で切替可能。V7でiPhone本体スピーカー出力確認済みのspeaker-check-1を継承し、AudioSession playback宣言、AudioContext再接続、独立HTMLAudioElement診断を保持。新しい完成版32曲の実機での聴感・出力は最終試聴で確認してください。WebKit試験を実機スピーカー確認とは扱いません。

## 音楽と音源

残り28曲のV6楽譜はオブジェクト全体が同一です。主旋律・基本音価・開始順序・velocity・フレーズ設計・対旋律・和声・配置を保持。新しい音符はありません。改善は録音の選択と演奏処理に限定しています。

- ピアノ、ハープ、打楽器: 最初に短い音を描画すると同じ録音の長い音も短くなるキャッシュを修正。原録音全長を保持してから必要な長さを取り出します。ピアノのペダル・0.60秒離鍵・打鍵補正はV6を継承。
- 木管: 特定レイヤーが高音しかない場合でも、近い音域の録音から選択。フルート71に84の録音を使用する旧処理を解消。持続音の移調は最大2半音。速い木管は約18–22msの発音を維持。
- 弦: 全曲を室内楽にせず、弦群が必要な飛行/冒険は弦群を保持。event-2、kisetsu、bgm-farewell、fishing-a、lullaby-aの既存低音だけB2系のKaroryferチェロへ。弓圧やビブラートを人工生成せず、原録音の揺れを使用。
- 発音/離音: 曲別に軽快、躍動、広がり、叙情、祝福の方針を指定。和音の同時発音を単旋律レガートとして誤処理せず、padの和声境界を考慮。対旋律の短い自然減衰は許容し、意図的な休符を一律に埋めません。
- ミックス: V6の用途別ラウドネスと声部バランスを保持。圧縮で盛り上がりを作らず、リミッターのゲインリダクションは0dB。

録音による弦は専用レガート遷移・連続弓圧表現には限界があります。自然な弓/息の成分まで除去するノイズゲートや過剰な残響は使用せず、録音長を超える人工ループも禁止。数値検査は聴感上の美しさを証明するものではありません。

## ライセンス

VSCO 2 Community Edition、固定440300901dfe9275fd84e0b7763af1f8443ae62e、CC0-1.0。ピアノ、木管、弦群、ハープ、打楽器等。Karoryfer x bigcat Cello、固定6fd75fbfc1dbb3109bf26220ba1adea46188a18b、CC0-1.0、演奏Kamila Borowiak。加工・楽曲への利用・配布が可能。LICENSE-*.txtとsamples.jsonに原文、固定URL、SHA-256を保存。実際の録音選択・音域・使用フレームは各receiptのnativeSourceUsesに記録。自作shell効果音は既存処理のままです。

## 再開・検証

Pythonにnumpy/scipy/soundfile/mido、FFmpegを用意。VSCO_DIRとKARORYFER_DIRに固定音源を配置。既存prototypesの制作コードも依存先として保持しています。

```sh
export VSCO_DIR=/path/to/vsco-2-ce
export KARORYFER_DIR=/path/to/karoryfer-cello
export OPENBLAS_NUM_THREADS=1
python prototypes/bgm-v7-complete-20261114/tools/test_native.py
python prototypes/bgm-v7-complete-20261114/tools/render.py --group 1
python prototypes/bgm-v7-complete-20261114/tools/verify.py --group 1
# group2/3/4も同じ。完成済みは入力・出力ハッシュ一致時にskip。
python prototypes/bgm-v7-complete-20261114/tools/verify.py
python prototypes/bgm-v7-complete-20261114/tools/verify_encoded.py
```

HOMEをrender対象に含めると処理を拒否。既存receiptの入力不一致も自動再生成せず停止します。録音取得はsamples.jsonの固定URLとハッシュで復元可能。追加音源は旧tools/download_samples.pyでも取得できます。

verification/group-1..4.jsonにグループ単位の音量・ピーク・mono・loop・hash、full32.jsonに全曲保護チェック、encoded-audio.jsonに全AACの独立照合を保存。explore-2の旧測定器の周期位置誤判定はaac-alignment-diagnosis.mdに記録。音源再生成なしで検査記録のみ訂正しました。

試遊版への準備/検証はtools/prepare_playtest.pyとverify_playtest.py。許容変更は完成版AAC32本、固定比較アーカイブ、比較ページ、catalogの音源hash/キャッシュ参照だけ。ゲーム条件・セーブ処理・本番mainは変更しません。本番へのマージ/公開は利用者の最終承認待ちです。
