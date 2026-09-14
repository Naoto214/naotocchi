# アイテム・経済 最終QA（2026-09-14）

承認済み設計とcatalog.jsonのproposal/new_price/guardに対する実装照合。基準は5cf658c、Task6で最終表示と文書を整えた。これは実行処理・保存境界の記録であり、実ブラウザの表示品質の合格記録ではない。

## 対応表の読み方

価格はコイン。普通装備の共通入口は「あいてむ→みにつけるもの」の購入/装備ボタン。表中の入口は装備後の効果が起きる操作。通常装備は全品永久所有・1枠で、ゲーム時は開始時装備を使う。ふくろの購入/使用ボタンはrenderConsumableItemGridから実ハンドラへ接続済み。達成品の所有・説明はrenderNaotoItemGridで表示し、個別の効果入口は表のとおり。

保存の共通根拠はIの「new life preserves unused stock」「module validates transactions and persists cooldowns and structured memories」「tool purchase stays owned」とmigration-test.cjs。全品を個別に周回するテストと主張するものではない。各行の効果・対象・再読込は下の既存ケース名の先頭で検索できる。

- I: `tests/item-inventory-test.cjs`
- C: `tests/item-care-game-test.cjs`
- R: `tests/item-relations-travel-test.cjs`
- X: `tests/item-experiences-test.cjs`
- K: `tests/item-collections-economy-test.cjs`
- E: `tests/economy-test.cjs`
- screens: `tests/screens-test.cjs`、migration: `tests/migration-test.cjs`

## 旧38品の全対応

| 旧ID | 新状態 | 価格 | 到達する操作 | 効果hook | 制限 | 保存・境界の実行根拠 |
|---|---|---:|---|---|---|---|
| `flower` | 永久装備 | 120 | きゅうあい | `courtCandidate・求愛処理` | 既存の双方向の恋愛対象判定・初対面処理・85%上限を維持。 | R: valid initial court adds twenty、共通I |
| `ribbon` | 永久装備 | 120 | 育成tick | `tickの自然減・itemContextReaction` | 効果は自然減だけ。病気・失敗・連続じゃれの直接ペナルティは残る。 | C: ribbon and bowtie reduce only ordinary decay、共通I |
| `bowtie` | 永久装備 | 180 | 育成tick・ごはん | `tick・feedBtn` | 満腹を自動回復しない。食べ過ぎの判定・病気は残す。 | C: ribbon and bowtie reduce only ordinary decay; R: equipment reactions、共通I |
| `poop1` | 永久装備 | 240 | うんち3個・育成tick | `tick自動掃除・paper cooldown` | 自動掃除では成長・掃除実績を加算しない。装備し直しても待ち時間を戻さない。 | C: paper removes only one; saved reservations and care cooldowns、共通I |
| `scarf` | 永久装備 | 300 | 冬/雪・育成tick | `envModifiers・発病判定` | 冬・雪による倍率の1を超えた部分だけ半減。病気無効化・食べ過ぎ保護にはしない。 | C: scarf halves only winter and snow; R: equipment reactions、共通I |
| `glasses` | 永久装備 | 360 | あそぶ | `finishMinigameInner` | 補正点を記録・Sランク・勧誘・日次スコアへ混ぜない。既存挙動からの変更点として確認対象。 | C: glasses gives plus ten; all game equipment is fixed、共通I |
| `energy1` | 永久装備 | 360 | 育成tick・あそぶ | `tick・finishMinigameInner` | 環境補正後に軽減して丸める。元気消費0にはしない。 | C: all game equipment is fixed、共通I |
| `hat` | 永久装備 | 540 | あそぶ→へんしん | `finishMinigameInner→offerTransformIfReady` | 年齢・成長段階・候補の解放条件・恋愛の再判定を飛ばさない。 | C: hat opens the legal transform offer、共通I |
| `travel1` | 永久装備 | 480 | たび | `travelToRegion` | 連続旅行の疲れ判定・そだち70の旅先条件・訪問記録は維持。 | R: backpack halves travel costs、共通I |
| `sleepboost1` | 永久装備 | 360 | ねる→おきる | `updateItemEffectTick・tick` | ゲームの元気消費は減らさない。連続使用で持続延長・多重化しない。年齢は通常どおり進む。 まくらを身につけている間だけ軽減が働き、外すと終了する。 | C: pillow takes thirty seconds; saved reservations and care cooldowns、共通I |
| `star` | 永久装備 | 360 | あそぶ・育成tick | `finishMinigameInner・claimStarReward` | 元の報酬とは別の固定15。倍率・ラッキーコインをかけない。購入後最初の受取も5分後で、100分に最大300。途中終了・切替連打は対象外。 | C: star three distinct real scores; star menu distinguishes、共通I |
| `bond1` | 永久装備 | 600 | あいてむ→さいかい | `renderItemRelationActions→startItemReunion` | 既存の勧誘点・レア条件は維持。成功保証なし。使える相手がいなければ待ち時間を消費しない。 再会では加入シールを再付与しない。通常の初加入・別人生の本来の加入報酬とは経路を分ける。 | R: badge retries; reunion cancel; reunion rechecks、共通I |
| `partner1` | 永久装備 | 720 | きゅうあい・向き合う・結婚→おもいで | `rememberPartnerLetter` | 現在すでに無料のデート・記録機能は維持。新しい専用手紙だけ追加。関係の成立・修復は自動化しない。 | R: court letters capture; ring adds partner-specific、共通I |
| `crown` | 永久装備 | 900 | いのちダメージ・けんこう0 | `raiseDeathMeter・checkMeters` | けんこう0の連続カウンターが死亡閾値に達した時、死亡確定前に1回発動し、連続カウンターを0へ戻す。90歳の既存の奇跡があればそちらを先に使い、かんむりは温存。命は戻さず、命側の死亡・100歳のお別れ・病気の原因は止めない。付け替えで再使用不可。 | C: crown rescues; crown does not bypass; saved reservations、共通I |
| `itemluck1` | 永久装備 | 900 | あそぶ | `finishMinigameInner` | カウントはゲーム開始時の装備で決定。ごほうび獲得でリセット。強制ごほうびと同時でも合計1個。誕生日抽選は基本25%へ。 | C: clover five misses survive reload; all three gift sources、共通I |
| `c_coin2` | 非売品の永久在庫 | 非売品 | 今日のチャレンジ→ふくろ→つかう→大成功 | `useConsumableItem→finishMinigameInner` | 新スターバッジ・節目・シールお題には掛けない。既存の購入済み未発動分は使える状態を維持。 在庫数のプレイ上の上限は設けず、日次達成時に1個加算。発動予約は同時に1個。既存在庫・発動中でもその日の1個を受け取れ、未達成日の遡り支給はない。 | I: daily completion adds lucky inventory; E: lucky coin doubles、共通I |
| `c_safety` | 購入→永久在庫→使用 | 20 | ふくろ→かう→つかう→失敗 | `useConsumableItem→finishMinigameInner` | 成功・通常成績では消費しない。途中終了や故意の中断では無料再挑戦報酬を与えない。 | I: bag buttons buy stock; C: protected failure、共通I |
| `c_mgsmall` | 購入→永久在庫→使用 | 40 | ふくろ→かう→つかう→あそぶ | `useConsumableItem→finishMinigameInner` | 実績・自己ベスト・Sランク・勧誘は実点。無効な終了では消費しない。 | E: consumables are bought into stock; C: star excludes assisted low scores、共通I |
| `c_mgbig` | 購入→永久在庫→使用 | 120 | ふくろ→かう→つかう→実点70以上 | `useConsumableItem→finishMinigameInner` | 実点70未満なら温存。クローバー等と重なってもごほうびは合計1個。追加せいちょう14は既存2倍ブーストの対象にして最大28、倍率を重ねない。 | C: great charm waits; failed and invalid completion、共通I |
| `c_sickshield` | 購入→永久在庫→使用 | 60 | ふくろ→かう→つかう→発病判定 | `useConsumableItem→tick` | 治療・食べ過ぎ予防・放置無敵にしない。発病条件を解除する世話が依然必要。 | C: disease shield shows; saved reservations and care cooldowns、共通I |
| `c_growth` | 購入→永久在庫→使用 | 90 | ふくろ→かう→つかう | `useConsumableItem→grantGrowthBoost` | そだち100・卵・無限・お別れ中では使わせない。未使用在庫と発動中の時間を分ける。 | I: buy stores a drink; bag buttons buy stock、共通I |
| `c_courtsmall` | 購入→永久在庫→使用 | 50 | ふくろ→かう→よやく→きゅうあい | `reserveRelationItem→commitPendingItem` | 初対面・候補なし・対象不一致では使わない。恋愛対象や性別を書き換えない。 | R: initial court charm reserves; first meeting and real mismatched; deferred partner reservations、共通I |
| `c_courtbig` | 統合・新規販売なし | 非売品 | 旧セーブの読み込みのみ | `ITEM_SYSTEM.normalize` | 移行済みの記録を付け、再読込・次の人生で二重返金しない。旧IDは履歴・互換用として保持し、必要な種類判定では統合先へ対応づける。 | I: big court reservation refunds 350 exactly once、共通I |
| `c_breakhalf` | 購入→永久在庫→使用 | 60 | ふくろ→かう→よやく→向き合う | `reserveRelationItem→commitPendingItem` | 最低1回はプレイヤーが会話する。すでに残り1回なら使わない。別れた相手を自動で戻さない。 | R: repair charm needs; deferred partner reservations、共通I |
| `c_breakfull` | 購入→永久在庫→使用 | 100 | ふくろ→かう→よやく→なかよし度0 | `tick・commitPendingItem` | 猶予中の減衰だけ停止。放置すれば再び減り別れる。相性を変更しない。連続使用は同じ関係で一生1回。 | R: shield is once; guest shield follows; legacy alias、共通I |
| `c_travel` | 購入→永久在庫→使用 | 70 | ふくろ→かう→よやく→たび→寄り道選択 | `openItemTravelScene→commitItemTravelScene` | 解放済みの場所のみ。元気・満腹は消費。イベントの重複報酬・実績の自然観測条件を壊さない。 | R: travel charm shows two choices; prepaid legacy relation/travel、共通I |
| `fun_candy` | 購入→永久在庫→使用 | 10 | ふくろ→かう→つかう／ホーム道具列 | `useItem→showFunItemEffect` | 満腹・命は回復しない。1分の反応中に重ねて使わせない。 | X: bag candy gives eight; all effect handlers、共通I |
| `fun_bubbles` | 購入→永久在庫→使用 | 25 | ふくろ→かう→つかう／ホーム道具列 | `useItem→showFunItemEffect` | ミニゲームの得点・成長・クリア回数には加算しない。演出を閉じても損失なし。 | X: bubbles reach every active companion; all effect handlers、共通I |
| `fun_balloon` | 購入→永久在庫→使用 | 35 | ふくろ→かう→つかう→ホーム招待 | `useItem→updateFunItemTick` | 呼べる未加入の通常なかまがいない時は使用不可。ゲーム・睡眠・他の招待中には割り込まず、その人生の次の有効なホーム場面へ保留。通常の遭遇予約と二重に招かず、対象資格を再確認。重ねて使用不可。 | X: balloon waits; balloon reload; balloon with no eligible、共通I |
| `fun_fireworks` | 購入→永久在庫→使用 | 60 | ふくろ→かう→つかう／ホーム道具列 | `useItem→showFunItemEffect` | 新規の恋人は作らない。自然の時間・天気の実績条件を満たしたことにはしない。 | X: bubbles reach every active companion; all effect handlers、共通I |
| `fun_camera` | 永久道具 | 900 | ふくろ→かう→つかう→おもいで→画像 | `useItem→photoSnapshot→NaotocchiItemMemories.exportPhoto` | 撮影でコイン・シール・成長を無制限に生成しない。既存の無料の人生カード・保存機能は維持。一般ドロップから外す。 | X: camera; real gallery export; guest photo; I: legacy tools migrate、共通I |
| `fun_musicbox` | 永久道具 | 1200 | ふくろ→かう→つかう→おもいで→きく | `useItem→collectItemTunes・playSavedItemTune→audio.playItemTune` | 既存BGM設定は無料のまま。おとろえ軽減は育成5分ごと。再使用・画面開閉・再読込で待ち時間を戻さない。一般ドロップから外す。 | X: music bag; actual audio controller; I: legacy use history、共通I |
| `fun_surprise` | 永久道具 | 600 | ふくろ→かう→つかう／ホーム道具列 | `useItem→showFunItemEffect` | 待ち時間は保存し、開閉・持ち替え・再読込でリセットしない。コイン・ごほうび・成長は抽選に入れない。一般ドロップから外す。 | X: box literal RNG outcomes; crown stores seven; I: tool purchase stays owned、共通I |
| `reward` | 非売品の永久在庫 | 非売品 | ごほうび表示→デート/たび出発選択 | `confirmDateReward・commitItemTravelScene` | 病気・命・年齢の全回復は付けない。出発不可・中断なら未消費。購入品と同様、未使用分は次の人生へ持ち越す。 | R: special travel; special date cancel; reward dates with a ring、共通I |
| `naoto_charm` | 達成で永久取得 | 非売品 | 達成品の表示→70歳以降の育成 | `syncNaotoRewardItems→tick年齢リスク` | 全ダメージ28%軽減や病気無効と誤記しない。通常のお世話は必要。 | R: equipment reactions; 最終runtime probe: ownedGoals、migration、共通I |
| `naoto_lantern` | 達成で永久取得 | 非売品 | 達成品の表示→あいてむ→地域のあかり | `renderItemRelationActions→useItemLantern` | 未解放の場所・未達条件のレアキャラを直接出さない。コイン報酬は追加しない。 | R: lantern requires ownership and visited region、共通I |
| `naoto_ring` | 達成で永久取得 | 非売品 | 達成品の表示→通常/特別デート→おもいで | `ringSecretLine・デート確定` | 不死・病気無効・関係固定には戻さない。交際相手がいない場合も所有と鑑賞はできる。 | R: ring adds partner-specific; reward dates with a ring、共通I |
| `naoto_crown` | 達成で永久取得 | 非売品 | 達成品の表示→7つのお楽しみ→おもいで | `useItem→かんむり反応記録` | 4ステータス固定・無制限のコイン生成は付けない。新コレクションを既存PERFECT条件へ追加しない。 | X: crown stores seven; each crown item varies; crown context uses age boundaries、共通I |

## 新規採用3品

| ID | 状態・価格 | 入口 | 効果hook | 効果と制限 | 実行根拠 |
|---|---|---|---|---|---|
| `new_life_patch` | 採用・160 | ふくろ→かう→つかう | `useConsumableItem` | 命が40以下のとき、命30・けんこう20を戻す。一生に1回。 病気・空腹・老いの原因は残る。100歳の終わりや死亡後は対象外。 | C: life patch bought; life patch rejects; life patch works at exactly forty |
| `new_transform_mirror` | 採用・80 | ふくろ/へんしん→こかがみ→候補選択 | `resolvePickerSelection→rerollTransformCandidate` | 変身候補が出たとき、1候補だけを合法な同じ候補プールから引き直す。1回の候補提示につき1個まで。 代替候補がなければ消費しない。年齢・段階・解放条件・隠し表示は維持。 元の候補と現在表示中の他候補は抽選から除外。代替なしなら不消費。 | C: mirror bag; mirror cannot spend; mirror actual transform button |
| `new_themed_pack` | 採用・60 | シールちょう→分類→テーマパック | `openThemedStickerPack` | 「けしき／なかま／あいてむ」など選んだ分類から3枚。重複救済は通常パックと同じ。 れんくんの隠し条件は共通。シールから本編加入・成長・図鑑発見は起こさない。 | K: theme costs 60; real sticker menu commits; hidden gate |

`new_world_kaleidoscope`（4000）は保留。販売・使用ボタンなし。新候補3品や新しい記憶を既存PERFECTの全品対象へ追加しない。

## 周辺8項目と411の収集対象

| ID | 価格 | 到達する入口・処理 | 効果・制限 | 保存・境界の根拠 |
|---|---:|---|---|---|
| `dreamEggs.normal` | 非売品 | 卵→あいてむ→たまごのゆめ→openDreamPicker→孵化 | そだち100で1個、通常22種。予約では減らず孵化成功で1個 | K: egg menu reserves; invalid or unavailable hatch; repeated hatch callback |
| `dreamEggs.rare` | 非売品 | 卵→あいてむ→でんせつのゆめ→openDreamPicker→孵化 | そだち90で1個、レア8種。隠しrenを除く | 同上。再読み込みで二重消費なし |
| `sticker-pack` | 30 | シールちょう→パック→openStickerPack | 即開封3枚。本編の図鑑発見・加入にはならない | K: theme costs 60…ordinary stays 30/3 |
| `sticker-kakera` | 非売品 | シールちょうの残数表示→grantSticker/お題 | 重複1/3/8、永久所持。次の交換までの不足数を表示、換金なし | sticker-test: granting stickers records copies; page tasks pay out once |
| `kakera-exchange` | 12かけら | シールちょう→かけらでえらぶ→chooseKakeraSticker | 未所持優先3候補から1枚。取消不消費。全所持時は重複と事前表示 | K: kakera choice presents; all-owned fragment choices |
| `sticker-catalog` | 個別販売なし | シールちょう→貼付/回転/縮尺/画像 | 330種（姿248・仲間26・恋人18・装備15・景色23）。旧装備IDの枚数/位置移行。隠し発見ゲート維持 | K: legacy sticker counts and positions; sticker-testの貼付/保存 |
| `design-colors` | 無料 | みため→あつめたいろ・がら→renderDesignCollection | 41種の達成見本、からだの着せ替えではない | UI実行で41件、viewport-design-test: legacy colors and earned designs |
| `design-patterns` | 無料 | 同上 | 40種の達成見本。旧所持も永久保持 | UI実行で40件、同上 |

411=330+41+40は収集対象の数で、411個の有料商品ではない。パックによる隠しキャラ開示・レア加入・図鑑自動登録はない。無料のお世話9操作、世界設定のじかん→てんき→きせつ→ばしょ、既存BGMと人生カードの無料入口を維持する。命・病気・お世話・そだち・変身・年齢・仲間・恋人・ゲーム・イベント・世界環境・実績・図鑑を上表の入口と境界で照合した。

## 価格・供給・PERFECT

通常装備15品合計6540。永久道具は900+1200+600=2700。7つのお楽しみを全て購入する場合は使い切り10+25+35+60=130を加え、装備と合わせ9370。無料配布の使い切り4種を利用するなら永久品9240の購入でこの所有/使用条件を進められる。既存所有や移行済み道具は買い直さない。

これはPERFECT達成の固定費ではない。装備15所有とFUN7初使用、実消費30回などの従来実績を維持し、新品3種・曲/写真/灯り/反応の全収集を条件に加えない。無限シャッターで使用30回は増えない。達成品は無償で各ゴールに対応する。全図鑑・レア・恋愛対象・年齢の条件は購入で飛ばせない。

一般のお楽しみ配布はキャンディ55%、泡25%、風船15%、花火5%。配布時期は従来どおりで、カメラ/オルゴール/箱は一般配布から外れる。通常ゲームの報酬判定30〜69は2、70以上の基本5〜11（環境等による増減は別）、失敗/中断0。星は実点30以上の異なる3種類＋100活動tickで固定15。クイック通常/単独は1ラン1精算、共通の星1種類。実点・記録・ランク・勧誘は報酬補正から分離する。

## 自動実行と実画面の境界

Task6の具体的な欠落は、星が0〜2個でも待ち時間だけ終わると「受取できる」と出たこと。実ハンドラで購入→表示→2ゲーム→3ゲームの固定15支給を確認するREDテストを追加し、必要な残り種類数と待ち時間を同時に表示するよう修正した。価格や支給ロジックは変更していない。

ふくろの説明に残っていた「購入即発動」「同じ品は1つしか持てない」を訂正。各品の承認済み量・回数・条件を説明へ補い、発動中の残数/時間と在庫を分けた。達成品・旧回復品の古いコメントも更新。キャッシュ更新は変更したassetだけ。

実ブラウザはCloud BrowserがローカルHTTPをERR_BLOCKED_BY_CLIENTで拒否し、共有ファイルもURLポリシーで拒否して迂回を禁じたため未実施。代替URL、プロキシ、CDP、トンネルは試していない。実画面の狭幅レイアウト・PNGの見た目・実音の試聴は未確認で、PRはDraftのまま。ランタイムのDOM/Canvas/WebAudioスタブは表示や聴感の証明ではない。

既存のゲストコードは引き続き読み込める。新コードの任意originIdは一生単位で保存し、関係保護/思い出に利用する。古いコードは同じ内容の別個体や内容が変わった同一個体を完全には識別できず、オフラインコードの本人性を保証しない。

### 手動確認用fixture

ローカル証跡は`/workspace/scratch/990ffa94bbe3/analysis/task6-fixtures/`。`camera`、`inventory`、`targetless`、`oldsave`、`rich`、`few-coins`のJSONとNTS1セーブコードを保存。既存セーブを守るため検証用プロファイルで「データ→セーブコードの読み込み」を利用する。安定した提供コマンドは、リポジトリで`python3 -m http.server 4173 --bind 127.0.0.1`。これは許可された実ブラウザ環境で将来実行する手順で、今回のブロックを回避する指示ではない。

確認対象: cameraの写真出力/過去の姿/同席者/環境順、inventoryの購入と使用/残数、targetlessの無効/取消不消費、oldsaveの1回移行、rich/few-coinsの全商品/不足金額、390×844と320×568で固定ホーム/一列うんち/左右対称の仲間/直下会話/メニュー内スクロール。音は初回タップ・効果音OFF・曲の切り替え・よみあげ中の音量復帰を実機で確認する。

## 最終runtimeの経済9シナリオ

実行: `node /workspace/scratch/990ffa94bbe3/analysis/harness-economy-sim-implemented.cjs`。既存9方針・seed11/29/47を変更せず、そのまま最終runtimeで実行した。出力は`analysis/harness-economy-results-task6-final.json`（この作業環境ではリポジトリの隣）。旧監査19b579aの反実仮想補正は使っていない。

各回はfreshStateからの独立した新規セーブ1人生。購入・装備・道具使用なし、場所home・夕方・曇り・春固定。空腹72未満で食事、うんち2以上で掃除、病気で薬、機嫌65未満かつ連打条件内でじゃれる、元気25未満で睡眠/回復helperを実行する。ゲームは即時完了させ、点数を供給している。実際のプレイヤーの計測ではない。

| 方針 | 活動tick間隔 | 得点20/50/80/95の確率 | 一人生のゲーム数 |
|---|---:|---|---:|
| light | 200（育成10分） | 20% / 50% / 25% / 5% | 10 |
| regular | 80（育成4分） | 5% / 30% / 40% / 25% | 25 |
| mastery | 40（育成2分） | 0% / 10% / 30% / 60% | 50 |

活動tick・life-minutesはゲーム内部の進行時間。ゲーム/メニュー/睡眠の実所要時間を測っていないので「100壁時計分で必ずこの収入」とは言えない。誕生日・段階・中年・伝説など、その実行中に起きた既存支給を含む。日次を別途実施したり、無制限にゲームを繰り返した結果ではない。

| 方針 | seed | 終了年齢 | そだち/最高そだち | 獲得コイン | 大成功/通常/失敗 | 睡眠 |
|---|---:|---:|---|---:|---|---:|
| light | 11 | 100 | 65/65 | 1920 | 3/3/4 | 9 |
| light | 29 | 100 | 68/68 | 1954 | 6/4/0 | 9 |
| light | 47 | 100 | 66/66 | 1910 | 1/7/2 | 9 |
| regular | 11 | 100 | 77/77 | 2697 | 17/7/1 | 12 |
| regular | 29 | 100 | 76/76 | 2723 | 20/5/0 | 12 |
| regular | 47 | 100 | 76/76 | 2671 | 16/8/1 | 12 |
| mastery | 11 | 100 | 95/95 | 3849 | 45/5/0 | 16 |
| mastery | 29 | 100 | 95/95 | 3871 | 45/5/0 | 16 |
| mastery | 47 | 100 | 94/94 | 3816 | 42/8/0 | 16 |

| 方針 | 収入の範囲 | 平均 | 最高そだちの範囲 |
|---|---:|---:|---|
| light | 1910〜1954 | 1928.0 | 65〜68 |
| regular | 2671〜2723 | 2697.0 | 76〜77 |
| mastery | 3816〜3871 | 3845.3 | 94〜95 |

全9件が年齢100のfarewellで終わったが、そだち100に到達した回はない。この収入を最高到達可能額や店を完成する正確な周回数へ換算しない。次の人生では初回/日次/永久報酬の条件が異なるため、同じ収入を単純に掛け算できない。ゲームの追加周回、購入/装備/道具、複数人生は対象外。

そだち100までの支給は別の実行probeで30〜100の8節目を呼び、60/80/100/150/220/300/450/800、合計2160と再支給なしを確認した。`tests/item-inventory-test.cjs`も100の800固定支給と使用後の再呼出で増えないことを確認している。probeは経済方針をそだち100達成と見なすものではない。同じprobeで実行した収集表示330/41/40、装備合計6540、達成品4所有の表示と無料維持を確認した。

### 最終検証結果

- RED: `node --test --test-name-pattern='star menu distinguishes' tests/item-care-game-test.cjs`で1件失敗（星0で「あと3種類」の案内なし）。
- GREEN: `node --test tests/item-care-game-test.cjs`で27/27、`node --test tests/item-inventory-test.cjs tests/item-care-game-test.cjs tests/item-relations-travel-test.cjs tests/item-experiences-test.cjs tests/item-collections-economy-test.cjs`で101/101。
- runtime probeと6種類のfixture再読み込みは成功。oldsaveは17→367の1回返金と永久道具移行を確認した。
- 全production/doc/cache編集後の全体テスト初回は518/519（1件失敗）。下記の根因修正後、controllerの指示で最終全体テストを1回再実行する。


### 全体テストで判明したQuickの根因と修正

初回の`env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test`はexit1、519件中518件成功、1件失敗。既存の「cue is a short instruction」assertionが、PR263で入ったumbrellaの「あめがきたら かさ！」（10文字）を拒否した。ランダムな初手がumbrellaになる場合に発生する。最終item差分以前の5cf658cとquick.js/当該テストは同じだった。

Systematic Debuggingでソロumbrellaを指定して同じ表示を再現し、実行時50ゲームのcueを調べ、9文字を超えるものはumbrellaだけと確認した。空白1文字を除き「あめがきたらかさ！」へ修正。既存assertionの上限を緩めず、ゲーム時間・操作・音声文は変更していない。新しい実行テストはソロ開始→短いcue→雨前は未準備→雨に合わせて上スワイプ→成功表示→次のゲームを確認する。RED1件失敗から、Quick全10件GREENへ。quick.jsのキャッシュを更新してから全体を再検証した。

経済9シナリオはこのcueだけの修正直前のruntime。ゲーム実行・経済・在庫・時間の意味は変更しておらず、その経済証跡を維持する。試行の失敗を消したり、同じ不具合のまま乱数を引き直して合格扱いにしていない。

最終全体実行: `env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test`、exit0。smoke・dialogue・visual QAの各実行に続き、Node test **520件/520件成功、失敗0**（11197.604126ms）。初回失敗は修正前の518/519として上に残す。最終ログは`analysis/task6-final-npm-test-corrected.txt`、初回は`analysis/task6-final-npm-test.txt`。`git diff --check`とstaged差分の同検査も成功。

ログには意図したfault injection（probe failure、minigame boom/start boom、保存容量不足）が出ている。これらは例外回復テストの実行に伴う診断で、出力が無音とは主張しない。環境のnpm proxy警告はコマンドのtask-local環境変数除外で避け、グローバル設定は変更していない。


### 最終レビュー修正・PR264の固定取り込み

上の520/520は以前のTask6の全体実行。最終レビュー後の修正基点は`a7fbb744056607ef675fff4b0af33baac40ad212`。PR264（`300d2aeeb93e61b6b2ff586e7a4ee83ab897c89b`）の指示整形・話速・高さ・質問形、600ms表示と0.32秒動作を取り込み、全50本・単独ゲーム・1ラン1精算・オルゴール再生を保持した。

リボンと花などの装備説明は、既存の通知欄へ表示する。通常のお世話通知・成長の通知・会話を待ち、緊急のお世話を優先する。動きを減らす設定でも説明を表示し、次の人生へ古い説明を持ち越さない。一度に最新の1件だけを保持し、15秒以上待った説明やホームから離れた場面の説明は再生しない。新しい常設の説明欄は追加していない。

`node --test tests/audio-regression-test.cjs tests/quick-mode-test.cjs tests/item-inventory-test.cjs tests/item-care-game-test.cjs tests/item-relations-travel-test.cjs tests/item-experiences-test.cjs tests/asset-versions-test.cjs tests/care-status-integration-test.cjs`は**120/120、失敗0**。装備の実イベント→予約された表示、花の成功/保留、動きを減らす設定、未適用、会話/緊急通知の優先、新人生の境界を確認した。音声テストは音量復帰の実コールバックと前の復帰予約の取消、BGM0.28/効果音0.9への復帰を確認した。`node tests/smoke-test.js`と`node tests/dialogue-test.js`も成功。

変更したaudio/script/quick/styleのURLは最終内容のハッシュへ変更し、旧mainとPR264の音声URLと重複しない。変更のない26参照は維持した。旧main・PR264それぞれのscriptと対応するHTMLを、現行の音声/Quickモジュールと組み合わせたsmokeも成功。これはキャッシュの実機観測や実音の確認を意味しない。

最初の統合確認は15件中13件成功。既存の音声assertionが旧語尾と旧700ms以上の復帰予約を期待していたため、PR264で実際に出る「よけろっ!」と短い指示の450msへ合わせ、15/15へ。装備の表示テストは未接続時の3件失敗を確認してから接続した。テスト用DOMの初期非表示状態と、成功時の成長通知待ち時間も修正して最終120/120へ至った。失敗出力は修正報告に保持している。

価格・数値効果・在庫・供給はこの修正で変えていない。9方針実測は装備/購入なし、ゲームの即時結果で進めているため、その既存証跡を維持する。controllerが一度の限定再レビュー後、最終HEADで新しい全npm gateを行う。実ブラウザ操作・390×844/320×568のレイアウト・PNGの見た目・実音は未確認のままであり、以前のCloud Browserによる拒否を回避する試行はしていない。

### 最終gateで判明したテストの時刻依存

最終レビュー修正後の`de2e00dd8ab850c64c2318817f9eaae9cf654fd0`でcontrollerが実行した全npm gateは**526件中524件成功、2件失敗**。Quickの2テストが元気91を期待したが89だった。前の限定実行はホスト時刻9月14日23:58（日本時間）、全体実行は9月15日00:07で、自動予想の天気が曇りから雪へ変わった。雪のゲーム消費1.2倍と開始時のバンドが正しく適用され、消費11になっていた。同じ2件は修正前のa7fbb74でも両時刻で再現し、今回のゲーム変更による不具合ではない。

この2件の準備だけをホーム・曇り・夜・秋へ固定し、元気91、報酬13、記録・開始時装備・1回精算の既存assertionは保持した。ゲーム本体と共通ハーネスは変更していない。先の526/524/2を合格扱いにせず、この小さな修正を確認してから次の全体実行を行った。実画面・PNGの見た目・実音の未確認も継続する。

### 最終全体実行の結果

`68c3f95cc67000f06b6cf3747b0443d82988e285`のクリーンな作業ツリーで、`env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test`を実行し、**exit0、526件中526件成功、失敗0**を確認した（10379.667296ms）。smoke・dialogue・visual QAの各段階も成功。ホストの日時やタイムゾーンを変更せず、既存のassertionを保持した実行である。全ログは作業時の`analysis/items-final-npm-test-68c3f95.txt`へ保存し、先の失敗ログも別に保持した。故障を模したテストの想定内の診断出力は隠していない。

controllerは2件の準備データ4行とQA追記6行の全差分を確認し、本体・共通ハーネス・期待値・価格・キャッシュに変更がないことを確認した。変更前後の時刻でも両テストが通り、元の自動天気が雪のときは消費11になる比較結果も保持している。mainの300d2aeからの全差分に対する`git diff --check`も成功。全体実行後の追記は、このQA記録だけである。

最終製品レビューの指摘I1/I2とM1〜M5は解消し、修正差分の限定再レビューを通過した。実ブラウザ・狭い画面・PNGの見た目・試聴は引き続き未確認で、提出はその制約を明記したDraft PRとする。mainへのマージや公開は行わない。

### Task9: PR265/266のムービー・指輪との固定統合

`a2ca196a357215bcaa434d852ed7a92ef8c2823b`から、PR265/266を含む固定main `3ec3a9ba030999a15a34b93d35bc6405ff676ed1`だけをfeatureへ取り込んだ。`index.html`では全画面ムービーのCSS/構造と指輪レイアウトの参照を残し、アイテムのCSS・`item-memories.js`・`item-system.js`を`script.js`より先に読む。統合済み`script.js`だけは内容ハッシュ`b8eddc25`へ更新し、mainと同一のmovie/CSS/指輪参照は上流の有効な値を維持した。

競合した`package.json`はmovie testと既存のitem inventory/care/relation/experience/collection testの両方を1つの`npm test`一覧に残した。`tests/dialogue-test.js`は、相手固有の記録・最初のリング文を残す現行`ringSecretLine`の実際の「ふたりの合言葉」を確認する。最初の統合実行では上流側の「ふたりだけ」期待がこの実装と不一致で1件失敗した。catalogの通常デートの相手別合言葉と実際の字幕を追跡してassertionだけを正しい文言へ戻し、価格・効果・在庫・保存処理は変えていない。

focused実行はmovie/cast/relation/experience/Quick/audio/cache/dialogueの**82件成功、失敗0**。リボン/花の読める通知、会話・緊急お世話優先、新人生境界、写真/思い出、リング+ごほうびの1記録、日付/旅の相手と対象再検証、Quickのhome/cloudy/night/autumn・元気91/報酬13・1回精算/生記録/再読込を保持して確認した。

コード・テスト・cache編集を確定した`7c84a7c`で、`env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test`を1回実行し、smoke/dialogue/visual QAを含め**533件成功、失敗0**（14129.07384ms、exit0）。故障注入のprobe/minigame/storage診断は意図した回復テストの出力として残した。完全な出力は作業時の`analysis/items-task9-npm-test-7c84a7c.txt`に保存した。以前の526/526と526/524/2の履歴は上記のまま保持し、今回の経済9方針は実行・転記していない（controllerが固定コードで一度実行する）。

上流に含まれるQA PNG/JSONは既存artifactとして取り込んだだけで、今回の目視証拠にはしていない。Cloud Browserのlocal HTTP/shared file拒否と迂回禁止は継続するため、実ブラウザの狭幅レイアウト、PNG外観、実音の試聴は未確認のまま。mainへのマージ、公開、pushはしていない。

### Task9後の収支再確認・差分レビュー

controllerは`68e0f75578e7e070958cd90d85476bd9be3701e8`（本体・テストは全体実行済み`7c84a7c`と同一）で、元の`harness-economy-sim-implemented.cjs`を変更せず実行した。新規セーブ9本、seed 11/29/47、ホーム・夕方・曇り・春、購入・装備なし、お世話と点数の方針は上記の経済試算と同一。出力は`analysis/harness-economy-results-task9-final.json`へ保存し、全9行がTask6のJSONと完全一致した。初回の起動は作業ディレクトリの指定漏れにより`quick.js`を読めず、方針を実行する前に終了した。リポジトリを作業ディレクトリに指定した実行はexit0、標準エラー出力なしで完了している。

| 遊び方 | 100歳時の所持金 | 到達したそだちの範囲 | 人生中のゲーム回数 |
|---|---:|---:|---:|
| 軽め（light） | 1,910〜1,954 | 65〜68 | 10 |
| 標準（regular） | 2,671〜2,723 | 76〜77 | 25 |
| 遊び込み（mastery） | 3,816〜3,871 | 94〜95 | 50 |

9例とも100歳のお別れで終了し、そだち100には到達していない。これは固定方針・購入なしの所持金比較であり、実際の利用者の収入分布、上限収入、実時間の必要量、複数人生での達成期間を示すものではない。ムービー・指輪の統合による、この比較条件での経済変化はなかった。

Task9の独立した差分レビューは仕様適合・品質承認。通知とstory/movieの優先順位を追加の限定実行で確認し、リングとごほうびの1回消費・1記録・再読込、読込順と6つのキャッシュハッシュ、テスト一覧を確認した。重要な未解決指摘はない。故障注入テストの意図した診断スタックは、ログを読みやすくする余地として残っている。実画面・PNGの外観・試聴の未確認は継続する。この確認後の変更は、QA結果とPR本文案の文書更新だけである。

## PR267 current-main integration（2026-09-14、Task1）

`3780497b8a9fc7e72a651ba6206543e47314f89d` を item economy feature へ統合した。`index.html` は `meguru.js` を `script.js` より前、既存の `item-memories.js` と `item-system.js` を元の順で読み込む。`package.json` は既存の全item/movie/ring/Quick suiteを残して `tests/meguru-test.cjs` を追加した。runtime harness と dialogue/smoke loader も同じ順で読み込み、既存exportsを保ったまま Meguru の entry/talk/exit、状態、解放判定、段階、旅行表示を公開する。実際に内容が変わった `style.css`、combined `script.js`、新規 `meguru.js` のキャッシュtokenだけを更新した。

統合後の最初の focused 実行では、Meguru の renderer-independent simulation の「party stays near」assertionが失敗した。pinned upstream `3780497` を一時archiveで同じ `node --test tests/meguru-test.cjs` として実行しても同じ失敗（6件中5件成功）を再現した。`setPlayer` は production caller がなく、fixture が遠方へ即時位置指定した後に通常の追従速度で2秒以内に追いつくことを期待していた。productionの追従挙動は変更せず、通常入力で歩くときに各follow slotから90未満のlagを確認する実測のassertionへ置き換えた。

追加したcross-feature regressionは、Meguru中のitem context通知がホームへ戻るまで待つこと、entry/talk/exitがコイン、minigame record、Star categoryを変えないことを確認する。REDではMeguru中に通知が表示された。GREENでは`scheduleItemContextMessage`がscene中だけ再試行し、同じ人生・通常の優先条件を保ったまま帰宅後に表示する。既存の旅行/GPS選択、日付・旅行の消費/保存、ふたりの合言葉と指輪の単一memory、Quickのhome/cloudy/night/autumnと元気91・報酬13のassertionを残した。

Focused command（source freeze直前）:

```sh
node tests/smoke-test.js && node tests/dialogue-test.js && node --test tests/meguru-test.cjs tests/item-relations-travel-test.cjs tests/item-care-game-test.cjs tests/item-experiences-test.cjs tests/quick-mode-test.cjs tests/movie-test.cjs tests/audio-regression-test.cjs tests/asset-versions-test.cjs
```

結果は102/102 pass。main3780497のHome layout CIにはMeguru由来の27 glyph source-art欠落という別の既知blockerがある。controllerのTask2がこの修正後に唯一の`npm test` full gateを行うため、Task1ではfull gateを重複実行していない。runtime testsはブラウザ実画面、PNGの見た目、実際の試聴を確認しない。

## PR267 illustration catalog repair（2026-09-14、Task2）

main `3780497b8a9fc7e72a651ba6206543e47314f89d` の Home layout CI job `104050374351` は、package install/browser setup の後、全root JS/CSS/HTML を読むdisplay corpusでMeguru由来27 glyphの表示定義を数えられず失敗していた。Node側のcatalog testが `index.html`、`script.js`、`games.js` だけを読む差が原因である。`tests/illustration-catalog-test.cjs` を同じroot inventoryへ広げ、既存のasset/safe SVG/frame検査とunknown joined-glyph保持検査は変更していない。

このREDを最初に実行した。

```sh
node --test tests/illustration-catalog-test.cjs
```

結果は2件中1 pass/1 fail（202.171619ms）で、実際の欠落は `🛝 🪑 🛖 🚉 ⛲ 🛷 🧊 🌉 🪺 🏛️ 🚲 🍜 🧦 🐷 🐯 🐮 🥕 🖐️ 🤤 🔪 🙌 🐺 🍅 🌛 🤚 ❗ 🪶` の27件だけだった。最初の失敗出力はTask2 reportに保持した。

`ui-symbol-art.js` へ、既存の24-unit warm outline paletteとshared `add`/path/shape helperを使う意味のあるvector定義を追加した。定義は順に、すべりだい、いす、こや、えき、ふんすい、そり、こおり、はし、す、しんでん、じてんしゃ、らーめん、くつした、ぶた、とら、うし、にんじん、ひらいたて、よだれのかお、ほうちょう、あげたて、おおかみ、トマト、かおのあるみかづき、あげたひら、びっくりマーク、はねである。aliasやunknown-symbolのgeneric fallbackは追加していない。source glyphと保存IDはそのままで、価格・効果・供給・ゲーム/Star記録・Quick・経済値には変更がない。`index.html` は実際に変更した `ui-symbol-art.js` のtokenだけを `20260914-7436e5ef` に更新した。

Focused GREEN:

```sh
node --test tests/illustration-catalog-test.cjs tests/ui-illustrations-test.cjs tests/display-illustrations-test.cjs tests/canvas-illustrations-test.cjs tests/asset-versions-test.cjs
```

結果は41/41 pass、fail 0（1592.479638ms）。catalog/UI/display/Canvas/cacheを同時に通し、27定義がすべて存在し、text/script/event attributeを含まないことも検査した。production/test/cacheのcommitは `53b3651bc0b626bc827f335f48b9accf6183802e`（`fix: catalog Meguru illustration symbols`）で凍結し、`git diff --check` はexit 0だった。

その凍結commitで一度だけ次を実行した。

```sh
env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test
```

結果はexit 0、540/540 pass、fail 0（13477.538502ms）。complete outputは `analysis/items-merge-ready-npm-test-53b3651.txt` に保存した。album probe とstorage quotaの診断は既存の故障注入回復testの想定出力として残り、test failureではない。controllerがこの完了コード上で未変更の9-policy economy comparisonを一度実行し、feature更新後に既存CIの実display box監査を観測する。

ブラウザ、Playwright/CDP、local HTTP/shared file、tunnel、画像検査、実音の試聴は行っていない。Node testは実レイアウトや聴感を保証しないため、CIの自然実行結果以外を視覚・聴覚の証拠として主張しない。mainへのmerge、公開、push、PR操作は行っていない。

### Task2 review follow-up: shared-art viewBox bounds（2026-09-14）

Task2のscoped reviewは、shared art groupの既定 `stroke-width="1.2"` を含めると、初版の `🛝` がy25、`🖐️` がy-1、`🔪` がx24（strokeで約24.6）へ出ると指摘した。これは実表示の主張ではなく、24-unit SVG座標とstroke半幅の静的確認であり、browser確認を行わずに修正した。

`d9d00a6d22a981114ec0dd85e4bd5bfc965e99a7` では、すべりだいを最大y22、いすの脚を最大y22、橋の水線をy22、にんじんの2.3幅の葉を最小y2、開いた手を最小y1/最大y21、上げた手を最小y2/最大y21へ内側に移した。ほうちょうはbladeのquadratic/smooth controlを最大x23以下にして実曲線もstroke込みx24未満にし、みかづきはarcの不明確な外側extremaを避ける内側のcubic outlineへ置換した。見分けられるobject/gestureの形、source glyph、label、normalizationは維持した。

全27件を同じ基準で再読した。既定1.2幅のstrokeは端点から0.6、明示幅は各半幅を加えた。最小余白が必要な場所は、ふんすい（y1、2幅でちょうどy0）、にんじん（y2、2.3幅で0.85）、新しい開いた手（y1、1.2幅で0.4）、既存のanimal/トマト/はねのy1（0.4）である。slide/chair/bridgeと他のobjectは最大23以下またはy22、stroke込み最大23.75以下である。手、knife、crescentはcontrol点だけでなくquadratic/cubicのextremaも確認し、0..24に収めた。generic fallbackやaliasは追加していない。

変更した `ui-symbol-art.js` のcache tokenだけを `20260914-e7f8e1de` に更新した。次を実行してexit0、41/41 pass、fail0（1577.244426ms）を確認した。

```sh
node --test tests/illustration-catalog-test.cjs tests/ui-illustrations-test.cjs tests/display-illustrations-test.cjs tests/canvas-illustrations-test.cjs tests/asset-versions-test.cjs
```

`git diff --check` もexit0だった。このfollow-upでは`npm test`を実行していない。前回の540/540は`53b3651`の事実として保持し、final full gateはTask3でmain `14e0b2a`の必要なsource変更後に一度だけ行う。browser/image/audio確認は引き続き行っていない。

### Task3: PR269 latest Meguru integration（2026-09-14）

Task2後にmainが `14e0b2ae7045fca651d8fd1ac5b1c2d78f9fef4b`（PR269）へ進んだため、item economy featureへこの正確なcommitをmergeした。6つの上流変更（checkpoint、README、index、`meguru.js`、`style.css`、Meguru test）を保持し、競合したcheckpointには両方の節を残した。`index.html`はitem/Quick/movie/ringのloaderを残し、内容が変わったcombined `style.css`、`meguru.js`、`ui-symbol-art.js`だけを内容ハッシュへ更新した。

PR269の同行者配置（こいびとはプレイヤーの向きと反対側、なかまは左右交互に後方へ並ぶ）をproductionのまま保持した。既存の追従testは即時移動を使わない通常入力のままとし、新slot式と90-unit未満のboundを維持した。150 frameでは実測lagが103.1/131.5でboundを満たさなかったため、4秒（240 frame）の通常前進で位置がsettleするまで準備するfixtureへ最小変更した。240 frameでは82.6/84.4で、Meguru focused 7/7が成功した。boundを緩めず、teleport/2秒fixtureへ戻していない。

root JS/CSS/HTMLのcatalog REDは新しく追加された `🔭 ⛱️ 🏄 🏺` の4件だけを示した。`ui-symbol-art.js`へ既存の24-unit shared helper/paletteで望遠鏡、日傘、サーフィン、つぼのvector定義を追加し、strokeを含めて端を避けた。fallback、source glyph filter、browser assertion、workflowは変更していない。catalog/cacheはGREENになり、Quickのhome/cloudy/night/autumn・元気91・報酬13、item travel/experienceも既存assertionのまま成功した。

source/test/cacheを凍結したmerge commitは `fbd30684887dfb7ad0663e3f998925f807c5b38b`。このcommitで一度だけ `env -u npm_config_http_proxy -u NPM_CONFIG_HTTP_PROXY npm test` を実行し、exit 0、**540/540 pass、fail 0**（13664.800609ms）を確認した。完全な出力は `/workspace/scratch/990ffa94bbe3/analysis/items-merge-ready-latest-npm-test-fbd3068.txt` に保存した。以前の`53b3651`の540/540は旧revisionの証跡として維持し、この結果へ移し替えていない。

この上流deltaにはitem/economy/scriptの変更がないため、Task2後にcontrollerが一度実行してTask9と完全一致した9-policy economy comparisonは再実行していない。ブラウザ、Playwright/CDP、local HTTP/shared file、tunnel、PNG検査、実音の試聴、push、PR/main/deploy操作は行っていない。

### PR267: controllerによる収支証跡の確認

controllerはTask2の製品コード`53b3651bc0b626bc827f335f48b9accf6183802e`で、元の`harness-economy-sim-implemented.cjs`を変更せず、リポジトリを作業ディレクトリとして1回実行した。exit0、標準エラー出力なし。出力`/workspace/scratch/990ffa94bbe3/analysis/harness-economy-results-merge-ready.json`は、前回Task9のJSONと全9件が完全一致した。runnerのSHA256は`b262cfe4fa35426d08993b273651cb90beb5911bcd5cdb2fa963bf383e5707bd`。

| 遊び方 | 100歳時の所持金 | 到達したそだち | ゲーム回数 |
|---|---:|---:|---:|
| 軽め | 1,910〜1,954 | 65〜68 | 10 |
| 標準 | 2,671〜2,723 | 76〜77 | 25 |
| 遊び込み | 3,816〜3,871 | 94〜95 | 50 |

全9例が新規セーブからの独立した人生で、seed11/29/47、ホーム・夕方・曇り・春、購入・装備なし、固定のお世話と点数を用いる。全例100歳のお別れで終了し、そだち100には到達していない。これは利用者の実測、上限収入、実時間や連続する複数人生の達成期間の推定ではない。

この比較後に行った変更は、描画枠の修正とPR269のMeguru画面・配置・追従・表示用データ、その統合テストおよび文書である。controllerは`53b3651..56c910f`で`script.js`、`item-system.js`、`item-memories.js`、`quick.js`、`games.js`、`audio.js`、共通runtime harness、承認済みcatalogに差分がないことを`git diff --exit-code`（exit0）で確認した。比較方針はMeguruを起動せず、これらの変更は経済の実行経路を変えないため、9方針の再実行は重複していない。PR269取り込み後に再実行したと読み替えず、上記の実行版を保持する。

最新の製品コードは`fbd30684887dfb7ad0663e3f998925f807c5b38b`で全npm540/540成功。以降の追記は検証記録とPR本文案だけである。GitHub上で自然に実行される既存CIの結果とDraft/マージ可否はPR267の本文へ反映する。実際の狭い画面の目視、PNG外観、音声の試聴は未確認のままで、NodeのCanvas代替環境やCIを本人による目視・試聴の証拠にはしない。

### PR267: 統合差分レビューの完了

Task1のPR268統合、Task2の31種類中27種類と描画枠修正、Task3のPR269統合と追加4種類を、それぞれ独立した仕様・品質レビューで確認した。描画枠の指摘は修正後の限定再レビューを通過し、重大・重要な未解決指摘はない。Task3も承認済み。対話的な競合解消の操作そのものは最終diffだけでは判定できないが、実装報告と両側のcheckpoint・loader・testを保持した成果物を確認しており、内容の欠落という未確認事項は残っていない。

小さな改善候補として、上流で追加されたresizeコールバックの引渡し・リスナーとタイマーの後始末を直接確認するテスト、および既存の故障注入テストの診断ログ整理が残る。レビューでは実装は整合しており、今回の統合挙動を妨げる問題ではないと判定している。既存の540件の実行後に、これらの任意の拡張を加えていない。

## Task4: 会話fixtureとペーパーの通常cooldown（2026-09-14）

公開済み `eeb8746390b454f4905bc24bfbfbcafd1739be00` のRuntime smokeは540/540で成功し、Home layoutはChromium・WebKitとも690 glyphのall-displayを通過した。一方、Home layoutの会話scenarioでは、paper装備かつうんち3個以上のものだけが `speaking moves poop` で失敗した。最初の差分は残りの矩形座標ではなく最後の1個の消失であり、`item-poop`、`full`、`small-full`、`large-text` などで同じ症状だった。これは会話clockが通常のactivity tickを進め、装備中のpaperが3個以上から1個を自動で片付けたためである。失敗ログの原文とjob URLは `.superpowers/sdd/2026-09-14-items-pr267-merge-ready/task-4-ci-evidence.md` に保持している。

fixtureだけを修正した `b08208a0326dcf04ce4fc0098dbd3d3cfa0b6f95` は、すべての装備overrideの後、最終的に `poop1` を装備しているsaveに公開 `itemSystem.cooldown(save, 'paper', 60)` を入れる。これは永久無効化ではなく保存される通常の60 activity tick待ちである。scenario、viewport、clock、うんちと装備の実数、geometry/speaker/animation/manual-clean assertionsを変更していない。productionの効果・価格・供給、他のtest、workflow、assetも変更していない。

focused verificationは `node --check tests/home-conversation-browser.cjs && node --test tests/item-inventory-test.cjs tests/item-care-game-test.cjs` でexit 0、39/39 passだった。さらに実runtime harnessで、予約なしの4個paper specimenが最初のtickで3個・`readyAt.paper=61` になることを確認した。公開APIで60 tickを予約した同一specimenはreload後も`readyAt.paper=60`を保ち、11 tickの会話相当windowで4個のまま、tick59までは待ち、tick60で3個かつ次のdeadline120になった。`actionCounts.clean`は0のまま、expiry前後でgrowthは6のままであり、paperの再開は手動careの報酬を与えない。既存の `paper removes only one at three with no care reward and sixty tick cooldown` と `saved reservations and care cooldowns survive reload and life limits reset` もこの確認に含まれる。

このTaskではbrowser/Playwright/CDP、host/tunnel、CI image routeを実行していない。狭幅の実表示、PNG外観、実音の試聴は確認していない。新しいcommitを公開した後に既存CIが自然に走る確認はcontrollerの担当であり、ここで`npm test`全体、収支simulation、CI rerunは重複実行していない。

Task4の修正差分（4989b34..eafbc6d）は、別担当の仕様・品質レビューで承認され、未解決指摘はありません。ブラウザテストの全シナリオ・時計の進め方・装備と個数・会話と配置と手動掃除の期待値を保持した5行追加です。製品側のアイテム効果・価格・供給に変更はありません。これから同じPRブランチへ通常更新し、そのコミットで自然実行されるRuntime smokeとHome layoutの両方を確認します。最終のCIリンク、Draft解除とマージ可否は[PR267](https://github.com/Naoto214/naotocchi/pull/267)へ記録します。この文書の時点では修正後のブラウザCI成功を主張しません。
