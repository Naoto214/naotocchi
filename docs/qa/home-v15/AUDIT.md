# Home version 15 全表示監査

基準: PR #426 `d8dd63c1`（v14）。A=方向、B=相対位置、C=グリフは非反転。下表は表示要素単位。個別通知呼出の全経路は `notification-sources.csv` にソース位置と呼出文を収録。

|正式名称|表示元コード/データ|表示条件|表示時間|v14位置|本来の役割|重複|左右分類|優先順位|v15扱い|
|---|---|---|---|---|---|---|---|---|---|
|タイトル|index.html .name-plate|常時|常時|header左|ゲーム名|なし|C|基本情報|第1行左|
|病気の温度計|script.js render / badges / careIconHTML(sick)|isSick・growing|状態中|タイトル下|病気状態|worldCareState / message / 顔のsick|C|警告|タイトルから除外。共通警告文と身体状態は保持|
|睡眠タイトルマーク|script.js render / badges|isSleeping|状態中|タイトル下|睡眠状態|Zzz / ねるボタン|C|通常状態|タイトルから除外。Zzzとボタン保持|
|成長2倍|script.js render / boostTicks|boostTicks>0|有効期間|タイトル下|一時効果の残時間|詳細|C|基本情報|消さず同じ第1行のバッジ帯|
|獲得ゴールバッジ全5種|script.js endingTiersReached / ENDING_TIER_ICONS / ENDING_TIERS|獲得済み。tier0はclears>0、未知tierは表示のみ除外|永続|タイトル下|目標達成の証|データ詳細|C|tier順昇順、全件|タイトルすぐ右、横スクロール。ボタンと詳細tip維持|
|獲得バッジ説明|endingBadgeTip / endingBadgeTipTimer|バッジタップ|既存timer|header付近|達成内容|なし|C|ユーザー操作|保持|
|データ|script.js render / profileBtn|egg/over以外|画面中|header右|画面遷移|なし|C|操作|第1行右、機能保持|
|つうしん|script.js render / commBtn|egg/over以外|画面中|header右|画面遷移|なし|C|操作|第1行右、機能保持|
|ねんれい|script.js render / ageLabel / currentAge|ホーム|常時|status-row|正確な現在値|詳細画面は役割別|C|基本情報|第2行。前2項目太字、お金右|
|そだち|script.js render / sodachiLabel / state.sodachi|ホーム|常時|status-row|正確な現在値|詳細画面は役割別|C|基本情報|第2行。前2項目太字、お金右|
|お金|script.js render / moneyLabel / lifetime.money|ホーム|常時|status-row|正確な現在値|詳細画面は役割別|C|基本情報|第2行。前2項目太字、お金右|
|時間帯|script.js render / environmentLabel / currentEnvironment|growing、環境側の正式条件|状態中|sub-status-row|現在の環境|背景は視覚表現|C|基本情報|第3行、正式アイコンと条件保持|
|天候|script.js render / environmentLabel / simulatedWeather|growing、環境側の正式条件|状態中|sub-status-row|現在の環境|背景は視覚表現|C|基本情報|第3行、正式アイコンと条件保持|
|季節|script.js render / seasonLabel / getEffectiveSeason|growing、環境側の正式条件|状態中|sub-status-row|現在の環境|背景は視覚表現|C|基本情報|第3行、正式アイコンと条件保持|
|地域|script.js render / regionLabel / applyRegion|growing、環境側の正式条件|状態中|sub-status-row|現在の環境|背景は視覚表現|C|基本情報|第3行、正式アイコンと条件保持|
|主役名|script.js render / mainNameLabel / SPECIES_DISPLAY_NAMES|ホーム|常時|cast-title-line|種族と段階|データ詳細|C|基本情報|第4行左、1行|
|成長段階|script.js render / stageLabel / currentStageLabel|ホーム|常時|cast-title-line|種族と段階|データ詳細|C|基本情報|第4行左、1行|
|恋人名|script.js render / partnerLabel|state.partner|関係中|主役と別行|関係を示す|身体のheart/ringは位置識別|C|基本情報|第4行右。名前のみ省略、詳細画面で全文|
|関係マーク|script.js render / partnerLabel|partner.mismatched|関係中|主役と別行|関係を示す|身体のheart/ringは位置識別|C|基本情報|第4行右。名前のみ省略、詳細画面で全文|
|親密度|script.js render / partnerLabel|partner.affection|関係中|主役と別行|関係を示す|身体のheart/ringは位置識別|C|基本情報|第4行右。名前のみ省略、詳細画面で全文|
|結婚指輪（上部）|script.js render / partnerLabel|partner.married|関係中|主役と別行|関係を示す|身体のheart/ringは位置識別|C|基本情報|第4行右。名前のみ省略、詳細画面で全文|
|上部状態文|renderCareAttention / worldCareState|CARE_STATUS.assess|状態中|cast-heading下|警告|messageと同一内容|C|life>health>sick|3Dホームでは空。共通通知へ|
|風景説明|worldDescription / WORLD_SCENE|地域|常時|cast-heading下|景色の説明|背景/環境欄|C|補助|3Dホームでは非表示、データと背景は保持|
|初回操作案内|homeGestureGuide / createGestureGuide|未学習/ヘルプから再生|閉じるまで|情報欄下|操作習得|なし|C|初回のみ|既存初回仕様保持|
|共通message|setMessage / showMessage / renderCareNotice|操作・警告・案内|4200ms、critical8000ms、継続状態は継続|homeEventSlot|システム案内|careFeedback / worldCareState|C|criticalMessage保護、イベント後警告復帰|homeTextで通常増減を表示除外。原文はmessage内保持|
|育成差分feedback|recordCareChange / CARE_STATUS.changes / showCareFeedback|各育成操作|4200ms|message|数値差分|meters|C|通常|Homeでは表示しない。値・feedback生成・履歴変更なし|
|そだち/成長/衰え節目|renderCareNotice careMilestone|sodachi差分・growth quarter等|feedback timer|message|細かな進捗|meters|C|通常|Homeで表示しない。重要進化showStoryEventとは別|
|ストーリー通知|showStoryEvent / homeNoticeQueue|進化・実績・加入・報酬等|STORY_FLASH_DURATION_MS|homeEventSlot/storyFlash|重要な出来事|messageを一時隠す|C|result4/character3/story2/ambient1/birthday0|既存queue保持、単一slotで同時表示を排他|
|誕生日トースト|setBirthdayToast|既存1歳ごとイベント|1200ms|homeEventSlot|誕生日|年齢は基本情報|C|queue0|既存一時イベント保持|
|ミニゲーム結果|showMinigameResultToast|帰還後結果|既存timer|homeEventSlot|結果/報酬|postgame会話とは別|C|queue4|本文と報酬保持|
|重大状態複数|CARE_STATUS.assess / homeWarnings|life/health閾値、isSick|状態中|message|見逃せない対応|重複なし|C|life>health>sick|最優先状態と病気を同じ欄。長い内容は欄内スクロール|
|頭部Zzz|pet-expression.js accentFor / MARK_PLACEMENT / home-diorama.js|主役sleeping|睡眠中|頭上|睡眠|タイトル睡眠は除外|A+C|正式表情resolver|小Z頭部アンカー維持、各Z位置と浮動方向だけ反転。文字不反転|
|病気頭部マーク|pet-expression.js ACCENTS.sick / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|しょんぼり頭部マーク|pet-expression.js ACCENTS.sulky / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|喜び頭部マーク|pet-expression.js ACCENTS.happy / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|こわばり/怒り相当頭部マーク|pet-expression.js ACCENTS.strained / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|空腹思考頭部マーク|pet-expression.js ACCENTS.hungry / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|疲れ頭部マーク|pet-expression.js ACCENTS.tired / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|衰弱頭部マーク|pet-expression.js ACCENTS.weak / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|危機頭部マーク|pet-expression.js ACCENTS.critical / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|遊びたい/驚き相当頭部マーク|pet-expression.js ACCENTS.wantsPlay / MARK_PLACEMENT|PET_EXPRESSION.resolveの正式条件|表情期間|画像boundsに対応した頭部|身体/感情状態|単一resolverで排他|B+C|既存resolver保持|共通effectPosition、グリフ自体不反転|
|病気の汗|care-attention.css / PET_EXPRESSION.sweatFor|careIllness=true|病気中、2.6秒周期|顔両側|病気を視覚化|sickとは別anchor|A+C|状態|描画bounds中心で左右座標交換、縦軌跡保持|
|恋人ハート|renderRelationshipReactions / heartAnchor|partner、またはpositive仲間|状態/2500ms|身体上側|関係性|専用表情とは補完|C|positive>lonely>normal|発生条件保持。身体アンカーは向き依存でない|
|関係オーラ|renderRelationshipReactions / relationship-aura|expression!=normal|状態/Reaction|身体外周|関係感情|ハートは別役割|C|既存|保持|
|結婚指輪（身体）|layout.ring / partner-ring|married|関係中|恋人身体横|配偶者識別|上部は要約|C|関係情報|既存solver装備clearanceと向き維持|
|選択マーカー|createController / diorama-shadow / target|選択、移動指示|操作中|足元/移動先|操作対象|selectedLabelは名称|C|操作|保持、文字/アイコン不反転|
|選択キャラ名|diorama-selected-label|model.selected|選択中|stage左上|対象名|会話話者は別|C|操作|保持|
|俯瞰ボタン|diorama-view|人数>5|群衆時|stage右上|全員を見る|なし|C|操作|保持|
|主役独り言|script.js sayPet / setSpeechBubble|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|仲間発言|script.js setSpeechBubble / companionSpeaker|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|恋人発言|script.js setSpeechBubble / partnerSpeaker|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|掛け合い44体|script.js Conversation Director / CONVERSATION_BANTER / conv2|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|プレイヤーへの質問|script.js conv2Ask|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|選択後返答|script.js conv2 reply|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|postgame会話|script.js conversation-postgame.js|既存抽選・条件・優先順位|SPEECH_DURATION_MS=2500 / reaction.holdMs|話者追従speechSlot|キャラクターの言葉|頭部エフェクトを隠す|C|既存Director順序保持|固定下部slot。台詞・時間・抽選不変、話者画像/名前|
|会話選択肢|speechChoices / conv2|質問待ち|answerWaitMs|話者付近|回答操作|なし|C|既存choice guard|下部slot直上。44pxタップ、二重送信防止保持|
|交流選択popup|individual-dialog.home-choice-popup|個性/仲間交流|選択まで|小popup|既存選択|選択後result|C|ユーザー操作|既存小popup保持|
|交流結果文|showHomeChoiceResult|交流後|4200ms|speechSlot|結果の地の文|speechBubbleとの併存|C|選択結果|同一slotで結果22px＋会話最大48pxに分け、双方の既存時間を保持|
|話者強調|castMotion.speak / clearSpeaker / cast-speaking|発話中|発話期間|身体|28体中の話者識別|speechSpeaker|C|既存Motion|保持|
|おなかゲージ|script.js render / updateMeter / hungerBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|ごきげんゲージ|script.js render / updateMeter / happinessBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|げんきゲージ|script.js render / updateMeter / energyBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|けんこうゲージ|script.js render / updateMeter / healthBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|いのちゲージ|script.js render / updateMeter / deathBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|せいちょうゲージ|script.js render / updateMeter / evoBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|おとろえゲージ|script.js render / updateMeter / devoBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|へんしんゲージ|script.js render / updateMeter / transformBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|100さいまでゲージ|script.js render / updateMeter / goalBar|既存egg/dead/infinite条件|常時|3段meters|正確な値と危険度|細かな通知|C|基本情報|5+4の指定順。ラベル/ゲージ/値。正式色/値維持|
|あそぶボタン|script.js playBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|ごはんボタン|script.js feedBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|そうじボタン|script.js cleanBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|ねる/おきるボタン|script.js sleepBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|くすりボタン|script.js medicineBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|じゃれるボタン|script.js playWithBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|きゅうあいボタン|script.js courtBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|たびボタン|script.js travelBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|メニューボタン|script.js menuBtn click / render|既存disable条件|画面中|careActions 5+4|育成操作|通知は結果/注意|C|操作|正式配置/アイコン/色/効果保持|
|注意!・おすすめ|renderCareNotice / careRecommended / care-attention.css|notice.action、既存警告|状態中|ボタン上|必要な操作への誘導|警告本文を補完|C|既存警告|削除せず保持|
|うんち|state.poopCount / placeGroundProps|個数>0|掃除まで|安全地形上|掃除対象|数値のみでは代替不可|C|生活|配置と掃除を保持|
|特別演出/ムービー/100歳|grandGoalPending / renderEnding / movie / transformation|既存達成条件|既存専用時間/操作|専用画面|重要目標/物語|通知とは別|C|既存専用優先|小slotへ押し込まず保持|
|Motion/育成一時エフェクト|cast-motion.js / petExpression / relationshipReaction|正式操作/自律cue|既存duration|身体wrapper|食事/回復/起床等|accentとは責務別|C|既存Motion owner|wrapper変換を奪わず保持。専用食事等の新作なし|

## 構造上の原因と統合方針

温度計は `badges` の病気アイコンであり獲得実績ではなかった。獲得実績は別の `endingBadges` に全件描画される。状態文は `worldCareState` と `message` が別々に生成していた。数値は `setMessage`、`careFeedback`、`careMilestone`、環境storyの4系統に分散。会話は既にsetSpeechBubbleへ統合済みなので、抽選器は触らず配置だけ変更する。

睡眠SVGは大きさの違う3つのZを静的な右上並びで持ち、v14は全体の発生位置のみを移していた。v15では小Zの頭部座標と、各Zの小Zからの横距離を分離する。SVG図形の鏡像化は行わない。病気/しょんぼり等も同じbounds中心反射を使用する。

頭部accentは既存resolverで一つに決まり、Relationshipのheart/ringは身体の専用アンカー、選択は足元に置く。既存のReaction条件・表情優先順位は変更しない。通常会話を頭上から取り除くため、最大の衝突原因を解消する。
