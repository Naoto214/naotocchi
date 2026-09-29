# RH-9 Session Safety & Recovery — QA 記録(2026-09-28)

基準: `main` `6e0658d4`(Merge PR #355 = RH-8)
branch: `claude/naotocchi-rh9-session-safety`
正本: Roadmap §8.1(2026-09-26 の 注記の 第一候補)・§8.2・§8.3・§8.8

- schemaVersion は 5 のまま。移行なし。
- 足した save の キーは `lifetime.saveRevision`(整数)だけ。Roadmap §8.2 が 指定する もので、古い コードでも 知らない キーとして のこる。
- ふつうの データは 消していない。見た目の テーマは 変えていない(救済パネルは 起動に 失敗した ときだけの、飾りの ない 画面)。

## 1. かくれた タブ(§8.1)— 芯だけ 実装、上限の 値は 変えていない

§8.1 の 旧推奨(A′)と 2026-09-26 の 第一候補の どちらにも 共通する 部分だけを 実装した。

- **かくれて いる あいだ** 次の ものを 止める:
  - ふつうの tick(`loop()` の 先頭で 判定)
  - なかまの であい
  - けしきの できごと
  - ひとりごと・idle の うごき
  - 恋愛・なかま・discovery を かってに すすめない。
- **もどった とき**
  - かくれた 時刻(メモリだけ。save には 書かない)から、**とじて いた ときと 同じ** `applyOfflineProgress` を 1 回だけ 呼ぶ。
  - 高速再生は しない。年れいは すすまない。
  - 環境・昼夜は もどった 時点に 同期する(`maybeRefreshEnvironment`、いままでどおり)。
- **離れていた 時間は 打ち切らない**
  - 「7日3時間」「2日」のように 表示する(1 日 未満は いままでどおり「N分」「N時間」)。
- **とじて いた とき と かくれて いた とき の 区別**
  - とじて いた: 起点は save の `savedAt`(起動時)。
  - かくれて いた: 起点は かくれた 時刻(visible に なった とき)。
  - 処理と 上限は 同じ。

**決めて いない もの(stop 条件 10: Roadmap が 一意で ない)**
- 第一候補の「status ごとに 安全な 反映の 上限」の 具体的な 値。
- いまの `applyOfflineProgress` の 上限(30 分ぶん・1 回で 30 まで・20 より 下げない・年を とらない)は そのまま。
- 値を 決めたら `applyOfflineProgress` だけを かえれば、とじた / かくれた の 両方に きく。

## 2. 複数タブ(§8.2)

- `lifetime.saveRevision` を save の たびに 1 ふやす。
- 書く まえに storage の 値を 読み、自分の 知っている 値より 大きければ 書かない。そのタブを 読みとり専用に して、「べつの タブで ひらかれています。こちらを とじるか、よみこみなおしてください」を 出す。
  - 読みとり専用の タブは 以後 すすまない・書かない。
- **ほかの タブの save**(`storage` event)で すぐ 読みとり専用に する。
  - 次のような revision の 小さい 書きこみでも 気づく:
    - セーブコードの よみこみ
    - バックアップから もどす
    - 救済パネル
  - event は 自分の 書きこみでは こない。ほかの キーや 消去では 止まらない。
- **同じ タブの reload は 止まらない**(CI で 見つけて 直した)
  - reload の とき、同じ タブの まえの ページが 閉じぎわに 書いた save も storage event で とどく。
  - 最初の 実装(どの event でも 止まる)では、reload した ページが 読みとり専用に なった。home-layout の equipment / consumables v2 / item economy v2 / crown が 赤。
  - 直しかた: タブごとの id(`sessionStorage` の `naotocchi-tab`。reload でも のこる)を、save の 直前に 別の キー `naotocchi-save-v1-writer` に 書く。event の 書き手が 自分の タブなら むしする。
  - 複製した タブは sessionStorage が 写るので、書く まえの revision の 判定で 止まる。
  - 手元で 4 本 とも、この 判定が ないと 赤、あると 緑を 確かめた。
- **あとから ひらいた タブが 引きつぐ**
  - 起動時に storage の revision を 引きつぎ、起動の save で 1 ふやす。
  - まえの タブは 次の 書きこみの まえ(または event)で 止まる。

## 3. 起動の 救済(§8.3)— ボタン 1〜3

- `index.html` の `<head>` に inline の guard を 置いた。外の ファイルに たよらない ので、script.js が こわれて いても・古い cache でも うごく。
- script.js は 起動の さいごに `window.__naotocchiBooted = true` を 立てる。
- 立たない まま 6 秒 たつか、起動中に `error` が 出たら パネルを 出す。起動が あとから おわれば パネルを しまう。
- ボタン(危なくない 順。1 が いちばん 大きく、はじめに focus):
  1. **もういちど よみこむ**
  2. **セーブコードを うつす**
     - 主キーと backup を `NTS1.` 形式に する(script.js の `encodeSaveCode` と 同じ 手順を inline で)。
     - クリップボードへ コピーし、textarea にも 出す。
  3. **じどうバックアップから もどす**
     - snapshot の 日時の 一覧を 出す。
     - 1 回目の クリックは 確認、2 回目で `naotocchi-save-v1` に 書いて reload。
     - もどす まえの 主キーは 別の キー `naotocchi-save-v1-rescued` に のこす(消さない)。
- **4「はじめから」は 実装して いない**(判断が 要る)
  - 退避を snapshot に すると、3 世代の いちばん 古い よい snapshot を 押しだす。
  - 退避先と 押しだしの 方針が Roadmap で 一意で ない。

## 4. 待ち時間の 上限

- `gamePassReadyAt`: 読む ときに「いま + 5 秒」で おさえる。
- `itemLife.temporaryForm.expiresAt`: 読む ときに「いま + 5 分」で おさえる。
- 時計が すすんだ 端末で 書かれた save や こわれた 値でも、ずっと 待たされない。ふつうの 値は そのまま。

## 5. やらなかった もの

| もの | 理由 |
|---|---|
| HeartRails の 座標の 丸め(§8.8「まだ 行って いなければ」) | 既存の テスト `tracker preserves municipality precision, rounds only weather` が「市区町村の 精度を たもつ ため HeartRails には 丸めない」を 明示して 固定して いる。Roadmap と 既存の 正本が 食いちがう ので 実装を もどした(境界の 近くで 市区町村が かわる 可能性が ある = 結果が ちがう 選択) |
| status ごとの 反映の 上限 | 上の 1 |
| 救済の「はじめから」 | 上の 3 |
| dirty flag(RH-8 から) | かくれた タブの save は かくれた とき 1 回に なった。tick ごとの save を へらす かどうかは 別の 判断(save の 回数と タイミングが かわる) |

## 6. テスト

- **`tests/session-safety-test.cjs`**(9 本)
  - かくれて いる あいだ:
    - tick・年れい・メーターが かわらない。
    - なかまの であい・けしきの できごとが 3 時間 おきない。
    - 見えれば おきる(タイマーが ほんとうに うごく ことの 確認)。
  - もどった とき:
    - 1 回だけ 反映される(30 下がる・年を とらない・2 回目は ない)。
    - 2 分 未満では 何も しない。
  - 7日3時間・2日 の 表示と、上限の まま で ある こと。
  - とじて いた 経路(`savedAt`)は かわらない。
  - 2 タブ:
    - あとから ひらいた タブが 引きつぐ。
    - storage event で すぐ 止まる。
    - ほかの キーや 消去では 止まらない。
  - 待ち時間の 上限。
  - 起動の しるし。
- **`tests/boot-rescue-browser.cjs`**(Chromium / WebKit。CI の home-layout に 追加)
  - script.js が 例外を 出す: すぐ パネル。ボタンの 順番と focus。
  - セーブコード: 主キーと backup の 2 つが もとの JSON に もどる。
  - もどす: 確認まで 書かない。確認後に 書いて reload し、もどす まえの 記録は `-rescued` に のこる。
  - もういちど よみこむ。
  - script.js が とどかない: 6 秒で パネル。
  - ふつうの 起動: パネルが 出ない・page error なし。
  - 手元では Chromium で PASS(WebKit は この 環境に ないので CI で 確認)。
- **harness**: 起動時の タイマーを 消す ので、`scheduleCompanionEncounter` / `scheduleEnvironmentMoment` / `scheduleIdleGreeting` を 公開した(テスト専用の 追加)。
- **RH-8 の 冪等テスト**: `saveRevision` は save の 回数 なので「ふえる」を 確かめて、それ以外が 同じ ことを 確かめる 形に した。

## 7. remove-it(本物の source を 1 か所ずつ もとに もどし、赤を 確かめて もどした)

| もどした もの | 赤に なった テスト |
|---|---|
| `loop()` の かくれた 判定 | かくれた タブ |
| であい・できごと・idle の かくれた 判定 | かくれた タブ |
| もどった ときの 反映 | 1 回だけ 反映・7日3時間 |
| `formatAbsence` | 7日3時間 |
| 書く まえの revision の 判定 | 2 タブ(引きつぎ) |
| storage event | 2 タブ(event) |
| `gamePassReadyAt` の 上限 | 待ち時間 |
| `temporaryForm` の 上限 | 待ち時間 |
| 起動の しるし | 起動の しるし |

9 / 9 が 赤。

## 8. cache token

- 中身が 変わった `script.js` だけ、RH-3 の 式(`assetHash`)で 更新: `script.js?v=20260928-1b018efe`。
- `index.html` の inline guard は 外の ファイルを 参照しない。

## 9. 結果

- `session-safety-test`: 9 / 9、`boot-rescue-browser`: Chromium PASS(手元。複数タブ: reload では 止まらない・2 つめの タブで まえの タブが 止まる、も 追加)
- `npm test` 全体: **1500 / 1500 PASS、exit 0**(RH-8 後の 1491 + 9)
