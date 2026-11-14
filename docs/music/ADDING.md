# 33曲目以降を追加する具体的手順

最新mainから新規ブランチを作る。既存32曲の原盤を制作入力へコピーしない。以下のNEW-IDは新しい永続IDへ置換する。

1. `python tools/music/library.py init NEW-ID --out work/NEW-ID.json`で新曲専用の台帳ひな形を作る。既存ID/ファイルがあれば拒否される。目的・使用場面・独自の旋律・楽器・強弱設計を制作票に記録する。
2. 新曲だけを制作。`music/candidates/NEW-ID/master.flac`、`score.mid`、`score.json`、`assets/bgm/NEW-ID.m4a`へ書き出す。score.jsonは`{"events":[{"t":0,"midi":60,"dur":1,"role":"melody"}]}`のような発音秒・MIDI音高・音価・役割の配列。例はデータ形式だけで、既存旋律の流用ではない。全声部の発音をMIDIと一致させる。
3. 新音源なら`music/sources.json`へ別IDで追加。license/reference/原文path/SHA/reviewedを記録。既存VSCO/Karoryferの項目は固定。制作票とmanifestへ正式名、BPM/拍子/調性、44100Hzのframe数、尺、loop、楽器、sourcesを記入する。
4. `python tools/music/library.py register work/NEW-ID.json`。新曲のメタデータ・権利・ファイル・ハッシュ・AAC/FLAC・MIDI・ピーク・loopを検証し、candidateとして登録する。既存曲の再生成はない。候補を修正したら元のmanifestを更新して`revise work/NEW-ID.json`。採用済み曲のreviseは拒否する。
5. `python tools/music/library.py verify`。SHAは全件確認するが、一致する成功receiptの重い解析はskip。失敗/壊れたreceipt/変更された入力だけ解析する。プロセスが途中停止しても成功した各曲の記録はatomic保存され、再実行で継続できる。`.writer.lock`はプロセス終了時にOSが解放する。並列writerは拒否される。
6. `python tools/music/library.py preview --out work/music-preview`。この独立フォルダだけをローカルHTTPまたは試遊版の新しい候補用URLへ配置する。候補を本番Pages許可リストへ追加しない。ネイティブHTMLAudioElementでA/Bを同じ位置で切替可能。iPhoneでは実際の出力を確認する。端末音量が基本で、HTMLAudioのプログラム音量制御はiOSの制限を受ける。
7. 試聴してもらい、採用する音源ハッシュに対するユーザーの明示的承認を取得。`python tools/music/library.py approve NEW-ID --reference '承認記録のURLまたは保存場所'`。このコマンドが承認を取り付けるわけではない。承認を受けた作業者だけが実行する。asset/metadata/policy fingerprintを保存し、後から変わればbuildを拒否する。
8. `music/extensions.json`のrows/gameSongsへ新しい場面とゲームIDを追加する。旧50行と100ゲーム対応を上書きしない。既存画面を別の曲に変更する場合は、ユーザーの別途指示と選曲テストが必要。新しい場面判定ロジックが必要ならaudio.js/subapp adapterを狭く変更し、その入力→曲IDをテストする。
9. `python tools/music/library.py build`でapproved-only catalog/placement/runtime-filesを作る。`python tools/music/sync_pages.py --write`でBGM関連だけのPages許可リスト/ソースSHAを更新する。差分をレビューし、HTMLの新しいcatalog参照も内容ハッシュで更新する。既存32曲はコピー/生成し直さない。
10. `python -m unittest discover -s tests/music -v`、`node --test tests/bgm-production-test.cjs tests/bgm-v2-integration-test.cjs`、`npm test`と対象ゲーム試験を実行。Pagesパッケージ上で新曲IDのAAC読込/実デジタル信号・選曲・gain0.36・停止をChromium/WebKitで確認する。実iPhoneの可聴性は別確認で、自動試験の進行バーを証明にしない。
11. 音源・台帳・receipt・配置・コード・検証をコミット/プッシュし、main向け独立PRでレビュー。承認済み原盤とチェック済みHEADのみマージ。Pages公開後に新AACと既存32のSHA・主要画面を確認する。

`build`だけでは候補は配信されない。さらにCIの`sync_pages.py`チェックが、未承認AACを手作業でallowlistへ加えた場合も拒否する。FLAC/MIDIや制作資料を本番Pagesへ配布しない。試験用33曲目はTemporaryDirectory内で作成され、正式台帳には残らない。
