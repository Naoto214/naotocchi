# Relationship Expression pilot 実施計画

日付: 2026-09-30
基準設計: docs/qa/relationship-expression-design-20260930.md

## 目的
全量88枚を制作する前に、Relationship Expression の画像方式・runtime接続・Home小表示が成立するかを最小4体8枚で検証する。

## pilot対象
### なかま
1. あそびずきカワウソ
   - 標準的な動物構造
   - bond減衰: 寂しがり25年
2. じかんにルーズなとけい
   - 非動物・特殊構造
   - bond減衰: マイペース35年

### こいびと
3. もりのクマさん
   - 標準的な動物構造
4. いわばのタコさん
   - 8本腕の特殊構造

## pilot画像
各対象について2枚:
- positive
- lonely

合計8枚。

normalは既存PNGをそのまま使用し、変更しない。

## 表情の意味
### positive
関係が良くなるイベントに対する短時間のReaction。
身体構造・個体性は通常基準から不要に変更しない。

### lonely
関係値30未満を示すpersistent Expression。
過度に悲惨・病的な表現にはせず、「最近かまってほしい／距離を感じている」が読み取れる程度とする。
通常31系統のsick/weak/criticalとは意味を混同させない。

## resolver優先順位
positive > lonely > normal

Expression自体はsaveしない。

## なかまpilot挙動
- bond >= 30、Reactionなし: normal
- bond < 30、Reactionなし: lonely
- 通常のじゃれる成功: 代表1体のみpositive
- lonelyだった個体がじゃれる成功でbond >= 30へ回復: 該当個体は代表抽選に関係なくpositive
- positive終了後、現在bondに応じてnormal/lonelyを再解決

## こいびとpilot挙動
- affection >= 30、Reactionなし: normal
- affection < 30、Reactionなし: lonely
- 求愛等の対象イベント: positive
- positive終了後、現在affectionに応じてnormal/lonelyを再解決
- 恋人成立・仲直り・結婚の強度差は画像を増やさず既存演出側で表現

## 今回pilotに含めないもの
- なおとの表情追加
- 通常31系統の変更・再監査
- 残り40体への全量展開
- 結婚3年＋求愛3＋デート4＋affection70のruntime実装
- デート0.5年化
- save schema変更
- migration実装
- 全26体の25/30/35年減衰runtime実装

上記はpilot画像・resolver方式がGREENになった後の別工程とする。

## 画像QA
各8枚について:
- 通常基準と同一個体であること
- 身体構造を保持すること
- 顔以外の自然な微細差は許容
- 明確な欠損・破綻のみ修正対象
- 自然な左右非対称を機械的に直さない
- 128pxの自然さを優先
- Home実表示で意味が判別できること
- とけい・タコの特殊構造を重点確認

## runtime QA
- positive > lonely > normal
- lonely救済: lonely -> positive -> normal
- positive終了後の再解決
- 非pilotキャラは既存PNGのまま
- Expression状態をsaveしない
- reload後は関係値から正しく再解決
- 通常31系統Expressionへ回帰0

## hash / 保護
- 通常31系統asset hash不変
- なおとasset hash不変
- 既存なかま・こいびとnormal asset不変
- pilot新規asset以外の画像変更0

## GREEN条件
画像8枚、runtime接続、Home表示、save非保持、回帰テスト、非対象hashがすべてPASS。
人間目視承認前に残り80枚へ展開しない。

## 停止
この計画文書保存時点では画像生成・runtime実装を開始しない。
