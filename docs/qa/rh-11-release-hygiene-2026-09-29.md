# RH-11 Release Hygiene — QA 記録(2026-09-29)

基準: RH-10 の 上。RH-9 / RH-10 が main に 入ったら main を merge する。
branch: `claude/naotocchi-rh11-release-hygiene`
正本: Roadmap §8.10

- save・schemaVersion(5)・master・画像・見た目の テーマは 変えていない。
- ほかの lane の branch と PR には 触れていない。PR の close も していない(外への 操作は オーナーの 判断)。

## 1. やった もの

| もの | 中身 |
|---|---|
| 使われない 行の 削除 | 地域の アイコンの 表の `tropical:'palm'` と、`style.css` の `body.region-tropical`。<br>地域 ID は RH-4 で すべて `resolveRegionId` を とおる ので、`tropical` は `jungle` に よみかえられる。登録表(`REGIONS` + `SPECIAL_REGIONS`)に ない キーは 引かれない。<br>呼び出し側は すべて 解決ずみの ID(`findRegion(...).id`・`currentRegionId()`・`REGIONS` の 列挙)を わたす ことを 確かめた。 |
| README(時間) | 「ページを閉じていた時間は加算されません」を 直した。<br>年れいは 閉じていた / かくれていた 時間 すすまないが、もどった ときに おなか・ごきげん・げんきが おだやかに 反映される(RH-9)。 |
| README(複数タブ・救済・動作環境) | べつの タブ と 起動の 救済 の 1 文、動作環境の 目安「iOS Safari 16 以上、Chrome 105 以上」(Roadmap §8.10 の 指定)。 |
| README(シールちょう) | 次の 3 点を いまの コードに あわせた。<br>・4 ページ固定 → 1 ページから 最大 15 ページ・ページごとの 背景<br>・かけら(#304 で 廃止)→ 同じ シールを 9 枚まで<br>・おだいの ごほうび → 記録と 5 こ / 8 こで 銀 / 金の シール |
| MASTER_SPEC | K-5 の「全アイテム実績は 通常装備 14 品」に、RH-10 の P1-8 ①(装備 10 品 + 使い切り 12 品を 一度でも 手に入れた)の 注記を 足した。 |
| TEXT_STYLE | koala / kinoko に 注記を 足した。<br>master の alias(`koala → snail`、`kinoko → clock`)で 件数を 数え、save の ID・画像・記録は のこす。 |
| テスト `tests/release-hygiene-test.cjs`(3 本) | ・README の シールの 数字(15 ページ・24 枚・9 枚・30 / 3 枚・60・おだい 8)が 定数と あい、「かけら」「4つのページ」が ない<br>・README に 動作環境と かくれた タブ・複数タブ が ある<br>・地域の アイコンの キーと `body.region-*` が 登録表の 中だけ |

remove-it: `tropical` の 行を もどすと 3 本目が 赤。

## 2. 確かめた もの(記録のみ)

### #278 の 最新 head(`54ce21d8`)の asset / token

- **token が 古い(RH-3 の gate で 赤に なる)**
  - `character-world-master.v1.js`: token `d24939fa`、中身 `59b21854`
  - `pet-expression.js`: token `19c9a562`、中身 `77a295ed`
  - #278 の lane の 中の 不整合。RH の branch からは 直さない(RH-3 の 方針の まま)。
- **同じ パスの PNG を 上書き**: `assets/characters/starfish/01.png`〜`03.png`。

### main で 同じ パスの まま 上書きされた 画像

- 09-10 の 公開後チェックポイント(`9595706c`)から main まで、次の 14 件が 名前も token も かわらずに 中身だけ かわった。キャッシュが 古い 絵を 出す 可能性が ある。
  - `assets/characters/beetle/01〜08.png`
  - `assets/characters/stagbeetle/02, 04〜08.png`
- Pages は main の merge ごとに 公開される ので、「前の release」の 基準が 1 つに 決まらない。
- 改名すると master と cast-bounds の パスを かえる ことに なる(#278 も master を かえる)。

## 3. やらなかった もの(判断が 要る)

| もの | 理由 |
|---|---|
| `ENDING_CELEBRATIONS` の perfect | perfect で 何を 見せるか(演出の 中身)が Roadmap・canon で 一意に 決まらない(RH-5 で known gap として 固定)。**stop 条件 6 / 10** |
| 同じ パスの 画像(beetle / stagbeetle 14 件、#278 の starfish 3 件) | 改名 か token か、基準の release、master / cast-bounds の 変更(#278 と 重なる)。EXP-Final の「画像の cache 方針」と いっしょに 決める |
| PR の 整理(#302 / #92 / #298 / #300 / #275 の close) | 外への 操作。オーナーが 行う |
| EXP-Final(#278) | F03 / F05 / 画像の cache 方針・repo の 大きさ(オーナーの 決定) |
| #259 の docs と card-game の superseded 注記 | #259 の docs を merge する ときの 条件つきの 作業 |
| 装備の 反応文(ribbon / bowtie) | 文章の 中身の 書きかえ(content) |

## 4. cache token

- `script.js?v=20260929-b001de03`、`style.css?v=20260929-4584fdbe`(assetHash、この 2 件)。

## 5. 結果

- `release-hygiene-test`: 3 / 3
- `npm test` 全体: **1514 / 1514 PASS、exit 0**(RH-10 後の 1511 + 3)
