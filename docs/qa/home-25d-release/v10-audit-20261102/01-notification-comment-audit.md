# 1. 通知・コメント全件監査表

監査基準: PR #490 / VERSION 10 / `bdb95499133b6f37065c6c815e4be21d4a0b6fb1`。2026-11-02 JST。
調査と設計整理のみ。ゲームコード、テスト、配信物、本人限定Site、mainは変更しない。Draftを維持し、修正着手は本人判断後。

## 結論と読解方法

表示システムは一本ではない。通常通知、行動反応、通常会話、物語、誕生日、ゲーム結果、選択結果、質問UIが独立した状態・寿命を持つ。V10はDOM移動とCSSの表示抑制でこれらを上下へ配置している。**見た目の非表示は、発生側のタイマー・入力ロック・キューを停止しない。**

下記の「経路契約表」と「全呼び出し元表」を合わせて各表示の発生条件、実際／本来の表示先、寿命、優先、画像・名前、CSS、競合を参照する。上＝`#homeEventSlot`、下＝`#speechSlot #homeCommentDock`。V10有効時の配置を記す。通常index・旧版の配置をV10と混同しない。

## 調査範囲・網羅性

- 確定HEADを別チェックアウト。追跡ファイル34,635件、JS/MJS/CJS/HTML/CSSは1,683件。AGENTS.mdなし。
- リポジトリ全体を検索し、実行ソース、テスト／QA、旧試作、文書、vendorを分類。本編通知APIの実呼び出しは`script.js`に集約。DOM移動は`home-production-touch.js`、`home-production-diorama.js`、旧`home-diorama.js`にも存在する。
- `script.js`をAcornで構文解析し、26種類の表示・中継APIへの直接呼び出し217箇所を抽出。コメント中の文字列や関数定義を数えていない。対象APIの別名代入／関数参照としての渡し方も走査し、直接call以外の参照0。217は通知文の種類数でも、実行テスト件数でもない。
- 各APIの全call式と発生側の分岐を確認。乱数・動的文章は以下の原典データへ遡る。文章の全組合せを実機で発火したという意味ではない。
- ホームの本体JS/CSS/HTMLを含むルート100ファイルはGitHub treeのblob SHAと一致確認。原票はV10 HEADに紐づくCI artifactを取得し、ZIP SHA-256一致も確認。
- 他ゲーム内部の独自UI、映画・プロフィール・図鑑・データ画面の静的説明／エラー、旧比較ページ、vendorはホーム通知キューに接続しないため今回の全件表の対象外。本編へ戻る結果・会話の入口は対象に含めた。これら独立画面の表示仕様そのものは未監査。

## 経路契約表

|契約|発生処理／実際の表示先|本来の表示先|寿命・消去|優先・キュー|画像・名前／CSS|重複・競合|
|---|---|---|---|---|---|---|
|N|setMessage → showMessage → renderCareNotice → `#message`、上|上。発言と一文に混ぜた箇所は要分離|4200ms。後続setMessageで上書き・タイマー更新。空文字で解除。ゲーム中は満了時renderしない|critical中だけ最後の1件を保留。全通知共通FIFOではない|本文の絵文字はcommentTextHTMLで画像化。通常は独立した話者名なし。home-diorama.css:74–92,257–310 / layout:35–77,161–168|story/birthday/resultのCSSに隠されても時間が進む。上書き、重複生成、警告との競合|
|C|setCriticalMessage → N、上|最優先の上部システム通知|8000ms。criticalTimerとmessageTimerは別。終了時最後の保留通知を4200ms表示|setMessageにだけ割込禁止。story/result/choiceには共通の禁止がない|警告文／⚠️。Nと同じDOM/CSS|重要通知でもstory/result/choiceの可視性抑制で見えなくなる経路あり|
|A|setActionComment → setMessage(speaker) → `#homeActionComment`。旧版は下、V10 applyが上へ移動|行動結果は上。通常発言の流用は分類が必要|Nと同じ4200ms、独立キューなし。careNoticeVisible等を満たす時のみこのDOM、それ以外はN|choiceResult＞action＞messageという上部CSS。story/birthday/resultとは排他でない|元は正式画像＋名前。V10上部ではSpeakerをdisplay:none。`.speech-bubble`のまま、旧speech-slot内の共通装飾から外れる|行動結果と通常会話が同時発生。恋人の返答もこの入口を使うため一律移動で意味が混ざる|
|S|setSpeechBubble / sayPet → `#speechBubble`、下|キャラクター発言は下|標準2500ms、reaction.holdMsで変更。次発言でタイマー再設定。hideSpeechBubble/メニュー/ゲーム等で中断|会話内の順送りはあるが全コメント共通キューなし。CSSでは質問／個性dialog／storyに隠される|commentActorVisual→正式画像／表情画像、renderLaneSpeaker→名前＋本文。layout:86–105,134–170 / world-scene:157|CSSで隠れてもspeechActiveとタイマーが進む。setSpeechBubbleは上のゲーム結果・選択結果まで消す|
|B|speakEvent / playConversationBeats / conv2Play → S|通常会話は下。選択後の返答の扱いはD1参照|通常1行2500ms、最大4beat。conv2最終行等はhold別指定。メニュー/操作/相手退出で中断|conversationBusyUntil、conversationTimers、conv2Unit.held、minigameResultSpeechHoldが別管理。speakEventは旧会話を消して開始|主役、実在する恋人、来訪中の仲間。台詞は各会話pool。SのCSS|会話中の移動ロック。隠れていてもbusy継続。保持したイベントを連続flushすると後続が前の予約を消し得る|
|T|showStoryEvent → `#storyFlash`。characterComment=trueなら下、それ以外は上。**同じDOMを移動**|実績・成長・環境・行動描写は上。実際の発言だけ下|4200ms。キュー待ちの間は未表示。終了／非可視化でhide・drain。非可視時は再開時に最初から|homeNoticeQueueで誕生／既存story／結果／birthdayを待つ。上と下が同一キュー|petReaction:主役正式画像、character:恋人画像、author:作者、achievement:🏆、その他絵文字。下では画像＋名前／本文。style.css:1665の黒背景を上部専用CSSだけが明色化|下へ移すと黒背景・白文字が残る。checkStoryEventsは行動描写を一律characterComment=trueにしている。通常会話と時間競合|
|Y|setBirthdayToast → `#birthdayToast`、上|上|1200ms、満了でdrain。非可視時は再キュー|homeNoticeQueue内priority0|🎂＋年齢、正式話者なし。上部共通CSS|NはCSSで隠れる。action/choiceとの排他はない|
|G|showMinigameResultToast → `#mgResultToast`、上|上|再挑戦ボタンあり6000ms、なし3600ms。再挑戦／setSpeechBubbleでhide|priority4。story/birthdayは中断して再キュー。birth/非可視時は待つ|ランク、得点、自己ベスト、再挑戦ボタン。CSS上部と旧toast|結果＋通常Nの重複発生。新会話が結果を途中消去可能。42pxに収まらなければ上部内スクロール|
|R|showHomeChoiceResult → `#homeChoiceResult`、V10上|上|4200ms。次の結果、setSpeechBubble、prepareIndividualityPopupで解除|上部CSSでA/Nより優先。T/Y/Gとの共通排他なし|exchangeSpeakerは正式仲間画像・名前を用意するがV10上ではSpeaker非表示。home-diorama.css:146 / layout:162–168|Bによる選択返答はこのAPIを通らず下へ出る。結果が次の会話で短縮される|
|Q|conv2AskBeat → S＋`#speechChoices`、下|質問・選択肢は下。結果は上／返答発言はD1|answerWaitMs=12000。回答・timeout・中断で解除。返答はconv2Play|下部CSSでstory等を隠す。質問中はspeechBubble表示を!importantで強制|主役画像＋名、選択肢ボタン。layout:108–120,134–139|76pxに本文とボタンを収めず内部スクロール。質問パネル幅100%は短文バブルとは別。一件性は質問文＋選択肢を一単位として扱う必要|
|I|showIndividualityEvent / maybeIndividualExchange → `#individualityDialog.home-choice-popup`、下（ホーム外はdialog）|下に質問、選択結果はRで上|選択／あとで／場面離脱。固定表示期限なし|CSSで他の下部要素を抑制。発生側もstory表示中等は待つ|仲間交流は正式画像＋名前。人生質問はタイトル・本文。home-diorama.css:141–146 / layout:109–113|独立したdialog/focus復帰。上部結果とは排他でない。長文・選択肢は76px枠内スクロール|
|F|showCareFeedback / recordCareChange / renderCareNotice → Nと状態効果|状態通知は上、状態表示は既定のメーター／ボタン|feedback4200ms。urgentは状態から毎回再評価。milestoneは最新要約1件|urgent優先の旧表示に、terrainではeventText優先を上書き。critical系とは別|care-status assess、homeWarnings、careIcon。terrainでは持続アイコン非表示、ボタン推奨維持|homeTextは数値増減を除去。hunger等は上部に全件表示せずボタン等へ。数値通知抑制と欠落を区別|
|H|showBirthCelebration＋N|誕生文は上、光・星はキャラクター側|光・星2800ms、文N4200ms。人生／画面変更で解除|誕生中はT/Y/G待機。ただしN/Cは別状態|正式誕生名、birth-notice金縁、星8個、卵/殻画像。egg-hatching.css|視覚演出2800と文4200が別。誕生後のキューが文をCSSで隠せる|
|V|renderCareAttention / renderRelationshipReactions|文章でない状態・Reactionはキャラクター／ボタン／背景|状態・reaction.startedAt・所有者のlifeに依存。対象消滅／メニューで取り外す|本文キューとは別。castMotion／expressionが所有|正式表情、ハート、オーラ、推奨「!」、病気等。care-attention.css / pet-expression.css / relationship-expression.js|文字バブルではない。homeDioramaBlockedはspeech/busy/story/Reaction中も入力を止める。CSS非表示でも状態が残る|

## 発生イベントと上流データ

|対象|呼び出し元・原典|監査結果|
|---|---|---|
|誕生／孵化|warmEgg:18388以降 → hatchEgg:10520 → N/H|あたため段階のresponseもN。誕生文と演出の寿命差あり|
|進化／成長／年齢／若返り|onStageChanged, onBirthday, gainSodachi, loseSodachi, onSodachiMilestone|N＋T＋Bが同一イベントから並行生成される|
|実績／シール|checkAchievements:2440、checkStickerTasks:16656–16666|T(上)、通常Nとの共通一件制御なし|
|食事／掃除／睡眠／薬|feedBtn/cleanBtn/sleepBtn/medicineBtn、tick|A/N＋B＋checkStoryEvents(T下)＋F。結果・会話・描写が別系統|
|遊び／ゲーム／中断|tryStartPlay、finishMinigameInner、dispatchMinigameReaction、retireMinigameInner|N/G上、B下、T下。minigame-reactions.jsが計画しscript.jsが表示|
|旅行／環境|travelToRegion、startMeguru、celebrateSeasonChange、renderEnvironmentのonMoment|到着結果Nにregion.linesのreaction連結。BとTも別生成。風景はT上|
|選択結果|chooseIndividualityEvent、chooseIndividualExchange、conv2Answer|前2者はR上、conv2はchoice.replyをB下へ。名前のあるAPIだけを移動しても網羅できない|
|主役／仲間／恋人|speakEvent、speakIdleWithDirector、speakPetIdleWithDirector、conv2、playFirstPartnerEncounter、showAuthorGreeting|S/B下、初遭遇等はT下。友達返答はA上。発言と反応の区別がAPI間で一貫しない|
|病気／危篤／回復／死亡／100歳|tick、updateDyingWarning、checkMeters、triggerDeath、enterFarewell、enterInfinite|N/T上＋F/V。警告優先の効力は全経路に及ばない|
|自律行動／Reaction|homeInitiative、Director、world-life.mjs、castMotion、renderRelationshipReactions|モデル行動自体は文章を直接作らない。発話はS/B/T、動き・オーラはV|
|アイテム／留守番／復旧|scheduleItemContextMessage、useConsumableItem、applyOfflineProgress、boot/storage|アイテム文は最大15秒待機・250ms再試行→N。留守番はN＋T。保存障害はC|

本文の画像化は `setCommentText → commentTextHTML`、正式話者は `commentActorVisual → renderLaneSpeaker`（script.js:3830–3885）。主役は現在段階＋表情、仲間は正式ID・関係表情、恋人はmaster/guestSnapshotを参照。正式画像が解決できなければrenderLaneSpeakerは画像・名前を隠す。ランダム文と画像の全組合せを実機検証していない点は残る。

会話原典: `CONVERSATION_POOLS`、`COMPANION_DAILY_REACTIONS`、`PARTNER_CHARACTER_IDLE_LINES`、`COMPANION_CHARACTER_IDLE_LINES`、`PARTNER_RELATIONSHIP_LINES`、個性由来の台詞、`conversation-banter.js`／`conversation-postgame.js`／`conversation-quick.js`／`conversation-away.js`／`conversation-director.js`。地域文は`REGIONS`／world master、アイテム文は`item-system.js`／`item-memories.js`、選択文は`individuality-data.js`。これらは表示DOMを直接変更せず、上記契約へ入る。

### 表示APIを通らない関連UI

|入口|表示先・寿命|扱い|
|---|---|---|
|endingBadges click / script.js:18989–18996|`#endingBadgeTip`、2600ms、既存タイマー更新。アイコン画像なし・data-title本文|上部情報の説明。通知キュー外、上下統一に含めるか未決。旧tooltip CSSを保持|
|render / script.js:12663–12684|`#farewellBar`、100歳／farewell中、lifeCard／grandGoalで非表示|常設案内・操作。瞬間通知とは別|
|renderPetVisual、warmEgg|卵殻／画像／誕生光、stage状態と2800ms演出|文字の重複ではなく画像演出。世界モデル変更対象外|
|home-production-diorama.js:314|`.diorama-selected-label`、選択中。V10 trackが描画actor数<=1で非表示|所持数でなく描画DOM数を使用。多人表示条件は1/6/28全ケースで最終画像確認していない|
|index.html:8–78|`#bootRescue`、起動6秒超／起動エラー、boot成功で撤去|起動不能専用の全画面救済。通常上下通知の対象外|
|care-status.js／renderCareAttention|状態アラート、ボタン推奨、メーター。状態解消まで|通知と同じ文を常設バブルとして重ねる仕様ではない|

## 全呼び出し元（217箇所）

各行の契約IDから上表の表示先・寿命・キュー・画像/CSS・競合を引く。条件欄は呼び出しを囲む分岐の式（then/elseの正負はリンク先の分岐を参照）。イベント抽選・中継を含め省略せず掲載。空文字通知は消去操作として含める。

|No.|呼び出し元（確定HEAD）|発生側分岐の参照式|契約|呼び出し全文|
|---|---|---|---|---|
|1|[script.js:2440](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L2440)<br>checkAchievements|!gameActive|T|showStoryEvent({ emoji: ach.emoji, achievement: ach, message: &#96;じっせきたっせい!「${ach.label}」&#96; })|
|2|[script.js:2857](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L2857)<br>noteStorageWarning|呼び出し元の状態／イベント|C|setCriticalMessage('⚠️保存に失敗しました。「データ」でセーブコードをひかえられますが、最後に保存できた記録になる場合があります。保存できていない変更は、画面を閉じると失われます。')|
|3|[script.js:2912](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L2912)<br>yieldToOtherTab|呼び出し元の状態／イベント|C|setCriticalMessage(OTHER_TAB_MESSAGE)|
|4|[script.js:3584](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L3584)<br>showCareFeedback|呼び出し元の状態／イベント|F|renderCareNotice()|
|5|[script.js:3589](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L3589)<br>recordCareChange|呼び出し元の状態／イベント|F|showCareFeedback(CARE_STATUS.changes(before, CARE_STATUS.snapshot(state)))|
|6|[script.js:3974](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L3974)<br>renderCareNotice|呼び出し元の状態／イベント|V|renderCareAttention(notice, visible)|
|7|[script.js:4006](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4006)<br>renderCareNotice|visible && !urgent && !careFeedback && careMilestone|F|showCareFeedback(pending)|
|8|[script.js:4055](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4055)<br>setCriticalMessage|呼び出し元の状態／イベント|N|showMessage(msg, CRITICAL_MESSAGE_MS)|
|9|[script.js:4060](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4060)<br>setCriticalMessage|next|N|showMessage(next, MESSAGE_DURATION_MS,speaker)|
|10|[script.js:4065](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4065)<br>setMessage|呼び出し元の状態／イベント|N|showMessage(msg, MESSAGE_DURATION_MS,speaker)|
|11|[script.js:4068](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4068)<br>setActionComment|呼び出し元の状態／イベント|N|setMessage(text,document.body.dataset.homeProduction==='true' && terrainNoticeMode() ? speaker : null)|
|12|[script.js:4074](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4074)<br>showMessage|CARE_STATUS|F|renderCareNotice()|
|13|[script.js:4319](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4319)<br>sayPet|呼び出し元の状態／イベント|S|setSpeechBubble(text, petSpeaker())|
|14|[script.js:6565](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6565)<br>speakEvent|呼び出し元の状態／イベント|B|playConversationBeats(beats, eventKey, ctx.delayMs &#124;&#124; 0, ctx.motionTarget)|
|15|[script.js:6579](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6579)<br>playConversationBeats|呼び出し元の状態／イベント|S|setSpeechBubble(beat.text, beat.speaker, {event,listener,target,primaryBeat:i===0})|
|16|[script.js:6660](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6660)<br>el.speechChoices?.addEventListener('click')|btn?.dataset?.choice != null && Array.from(el.speechChoices.children).includes(btn) && !el.speechChoices.classList.contains('hidden')|B|conv2Answer(Number(btn.dataset.choice))|
|17|[script.js:6727](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6727)<br>conv2Flush|呼び出し元の状態／イベント|B|speakEvent(eventKey, ctx)|
|18|[script.js:6739](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6739)<br>conv2Play|呼び出し元の状態／イベント|S|setSpeechBubble(b.text, speaker, {listener:b.role === 'pet' ? visitor : petSpeaker(), holdMs:hold})|
|19|[script.js:6771](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6771)<br>conv2StartBanter|呼び出し元の状態／イベント|B|conv2Play(unit, unitDef.beats, visitorKey, () => conv2Finish(unit))|
|20|[script.js:6807](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6807)<br>conv2Ask|呼び出し元の状態／イベント|Q|conv2AskBeat(unit, q)|
|21|[script.js:6808](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6808)<br>conv2Ask|q.lead.length|B|conv2Play(unit, q.lead, visitorKey, ask)|
|22|[script.js:6816](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6816)<br>conv2AskBeat|呼び出し元の状態／イベント|S|setSpeechBubble(q.ask, petSpeaker(), {holdMs:CONV2.answerWaitMs})|
|23|[script.js:6820](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6820)<br>conv2AskBeat|呼び出し元の状態／イベント|B|conv2NoAnswer(unit)|
|24|[script.js:6856](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6856)<br>conv2PostGame|def.kind === 'question'|Q|conv2AskBeat(unit, def)|
|25|[script.js:6858](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6858)<br>conv2PostGame|def.kind === 'question'|B|conv2Play(unit, def.beats, unitVisitor, () => conv2Finish(unit), start)|
|26|[script.js:6894](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6894)<br>conv2Quick|呼び出し元の状態／イベント|B|conv2Play(unit, def.beats, unitVisitor, () => conv2Finish(unit), cardMs + CONV2.quickStartDelayMs)|
|27|[script.js:6932](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6932)<br>conv2StartAway|呼び出し元の状態／イベント|B|conv2Play(unit, def.beats, unitVisitor, () => conv2Finish(unit))|
|28|[script.js:6956](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6956)<br>conv2Answer|呼び出し元の状態／イベント|B|conv2Play(unit, choice.reply, unit.visitorKey, () => conv2Finish(unit), CONV2.replyDelayMs)|
|29|[script.js:6964](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6964)<br>conv2NoAnswer|line && conv2ContextOk()|B|conv2Play(unit, [{role:'pet', text:line}], null, () => conv2Finish(unit), CONV2.replyDelayMs)|
|30|[script.js:6975](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L6975)<br>celebrateAgeSpeech|呼び出し元の状態／イベント|B|speakEvent('age', { age, stageLabel, partnerChance: 0.8, companionChance: 0.75 })|
|31|[script.js:7709](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7709)<br>showPendingClownfishTransition|呼び出し元の状態／イベント|T|showStoryEvent({emoji:'🐠', petReaction:true, message:notice})|
|32|[script.js:7710](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7710)<br>showPendingClownfishTransition|呼び出し元の状態／イベント|N|setMessage(notice)|
|33|[script.js:8782](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L8782)<br>decayRelationship|呼び出し元の状態／イベント|N|setMessage(wasMarried ? &#96;${label}と何度もはなして、べつべつにくらすことになった&#96; : &#96;${label}とは、ここでこいびとをやめることになった&#96;)|
|34|[script.js:8811](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L8811)<br>decayCompanionBonds|left.length|N|setMessage(&#96;${names}のすがたをさいきん見なくなった。しばらくべつのところで過ごすみたい&#96;)|
|35|[script.js:9449](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L9449)<br>showAuthorGreeting|呼び出し元の状態／イベント|T|showStoryEvent({ author:true, characterComment:true, message:lines[kind] &#124;&#124; lines.hello })|
|36|[script.js:9880](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L9880)<br>openDateChooser|blocked|N|setMessage(blocked)|
|37|[script.js:10044](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10044)<br>goOnDate|blocked|N|setMessage(blocked)|
|38|[script.js:10073](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10073)<br>goOnDate|呼び出し元の状態／イベント|N|setMessage(&#96;💞 ${partner.label}と、${plan.label}。話の続きはまた今度&#96;)|
|39|[script.js:10178](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10178)<br>triggerLegendEncounter|呼び出し元の状態／イベント|N|setMessage('')|
|40|[script.js:10543](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10543)<br>hatchEgg|呼び出し元の状態／イベント|N|setMessage(&#96;${currentVisualStage().label}が うまれた！&#96;)|
|41|[script.js:10544](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10544)<br>hatchEgg|呼び出し元の状態／イベント|H|showBirthCelebration()|
|42|[script.js:10574](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10574)<br>onStageChanged|呼び出し元の状態／イベント|N|setMessage(stage.message &#124;&#124; &#96;${stage.label}になった!&#96;)|
|43|[script.js:10577](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10577)<br>onStageChanged|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: stage.emoji, petReaction:true, message: &#96;${age}さいになった！\n${stage.label}&#96; })|
|44|[script.js:10578](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10578)<br>onStageChanged|呼び出し元の状態／イベント|B|speakEvent('evolve', {age,stageLabel:stage.label,partnerChance:0.8,companionChance:0.75})|
|45|[script.js:10579](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10579)<br>onStageChanged|呼び出し元の状態／イベント|T|checkStoryEvents('evolve')|
|46|[script.js:10589](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10589)<br>onStageChanged|notice|N|setMessage(notice)|
|47|[script.js:10614](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10614)<br>maybeMidlifeEvent|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: ev.emoji, petReaction: true, message: text })|
|48|[script.js:10624](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10624)<br>onBirthday|呼び出し元の状態／イベント|Y|setBirthdayToast(&#96;🎂 ${age}さいになった&#96;)|
|49|[script.js:10627](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10627)<br>onBirthday|age === 90|N|setMessage('🌅 90さい。いつもの場所で、しばらくゆっくりしていた')|
|50|[script.js:10684](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10684)<br>gainSodachi|!suppressLifeEvents|B|speakEvent('sodachi', { sodachi: state.sodachi, partnerChance: 0.35, companionChance: 0.35 })|
|51|[script.js:10702](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10702)<br>loseSodachi|!suppressLifeEvents|N|setMessage(&#96;そだちが${state.sodachi}にさがってしまった…&#96;)|
|52|[script.js:10704](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10704)<br>loseSodachi|!suppressLifeEvents|T|checkStoryEvents('devolve')|
|53|[script.js:10718](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10718)<br>onSodachiMilestone|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: perk.emoji, message: &#96;そだち${value}！ ${perk.name}\n${perk.desc}&#96; })|
|54|[script.js:10722](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10722)<br>onSodachiMilestone|value === 100|N|setMessage('そだち100。ふしぎなたまごをもらった')|
|55|[script.js:10724](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10724)<br>onSodachiMilestone|value === 100|N|setMessage(&#96;${perk.emoji}そだち${value}! ${perk.name}&#96;)|
|56|[script.js:10785](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10785)<br>triggerDeath|state.stage === STAGE.GROWING && currentAge() < GOAL_AGE && !isImmortal() && ITEM_SYSTEM.take(state, 'c_life_charm')|N|setMessage('いのちのおまもりが、なおとっちを助けた')|
|57|[script.js:10801](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10801)<br>triggerDeath|呼び出し元の状態／イベント|N|setMessage('てんごくへいってしまった。いつもの場所が、少し静かになった。')|
|58|[script.js:10820](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10820)<br>enterFarewell|呼び出し元の状態／イベント|N|setMessage('🎊100さい。なおとっちは、部屋のすみずみに小さくうなずいた')|
|59|[script.js:10849](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10849)<br>enterInfinite|呼び出し元の状態／イベント|N|setMessage('♾️年齢から自由になった!ずかんから好きな姿を選べるよ')|
|60|[script.js:10877](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10877)<br>exitInfinite|!snapshot|N|setMessage('あたらしいたまごがやってきた…')|
|61|[script.js:10892](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L10892)<br>exitInfinite|呼び出し元の状態／イベント|N|setMessage('♾️のせかいから、この子のいっしょうにもどってきた')|
|62|[script.js:11024](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11024)<br>chooseIndividualityEvent|!homeResult|N|setMessage('その気持ちを、思い出にしまった。')|
|63|[script.js:11025](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11025)<br>chooseIndividualityEvent|homeResult|R|showHomeChoiceResult('その気持ちを、思い出にしまった。')|
|64|[script.js:11046](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11046)<br>chooseIndividualExchange|!homeResult|N|setMessage(e.reaction)|
|65|[script.js:11047](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11047)<br>chooseIndividualExchange|homeResult|R|showHomeChoiceResult(e.reaction,exchangeSpeaker(e))|
|66|[script.js:11259](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11259)<br>checkMeters|state.deathMeter >= 100 && !isImmortal() / state.miracleGuard|N|setMessage('もうだめかと思ったところで、なおとっちがゆっくり目をあけた')|
|67|[script.js:11286](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11286)<br>updateDyingWarning|state.deathMeter >= 80 / !state.dying|N|setMessage('なおとっちの様子がおかしい…早くおせわをしてあげて!')|
|68|[script.js:11294](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11294)<br>updateDyingWarning|state.deathMeter >= 80 / state.dying|N|setMessage('なおとっちの呼吸がおちついて、いつもの顔にもどってきた')|
|69|[script.js:11330](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11330)<br>drainHomeNotices|next.kind==='result'|G|showMinigameResultToast(next.payload)|
|70|[script.js:11330](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11330)<br>drainHomeNotices|next.kind==='result' / next.kind==='birthday'|Y|setBirthdayToast(next.payload)|
|71|[script.js:11330](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11330)<br>drainHomeNotices|next.kind==='result' / next.kind==='birthday'|T|showStoryEvent(next.payload)|
|72|[script.js:11341](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11341)<br>document.addEventListener('visibilitychange')|呼び出し元の状態／イベント|T/Y/G|queueHomeNotice(kind,payload)|
|73|[script.js:11348](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11348)<br>setBirthdayToast|terrainNoticeMode()&&(birthCelebration&#124;&#124;!pageVisible()&#124;&#124;storyFlashTimer&#124;&#124;mgResultToastTimer&#124;&#124;birthdayToastTimer)|T/Y/G|queueHomeNotice('birthday',text)|
|74|[script.js:11377](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11377)<br>reserveNextEgg|呼び出し元の状態／イベント|N|setMessage('次の人生のたまごを予約しました。中身は生まれるまでのお楽しみ。')|
|75|[script.js:11393](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11393)<br>cancelNextEgg|呼び出し元の状態／イベント|N|setMessage('予約を取り消しました。たまごはふくろに残っています。')|
|76|[script.js:11420](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11420)<br>offerTransformIfReady|呼び出し元の状態／イベント|N|setMessage('へんしんメーターがいっぱいになった!からだがふわっと光って、すがたをかえられそう')|
|77|[script.js:11448](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11448)<br>checkStoryEvents|delayMs > 0|T|showStoryEvent({...event,petReaction:true,characterComment:true})|
|78|[script.js:11451](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11451)<br>checkStoryEvents|delayMs > 0|T|showStoryEvent({...event,petReaction:true,characterComment:true})|
|79|[script.js:11459](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11459)<br>showStoryEvent|terrainNoticeMode()&&(birthCelebration&#124;&#124;!pageVisible()&#124;&#124;storyFlashTimer&#124;&#124;mgResultToastTimer&#124;&#124;birthdayToastTimer)|T/Y/G|queueHomeNotice('story',event)|
|80|[script.js:11497](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11497)<br>showStoryEvent|!storyFlashTimer|I|showIndividualityEvent()|
|81|[script.js:11613](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11613)<br>tick|!state.isSick && neglected && !infantGrace / Math.random() < sicknessChance|N|setMessage(&#96;${sickness.label}になってしまった…くすりをあげよう&#96;)|
|82|[script.js:11627](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11627)<br>tick|isEquipped('scarf') && state.isSick|T|checkStoryEvents('medicine-cure')|
|83|[script.js:11660](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11660)<br>tick|state.lowHealthStreak >= deathThreshold && !isImmortal() / state.miracleGuard|N|setMessage('きせきのふんばり!もうすこしがんばる…!')|
|84|[script.js:11890](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11890)<br>scheduleIdleGreeting|canGreet / kind === 'partner' / homePresentPartner() && homeInitiative('affection_interaction','partner:'+state.partner.id)|S|setSpeechBubble(pickCharacterConversationLine(PARTNER_CHARACTER_IDLE_LINES[canonicalPartnerId(state.partner.id)], PARTNER_IDLE_LINES), partnerSpeaker())|
|85|[script.js:11893](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11893)<br>scheduleIdleGreeting|kind === 'partner' / kind === 'companion' / speaker && homeInitiative('greeting','companion:'+speaker.id)|S|setSpeechBubble(pickCharacterConversationLine(COMPANION_CHARACTER_IDLE_LINES[speaker.id], COMPANION_IDLE_LINES), speaker)|
|86|[script.js:11900](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11900)<br>scheduleIdleGreeting|kind === 'partner' / kind === 'companion' / kind === 'pet'|S|setSpeechBubble(greeting, petSpeaker())|
|87|[script.js:11925](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11925)<br>speakIdleWithDirector|c.kind === 'partner' / line && homeInitiative('affection_interaction', 'partner:' + partner.id)|S|setSpeechBubble(line, partnerSpeaker())|
|88|[script.js:11930](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11930)<br>speakIdleWithDirector|c.kind === 'partner' / line && homeInitiative('greeting', 'companion:' + speaker.id)|S|setSpeechBubble(line, speaker)|
|89|[script.js:11950](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L11950)<br>speakPetIdleWithDirector|呼び出し元の状態／イベント|S|setSpeechBubble(line, petSpeaker())|
|90|[script.js:12051](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L12051)<br>openCompanionInvite|呼び出し元の状態／イベント|N|setMessage(isRare ? &#96;${companion.emoji}みたことのないなにかとめがあった…&#96; : reunited ? &#96;${companion.emoji} ${companion.name}だ。またあった&#96; : &#96;${companion.emoji} ${companion.name}がこっちをみている&#96;)|
|91|[script.js:12527](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L12527)<br>celebrateSeasonChange|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: announce.emoji, message: announce.text })|
|92|[script.js:12582](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L12582)<br>render|typeof state !== 'undefined' && state.individuality|I|showIndividualityEvent()|
|93|[script.js:12729](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L12729)<br>render|呼び出し元の状態／イベント|F|renderCareNotice(true)|
|94|[script.js:13216](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13216)<br>renderProfile|resumeIndividual|I|showIndividualityEvent(true)|
|95|[script.js:13820](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13820)<br>buyOrEquipShopItem|!owned / state.lifetime.money < item.price|N|setMessage('おかねがたりない…')|
|96|[script.js:13827](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13827)<br>buyOrEquipShopItem|!owned|N|setMessage(&#96;${item.label}を買って身につけた!&#96;)|
|97|[script.js:13831](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13831)<br>buyOrEquipShopItem|!owned / state.lifetime.equippedItemId === id|N|setMessage(&#96;${item.label}をはずした&#96;)|
|98|[script.js:13834](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13834)<br>buyOrEquipShopItem|!owned / state.lifetime.equippedItemId === id|N|setMessage(&#96;${item.label}を身につけた!&#96;)|
|99|[script.js:13909](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L13909)<br>scheduleItemContextMessage|呼び出し元の状態／イベント|N|setMessage(text)|
|100|[script.js:14012](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14012)<br>buyConsumableItem|呼び出し元の状態／イベント|N|setMessage(&#96;${item.label}をふくろに入れた&#96;)|
|101|[script.js:14044](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14044)<br>useConsumableItem|item.available && !item.available()|N|setMessage(item.unavailableMessage &#124;&#124; '今は使えない')|
|102|[script.js:14064](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14064)<br>useConsumableItem|result?.message|N|setMessage(result.message)|
|103|[script.js:14118](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14118)<br>resolvePickerSelection|item.picker === 'transform'|N|setMessage(result.message)|
|104|[script.js:14141](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14141)<br>resolvePickerSelection|item.picker === 'dex-form'|N|setMessage(result.message)|
|105|[script.js:14163](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14163)<br>resolvePickerSelection|item.picker === 'match-ticket'|N|setMessage(&#96;${candidate.emoji} ${candidate.label}が会いにきた&#96;)|
|106|[script.js:14167](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14167)<br>resolvePickerSelection|state.lifetime.money < item.price|N|setMessage('おかねがたりない…')|
|107|[script.js:14178](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14178)<br>resolvePickerSelection|result.message|N|setMessage(result.message)|
|108|[script.js:14895](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L14895)<br>scheduleEnvironmentMoment|idleOk / m|T|showStoryEvent({ emoji: m.emoji, message: caption, environmentMoment: true })|
|109|[script.js:15068](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15068)<br>renderHomeCast|key === homeCastLayoutKey|V|renderRelationshipReactions()|
|110|[script.js:15128](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15128)<br>renderHomeCast|呼び出し元の状態／イベント|V|renderRelationshipReactions()|
|111|[script.js:15245](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15245)<br>renderWorldScene|呼び出し元の状態／イベント|V|renderCareAttention(notice, !paused && careNoticeVisible())|
|112|[script.js:15352](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15352)<br>chooseTransform|wasHiddenRen|T|showStoryEvent({ emoji: '🕯️', message: 'なんで人間がいるの?と思ったが、なぜかだれも気にしていない' })|
|113|[script.js:15357](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15357)<br>chooseTransform|呼び出し元の状態／イベント|N|setMessage(lifeStageAside ? &#96;${transformMessage} ${lifeStageAside}&#96; : transformMessage)|
|114|[script.js:15358](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15358)<br>chooseTransform|呼び出し元の状態／イベント|T|checkStoryEvents('transform')|
|115|[script.js:15359](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15359)<br>chooseTransform|呼び出し元の状態／イベント|B|speakEvent('transform', { partnerChance: 0.65, companionChance: 0.65 })|
|116|[script.js:15368](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15368)<br>skipTransform|呼び出し元の状態／イベント|N|setMessage('鏡を見て、やっぱり今の姿でいくことにした')|
|117|[script.js:15756](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L15756)<br>startMeguru|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingTravel'))|
|118|[script.js:16496](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16496)<br>openStickerPack|state.lifetime.money < STICKER_PACK_PRICE|N|setMessage('おかねがたりない…')|
|119|[script.js:16497](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16497)<br>openStickerPack|!stickerDrawablePool().length|N|setMessage(&#96;シールは ぜんぶ${STICKER_COPY_MAX}まいまで あつまっているよ&#96;)|
|120|[script.js:16502](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16502)<br>openStickerPack|呼び出し元の状態／イベント|N|setMessage(fresh ? &#96;🏷️シールパックをあけた!あたらしいシールが${fresh}まい${copies ? &#96;・もっているシールが${copies}まい&#96; : ''}&#96; : &#96;🏷️シールパックをあけた!もっているシールが${results.length}まい ふえた&#96;)|
|121|[script.js:16512](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16512)<br>openThemedStickerPack|!stickerDrawablePool(pool).length|N|setMessage(&#96;${STICKER_KINDS[kind]}のシールは ぜんぶ${STICKER_COPY_MAX}まいまで あつまっているよ&#96;)|
|122|[script.js:16568](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16568)<br>addStickerPage|store.pageOrder.length >= STICKER_BOOK_MAX_PAGES|N|setMessage(&#96;シールちょうは${STICKER_BOOK_MAX_PAGES}ページまで&#96;)|
|123|[script.js:16586](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16586)<br>placeSticker|!ownedStickerCount(id)|N|setMessage('そのシールは まだ もっていない')|
|124|[script.js:16588](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16588)<br>placeSticker|page.length >= STICKER_PAGE_MAX|N|setMessage(&#96;このページは いっぱい(${STICKER_PAGE_MAX}まいまで)&#96;)|
|125|[script.js:16589](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16589)<br>placeSticker|placedStickerCount(id) >= ownedStickerCount(id)|N|setMessage('そのシールは もう はってある(かぶりが あれば もう1まい はれる)')|
|126|[script.js:16656](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16656)<br>checkStickerTasks|!gameActive|T|showStoryEvent({ emoji: '🏷️', message: &#96;おだい たっせい!「${task.label}」&#96; })|
|127|[script.js:16661](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16661)<br>checkStickerTasks|doneCount >= 5 && ownedStickerCount(STICKER_TASK_ADEPT_ID) === 0 / silver && !gameActive|T|showStoryEvent({ emoji: '🥈', message: 'おだい 5こたっせい！「ぎんのシールちょう」を もらった！' })|
|128|[script.js:16666](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16666)<br>checkStickerTasks|allDone && ownedStickerCount(STICKER_TASK_MASTER_ID) === 0 / gold && !gameActive|T|showStoryEvent({ emoji: '🥇', message: 'おだい ぜんぶたっせい！「きんのシールちょう」を もらった！' })|
|129|[script.js:16889](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16889)<br>showMinigameResultToast|terrainNoticeMode()&&(birthCelebration&#124;&#124;!pageVisible())|T/Y/G|queueHomeNotice('result',result)|
|130|[script.js:16911](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16911)<br>showMinigameResultToast|terrainNoticeMode() / storyFlashTimer / homeStoryCurrent|T/Y/G|queueHomeNotice('story',homeStoryCurrent)|
|131|[script.js:16912](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L16912)<br>showMinigameResultToast|terrainNoticeMode() / birthdayToastTimer / homeBirthdayCurrent|T/Y/G|queueHomeNotice('birthday',homeBirthdayCurrent)|
|132|[script.js:17254](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17254)<br>handleMinigameCrash|呼び出し元の状態／イベント|N|setMessage(&#96;⚠️${name}がうまく動かなかったので、途中で終わりにした。今回の得点は記録されないよ&#96;)|
|133|[script.js:17365](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17365)<br>retireMinigameInner|呼び出し元の状態／イベント|N|setMessage(message)|
|134|[script.js:17471](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17471)<br>dispatchMinigameReaction|plan && plan.eventKey|B|speakEvent(plan.eventKey, ctx)|
|135|[script.js:17475](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17475)<br>dispatchMinigameReaction|呼び出し元の状態／イベント|B|speakEvent(key, { ...ctx, delayMs: ((ctx && ctx.delayMs) &#124;&#124; 0) + delayMs })|
|136|[script.js:17499](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17499)<br>finishMinigameInner|isQuick|N|setMessage((customMessage &#124;&#124; resultMessageForScore(score)) + (coins ? '／100コインをもらった!' : ''))|
|137|[script.js:17501](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17501)<br>finishMinigameInner|isQuick|G|showMinigameResultToast(quickSoloToastRecord(game, record))|
|138|[script.js:17596](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17596)<br>finishMinigameInner|呼び出し元の状態／イベント|N|setMessage(resultMessage)|
|139|[script.js:17599](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17599)<br>finishMinigameInner|呼び出し元の状態／イベント|G|showMinigameResultToast(record)|
|140|[script.js:17621](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17621)<br>finishMinigameInner|isGreat|T|checkStoryEvents('minigame-great')|
|141|[script.js:17622](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17622)<br>finishMinigameInner|isGreat / isBad|T|checkStoryEvents('minigame-bad')|
|142|[script.js:17627](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17627)<br>finishMinigameInner|呼び出し元の状態／イベント|F|recordCareChange(careBefore)|
|143|[script.js:18129](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18129)<br>withFeedback|呼び出し元の状態／イベント|F|recordCareChange(careBefore)|
|144|[script.js:18138](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18138)<br>el.feedBtn.addEventListener('click')|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingFeed'))|
|145|[script.js:18157](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18157)<br>el.feedBtn.addEventListener('click')|overfed / !state.isSick && Math.random() < 0.15|N|setMessage(&#96;🍚たべすぎて${sickness.label}になった&#96;)|
|146|[script.js:18158](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18158)<br>el.feedBtn.addEventListener('click')|overfed / !state.isSick && Math.random() < 0.15|B|speakEvent('overfeed')|
|147|[script.js:18160](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18160)<br>el.feedBtn.addEventListener('click')|overfed / !state.isSick && Math.random() < 0.15|N|setMessage('🍚たべすぎた')|
|148|[script.js:18161](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18161)<br>el.feedBtn.addEventListener('click')|overfed / !state.isSick && Math.random() < 0.15|B|speakEvent('overfeed')|
|149|[script.js:18163](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18163)<br>el.feedBtn.addEventListener('click')|overfed|T|checkStoryEvents('overfeed',SPEECH_DURATION_MS+120)|
|150|[script.js:18171](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18171)<br>el.feedBtn.addEventListener('click')|!checkMeters()|A|setActionComment(randomActionMessage('feed'))|
|151|[script.js:18172](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18172)<br>el.feedBtn.addEventListener('click')|!checkMeters()|B|speakEvent('feed')|
|152|[script.js:18173](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18173)<br>el.feedBtn.addEventListener('click')|!checkMeters()|T|checkStoryEvents('feed')|
|153|[script.js:18250](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18250)<br>applyGamePassSuccess|呼び出し元の状態／イベント|N|setMessage('ゲームパスで通常成功!／30コインをもらった')|
|154|[script.js:18255](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18255)<br>applyGamePassSuccess|呼び出し元の状態／イベント|F|recordCareChange(careBefore)|
|155|[script.js:18273](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18273)<br>tryStartPlay|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingPlay'))|
|156|[script.js:18282](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18282)<br>tryStartPlay|!isQuick && state.energy < 10|A|setActionComment(randomBlockedMessage('lowEnergyPlay'))|
|157|[script.js:18314](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18314)<br>el.cleanBtn.addEventListener('click')|state.poopCount === 0|A|setActionComment(randomBlockedMessage('cleanAlready'))|
|158|[script.js:18323](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18323)<br>el.cleanBtn.addEventListener('click')|呼び出し元の状態／イベント|T|checkStoryEvents('poop-clean')|
|159|[script.js:18325](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18325)<br>el.cleanBtn.addEventListener('click')|!checkMeters()|A|setActionComment(randomActionMessage('clean'))|
|160|[script.js:18326](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18326)<br>el.cleanBtn.addEventListener('click')|!checkMeters()|B|speakEvent('clean')|
|161|[script.js:18342](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18342)<br>el.sleepBtn.addEventListener('click')|state.isSleeping|A|setActionComment(randomActionMessage('sleep'))|
|162|[script.js:18343](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18343)<br>el.sleepBtn.addEventListener('click')|state.isSleeping|B|speakEvent('sleep')|
|163|[script.js:18352](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18352)<br>el.sleepBtn.addEventListener('click')|!checkMeters()|A|setActionComment(randomActionMessage('wake'))|
|164|[script.js:18353](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18353)<br>el.sleepBtn.addEventListener('click')|!checkMeters()|B|speakEvent('wake')|
|165|[script.js:18354](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18354)<br>el.sleepBtn.addEventListener('click')|!checkMeters()|T|checkStoryEvents('wake')|
|166|[script.js:18369](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18369)<br>el.medicineBtn.addEventListener('click')|state.isSick|T|checkStoryEvents('medicine-cure')|
|167|[script.js:18371](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18371)<br>el.medicineBtn.addEventListener('click')|state.isSick / !checkMeters()|A|setActionComment(randomActionMessage('cure'))|
|168|[script.js:18372](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18372)<br>el.medicineBtn.addEventListener('click')|state.isSick / !checkMeters()|B|speakEvent('medicine_cure')|
|169|[script.js:18381](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18381)<br>el.medicineBtn.addEventListener('click')|state.isSick / !checkMeters()|N|setMessage('💊びょうきではないのに、くすりを飲ませた')|
|170|[script.js:18382](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18382)<br>el.medicineBtn.addEventListener('click')|state.isSick / !checkMeters()|B|speakEvent('medicine_wrong')|
|171|[script.js:18405](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18405)<br>warmEgg|state.stage === STAGE.EGG|N|setMessage(response)|
|172|[script.js:18424](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18424)<br>el.playWithBtn.addEventListener('click')|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingPet'))|
|173|[script.js:18455](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18455)<br>el.playWithBtn.addEventListener('click')|!checkMeters()|N|setMessage('')|
|174|[script.js:18456](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18456)<br>el.playWithBtn.addEventListener('click')|!checkMeters()|B|speakEvent(spammed ? 'play_with_annoyed' : 'play_with', { petText: reaction, partnerChance: 0.45, companionChance: 0.8 })|
|175|[script.js:18457](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18457)<br>el.playWithBtn.addEventListener('click')|!checkMeters() / !spammed|T|checkStoryEvents('pet')|
|176|[script.js:18457](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18457)<br>el.playWithBtn.addEventListener('click')|!checkMeters() / !spammed|I|maybeIndividualExchange()|
|177|[script.js:18490](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18490)<br>playFirstPartnerEncounter|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: candidate.emoji, character:candidate, characterComment:true, message: beats[0] })|
|178|[script.js:18492](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18492)<br>playFirstPartnerEncounter|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: candidate.emoji, character:candidate, characterComment:true, message: text })|
|179|[script.js:18505](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18505)<br>el.courtBtn.addEventListener('click')|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingCourt'))|
|180|[script.js:18525](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18525)<br>el.courtBtn.addEventListener('click')|resolvedOrientation / !checkMeters()|N|setMessage(&#96;じぶんの気持ちが少しはっきりした。「${orientationLabel(resolvedOrientation, state.gender)}」なんだと思う。${mismatchNote}&#96;)|
|181|[script.js:18547](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18547)<br>el.courtBtn.addEventListener('click')|state.partner && state.partner.mismatched / p.repair >= MISMATCH_REPAIR_NEEDED / !checkMeters()|N|setMessage(&#96;${p.emoji} ${p.label}とちゃんと話した。恋愛タイプは変わったけれど、それでもいっしょにいることにした&#96;)|
|182|[script.js:18554](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18554)<br>el.courtBtn.addEventListener('click')|state.partner && state.partner.mismatched / !checkMeters()|N|setMessage(&#96;${p.emoji} ${p.label}とぎこちなく話した…あと${left}回向きあえば、きっと伝わる&#96;)|
|183|[script.js:18572](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18572)<br>el.courtBtn.addEventListener('click')|state.partner / justMarried / !checkMeters()|N|setMessage(&#96;💍 ${state.partner.label}とけっこんした&#96;)|
|184|[script.js:18573](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18573)<br>el.courtBtn.addEventListener('click')|state.partner / justMarried / !checkMeters()|B|speakEvent('marriage', { partnerChance: 1, companionChance: 0.65 })|
|185|[script.js:18582](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18582)<br>el.courtBtn.addEventListener('click')|state.partner / !checkMeters()|N|setMessage('')|
|186|[script.js:18583](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18583)<br>el.courtBtn.addEventListener('click')|state.partner / !checkMeters()|B|speakEvent('court', { petText: reaction, partnerChance: 0.9, companionChance: 0.35 })|
|187|[script.js:18584](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18584)<br>el.courtBtn.addEventListener('click')|state.partner / !checkMeters()|T|checkStoryEvents('court')|
|188|[script.js:18614](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18614)<br>el.courtBtn.addEventListener('click')|!candidate / !checkMeters()|N|setMessage('💞いまは気持ちをつたえたいあいてがいない')|
|189|[script.js:18623](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18623)<br>el.courtBtn.addEventListener('click')|candidate.id !== 'guest' && playFirstPartnerEncounter(candidate)|N|setMessage(&#96;${candidate.emoji} ${candidate.label}としりあった。また会えそうだ&#96;)|
|190|[script.js:18640](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18640)<br>el.courtBtn.addEventListener('click')|!mutualMatch / !checkMeters() / document.body.dataset.homeProduction==='true' && terrainNoticeMode()|A|setActionComment(reaction,{...candidate,kind:'partner'})|
|191|[script.js:18641](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18641)<br>el.courtBtn.addEventListener('click')|!mutualMatch / !checkMeters() / document.body.dataset.homeProduction==='true' && terrainNoticeMode()|N|setMessage(&#96;${candidate.emoji} ${candidate.label}:${reaction}&#96;)|
|192|[script.js:18692](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18692)<br>el.courtBtn.addEventListener('click')|Math.random() < successChance / !checkMeters()|N|setMessage(&#96;💑 ${candidate.label}とこいびとになった&#96;)|
|193|[script.js:18693](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18693)<br>el.courtBtn.addEventListener('click')|Math.random() < successChance / !checkMeters()|B|speakEvent('partner_new', { petText: reaction, partnerChance: 0.95, companionChance: 0.5 })|
|194|[script.js:18702](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18702)<br>el.courtBtn.addEventListener('click')|Math.random() < successChance / !checkMeters()|N|setMessage('💞気持ちはつたえた。返事は「もう少し友達でいたい」だった')|
|195|[script.js:18703](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18703)<br>el.courtBtn.addEventListener('click')|Math.random() < successChance / !checkMeters()|B|speakEvent('court_fail', { petText: reaction, partnerChance: 0, companionChance: 0.45 })|
|196|[script.js:18733](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18733)<br>el.gameLengthGrid.addEventListener('click')|el.difficultyModeGrid / el.gameLengthGrid|N|setMessage(btn.dataset.id === 'short' ? '⚡ゲームを「みじかめ」にした（20秒以上の制限時間を70%にする。手番で進むゲームはそのまま）' : '⏱️ゲームのながさを「ふつう」にした')|
|197|[script.js:18739](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18739)<br>el.difficultyModeGrid.addEventListener('click')|el.difficultyModeGrid|N|setMessage(btn.dataset.id === 'easy' ? '🌱ミニゲームをやさしくした(時間も長め)' : btn.dataset.id === 'hard' ? '🔥ミニゲームをむずかしくした' : '🙂ミニゲームをふつうにした')|
|198|[script.js:18787](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18787)<br>el.currentLocationBtn.addEventListener('click')|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingTravel'))|
|199|[script.js:18828](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18828)<br>travelToRegion|state.isSleeping|A|setActionComment(randomBlockedMessage('sleepingTravel'))|
|200|[script.js:18829](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18829)<br>travelToRegion|region?.special && !hasPerk(70)|N|setMessage('そのばしょへつづく道はまだ見つからない')|
|201|[script.js:18889](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18889)<br>travelToRegion|呼び出し元の状態／イベント|B|speakEvent('travel', { partnerChance: 0.7, companionChance: 0.75 })|
|202|[script.js:18890](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18890)<br>travelToRegion|呼び出し元の状態／イベント|T|checkStoryEvents('travel')|
|203|[script.js:18894](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18894)<br>travelToRegion|!checkMeters()|N|setMessage(spammedTravel ? &#96;${region.emoji} ${region.label}にやってきた!でも、旅の疲れでちょっとぐったり…${reaction}&#96; : &#96;${region.emoji} ${region.label}にやってきた!${reaction}&#96;)|
|204|[script.js:18967](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18967)<br>el.companionInvitePlayBtn.addEventListener('click')|!stillOk|N|setMessage('いまはあそべなかった…またこんどさそってもらおう')|
|205|[script.js:18981](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18981)<br>el.companionInviteLaterBtn.addEventListener('click')|companion && document.body.dataset.homeProduction==='true' && terrainNoticeMode()|A|setActionComment('「またこんどね」とかえっていった',{kind:'companion',id:companion.id,label:companion.name})|
|206|[script.js:18982](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18982)<br>el.companionInviteLaterBtn.addEventListener('click')|companion && document.body.dataset.homeProduction==='true' && terrainNoticeMode()|N|setMessage(companion ? &#96;${companion.emoji} ${companion.name}は「またこんどね」とかえっていった&#96; : 'またこんどあそぼう')|
|207|[script.js:19088](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19088)<br>doWipe|呼び出し元の状態／イベント|N|setMessage('ぜんぶきえました。はじめまして!')|
|208|[script.js:19129](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19129)<br>el.resetBtn.addEventListener('click')|呼び出し元の状態／イベント|N|setMessage('あたらしいたまごがやってきた…')|
|209|[script.js:19188](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19188)<br>el.dexDetailTransformBtn.addEventListener('click')|呼び出し元の状態／イベント|N|setMessage(&#96;${stage.emoji} ${stage.label}にすがたをかえた!${breakupMessage}&#96;)|
|210|[script.js:19575](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19575)<br>el.profilePastLives.addEventListener('click')|el.profilePastLives|N|setMessage('📋 いっしょうカードの コードを コピーした')|
|211|[script.js:19991](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19991)<br>applyOfflineProgress|呼び出し元の状態／イベント|N|setMessage(summary)|
|212|[script.js:19992](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L19992)<br>applyOfflineProgress|呼び出し元の状態／イベント|T|showStoryEvent({ emoji: sleeping ? '😴' : '🏠', message: &#96;おかえり!${span}、お留守番していたよ&#96; })|
|213|[script.js:20000](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L20000)<br>loop|otherTabTookOver / message !== compactJapaneseText(OTHER_TAB_MESSAGE)|C|setCriticalMessage(OTHER_TAB_MESSAGE)|
|214|[script.js:20050](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L20050)<br>匿名/初期化|legacyResolution|N|setMessage(legacyResolution.married ? &#96;${who}とちゃんと話した。恋愛の向きがちがうことを確かめて、夫婦ではなくなることにした&#96; : &#96;${who}とちゃんと話した。恋愛の向きがちがうことを確かめて、こいびとではなくなることにした&#96;)|
|215|[script.js:20053](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L20053)<br>匿名/初期化|legacyResolution|S|sayPet('これからは、おたがいにむりのないかたちでいよう')|
|216|[script.js:20060](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L20060)<br>匿名/初期化|!stateLoadRecovered|C|setCriticalMessage(saveWriteBlocked ? 'きろくを読みこめませんでした。前のきろくを守るため、いまは保存を止めています' : '前のきろくから元にもどしました。内容をたしかめてください')|
|217|[script.js:20086](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L20086)<br>document.addEventListener('visibilitychange')|document.visibilityState === 'hidden'|V|renderCareAttention(null, false)|

## 静的メッセージプール全キー

各キーの全候補は固定HEADへのリンクで参照できる。テンプレート展開の動的値（年齢、名前、得点等）は呼び出し表に原式を残した。

|原典|キー|要素数|表示経路・注意|
|---|---|---|---|
|[script.js:4348](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4348)<br>CONVERSATION_POOLS|feed|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4384](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4384)<br>CONVERSATION_POOLS|overfeed|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4416](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4416)<br>CONVERSATION_POOLS|sleep|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4449](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4449)<br>CONVERSATION_POOLS|wake|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4482](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4482)<br>CONVERSATION_POOLS|clean|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4521](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4521)<br>CONVERSATION_POOLS|medicine_cure|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4555](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4555)<br>CONVERSATION_POOLS|medicine_wrong|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4586](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4586)<br>CONVERSATION_POOLS|play_with|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4619](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4619)<br>CONVERSATION_POOLS|play_with_annoyed|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4650](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4650)<br>CONVERSATION_POOLS|court|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4686](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4686)<br>CONVERSATION_POOLS|court_fail|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4718](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4718)<br>CONVERSATION_POOLS|age|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4751](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4751)<br>CONVERSATION_POOLS|sodachi|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4784](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4784)<br>CONVERSATION_POOLS|money|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4817](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4817)<br>CONVERSATION_POOLS|travel|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4851](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4851)<br>CONVERSATION_POOLS|transform|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4885](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4885)<br>CONVERSATION_POOLS|partner_new|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4918](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4918)<br>CONVERSATION_POOLS|marriage|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4951](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4951)<br>CONVERSATION_POOLS|minigame_great|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:4985](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L4985)<br>CONVERSATION_POOLS|minigame_bad|役割別配列|B→S下。pet/partner/companion別の候補|
|[script.js:7094](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7094)<br>STORY_EVENT_POOLS|feed|5|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7101](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7101)<br>STORY_EVENT_POOLS|pet|5|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7108](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7108)<br>STORY_EVENT_POOLS|travel|5|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7115](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7115)<br>STORY_EVENT_POOLS|court|4|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7121](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7121)<br>STORY_EVENT_POOLS|wake|4|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7127](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7127)<br>STORY_EVENT_POOLS|evolve|10|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7169](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7169)<br>STORY_EVENT_POOLS|devolve|9|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7207](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7207)<br>STORY_EVENT_POOLS|transform|8|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7241](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7241)<br>STORY_EVENT_POOLS|minigame-great|5|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7263](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7263)<br>STORY_EVENT_POOLS|minigame-bad|4|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7281](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7281)<br>STORY_EVENT_POOLS|medicine-cure|4|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7299](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7299)<br>STORY_EVENT_POOLS|overfeed|4|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:7317](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L7317)<br>STORY_EVENT_POOLS|poop-clean|6|T下。45%抽選、直前と同文を避ける。行動描写も下へ分類|
|[script.js:17939](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17939)<br>ACTION_RESULT_MESSAGES|feed|10|A上。行動結果として扱う|
|[script.js:17951](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17951)<br>ACTION_RESULT_MESSAGES|clean|10|A上。行動結果として扱う|
|[script.js:17963](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17963)<br>ACTION_RESULT_MESSAGES|sleep|10|A上。行動結果として扱う|
|[script.js:17975](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17975)<br>ACTION_RESULT_MESSAGES|wake|10|A上。行動結果として扱う|
|[script.js:17987](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L17987)<br>ACTION_RESULT_MESSAGES|cure|10|A上。行動結果として扱う|
|[script.js:18002](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18002)<br>ACTION_BLOCKED_MESSAGES|cleanAlready|6|A上。拒否／状態説明|
|[script.js:18010](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18010)<br>ACTION_BLOCKED_MESSAGES|sleepingFeed|5|A上。拒否／状態説明|
|[script.js:18017](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18017)<br>ACTION_BLOCKED_MESSAGES|sleepingPlay|5|A上。拒否／状態説明|
|[script.js:18024](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18024)<br>ACTION_BLOCKED_MESSAGES|lowEnergyPlay|5|A上。拒否／状態説明|
|[script.js:18031](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18031)<br>ACTION_BLOCKED_MESSAGES|sleepingPet|5|A上。拒否／状態説明|
|[script.js:18038](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18038)<br>ACTION_BLOCKED_MESSAGES|sleepingCourt|5|A上。拒否／状態説明|
|[script.js:18045](https://github.com/Naoto214/naotocchi/blob/bdb95499133b6f37065c6c815e4be21d4a0b6fb1/script.js#L18045)<br>ACTION_BLOCKED_MESSAGES|sleepingTravel|5|A上。拒否／状態説明|

## 未調査・未確定を残す経路

- iPhone Safari実機での動的バー／指スクロール／ピンチ中のviewport scroll／回転の競合タイミング。コード上の候補は確認したが、今回のユーザー報告そのものの実機traceは取得していない。
- 自然生活中の全地域・全28体・全会話／Reaction／長文／選択の組合せ。既存QAはloop停止や乱数固定を含み、到達経路の全実行保証にはならない。
- 公開先の認証後HTTP内容と端末キャッシュの同一性は今回再取得していない。監査対象は確定GitHub HEAD。旧版入口／V10入口の違いを原因候補に残すが、端末が旧版だったとは断定しない。
- 他ゲーム内の独自通知・全画面dialogの内部詳細は対象外。ホームへ戻るN/G/B経路は確認済み。
- 選択後の「発言」と「結果描写」の分類、割込み時の未読発言を再開するか捨てるかは仕様判断待ち。新ルールを実装していない。
