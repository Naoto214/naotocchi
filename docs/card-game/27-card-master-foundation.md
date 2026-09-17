# 27 カードマスター土台

最新mainのstable IDをカード候補へ写す。効果は急いで決めず、イラストはPROXY。

仮ID：メイン M-<species>-<01..08> / なかま C-<id> / こいびと P-<id> / セカイ W-<id> / あそび G-<id> / あいてむ I-<id> / できごと E-<id>。

## メイン248
本編sourceは通常22種＋レア8種＋シークレットren 1種の各8段階。カブト／クワガタ16枚は01〜24の既存案を移植し作り直さない。author naotoはplayable=falseなのでメインへ入れない。

**71の個別割当・第1稿:** カード側のれんくん①〜⑧は通常とし、01の通常同名3枚を各段階へ適用する。他の通常22種と合わせて通常184枚、レア8種64枚。sourceのシークレットという入手区分は残し、カード独自のシークレット構築制限は新設しない。これは61の未指定部分を今回明示した設計案で、以前から割当済みだったという記録ではない。収録弾・販売上の希少度の確定でもない。[51](51-human-woman-ren-card-text-draft.md)・[71](71-main-248-card-text-cross-audit.md)参照。

## なかま26
通常：cat_friend, rabbit_friend, tanuki, squirrel, owl, otter, hamster, panda, monkey, parrot, sheep, seal, bat, chicken, penguin_friend, hedgehog, shiba, snail。
レア：punyu, sekizou, chameleon, clock, unicorn, many_tail_fox, watcher, box。
旧koalaはsnailへの互換aliasなので独立候補にしない。旧kinoko相当も現行レア枠ではclockを正とする。

## こいびと18
cat_ceo, robot_neighbor, field_cow, sunflower_partner, forest_bear, grove_deer, cliff_goat, high_eagle, snow_spirit, snowman, rock_octopus, sea_mermaid, anglerfish, swamp_croc, gentle_gorilla, knitting_spider, desert_scorpion, oasis_cactus。firstRegionとhookを能力設計の根拠にする。旧互換IDは独立候補にしない。

**74の個別割当・第1稿:** カード側のこいびとは全18体とも通常・各同名3枚とする。本編partnersの単一配列自体を構築区分の指定とは扱わず、今回の個別設計として明記する。全18体の本文は[74](74-partner-18-card-text-draft.md)、根拠・接続・40局面は[75](75-partner-18-text-audit.md)。収録弾・販売上の希少度・強度は未確定。

## セカイ13
home, city, countryside, forest, mountain, snow, sea, deepsea, river_lake, jungle, desert, star_stop, memory_lake。季節・時間・天気は独立軸なので役割監査までHOLD。

## 伝説5：暫定できごと
E-gate「そらにうかぶとりい」 / E-stairs「どこにもつながらないかいだん」 / E-boss「あやまりにきただいおういか」 / E-lamp「よなかのあかり」 / E-mirror「としをとったじぶん」。CARD候補。最終種類は全できごと監査時に再確認。

## なおと
E-naoto。source: playerSpecies.author / naoto。カード表示名「なおと」。暫定種類：できごと。CARD。効果・収録弾は全体設計後。イラストPROXY。

## 現行アイテムsource26の構築区分案（77）

2026-09-17の本編改良追従で、なおとシリーズ4種はレア・各同名1枚、その他22種は通常・各同名3枚の第1稿とした。個別の時・使用方法・本文は[77](77-current-items-card-text-draft.md)。既存登録14と未登録source12を区別し、旧38・全体477の履歴は[76](76-item-source-v2-followup.md)どおり保持する。以下の311は初回時点の集計。

## 現在311候補
メイン248＋なかま26＋こいびと18＋セカイ13＋伝説5＋なおと1。まだあそび100本、現行あいてむ、その他できごとを含まない。

次：games.jsの100本、現行アイテム、イベント群を抽出し、既存カブト／クワガタ16枚を移植する。
