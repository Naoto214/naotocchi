# なおぽよ — 本編・CARD GAMEとの関係棚卸し（2026-10-21）

固定main: `a037b3abe4f97b6e9bfb4838e854161c53ece6ba`。最新レスキューDraft PR412: `5f410591b589061c09ef12483f72adda9a2c71ed`。これは調査資料であり、ゲーム・保存・公開導線を変更しない。機械可読の正本は `naopoyo-relations.json`。

## 採用済み／現mainとDraftの区別

|区分|確認した状態|
|---|---|
|現main|シリーズ入口はスライド／現ドロップ。旧ドロップの記録も別に保持。|
|PR412レスキュー|独立10面の最新Draft。現mainの公開導線への置換は未採用。|
|PR405入れ替え型|`a3df3cad7bd8ff70d00460045f0b808cacaca260`を保存、新規開発停止。|
|今後の本編キャラ選定|未選定。提案された4〜8種を採用済みとして数えない。|

根拠: PR412 `5f410591b589061c09ef12483f72adda9a2c71ed` の `prototypes/naopoyo-rescue/RELEASE-PLAN.md:2–25,27–46`。現mainにある旧READMEの「main禁止」等は過去の試作段階の記録であり、現時点のmain収録状態と混同しない。「main」は固定tree内を意味し、最終バランス承認や配信実測の主張ではない。

## 種族と01〜08

現mainのなおぽよカタログは本編31種族×8段階=248姿のラベルを共有する。初期解放は `dog / penguin / clownfish / mushroom / butterfly` の5種。残り26種は本編セーブの `discoveredStages` に当該種族の `:0`〜`:7` が全てあると解放される。本編図鑑を読む関係であり、なおぽよプレイから図鑑を増やす実装とは解釈しない。

根拠（main `a037b3abe4f97b6e9bfb4838e854161c53ece6ba`）: `prototypes/growth-chain/roster.mjs:2–40`、`catalog.mjs:1–468`、`tests/catalog-source.test.mjs:6–28`。各種族の個別行と全248ラベル・画像参照をJSONに収録。画像バイナリ自体は今回のsparse checkoutで再検査していない。

|species_id|表示名|利用条件|
|---|---|---|
|`man`|おとこのひと|本編8姿発見後|
|`woman`|おんなのひと|本編8姿発見後|
|`dog`|いぬ|初期5種|
|`cat`|ねこ|本編8姿発見後|
|`penguin`|ペンギン|初期5種|
|`turtle`|かめ|本編8姿発見後|
|`frog`|かえる|本編8姿発見後|
|`salmon`|さけ|本編8姿発見後|
|`clownfish`|カクレクマノミ|初期5種|
|`butterfly`|ちょう|初期5種|
|`beetle`|カブトムシ|本編8姿発見後|
|`stagbeetle`|クワガタムシ|本編8姿発見後|
|`cicada`|セミ|本編8姿発見後|
|`antlion`|アリジゴク|本編8姿発見後|
|`hermit_crab`|ヤドカリ|本編8姿発見後|
|`jellyfish`|クラゲ|本編8姿発見後|
|`starfish`|ヒトデ|本編8姿発見後|
|`coral`|サンゴ|本編8姿発見後|
|`dandelion`|タンポポ|本編8姿発見後|
|`sakura`|サクラ|本編8姿発見後|
|`venus_flytrap`|ハエトリグサ|本編8姿発見後|
|`mushroom`|キノコ|初期5種|
|`dragon`|りゅう|本編8姿発見後|
|`phoenix`|フェニックス|本編8姿発見後|
|`god`|かみさま|本編8姿発見後|
|`world_tree`|世界樹|本編8姿発見後|
|`ghost`|おばけ|本編8姿発見後|
|`star`|ほし|本編8姿発見後|
|`plush`|ぬいぐるみ|本編8姿発見後|
|`unknown`|？？？|本編8姿発見後|
|`ren`|れんくん|本編8姿発見後|

スライド／現ドロップ／旧ドロップの01〜08は既存キャラ画像に対応する。現ドロップは同段階の塊に異種が混じると消滅し、同種なら成長。スライドと旧ドロップは同種・同段階の成長と08寿命消滅を持つ。04〜07への成長卵報酬や旧死亡時卵報酬はゲーム規則の履歴であり、本編の一生やカードの効果へ自動転記しない。根拠: `growth-clear/engine.mjs:3–46`、`slide08/engine.mjs:121–140,233–249`、`growth-chain/engine.mjs:195–219`（全て `prototypes/` 配下、固定main）。

レスキューは `dog` と汎用 `fish` の2トークンだけを受け付ける。`fish` を `clownfish`／`salmon` へ結び付ける根拠はない。`dog` も同じID文字列ではあるが、現描画はCanvasの丸い犬／魚で、本編8姿を採用したものではない。 actor level 01〜08は合体・分裂と `2^(level-1)` の量を表す。問題番号01〜10とは別軸。根拠: PR412 `engine.mjs:3–4,15–24,45–46`、`render.mjs:18–21`、`stages.mjs:1–14`（`prototypes/naopoyo-rescue/`）。

## レスキュー10面の遊び・出来事モチーフ

|面|タイトル|モチーフ|
|---|---|---|
|01|はじめての救出|なおぽよから出口まで、指でなぞろう。|
|02|ふたりで、ひとつ|同じ種族・同じ段階の2体で、ひとつ上へ。|
|03|ぷにっと連続合体|01＋01→02。もう1体の02と合体して03へ。|
|04|とげで、ふたりに|トゲで1段階下の2体に。残った子も救出しよう。|
|05|もう一度、ひとつに|分裂したら、トゲを離れた場所で再合体。|
|06|小さな抜け道|01だけが通れる出口へ。曲がり道を進もう。|
|07|番人の約束|02で番人を開けた後、分裂して小さな出口へ。|
|08|それぞれの帰り道|いぬは青い出口へ。さかなは桃色の出口へ。|
|09|なかまの階段|さかなを足場に1段登ろう。上→右で着地。最後にさかなも救出。|
|10|みんなで帰ろう|合体して番人へ。分裂した全員と、さかなも出口へ。|

全行の固定根拠はPR412 `prototypes/naopoyo-rescue/stages.mjs:4–13`。合体、分裂、再合体、番人の条件、種族別出口、仲間の足場、全員で帰るというモチーフは今後の世界観検討に使えるが、実装済みCARD GAMEの出来事・あそびカードとの直接対応は未確立。

## 実績・記録、旧版の保持

|対象|保持される内容|根拠（prototypes/配下）|
|---|---|---|
|スライド|通常／練習別のplays, deaths, fastest, fewest|slide08/player-store.mjs:1–27,50–60|
|現ドロップ|2/6と比較8/24、score/drops/maxChain/outcome|naopoyo/series.mjs:77–84|
|旧ドロップ|clear/endless/post-clear、plays/best/deaths/maxChain|growth-chain/player-store.mjs:38–61; naopoyo/series.mjs:85–99|
|レスキューDraft|全員救出＋必須扉開門で面クリア、cleared配列と最大80手の履歴|PR412 naopoyo-rescue/engine.mjs:4; app.mjs:7–11; store.mjs:1–4|

これらは記録・達成条件であり、本編 `ACHIEVEMENTS` の専用なおぽよバッジとしては扱わない。レビューしたStore/app内に専用の名前付き実績レジストリは見つからなかった。全面的な本編実績一覧は同ディレクトリの本編棚卸し資料を参照。PR412公開計画は旧ゲームのコード・テスト・記録・実績定義・GitHub履歴を削除しないことを明記する（`RELEASE-PLAN.md:27–36`）。公開除外と資料削除は別。

## CARD GAMEとの強い関係と未確定の関係

強い関係は、本編31種族の01〜08という共通の出典。カード人生テーマ地図も `character-world-master.v1.js` を最優先する（main `docs/card-game/41-main-31-species-life-theme-map.md:9–27`）。これはレスキューの新規キャラ採用を意味しない。

既存カード `G-chain-puzzle`（れんさパズル）と `G-slide-puzzle`（スライドパズル）は比較できるパズル題材だが、なおぽよ／slide08由来という直接の証拠はない。名称の類似で結び付けない。根拠: main `prototypes/card-game/full-catalog.mjs:659–668,1341–1350`。

検証: PR412差分の全28ファイルを読み取り、再構成した内容のGit blob SHAを固定HEADのtreeと照合し全件一致。JSONの31種・248段階・5初期種・26追加解放種・Draft10面を確認。ゲームテストは変更のない調査のため実行していない。
