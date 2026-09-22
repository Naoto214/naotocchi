# りゅう80表情 — 制作記録（2026-09-22）

基準GitHub HEAD: `761f049a4942bf0777b81189e1f5757e4e20d192`。local `ffee54775ab75621b9240207f5e67f9c1f513ad3`、一致tree `6986cfd6ae1ffbb84d8896cfa9efa2b65b89784c`。開始時remote一致、実main `68c9ba72fd1a060b8a1742cf1701956e02bc51cf` をAPI/ls-remote照合。PR278 Draft/open/未マージ、既存競合あり。CI Actions/statuses/check-runs0、combined pending。制作checkout/Siteともcleanから開始。

## 選定と分類

実装済み22系統1760表情を確認し、character-world-master.v1.jsの未制作rare先頭dragonを選定。script.jsの成長資料・元画像全8を原寸/6倍/実座標グリッドで主担当と独立担当が確認した。全8は単一個体・単一顔。A/B/Cの複数構成要素対象はなく、分類未確定0。火炎・角・翼・尾を別生物と数えない。06の火炎は元画像の成長段階を示すデザイン要素として保持し、外部状態マークと区別。表情は既存一頭の目・眉・口へ反映する。

アンカーと各段階保持事項は `dragon-expressions-20260922-original-review.md` を参照。原本8枚は変更しない。角の数・翼・姿勢・年齢・配色・小物・体格を保ち、状態マーク/汗をPNGへ焼き込まない。新8段階のみ配置生成し、既存176配置を再計算しない。

## 制作開始時の記録

以下は制作開始時点の記録：80全数の生成・検証・独立受理まで完成数へ追加しない。promptと生成元対応はjobs.jsonに保存する。完成済み1760表情の再生成なし。最終版で全体テスト、独立Spec/Codeレビュー、同じowner-private確認Site、GitHub保存を行い末尾へ結果を追記する。

## 制作中の限定修正と表示上の制約

02の新規生成で hungry/sick/tired/sulky/critical/wantsPlay/sleeping の7枚に余分な中央白角が出たため、元画像の2白角＋低い赤橙の中央稜線へ限定修正。tiredのみ初回修正で残存し、2回目で解消。既存1760表情には変更なし。修正前後のSHA256、参照元、生成promptは最終manifestのrepair_historyへ残す。この途中記録時点では01〜06の60枚を原寸・6倍で独立受理済みだった。最終結果は下記の80枚受理を参照。

06は炎と発生口を保持するため、状態差は主に目・眉へ現れる。原寸では空腹／かまって、病気／疲労／弱りの区別が小さい制約がある。全10の意味に明確な矛盾はないとの独立判定であり、完全に理想的な見た目を保証する意味ではない。別レイヤーの状態マークとの合成も最終確認する。確認一覧では後からコマを指定できる。

途中検証：保存済み基準の2061PNG（active1760＋旧資産4＋通常297）は全SHA256一致。HEAD 761f049のCI再照会もActions/statuses/check-runs各0、combined pending。Site一覧のVM DOM状態評価で新規りゅう80・キノコ80・A100/B70/C40・過去複数顔100・全1840の対象設定と選択/メモ/コピー保持を確認した。これは完成画像の公開や実機クリックを意味せず、最終結果は末尾へ追記する。

## 画像・配置の最終受理

全80枚を各段階の元画像参照で個別生成し、128×128・二値alpha・元画像boundsへ正規化。独立担当が全80を単独の原寸・6倍で目視し、80受理・修正待ち0、最終80SHA256一致。主担当は全生成結果と全80マーク付き合成を確認。別の独立担当も全80合成を確認し、追加修正必須0。日本語欠字なし。原画像8枚、顔数・身体数・成長構造の整合を確認。複数顔・群れ・別個体の新規対象や分類未確定0。

新規生成80枚のうち02の7枚のみ角を局所修正（修正生成8回、tiredのみ2回）。完成済み1760表情の修正・再生成0。通常画像297枚、旧資産4枚を含む基準2061PNGを保持。既存176段階配置も保持。`node tools/place-expression-marks.cjs dragon` で新8段階だけ追加し、全1840マーク／1104汗動作範囲の衝突検査はissues0。配置制約・例外を緩めていない。05〜08の汗は翼・角を避けて広め・頭上寄りになる。重なり0は完全に理想的な見た目という意味ではない。

06は火炎、08は細密な角・陰影によって原寸の表情差が控えめになる制約を保持・記録。07-happyの白灰色部分は口内の歯・牙状描写として受理したが、閉口の元画像と牙形の厳密一致を主張しない。全レビューの根拠はreview.md/json、composite-review.md、manifest.jsonを参照。画像一覧は静止合成、汗は近似であり実機確認ではない。

`npm run bump`後、無関係な36識別子を基準へ戻し、pet-expression.jsのみ `20260922-9ec07a00` に更新。JS SHA1先頭8桁との一致を確認。resolver・マーク色/形・ゲーム数値・成長/恋愛・セーブ互換は変更していない。

## 全体テスト初回失敗の原因と限定修正

初回 `npm test` は1542件中1541成功・1失敗（cancelled/skipped/todo各0）、285275.799169ms、exit1。失敗は `dragon preview exposes every stage and never accesses real saves` で、確認用使い捨てデータの保存後に病気表情が通常へ戻る検査。単独再実行でも再現した。

原因は新規rare系統dragonの確認データが `rare-line-1` 実績を未達成としていたこと。初回保存で実績イベントが開き、既存のイベント優先仕様で通常顔へ戻っていた。診断で未達成時は before=sick/after=normal/storyHidden=false、同実績達成済みでは sick維持/storyHidden=true を確認。実ゲームの全段階・状態接続テストは成功しており、resolverやゲーム実績条件は原因ではない。

`tools/cat-expression-preview.cjs` の使い捨てdragon fixtureだけを `rare-line-1` 達成済みにした。既存の年齢実績達成済みfixtureと同じ方式で、ゲーム本体・ゲーム数値・実績獲得条件・セーブ形式は変更していない。既存の失敗テストは変更せず、8段階の表情・実セーブ非アクセス・イベント非表示を再検証し成功（1件、3261.479569ms、exit0）。修正済み確認HTMLを再生成し、最終版で全体テストを再実行する。

初回Site source `4b8c0b70ca3442636a4ab95559de9785e1b4eb12` は保存・packageまでで公開していない。修正後のsource/archiveを改めて保存・検証し、その版だけを公開する。

## 修正版Siteの公開前検証

修正版Site source `0163fac2f181b6c5a2590b2051ace49e4a1ad136` を同じSite repositoryへcommit/push後、`git rev-parse --verify HEAD`で完全SHAを確認。helper正常終了後、`dragon-site-final.tar.gz`全体を別実行を含め2回gzip検証し、SHA256一致を確認した。archive SHA256 `180c065b859d1e92f5d57ade51c81f2880fff03fba03374838bd9e95066ae8ea`、92,593,119bytes、2436ファイルすべて保存済みsourceと内容一致。`dist/.openai/hosting.json`の既存project_id・index・一覧・全PNGを確認。公開結果は次節へ記録する。

一覧は画像版 `dragon-526af411`、りゅう80を初期表示。キノコ80、A同一身体100、B一群70、C別個体40、過去複数顔100、全1840へのアクセスを保持。既存選択保存KEYを維持し、絞り込み・移動・選択・メモ・コピー・ダイアログをVM DOM状態評価で検証（実機クリックではない）。全1840のassetFor実PNG接続・accentFor SVG・Site PNG SHA256一致。既存アンカー/段階名と、新系統list・新8配置以外の表情runtimeが基準と一致。

## 最終全体検証（修正版）

修正後の最終版 `npm test` は1542件成功、失敗／cancelled／skipped／todo各0、292298.621306ms、exit0。全体実行は初回の1失敗を上記の確認fixture限定修正で解消した後の2回目。この成功以降runtime・PNG変更なし。最終Spec PASS／Code quality PASS、未解決Critical／Important／Minor各0。途中記録の時点表記も修正済み。`git diff --check`成功。

既存1760表情の修正・再生成0、基準2061PNG保持、176配置保持、全1840実PNG接続・SVG・Site画像SHA一致、最終新80PNGの独立受理ハッシュ一致。りゅう追加で23系統1840表情。未制作系統は残り、全キャラクターの表情制作完了とは扱わない。

## 確認Site公開・GitHub保存準備

同じSite `appgprj_6aa908e9357c8191abb0f486be58697c` のversion63をprivate公開し、status succeededを再取得した。source `0163fac2f181b6c5a2590b2051ace49e4a1ad136`、version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_5d2b6b73834c8191bfa75afc9172e8c6`、deployment `appgdep_6ab2a486cbd48191b0be920b02c2b979`。owner1・groups0・外部招待0を確認。ゲーム https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/ 、タップ式一覧 https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/mark-review/ 。実機の見た目はユーザー確認対象であり、静止合成/状態評価とは区別する。

GitHub保存直前remoteは基準 `761f049a4942bf0777b81189e1f5757e4e20d192`、tree `6986cfd6ae1ffbb84d8896cfa9efa2b65b89784c`。実main `68c9ba72fd1a060b8a1742cf1701956e02bc51cf` をAPI/ls-remote双方で確認。PR278 Draft/open/未マージ、既存競合を維持し、mainの取り込み・マージなし。必要100ファイル（新80PNGを含む）のみを保存する。保存後の完全HEAD/tree/CI結果は既存本文を保持したPR最終保存欄へ追記する。新HEADのCIが実行0/pendingの場合は成功扱いしない。
