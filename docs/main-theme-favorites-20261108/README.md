# なおとっち お気に入り 6曲 統合比較 (2026-11-08)

これまでの 作曲で 気に入った 6曲を、原曲の まま 1ページで 聴きくらべる ための 試聴ページです。新曲の 制作・編曲は していません。採用や 時間帯への 割り当ても まだ 決めません。

- 試聴ページ: `prototypes/main-theme-favorites-20261108/index.html`（Claude Artifact 版: https://claude.ai/artifact/BN4pxSARx5mU8JxREieRJn ・ 依頼者の 非公開ページ）
- 曲の 参照と 音量補正: `prototypes/main-theme-favorites-20261108/favorites.js`
- 点検: `node prototypes/main-theme-favorites-20261108/tools/check-favorites.cjs`
- 音量の 測定: `node prototypes/main-theme-favorites-20261108/tools/measure-loudness.cjs`（Playwright の Chromium を 使う）

## 対象の 6曲（原曲データの 出どころ）

| 曲 | 出どころ | データ | MIDI・譜面 |
|---|---|---|---|
| いまの メインテーマ | `audio.js` の `TRACKS.home`（PR #524 で 転記） | `prototypes/main-theme-20261108/songs.js` の `current` | `prototypes/main-theme-20261108/midi/naotocchi-theme-current.mid` ・ `docs/main-theme-20261108/README.md` |
| ほしふる みずうみ | PR #524 D案 | 同 `D` | `…/main-theme-20261108/midi/naotocchi-theme-D.mid` ・ 同上 |
| ほしぞらの やくそく | PR #526 新B | `prototypes/main-theme-v2-20261108/songs-v2.js` の `B` | `…/main-theme-v2-20261108/midi/naotocchi-theme-v2-B.mid` ・ `docs/main-theme-v2-20261108/README.md` |
| きせつの きおく | PR #526 新C | 同 `C` | `…/main-theme-v2-20261108/midi/naotocchi-theme-v2-C.mid` ・ 同上 |
| おはようの ひかり | PR #527 朝B | `prototypes/main-theme-v3-morning-20261108/songs-v3.js` の `B` | `…/main-theme-v3-morning-20261108/midi/naotocchi-morning-v3-B.mid` ・ `docs/main-theme-v3-morning-20261108/README.md` |
| そよかぜの まど | PR #527 朝C | 同 `C` | `…/main-theme-v3-morning-20261108/midi/naotocchi-morning-v3-C.mid` ・ 同上 |

`favorites.js` は 上の データの オブジェクトを そのまま 参照する だけで、コピーも 加工も しない。新しい MIDI や 譜面は 作っていない（元の ものが 正）。

## 守ったこと

- PR #524・#526・#527 の ファイル、元の 音源データ・譜面・MIDI は 変更していない（`check-favorites.cjs` が #527 の ブランチと git で くらべて 確認）。
- ゲーム本体（`audio.js` ほか）は 変更していない（現行曲の データが `audio.js` と 一致する ことも 確認）。
- #527 の ブランチ `claude/main-theme-v3-morning-20261108` から 独立ブランチ `claude/favorites-compare-20261108` を 作り、Draft PR を #527 に 積んだ。main には マージしない。
- 再生エンジンは V2 の `engine-v2.js` を 変更せずに 読みこむ（音色・伴奏型は これまでの 試聴室と 同一）。

## 試聴機能

- 6曲の 個別再生（もう一度 押すと 停止）、6曲の 連続再生（一覧の 順。曲の あいだ 0.8秒）
- 曲順の 変更（各曲の ↑↓。iPhone でも 押しやすい ボタン式。「曲順を もとに もどす」あり）
- 連続再生の 長さ: 「いつもの 長さ」（各曲の 試聴版 45〜90秒、全体 約6分40秒）/「1周ずつ」（現行曲は 8小節なので 2周、全体 約4分20秒）
- ループ: 個別再生では その曲を、連続再生では 6曲全体を くりかえす
- 音色: メロディのみ / ピアノ / 軽い伴奏（比べる 条件を そろえる ため、現行曲の「ゲームの 音で」は この ページには 入れていない）
- 音量（0〜100）、前の 曲 / 次の 曲、再生中の 曲名・何曲目か・進み具合の 表示
- 譜面（ピアノロール・コード・階名）

## 評価と ブラインド比較

- 各曲に 4段階の 評価: **絶対に 使いたい / 好きだが 保留 / 候補の 中では よい / 採用しない**（もう一度 押すと 取り消し）と メモ。
- 保存先は ブラウザの localStorage（キー `naotocchi-favorites6-v1`）だけ。ほかの 人や Claude には 送られない。プライベートブラウズなど 保存できない 環境では、ページを 閉じると 消える。
- **ブラインド A〜F**: 曲名・出どころ・調・テンポ・曲ごとの 色・コード名・階名を 隠し、くじ引きで 決めた A〜F の 記号だけで 聴く。再生中の 表示も「曲 A」だけ。連続再生も A → F の 順。
  - ブラインドの 評価は 曲名ありの 評価とは 別に 保存する。
  - 「答え合わせを 見る」で、記号と 曲名、ブラインドの 評価と 曲名ありの 評価を ならべて 見られる。
  - 「A〜F を くじ引きし直す」で 記号を 振り直す（その とき ブラインドの 評価は 消える）。

## 曲間の 音量

OfflineAudioContext で 各曲 1周を 描いて 測った 値（補正前）。

| 曲 | メロディのみ RMS | ピアノ RMS | 軽い伴奏 RMS |
|---|---|---|---|
| いまの メインテーマ | −20.6 dB | −18.9 dB | −16.4 dB |
| ほしふる みずうみ | −21.4 dB | −19.7 dB | −16.7 dB |
| ほしぞらの やくそく | −21.9 dB | −19.2 dB | −16.8 dB |
| きせつの きおく | −21.4 dB | −19.4 dB | −16.7 dB |
| おはようの ひかり | −21.5 dB | −19.0 dB | −16.6 dB |
| そよかぜの まど | −21.5 dB | −19.2 dB | −16.6 dB |
| **最大差** | **1.3 dB** | **0.8 dB** | **0.4 dB** |

- 差は もともと 小さいが、続けて 聴くと メロディのみで 現行曲が 少し 大きく 聴こえる 可能性が ある。
- そこで「曲間の 音量を そろえる」（初期状態で オン）で、各曲の 1周の RMS を 6曲の 平均に そろえる 補正（−0.8〜+0.5 dB）を、再生時の 音量だけに かける。原曲データは 変えない。
- 3秒ごとに いちばん 大きい 場面の RMS も 測った（`favorites.js` の `MAX3S_RMS`）。ピアノで おはようの ひかり の 最後の 盛り上がりが ほかより 1〜2 dB 大きい。これは 曲の 中の 抑揚なので 補正していない。
- これは 数値での 確認。音量感が 自然か どうかは、実際に 聴いて 確かめて ください。

## iPhone Safari

- これまでの 試聴室と 同じ 対策（タップで 再生開始、`navigator.audioSession` と 無音 `<audio>` で 消音スイッチ対策、画面に もどったら 再開）。
- 押しやすさ: 再生ボタン 40px、評価ボタン 34px、↑↓ 30px 以上の 高さ。390px 幅で 横スクロール なし。
- この 環境に ある ブラウザは Chromium だけ。iPhone 13 の 画面サイズ・タッチを 再現した Chromium で 確認した。**本物の iOS Safari では 未確認**。

## 確認した こと

- `check-favorites.cjs`: 6曲の データが 元と 同一、長さ 45〜90秒、元の ファイルが 無変更、現行曲 = `audio.js`。
- Playwright（Chromium）: 6曲すべて 再生が 始まり 進む こと、評価・メモ・曲順が 再読みこみ後も 残る こと、ブラインドで 曲名が 一覧に 出ない こと、連続再生で 1曲目 → 2曲目へ 自動で 進む こと、次の 曲ボタン、iPhone 13 幅で エラー・横スクロールなし。
