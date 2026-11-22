# CARD GAMEの説明文　VERSION 4実装単位

V3の比較案から今回本人が判断を確定した19箇所のうち、実際の差し替えは12箇所。7箇所は現行文を維持する。J側の12件は、差し替えるRのうち9箇所に重なる。残るR02・R10・R14には重複するJがない。J側の候補文は過去の個別案として保存し、実装文にはR側の承認全文を使う。

正式な根拠はPR #577（d4db3e358dcc0da343d71ca65871a632bfa2441f）の docs/japanese-notation-v3/rules.md。V3のrules.jsonと突き合わせ、句読点、数字、空白、改行を含め19件の原文・承認文が一致した。現行維持7件の承認文は原文と同じ。公開main（9539e462e78452ad6da5f72d454911679b4ec20e）とPRのゲームデータ・実装・原典等11ファイルは同一。現行コードを読み込み、19件の表示文が指定フィールドに各1回現れることを確認した。

## 重複する個別候補

|個別ID|実装単位|対応箇所|
|---|---|---|
|J010|R04|第5段落|
|J011|R09|全文|
|J021|R08|全文|
|J027|R04|第2段落|
|J028|R04|第1段落|
|J252|R05|全文|
|J255|R06|全文|
|J466|R04|第6段落|
|J467|R13|全文|
|J468|R01|全文|
|J469|R03|全文|
|J502|R07|全文|

R04の筆頭段落はJ028、第2段落はJ027、第5段落はJ010、末尾の具体例はJ466に対応する。途中の予約・誘発・期限切れ、および100維持の中断と防止を述べる2段落も同じR04に含む。4件の抜粋を連結するとこの2段落が欠けるため、実装ではR04の全文を1回だけ使う。

## 差し替えと維持

各節の原文と承認文はデータの文字列をそのまま載せた。段落先頭の「- 」や「6. 」も文字列の一部。current_sha256とproposed_sha256は、改行をLFとして保持したUTF-8文字列のSHA-256。

### R01　訂正

ルールブック／第1章／詳しいルール・裁定「コンセプト」。

参照元　prototypes/card-game/rulebook-sources.mjs:33　対象　CURRENT_RULINGS／rule-01-1／text。

作業　表示フィールドの全文を1回置換。　該当する個別候補　J468。

現行文

```text
全452枚を最初から閲覧でき、デッキに使用できる。コレクションの453種類目はデッキに入れない通常たまご。40枚デッキで、10ラウンド＝100年を生き、それぞれの3×3人生世界を築き、ライバルと干渉・読み合いながら「そだち」100を目指す。相手HPを0にするゲームではない。
```

採用する全文

```text
全459枚を最初から閲覧でき、デッキに使えます。コレクションには、デッキに入らない通常たまごを含めて460種類あります。各自40枚のデッキを使い、3×3の盤面に自分の人生世界を築いて、そだちを高めます。基本は10ラウンド＝100年。時のカードで終了ラウンドは9〜12に変わります。終了ラウンドより前に100を維持するか、最終比較で相手のそだちを上回ると勝ちです。相手のHPを削るゲームではありません。
```

旧カタログ452枚に時のカード4枚とできごと3枚が加わった。図鑑は正式459枚と状態表示の通常たまご1種類。100に届かない対戦でも最終比較で勝てる。

根拠　prototypes/card-game/engine.mjs:9 ／ prototypes/card-game/collection.mjs:3 ／ prototypes/card-game/collection.mjs:5 ／ prototypes/card-game/tests/collection.test.mjs:7 ／ prototypes/card-game/tests/collection.test.mjs:16 ／ prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R02　訂正

ルールブック／第14章／詳しいルール・裁定の見出し「10ラウンド＝100歳」。

参照元　prototypes/card-game/rulebook-sources.mjs:152　対象　CURRENT_RULINGS／rule-01-13／title。

作業　表示フィールドの全文を1回置換。

現行文

```text
10ラウンド＝100歳
```

採用する全文

```text
ラウンドと終了ラウンド
```

この見出しは章内・全体検索にも出る。R10は初期設定で、全試合の終了を表す唯一のラウンドではない。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R03　訂正

ルールブック／第14章／詳しいルール・裁定「10ラウンド＝100歳」の本文。

参照元　prototypes/card-game/rulebook-sources.mjs:153　対象　CURRENT_RULINGS／rule-01-13／text。

作業　表示フィールドの全文を1回置換。　該当する個別候補　J469。

現行文

```text
全試合10ラウンド固定。1ラウンド＝先攻ターン→後攻ターン。双方毎ラウンド1ターン。R10終了＝100歳。メイン8段階とは別概念。
```

採用する全文

```text
1ラウンドは、先攻と後攻が1ターンずつ行う区切りです。対戦開始時の終了ラウンドはR10で、基本の10ラウンドが100年に相当します。時のカードで終了ラウンドはR9〜R12に変わります。メインの成長段階はラウンドとは別で、全部で8段階です。
```

「全試合10ラウンド固定」が現行の時のカードに反する。R10と100歳の関係を基本の設定として残し、メインの8段階を区別する。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R04　訂正

ルールブック／第2章／詳しいルール・裁定「勝利」の全文。

参照元　prototypes/card-game/rulebook-sources.mjs:183　対象　CURRENT_RULINGS／rule-01-16／text。

作業　表示フィールドの全文を1回置換。　該当する個別候補　J010・J027・J028・J466。

現行文

```text
R1〜R9: 100到達で即勝利せず、その到達後に開始する最初の相手ターンの終了まで100維持で早期勝利。到達時に進行中の相手ターンは含めない。100未満へ戻れば続行し、再び100へ到達した場合は新しい到達時点から数える。
R10: 早期勝利なし。双方最後のターン後、高いそだちが勝利。同値（100対100含む）は引き分け。延長なし。

- 判定は終了時の予約・誘発・反応・期限切れと、それらから生じた処理をすべて終えてから行う。100へ届いた連鎖の途中で勝利にしない。
- 実際に100未満になった時点で、その到達からの維持は途切れる。同じ連鎖・終了処理中に100へ戻しても、以前の維持を復元せず新しい到達として扱う。減少を全部防いで100のままなら維持は途切れない。
- R9から100を維持していても、判定時点がR10なら早期勝利は行わない。R10後攻の終了処理とラウンド期限まで終えて比較する。ゲーム終了後の予約ドロー等のために次ターンを作らず、予約を得点へ換算しない。
例：先攻が後攻R5中に100へ届いた場合、後攻R6の終了まで維持する。後攻が先攻R9中に100へ届いた場合、次の先攻ターンはR10なので早期勝利を行わず、R10の最終比較へ進む。
```

採用する全文

```text
終了ラウンドより前は、そだちが100に達してもすぐには勝ちません。100に達した後に始まる最初の相手ターンの終了まで100を維持し、その時点が終了ラウンドより前なら早期勝利です。到達したときに進行中だった相手ターンは数えません。
終了ラウンドは早期勝利がありません。後攻の終了処理を終えた時点で、そだちが高い方の勝ちです。同じなら100対100でも引き分けです。延長はありません。

判定は、終了時の予約・誘発・応答・期限切れと、それらから生じた処理がすべて終わってから行います。100に達した連鎖の途中では勝利を決めません。
一度でも実際に100未満になれば、それまでの維持は中断します。同じ連鎖や終了処理の中で100に戻っても、新しい到達として数え直します。減少をすべて防いで100のままなら、維持は続きます。
前のラウンドから100を保っていても、判定時点が終了ラウンドなら、後攻の終了処理とラウンド期限の処理をすべて終えてから最終比較します。対戦終了後の予約ドローのために次のターンを作ったり、予約を得点に換えたりすることはありません。

たとえば、先攻が後攻のR5ターン中に100へ届いた場合は、後攻のR6ターン終了まで100を保つ必要があります。終了ラウンドがR10のままなら、後攻が先攻のR9ターン中に100へ届いても、次の先攻ターンは終了ラウンドです。早期勝利は行わず、後攻のR10ターン終了後にそだちを比べます。
```

勝利判定は到達時点のラウンド番号ではなく、維持を判定する時点の終了ラウンドを参照する。最終ラウンドの先攻終了時には決着せず、後攻の終了処理を待つ。元の例、減少防止、予約と期限の条件を残した。

根拠　prototypes/card-game/engine.mjs:54 ／ prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R05　訂正

ルールブック／第4章／詳しいルール・裁定「盤面」の「たまごの配置」。

参照元　prototypes/card-game/rulebook-sources.mjs:193　対象　CURRENT_RULINGS／rule-01-17／text。

作業　同一フィールド内の指定原文だけを1回置換。　該当する個別候補　J252。

現行文

```text
たまごの配置: 独立したたまご置き場は設けない。通常たまごは全452枚・40枚デッキとは別の状態表示用カードとして各プレイヤー1枚、メイン枠の最下層に置く。メインがいる間はその上にメインカードを完全に重ね、最上層だけを表示する。メインが離れてたまご状態へ戻る場合は、下の通常たまごが再び見える。物理版のフィールドには「メイン」枠だけを設け、たまごの絵は印字しない。
```

採用する全文

```text
たまごの配置。通常たまごは、正式459枚や各自の40枚デッキに含まれない状態表示用カードです。各自のメイン枠の最下層に1枚置き、独立したたまご置き場は設けません。メインがいる間はたまごに完全に重ねて、いちばん上のメインだけを表示します。メインが離れると、下の通常たまごが再び見えます。物理版のフィールドには「メイン」枠だけを設け、たまごの絵は印字しません。
```

全452枚だけが旧数値。デッキ外、片側1枚、専用の置き場を作らないこと、物理版での扱いを保つ。

根拠　prototypes/card-game/engine.mjs:9 ／ prototypes/card-game/collection.mjs:3 ／ prototypes/card-game/collection.mjs:5 ／ prototypes/card-game/tests/collection.test.mjs:7 ／ prototypes/card-game/tests/collection.test.mjs:16 ／ prototypes/card-game/ui-presentation.mjs:135 ／ prototypes/card-game/tests/ui-egg-stack.test.mjs:6 ／ docs/card-game/02-main-system.md:10。

### R06　訂正

ルールブック／第6章／詳しいルール・裁定「たまご／たんじょう」の「たんじょう時のカード配置」。

参照元　prototypes/card-game/rulebook-sources.mjs:273　対象　CURRENT_RULINGS／rule-02-1／text。

作業　同一フィールド内の指定原文だけを1回置換。　該当する個別候補　J255。

現行文

```text
たんじょう時のカード配置: 通常たまごは全452枚とは別のデッキ外の状態表示用カードとして、メイン枠の最下層に置いたままとする。たんじょう時は手札の新メインをその上へ完全に重ね、メインだけを見せる。独立したたまご置き場は設けない。たまごは山札・手札・捨て札へ移さず、
```

採用する全文

```text
たんじょう時のカード配置。通常たまごは正式459枚に含まれない、デッキ外の状態表示用カードです。メイン枠の最下層に置いたまま、たんじょう時には手札の新しいメインをその上に完全に重ね、メインだけを見せます。独立したたまご置き場は設けません。たまごは山札・手札・捨て札へ移さず、通常カードの実体や新たな保存状態を追加しません。
```

詳しいルール用のCURRENT_RULINGSは「移さず、」で段落が途切れる。設計原典の「通常カードの実体や新たな保存状態を追加しない。」まで復元し、枚数だけは現行の459に合わせる。

根拠　prototypes/card-game/engine.mjs:9 ／ prototypes/card-game/collection.mjs:3 ／ prototypes/card-game/collection.mjs:5 ／ prototypes/card-game/tests/collection.test.mjs:7 ／ prototypes/card-game/tests/collection.test.mjs:16 ／ prototypes/card-game/ui-presentation.mjs:135 ／ prototypes/card-game/tests/ui-egg-stack.test.mjs:6 ／ docs/card-game/02-main-system.md:10。

### R07　訂正

ルールブック／第9章／詳しいルール・裁定「こいびと」の最終比較の項目。

参照元　prototypes/card-game/rulebook-sources.mjs:223　対象　CURRENT_RULINGS／rule-01-20／text。

作業　同一フィールド内の指定原文だけを1回置換。　該当する個別候補　J502。

現行文

```text
- 結婚は、R10終了時にそだちが同値だった場合のタイブレークには使わない。 R10終了時は純粋にそだちが高い方が勝ち、同値（100対100を含む）は引き分け。延長・結婚判定は行わない。
```

採用する全文

```text
- 終了ラウンドの後攻の終了処理後に、そだちが高い方が勝ちます。同じなら100対100でも引き分けです。延長はなく、結婚しているかどうかで勝敗は決めません。
```

結婚の有無を同点時の決着に使わない点は正しい。比較時点はR10に固定されていない。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R08　訂正

ルールブック／第14章／詳しいルール・裁定「ターン終了」の手順6。

参照元　prototypes/card-game/rulebook-sources.mjs:683　対象　CURRENT_RULINGS／rule-06-25／text。

作業　同一フィールド内の指定原文だけを1回置換。　該当する個別候補　J021。

現行文

```text
6. 勝利判定を行う。 R1〜R9の維持判定、またはR10後攻の最終比較。R10は先攻終了でも早期勝利を行わない。続行するなら次のターンへ進む。残り時は次の自分ターンの回復まで保つ。ゲームが終わった場合は、後日の予約のためにターンを作らない。
```

採用する全文

```text
6. 勝利判定を行います。終了ラウンドより前は、そだち100の維持を判定します。終了ラウンドは先攻・後攻とも早期勝利を行わず、後攻の終了処理後にそだちを最終比較します。対戦が続くなら次のターンへ進みます。残った時は次の自分ターンで回復するまで保ちます。終了後の予約のために次のターンを作ることはありません。
```

終了手順6で現在の終了ラウンドを参照する。R9終了の試合や、R10を通過する試合の説明にもなる。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R09　訂正

ルールブック／第14章／詳しいルール・裁定「期限・履歴の読み方」の100維持の項目。

参照元　prototypes/card-game/rulebook-sources.mjs:693　対象　CURRENT_RULINGS／rule-06-26／text。

作業　同一フィールド内の指定原文だけを1回置換。　該当する個別候補　J011。

現行文

```text
- 100維持の中断は、各増減を実際に適用した時点で記録する。最終値だけを見て、途中の100未満を消さない。相手ターン中の新規100到達も、到達後に開始する最初の相手ターンの終了を期限とする。到達時に進行中の相手ターンは数えず、判定時点がR10なら最終比較へ進む。
```

採用する全文

```text
- 100維持の中断は、そだちの増減が実際に適用されるたびに記録します。最後の値が100でも、途中で100を下回れば維持は中断します。相手ターン中に新たに100へ達したときも、到達後に始まる最初の相手ターンの終了まで維持する必要があります。到達時に進行中だった相手ターンは数えません。判定時点が終了ラウンドなら早期勝利を行わず、そのラウンドの後攻の終了処理後に最終比較します。
```

100維持の中断条件を保ち、末尾の固定R10を訂正する。最終比較が後攻終了後であることも明示する。

根拠　prototypes/card-game/engine.mjs:54 ／ prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R10　訂正

ルールブック／第12章／詳しいルール・裁定「ちょうせん」の最初の文。

参照元　prototypes/card-game/rulebook-sources.mjs:373　対象　CURRENT_RULINGS／rule-02-11／text。

作業　同一フィールド内の指定原文だけを1回置換。

現行文

```text
相手を傷つける攻撃ではなく、同じ100年を生きるライバルと競う人生経験。
```

採用する全文

```text
ちょうせんは、同じ人生の時間を歩むライバルと、ちからやちえを競う経験です。相手にダメージは与えません。
```

ちょうせんの主題は競い合う人生経験で、競う値はちから・ちえ。可変終了の全試合を「同じ100年」と言い切る部分を外す。

根拠　prototypes/card-game/engine.mjs:115 ／ prototypes/card-game/engine.mjs:183 ／ docs/card-game/482-time-reversal-cards.md:9。

### R11　現行維持

ルールブック／第12章／詳しいルール・裁定「得点と挑む判断」。

参照元　prototypes/card-game/rulebook-sources.mjs:403　対象　CURRENT_RULINGS／rule-02-14／text。

作業　現行表示を照合して維持。

現行文

```text
数値差は逆転のしやすさとして自然に機能する。通常ちょうせん自体に時コストは現状なし。自分から行うちょうせんは10ラウンドで最大10回、その通常勝利報酬は最大+50。ただし、相手から受けたちょうせんに勝った場合も+5を得るため、これは通常勝利報酬全体の上限ではない。通常勝利だけで初期20→100へ届く局面もあり得る。相手はちょうせんを見送れるので、受け側の報酬を毎ターン保証される収入としても扱わない。
```

採用する全文は上記の現行文と同一。

「10ラウンドで」と範囲を限定した得点例。自分の通常ちょうせんは自分のターンに1回で、勝てば+5。10回で最大+50は正しい。相手から受けた勝利を含めた全体の上限ではないことも後半に書かれている。

根拠　prototypes/card-game/engine.mjs:73 ／ prototypes/card-game/engine.mjs:115 ／ prototypes/card-game/engine.mjs:164 ／ prototypes/card-game/engine.mjs:183。

### R12　現行維持

ルールブック／第8章／詳しいルール・裁定「時」の冒頭の数値例。

参照元　prototypes/card-game/rulebook-sources.mjs:143　対象　CURRENT_RULINGS／rule-01-12／text。

作業　現行表示を照合して維持。

現行文

```text
- R1=1、R2=2、…、R10=10。
```

採用する全文は上記の現行文と同一。

R1、R2、R10における時の具体例で、回復の上限を10とする文はない。直後の項目がラウンド番号への回復を定義し、R11・R12にもそのまま当てはまる。

根拠　prototypes/card-game/engine.mjs:73 ／ prototypes/card-game/engine.mjs:221 ／ prototypes/card-game/tests/card459-engine.test.mjs:13。

### R13　訂正

ルールブック／各章の「用語を確認する」または本文の用語ボタン／「ラウンド」。

参照元　prototypes/card-game/rulebook-content.mjs:127　対象　GLOSSARY["ラウンド"]。

作業　表示フィールドの全文を1回置換。　該当する個別候補　J467。

現行文

```text
先攻Aと後攻Bが1ターンずつ行う区切り。R10後攻の終了処理後に最終比較します。
```

採用する全文

```text
先攻Aと後攻Bが1ターンずつ行う区切りです。終了ラウンドは基本R10で、時のカードによりR9〜R12に変わります。終了ラウンドの後攻の終了処理後に、そだちを最終比較します。
```

用語集はどの対戦でも読める共通説明。R10以外に終了が設定されたときも正しく読める表現にする。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R14　訂正

ルールブック／第2章「ゲームの目的・勝利条件」／基本説明の勝利フロー／4段目。

参照元　prototypes/card-game/learning-ui.mjs:12　対象　diagramMarkup("victory")／sequences.victory[3]。

作業　同一フィールド内の指定原文だけを1回置換。

現行文

```text
R1〜R9なら早期勝利
```

採用する全文

```text
終了ラウンドより前なら早期勝利
```

判定の直前の段には100維持の条件がすでにある。最後の段だけを短く直す。R9終了の試合はR9で早期勝利せず、R12終了の試合ではR10・R11も判定対象。

根拠　prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

### R15　現行維持

ルールブック／第8章「時コスト・通常行動」／基本説明の時回復の例。

参照元　prototypes/card-game/rulebook-content.mjs:52　対象　CHAPTERS／第8章／details。

作業　現行表示を照合して維持。

現行文

```text
R1=時1、R2=時2、…R10=時10。残りに加算するのではなく、その値へ回復します。試合開始時は両者0で、それぞれの最初の開始処理で1になります。
```

採用する全文は上記の現行文と同一。

「その値へ回復」と書いたうえで、基本のR1〜R10を例示する文。R10を上限とする記述はなく、残り時への加算とも区別されている。R11・R12の例を増やすのは任意。

根拠　prototypes/card-game/engine.mjs:73 ／ prototypes/card-game/engine.mjs:221 ／ prototypes/card-game/tests/card459-engine.test.mjs:13。

### R16　現行維持

ルールブック／第10章／詳しいルール・裁定「セカイ」。

参照元　prototypes/card-game/rulebook-sources.mjs:243　対象　CURRENT_RULINGS／rule-01-22／text。

作業　現行表示を照合して維持。

現行文

```text
各自1枚。新セカイの時を払い旧セカイを捨て札へ。相手セカイへ移動／上書き不可。セカイ変更の共通回数制限なし。
```

採用する全文は上記の現行文と同一。

この項目は通常のセカイの配置枠・支払い・所有者・回数を説明しており、現在も正しい。同じ第10章の基本説明に、時のカードの9〜12・同数のカウンター・費用・最後の有効効果・捨て札の置換がすでに載る。

根拠　prototypes/card-game/rulebook-content.mjs:75 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:36 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:39 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:49。

### R17　現行維持

練習／第1課「ゲームの目的」／手順1の見出し。

参照元　prototypes/card-game/tutorial.mjs:50　対象　LESSONS[0].steps[0].title。

作業　現行表示を照合して維持。

現行文

```text
そだち20から、10ラウンド
```

採用する全文は上記の現行文と同一。

「ゲームの目的」練習の手順見出し。この練習はそだち20・終了R10の固定局面で、練習デッキに時のカード4枚は入らない。

根拠　prototypes/card-game/tutorial.mjs:7 ／ prototypes/card-game/tutorial.mjs:23 ／ prototypes/card-game/tutorial.mjs:49 ／ prototypes/card-game/tutorial.mjs:52 ／ prototypes/card-game/tests/learning.test.mjs:14。

### R18　現行維持

練習／第1課「ゲームの目的」／手順1の説明。

参照元　prototypes/card-game/tutorial.mjs:50　対象　LESSONS[0].steps[0].copy。

作業　現行表示を照合して維持。

現行文

```text
そだちを育てるゲームです。まず「ターン終了」を押し、あなた→CPUの順で進む様子を見ましょう。R10の最後に高い方が勝ちます。
```

採用する全文は上記の現行文と同一。

第1課の手順ではR10が有効な終了ラウンド。操作はターン終了とCPUの配置だけで、終了ラウンドを変更できない。全試合固定という宣言ではない。

根拠　prototypes/card-game/tutorial.mjs:7 ／ prototypes/card-game/tutorial.mjs:23 ／ prototypes/card-game/tutorial.mjs:49 ／ prototypes/card-game/tutorial.mjs:52 ／ prototypes/card-game/tests/learning.test.mjs:14。

### R19　現行維持

練習／第1課「ゲームの目的」／完了時の結果説明。

参照元　prototypes/card-game/tutorial.mjs:52　対象　LESSONS[0].outcome。

作業　現行表示を照合して維持。

現行文

```text
R2へ進みました。そだち20から開始し、R10終了時に比較。R1〜R9では100到達後に始まる最初の相手ターン終了まで100を維持すると早期勝利です。
```

採用する全文は上記の現行文と同一。

実際にR1からR2へ進んだ練習の振り返り。この固定局面ではR1〜R9が早期勝利の対象で、R10に最終比較となる。現行の通常対戦一般の用語集とは用途が異なる。

根拠　prototypes/card-game/tutorial.mjs:7 ／ prototypes/card-game/tutorial.mjs:23 ／ prototypes/card-game/tutorial.mjs:49 ／ prototypes/card-game/tutorial.mjs:52 ／ prototypes/card-game/tests/learning.test.mjs:14 ／ prototypes/card-game/engine.mjs:84 ／ prototypes/card-game/engine.mjs:85 ／ prototypes/card-game/engine.mjs:86 ／ prototypes/card-game/tests/card459-gameplay.test.mjs:55 ／ docs/card-game/482-time-reversal-cards.md:9。

## 照合と実装時の確認

- 詳細裁定で変えるのはCURRENT_RULINGSの該当タイトルまたは本文。過去原典スナップショットSOURCESやsource.headingまで一括置換しない。R02はタイトル、同IDのR03は本文という二つの掲載箇所。
- R06は現在の読点終わりを含む原文だけを置換する。直後の「たまご固有能力」以降の段落は別の内容。
- 新規対戦hotseat-9は正式459枚とデッキ外たまごで図鑑460種類。終了ラウンドの初期値は10、時のカードで9〜12。100維持は終了ラウンドより前、最終比較は終了ラウンドの後攻終了後。E-final-timeとP-snow_spiritの個別R10条件、旧保存、練習第1課の固定R10は個別の既存仕様を保つ。
- 照合時の既存テストはcard459-engine、card459-gameplay、collection、ui-egg-stack、learning、rulebook-currentの6スイート44件すべて成功。旧数値を固定しているrulebook-current.test.mjs:16・22は、実装時に新しい表示・全角検索へ期待を更新する。変更後のテストや端末上の折り返し確認は今後の実装工程。

## データ形式

v4-rules.jsonのrulesは19件の順序付き配列。各要素にR ID、元の文脈ID、現行文、承認全文、決定、使用箇所、出典、根拠、対応J一覧、対象フィールド、作業区分、文ごとのSHA-256が入る。j_to_rはJ IDをキーに、対応R、承認済み抜粋、実装する承認全文、V3の個別案、個別IDでの追加計上の有無を返す。
