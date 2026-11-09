# なおとっち — 採用32曲・完成版BGM VERSION 1

PR #534で選ばれた32曲を収録した完成音源集です。選曲は確定済み。比較案・再評価ボタンは設けていません。

本人用試聴ページ: https://naotocchi-bgm-master32-v1.kerzion214.chatgpt.site

## 収録物

- AAC再生音源32、FLAC原盤32、編曲MIDI32。
- ホーム朝昼夕夜はPR #530のアレンジAのAAC・FLAC・MIDIをバイト同一で継承。
- 他28曲はVSCO 2 Community Editionの録音サンプルで編曲。ピアノ、フルート、マリンバ、ハープ、弦、ピチカート、ベル、トランペット、打楽器を用途別に配置。
- 飛行・海はベルとハープのきらめきを加えた120 BPM版。睡眠・パズル・釣りは音数と音量を抑制。
- 孵化ファンファーレは原曲冒頭2小節・120 BPM、導入0.35秒＋旋律4秒＋余韻2.4秒＝6.75秒。金管・ベル・ティンパニ・シンバルと最後のE♭和音。
- 既存のnotify等の効果音、ゲーム本体、以前の試聴版・MIDI・譜面は変更していません。

曲名・用途・ID・編曲説明: [TRACKS.md](TRACKS.md)。配置表50行: [PLACEMENT.md](PLACEMENT.md)。全指定を保持した機械可読版: `placement.json`。

## 正本と継承

- PR #534: `3060388f624deb7787d0f23006595493caecbfdc`。README、最終実行状態のADOPTED・TABLE・DECISIONS、曲データ、変奏、MIDI、譜面、本人メモを参照。
- PR #530: `12411ea5df21d357678749335773571c13252688`。ホーム4曲の既存アレンジA。
- `source.json`に採用32曲を丸ごと保存。`source-lock.json`に依存した原資料のSHA-256を保存。
- `ohayo`（おはようのひかり）と`explore-2`（そらとうみのさんぽ108版）は採用32曲に含まれますが、最終配置表には直接割り当てられません。各原曲を収録し、実際の配置には`var-ohayo-hatch2`と`var-flight`を使います。
- 配置表は50行（採用47・無音扱い3）。誕生日は新曲を作らず、BGM継続＋既存notify。なおぽよ。失敗時もBGMを止める意味ではありません。各行の文章をそのまま保持しています。

## 音源仕様

| 項目 | 新規28曲 | 継承ホーム4曲 |
|---|---|---|
| 再生用 | AAC-LC / M4A / 44.1kHz / stereo / 160kbps目標 | AAC-LC / M4A / 32kHz / stereo / 128kbps |
| 原盤 | FLAC / 24bit / 44.1kHz | FLAC / 16bit / 32kHz |
| 旋律 | 原曲の音高・開始・譜面音価・テンポ・小節・反復を保存。離鍵は既存エンジン同様96% | 既存Aの演奏を変更せず保存 |
| ループ | 指定の反復を含む曲全体。余韻と室内反射を周期的に折り返す | 元のAの音楽周期 |
| ジングル | 自然減衰。孵化以外の5曲は音楽周期＋1.2秒余韻 | — |

音量はホームを−23 LUFS基準とし、静かな用途は低め、孵化は−19 LUFS。ピークを抑えるための過剰なリミッター・音圧圧縮は使わず、基本は線形ゲイン。ベルや金管の高域を穏やかに処理し、中央の旋律と控えめな左右の伴奏でモノラル再生も保ちます。数値は`decoded-metrics.json`を参照。

## 次のゲーム統合に渡す契約

`catalog.json`の`id`を曲IDとして維持し、`placement.json`の`songs`と結びます。`duration`は余韻を含む配信ファイルの有効秒数。通常曲は`loopStart=0`から`loopEnd=duration`、ジングルは`loop=false`。孵化以外のジングルの音楽周期は`scores.json`の`period`です。

AACの圧縮末尾は無音として余計に繰り返さないこと。試聴ページはWeb Audioで復号後、原盤のフレーム数に合わせてバッファを切り出しています。44.1kHz音源のMP4 movie timescaleも44100にし、ミリ秒への丸めによる末尾の欠落を防いでいます。ブラウザーに全32曲を一括復号せず、保持する完成バッファは最大2曲。

原盤に用途別音量を反映済みなので、場面の指定dBをさらに一律に加えると二重に小さくなります。ホーム基準−23 LUFSから場面指定差を適用する際のゲインは `場面指定差(dB) − (原盤実測LUFS + 23)`。例えば睡眠原盤−31 LUFSに指定−8 dBを再度足す必要はありません。孵化中のホーム−14 dB、TTS中のダッキング等は別途再生側で適用します。今回はそのゲーム側処理を変更していません。

## 再制作と検証

必要: Node.js、Python 3、NumPy、SciPy、FFmpeg。作業ディレクトリはリポジトリルート。

```sh
node prototypes/bgm-master32-v1/tools/arrange.cjs
python prototypes/bgm-master32-v1/tools/fetch-samples.py
python prototypes/bgm-master32-v1/tools/render.py
node prototypes/bgm-master32-v1/tools/catalog.cjs
node --test prototypes/bgm-master32-v1/tests/*.cjs tests/audio-regression-test.cjs
python prototypes/bgm-master32-v1/tools/verify-midi.py
python prototypes/bgm-master32-v1/tools/verify-audio.py
```

ホーム音源の再制作はせず、PR #530から`home-inheritance.json`に記載のファイルを取得します。元サンプルWAVは容量節約のためGitには含めず、固定URLとハッシュで復元できます。生成途中のWAVは配信・Git対象外です。

制作・検査の範囲と制限: [VALIDATION.md](VALIDATION.md)。権利・使用音源: [RIGHTS.md](RIGHTS.md)。開発計画: [PLAN.md](PLAN.md)。
