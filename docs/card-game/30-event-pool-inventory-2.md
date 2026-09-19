# 30 できごと候補棚卸し 2 — 人生・関係・旅の接続

最終更新: 2026-09-14

状態: **設計対象の棚卸し。効果本文・コスト・収録弾は未確定。全候補PROXY。**

## 参照した保存地点

- 本編: main `3ea8adac59281cbd10d5f5ff48a94cd9913c36a5`（PR #260を含む）。
- 既存棚卸し: `design/card-pool-master-20260914` の `dc829b750540dba0593ba6e5dc3d1d6287d969d8`、25〜29。
- 基本ルール: [01](01-core-rules.md)、[02](02-main-system.md)。
- 既存できごと: [07](07-advanced-rules-checkpoint.md)、[08](08-test-deck-a-card-drafts.md)、[13](13-test-deck-b-support-pool.md)。A/Bの凍結位置は[19](19-test-decks-a-b-cross-audit.md)。
- 本編の根拠: [script.jsの固定版](https://github.com/Naoto214/naotocchi/blob/3ea8adac59281cbd10d5f5ff48a94cd9913c36a5/script.js)、[キャラクターマスターの固定版](https://github.com/Naoto214/naotocchi/blob/3ea8adac59281cbd10d5f5ff48a94cd9913c36a5/character-world-master.v1.js)。

以下の `E-...` はカード側で付けた仮ID。本編に同名のイベントIDが存在するという意味ではない。本編イベントに固定IDがない場合は、source path・関数／定数・分岐条件を併記して追跡する。行番号やログ文の表記だけを識別子にしない。

CARDは「カードとして設計を進める候補」であり、正式カード・最終効果の確定を意味しない。HOLDも候補総数に含める。NO-CARDと未展開のsource familyは別管理する。

## 1. 既存試作のできごと6枚を登録する

07・08には既に6枚の試作があり、13のBではそのうち5枚を使っている。一方、27〜29の数にはこの6枚がまだ独立登録されていない。**新しく発案した6枚ではなく、既存設計への仮ID付与**として扱う。同じ出来事に別名カードを追加しない。

| 仮ID | 既存カード名 | 状態 | 本編source anchor（script.js） | 維持する役割・注意 |
|---|---|---|---|---|
| E-big-illness | おおきなびょうき | CARD | SICKNESS_TYPES / tickの発病分岐 / medicineBtn | A/Bの不利益・立て直し検証を継承。症状名ごとに10枚へ分割しない。カードゲームへ病気メーターを追加しない。 |
| E-fateful-transform | うんめいのへんしん | CARD | offerTransformIfReady / rerollIdentityAndBreakupIfNeededとへんしんログの呼出箇所 | へんしん支援。通常へんしんに専用カードが必要になる変更はしない。シルクハットとの重複を継続監査。 |
| E-new-encounter | あたらしいであい | CARD | PARTNER_FIRST_ENCOUNTERS / playFirstPartnerEncounter / なかま加入時のstate.companions.push | なかま・こいびとを探す役割を継承。キャラクター本体のC-/P-候補とは別だが、相手ごとの出会い文を別カードにしない。 |
| E-misunderstanding | すれちがい | CARD | recheckRelationship / courtBtnのmismatched分岐 | 関係への干渉を扱う既存試作。本編ではすれちがいと関係終了は別の状態である。カード側へそのまま新状態を持ち込まず、既存試作との対応を後で監査する。 |
| E-sudden-trip | とつぜんのたび | CARD | 旅処理のstate.regionId更新 / firstVisit / checkStoryEvents('travel') | 既存のセカイ移動試作を継承。移動先ごとの別名カードを増やさず、場所そのものはW-候補へ分離する。 |
| E-final-time | さいごのじかん | CARD | enterFarewell / tickのGOAL_AGE到達分岐 | 既存の終盤カードを継承。100さい到達と死亡を同一視しない。⑧とR10も別概念のまま。延長ターン・勝利条件変更を追加しない。 |

この登録で既存カードの時コスト・効果本文は変更しない。詳細が旧稿にしか残っていないカードは、その履歴を読み戻して移植し、要約から本文を捏造しない。

## 2. 新たに設計へ進める4候補

これらは既存6枚では表現し切れていない「行動の後に残る経験」を担当する。以下は役割案であり、プレイ方法・数値・発動条件を確定するものではない。

| 仮ID | 仮名 | 状態 | 本編source anchor（script.js） | 役割案と差別化 |
|---|---|---|---|---|
| E-first-date | はじめてのデート | CARD | datesThisLife === 1のデート処理 / rememberSpecialDate / デートムービー | 今いるこいびとと一緒に経験するカード。出会いの探索、結婚成立の基本報酬とは分ける。名前の「はじめて」を理由に試合中の初デート専用カウンターを追加しない。 |
| E-reconciliation | なかなおり | CARD | courtBtnのp.repair・MISMATCH_REPAIR_NEEDED分岐 | 関係への干渉の後、立て直す選択。I-c_breakhalf/I-c_breakfullの「別れの損失を軽減」と、関係そのものをどう扱うかを分離する。相手の恋愛対象を書き換える能力にはしない。 |
| E-wedding-anniversary | けっこんきねんび | CARD | MARRIAGE_MILESTONES / checkMarriageMilestones | 結婚後にも続く生活の価値。1・10・25・50周年は現段階では1候補へ束ねる。結婚時そだち+10を自動的に再取得する設計や、新たな経過年カウンターは導入しない。 |
| E-special-trip-memory | とくべつなたびのおもいで | CARD | 旅処理のspecialRewardTrip分岐と対応するpushLifeLog | 旅をした後の成果。E-midlife-travel-planの事前準備、E-sudden-tripの移動、I-rewardの贈り物から役割を分ける。公開盤面・捨て札等で確認できる条件を優先する。 |

通常デート・特別デート・会話の違いをすべて別カードにはしない。特別デートの枝はE-first-dateの設計資料として保持し、必要性が検証されてから分割を検討する。

## 3. 根拠はあるが役割を保留する5候補

| 仮ID | 仮名 | 状態 | 本編source anchor（script.js） | 保留理由 |
|---|---|---|---|---|
| E-sickness-recovery | びょうきをのりこえて | HOLD | medicineBtnの治療分岐 / recordSicknessCure | 発病とは独立した回復経験。ただし既存ハグ、あいてむ、防止・数値回復との役割重複が未整理。病気カウンターなしで表現できるかを検証する。 |
| E-last-stand | きせきのふんばり | HOLD | onBirthdayのage === 90 / checkMetersとtickのmiracleGuard分岐 | 本編の危機回避に実体がある。ただしカードゲームにはHP・死亡メーターがなく、メイン除去も死亡と同義ではない。安易な復活や除去ロックを作らず、防止カードとの差を先に検証する。 |
| E-companion-parting | しばらくのおわかれ | HOLD | decayCompanionBonds | 本編はbondが尽きると現在のなかまから離脱する。カード側は既存のなかま交代・個別離脱能力との違いが未定。全なかまへ自動離脱や共通のきずなメーターを追加しない。 |
| E-sodachi-milestone | そだちのふしめ | HOLD | SODACHI_PERKS / onSodachiMilestone | 30〜100の8節目を1 source familyとして保留。報酬や解禁の数だけカードを増やさない。そだちを消費資源にせず、既存の成果獲得能力と比較する。 |
| E-grand-goal | いっしょうのたっせい | HOLD | enterFarewell / checkGrandGoals / syncNaotoRewardItems | 達成体験は残すが、E-final-time・I-naoto_*・E-naotoと重なりやすい。対戦外の解禁条件と対戦内効果を分離し、5ゴールごとにカードや別勝利条件を自動追加しない。 |

本編の古いコメントには「そだち100やリングで不死」等が残るが、この固定版のisImmortal()はstate.infiniteを返している。採用根拠は実際の分岐・状態更新とし、古いコメントだけから能力を復活させない。

## 4. 独立カードにしないsource family

ここはカード候補IDではなく、重複・対象外を記録する除外表。未読・未設計というだけでNO-CARDにしない。

| source family | 判定 | 理由・受け皿 |
|---|---|---|
| hatchEgg / warmEggの通常孵化・温め・ひび | NO-CARD | 通常たんじょうとデッキ外たまごが既に担当。日常の孵化ログだけを追加カードにせず、別効果の必要性が出た時に再検討する。 |
| onStageChangedの通常成長・種別の姿変更 | NO-CARD | M-<species>-<01..08>の248形態と、たんじょう／ときおくり／へんしんが担当。各段階の通知を再加算しない。 |
| 個々のなかま加入・PARTNER_FIRST_ENCOUNTERSの人物別差分 | NO-CARD | C-/P-候補とE-new-encounterへ紐付け。加入そのものを、同じ人物名で二重登録しない。 |
| 通常の交際進行・reinforceRelationshipによる結婚成立 | NO-CARD | 01の交際・結婚の基本行動とP-固有能力が担当。追加できごとがなくても関係を進められる。記念日は別候補。 |
| triggerDeath / showLifeCard / セーブ・復帰・旧セーブ移行通知 | NO-CARD | 本編の人生終了・記録表示・運用通知。死亡即敗北、無条件たまご戻し、試合やり直し等の共通ルールに翻訳しない。 |
| STORY_EVENT_POOLSの同じ文脈内の言い回し差分 | NO-CARD | checkStoryEventsは文を抽選して表示する処理。テキスト1行を独立カードにしない。文脈そのもののカード価値の精査は未完了で、未読文脈を一括除外する意味ではない。 |

カクレクマノミの体の変化・クエスチョニングの解消など、性別／恋愛対象に関わる本編分岐も確認した。**66のユーザー確定後は、本編の生態・人物表現の資料として保持し、カード側の性別・恋愛対象・相性判定へ移植しない。** 独立イベント候補はこの記録から自動追加せず、必要な組み合わせ条件だけ個別のカード能力に明記する。今回の件数には追加していない。

## 5. 登録済みできごとの正規一覧 — 34候補

この節が30時点のE-候補の集計用一覧。上の説明表や27・29の再掲は重複加算しない。

| 仮ID | 状態 | 登録元 |
|---|---|---|
| E-gate | CARD | 27 |
| E-stairs | CARD | 27 |
| E-boss | CARD | 27 |
| E-lamp | CARD | 27 |
| E-mirror | CARD | 27 |
| E-naoto | CARD | 27 |
| E-midlife-hobby | CARD | 29 |
| E-midlife-50th | CARD | 29 |
| E-midlife-album | CARD | 29 |
| E-midlife-flower | CARD | 29 |
| E-midlife-travel-plan | CARD | 29 |
| E-env-sunny | HOLD | 29 |
| E-env-cloudy | HOLD | 29 |
| E-env-rain | HOLD | 29 |
| E-env-snow | HOLD | 29 |
| E-env-morning | HOLD | 29 |
| E-env-day | HOLD | 29 |
| E-env-evening | HOLD | 29 |
| E-env-night | HOLD | 29 |
| E-big-illness | CARD | 30・既存試作の登録 |
| E-fateful-transform | CARD | 30・既存試作の登録 |
| E-new-encounter | CARD | 30・既存試作の登録 |
| E-misunderstanding | CARD | 30・既存試作の登録 |
| E-sudden-trip | CARD | 30・既存試作の登録 |
| E-final-time | CARD | 30・既存試作の登録 |
| E-first-date | CARD | 30・新規 |
| E-reconciliation | CARD | 30・新規 |
| E-wedding-anniversary | CARD | 30・新規 |
| E-special-trip-memory | CARD | 30・新規 |
| E-sickness-recovery | HOLD | 30・新規 |
| E-last-stand | HOLD | 30・新規 |
| E-companion-parting | HOLD | 30・新規 |
| E-sodachi-milestone | HOLD | 30・新規 |
| E-grand-goal | HOLD | 30・新規 |

**できごと: CARD 21 + HOLD 13 = 34候補。**

## 6. 全体集計の訂正 — 477候補

29の「454」は、28の449にちゅうねん5件を加え、ENV_MOMENTSのHOLD 8件を除いた小計だった。さらに449にはHOLDのI-reward 1件が含まれるため、「454 CARD」とは言えない。

29終了時を同じ基準で数え直すと、**CARD 453 + HOLD 9 = 462候補**。そこへ今回、既存試作6 + 新規CARD 4 + 新規HOLD 5 = 15候補を登録する。

| 種類 | CARD | HOLD | 合計 |
|---|---:|---:|---:|
| メイン | 248 | 0 | 248 |
| なかま | 26 | 0 | 26 |
| こいびと | 18 | 0 | 18 |
| セカイ（場所） | 13 | 0 | 13 |
| あそび | 100 | 0 | 100 |
| あいてむ | 37 | 1 | 38 |
| できごと | 21 | 13 | 34 |
| **合計** | **463** | **14** | **477** |

これは27〜30で登録・枚数展開した範囲の暫定母集団であり、完成カード477枚や第0弾477種を意味しない。NO-CARDは含めない。セカイのじかん・てんき・きせつなど、候補単位・IDをまだ展開していない軸も含めない。HOLDのsource familyを後で分割した場合は、親familyと子カードを同時に枚数へ加算しない。

## 7. 検証範囲と残件

今回確認したのは、孵化・段階変化・100さい／終了、関係の成立・修復・記念日・離脱、旅の初訪問／特別報酬、発病／治療／危機回避、そだち節目／ゴール達成の主要分岐。全イベントの網羅監査・カードバランステストはまだ完了していない。

特に、あそび100件は28でstable IDを列挙した段階で、全件の現行表示名・生成元・カード本文まで完成したわけではない。旧試作の「ハグ」「キャッチボール」「かくれんぼ」「うそつきしょうぶ」等と現行source IDの対応も未完了。旧試作を黙って削除せず、現行本編にない旧アイテムを黙って復活もさせない。

次の作業は以下の順で進める。

1. 15第2稿のカブト8枚、23第3稿のクワガタ8枚をM-仮IDへ忠実に移植する。24は第2稿の問題検出記録なので、番号が大きいことを理由に23第3稿を巻き戻さない。既に248に含まれる16枚なので候補総数は増やさない。
2. 残るsource対応（あそびの実名・旧試作・イベント文脈）を埋める。セカイは「じかん → てんき → きせつ → ばしょ」の順序を守って候補単位を整理する。
3. 全種類の役割地図を作り、CARD/HOLDを再評価して本文設計・プロキシテストへ進む。

本編コード・既存01〜24・最終イラストは今回変更しない。

## 91追従注記（登録表は変更しない）

[91](91-event-21-card-text-draft.md)でCARD21の全本文とHOLD13の継続理由を保存。上記specialRewardTripは旧source参照で、現行mainでは削除済み。現在の特殊地訪問・firstVisit・ログへ接続し、候補自体と登録数は保持する。旧アイテム名から現行報酬を推測しない。
