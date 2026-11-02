# なおぽよ。新第1章 VERSION 3 — 公開・検証報告

本人限定V3: https://naopoyo-time-hand-chapter1-20261102.kerzion214.chatgpt.site/

**V3を公開済み。ただし全完了条件を満たしたとは報告しません。実ブラウザーQAは未確認、全体CIの残り1件は実行中です。**

|#|要求項目|結果|
|---|---|---|
|1|正式資産の継承|30項目をAUDIT.mdに記録。actorLayout/enteredCells/contactVisualActors/contactEffects/ForestSession.animate/pointerActor/playbackClock、岩・門・出口・正式画像を直接再利用。|
|2|独自UI撤去|ステージselect・キャラselect撤去。正式chapter1/world CSSを直接importし、正式grid/クリアUIをデータアダプター付きで移植。|
|3|選択・移動モーション|V2の共通描画関数を維持。壁で一筆を打ち切る差分を正式travelに合わせて修正。実画面比較は未確認。|
|4|選択・順次開放|クリア済み★・次の1面・未開放disabled・次面ボタン。完了盤面の再読込でも履歴を維持。再挑戦は「やりなおす」。|
|5|キーボード案内|HTML/説明/ヒントから撤去。内部keydownは維持。|
|6|未承認一覧|金印/青印、恋人専用解錠、目標達成まで出口を閉じるlearned条件、独自格子・封印膜・★目標。|
|7|撤去|上記の状態・判定・描画・説明を撤去。ALLと門の淡い光は正式実装由来なので維持。|
|8|本人判断|新ギミックは提案・追加なし。封印撤去後、一部の面は学習ルート以外でもクリア可能。学習目的はヒント/おてほんに維持。強制化を望む場合は別途相談。|
|9|第10面|岩の部屋と既存開口部、犬・ペンギン、既存出口を維持。恋人は最初から通常操作可能。ふたりの救出物語は維持。|
|10|第08面|最初の右上移動は元の岩と行先のかえるが支持し、正式版でも合法。トゲの台は支持にならない。片側と両側の角、ゲート上面も正式と同一。|
|11|物理変更|engine/priorities無変更。正式との差分は既存のD生成ディスパッチと観測hookのみ。V3では外側の未承認policyを撤去。|
|12|10面解答|board/solutionsともV2と同一。全10面の解答・質量・種族別合計・Undo・再読込を検証。|
|13|おてほん/Undo/保存|52試験成功。V2実装生成91保存prefix、追加ランダム947合法prefix復元。DOM単体で全10おてほん前後・位置保持・通常save分離、完了盤面起動Undo、クリア後resize→次面を確認。|
|14|非干渉|変更は新章と資料のみ。正式01〜20/正式解答/本番save/本編/CARD GAME/物語/PR494/503無変更。main未マージ、本番Pages未更新。|
|15|自動テスト/CI|ローカル新章52/52、正式1529/1529。実装コミットのPages/World/Home/Runtime smoke成功。新章workflowのchapter/formal/cardも成功、同workflow内runtimeは実行中。ci.json参照。|
|16|ブラウザー|プレビュー接続失敗後、ブラウザーURLアクセス制御で拒否。回避せず未確認。jsdomは描画・画像・寸法stubを使うDOM単体試験であり、Chrome/Safariの証拠ではない。320×568/375×667/390×844/430×932/短い縦/横の実表示・実指は未確認。|
|17|GitHub|PR504 Draft。実装HEAD `19a8fd8fc297354be35b5e3e2bce36c3ecdc2bec`、実装tree `0765b3f0be00d9bb44f60819402a6ea55a4e2434`。最終の報告追記コミットはコード無変更・[skip ci]。最終HEAD/treeはPR本文に記録。|
|18|本人限定公開|Sites version3、source `62f4c36705c0aeadd55ebb3e2be3333ff7b2851e`。owner1人・groups0・external0。deployment `appgdep_6ae8475f6e088191a2cc24896e8fb074` succeeded。|
|19|配信照合|公開先のHTML/JS/CSS/画像/manifest 67/67 SHA-256一致。index.htmlの2件は同一origin内の正規URLリダイレクトを確認して照合。異なるoriginへ認証情報は転送しない。|
|20|未解決|新章実ブラウザー/Safari QA、残りCIの終了。Undo/save/replayは独立Dアダプターであり、全面的な共通化済みではない。|

保存済みversion ID: `appgprj_6ae818c288a481919e8753bc6e943846~appgver_082dc8d5593c8191838c4731bc018cee`。

旧V2は `1217ebaa39a15df28c48523dd9cfaef1797304b3` に保存。ステージや解答の新規再制作なし。新しい出口条件や物理ギミックなし。空き容量は約6.3GiBを維持。
