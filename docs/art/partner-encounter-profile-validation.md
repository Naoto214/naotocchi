# 恋人18体の初遭遇・プロフィール実画面検証 — BN（2026-09-09）

PR #183 / `feature/character-cast-art-v1` をGitHub実状態から継続。
開始HEADはBM `088e62fa27e4a8c631ab3f9bc271092e0c052101`、tree `29bbaa30b822a5342f0f231393c27a6bcb078233`。
[Runtime smoke / dialogue regression #235 SUCCESS](https://github.com/Naoto214/naotocchi/actions/runs/34352048465)を確認した。
mainは `da5c631a911504e78c8b88fae373f30b85f26b31`（PR #203）、PRはopen / Draft・未マージ、競合なし。

## 今回の対象と方法

正規のSites開発プレビュー `http://terminal.local:4173/__qa` をCloud Browserで操作した。
このcheckoutの通常のHTML/CSS/JS・承認済み画像を読み込み、公開mainや古いプレビューは確認対象にしていない。
URLポリシーの拒否・迂回はない。ゲーム本体4ファイルと承認済み画像301枚はBMからバイト不変。
表示上の追加不具合は今回の範囲では見つからず、変更は開発用QAと検証記録に限る。

検証条件はiframe 320×640px、スクロールバーを除いた実clientWidth 305px。
主人公は成人、通常18＋レア8の仲間26体。`/__qa` のLoad sceneはこのプレビューoriginのセーブを検証用セーブへ置換する。

1. Sceneの `first_<地域ID>` をロードし、ゲームの「💘 きゅうあい」を押す。10地域の通常の抽選で全18体に出会うまで行う。
2. 初遭遇の冒頭を撮影し、「Observe story (9s)」で通常の4.2秒切り替えを含め2台詞を観測する。台詞・専用PNG参照は現行マスター/ゲーム定義と全18体で一致した。
3. 同じ候補が出たときは再ロード、または通常の「🤗 じゃれる」の後に求愛する。ゴリラは1回、サボテンは2回のじゃれる後に確認した。乱数・時刻・タイマー・ゲームクロージャーは差し替えていない。
4. `partner_<ID>` をロードし、「👤」からプロフィールを開く。恋人の名前を画面内へスクロールし、専用画像・名前・属性・なかよし度を確認して撮影する。

プロフィール用fixtureは画像表示の検証用に婚姻済み状態を作る。交際の成立条件や性別の組み合わせの可否をこの操作で検証したとは扱わない。

## 結果

- 初遭遇は18体それぞれ2台詞を実ブラウザーで観測。配置失敗・通知の画面外表示・文字の横overflow・破損画像は0。
- 全18体のプロフィールを実画面で目視。専用画像が正しい恋人へ対応し、長い名前/属性は折り返され、恋人カードとゲージを狭い画面内で確認できた。
- 静的計測は探索中の再試行を含む65件すべて、画像読み込み完了後に総合PASS。プロフィール18件を含む独立した65種類の網羅ケースという意味ではない。
- 画面記録は初遭遇18枚とプロフィール18枚の計36枚。各初遭遇の画像は1台詞の瞬間であり、2台詞の全時間を動画として保存したものではない。

初遭遇の9秒観測は探索中の重複を含め20回・10,574フレーム。
最後の観測を各キャラ1回ずつ採ると18回・9,506フレームで、配置失敗0、破損画像0、読込中68フレームだった。
読込中は表示領域を持つ全ゲーム画像を対象とした値で、初遭遇の顔だけの値ではない。
読み込み待ちのフレームは総合PASSに含めず、ちらつきが全くないことまで確認済みとはしない。
探索分を含む全20回でも配置・破損0、読込中68フレーム。成功した観測だけを残していない。

ブラウザー側で2台詞目の要素を直接待つ操作は、一部の探索でクライアントの待機期限に達した。
その後に完了済みの9秒観測結果を読み直して回収した。以後は観測開始と結果読取を別操作に分け、通常時間で待った。
この待機エラーをURLポリシー拒否やゲームの保存失敗とは扱わない。

| 恋人 | 画面記録 | 最終観測フレーム | 読込中フレーム |
| --- | --- | ---: | ---: |
| ビルの ねこ社長 | [初遭遇](qa-bn/first-cat_ceo.jpg) / [プロフィール](qa-bn/profile-cat_ceo.jpg) | 530 | 3 |
| となりまちの ロボット | [初遭遇](qa-bn/first-robot_neighbor.jpg) / [プロフィール](qa-bn/profile-robot_neighbor.jpg) | 536 | 6 |
| のはらの うしさん | [初遭遇](qa-bn/first-field_cow.jpg) / [プロフィール](qa-bn/profile-field_cow.jpg) | 531 | 3 |
| はたけの ひまわりさん | [初遭遇](qa-bn/first-sunflower_partner.jpg) / [プロフィール](qa-bn/profile-sunflower_partner.jpg) | 525 | 12 |
| もりの クマさん | [初遭遇](qa-bn/first-forest_bear.jpg) / [プロフィール](qa-bn/profile-forest_bear.jpg) | 532 | 2 |
| こだちの シカ | [初遭遇](qa-bn/first-grove_deer.jpg) / [プロフィール](qa-bn/profile-grove_deer.jpg) | 515 | 2 |
| がけの ヤギさん | [初遭遇](qa-bn/first-cliff_goat.jpg) / [プロフィール](qa-bn/profile-cliff_goat.jpg) | 524 | 3 |
| たかねの ワシ | [初遭遇](qa-bn/first-high_eagle.jpg) / [プロフィール](qa-bn/profile-high_eagle.jpg) | 531 | 2 |
| ゆきの せいれい | [初遭遇](qa-bn/first-snow_spirit.jpg) / [プロフィール](qa-bn/profile-snow_spirit.jpg) | 534 | 3 |
| とけない ゆきだるま | [初遭遇](qa-bn/first-snowman.jpg) / [プロフィール](qa-bn/profile-snowman.jpg) | 509 | 3 |
| いわばの タコさん | [初遭遇](qa-bn/first-rock_octopus.jpg) / [プロフィール](qa-bn/profile-rock_octopus.jpg) | 526 | 3 |
| うみの にんぎょ | [初遭遇](qa-bn/first-sea_mermaid.jpg) / [プロフィール](qa-bn/profile-sea_mermaid.jpg) | 529 | 2 |
| ひかる チョウチンアンコウ | [初遭遇](qa-bn/first-anglerfish.jpg) / [プロフィール](qa-bn/profile-anglerfish.jpg) | 539 | 6 |
| ぬまの ワニさん | [初遭遇](qa-bn/first-swamp_croc.jpg) / [プロフィール](qa-bn/profile-swamp_croc.jpg) | 528 | 3 |
| やさしい ゴリラ | [初遭遇](qa-bn/first-gentle_gorilla.jpg) / [プロフィール](qa-bn/profile-gentle_gorilla.jpg) | 525 | 3 |
| あみものが すきな クモさん | [初遭遇](qa-bn/first-knitting_spider.jpg) / [プロフィール](qa-bn/profile-knitting_spider.jpg) | 536 | 4 |
| さばくの サソリさん | [初遭遇](qa-bn/first-desert_scorpion.jpg) / [プロフィール](qa-bn/profile-desert_scorpion.jpg) | 521 | 3 |
| オアシスの サボテンさん | [初遭遇](qa-bn/first-oasis_cactus.jpg) / [プロフィール](qa-bn/profile-oasis_cactus.jpg) | 535 | 5 |

全行で2台詞/画像参照一致、配置失敗0・破損画像0、プロフィールの静的計測PASS。
`profileVisible` は矩形が存在することの診断値であり、スクロール枠内の可視性を単独で保証しない。カードを表示位置へスクロールしたスクリーンショットを別途目視した。

## 保存・回帰・残る範囲

[実測JSON](partner-encounter-profile-browser-results.json)は静的計測と20回の観測サマリーをそのまま保存する。
全フレームの個別値を保存したものではない。
[集計・ソース・画面記録のハッシュ](partner-encounter-profile-validation.json)には各キャラ最後の観測、期待台詞、画像対応、検証範囲を収録。
画像301枚の既存ハッシュ一覧は [BMの検証JSON](cast-movie-validation.json) を参照し、その全ファイルをBMのGit実体とも再照合した。

`npm test`成功（DOM 287 / ミニゲーム100 / variant collections 91）。
会話、248段階本文、恋人18体、仲間26体、旧コアラ/旧きのこ、時計/カタツムリ、作者④⑤と旧PERFECTの作者・王冠・自由モード保持を含む既存回帰が通過。
開発fixture生成も成功。ゲーム本体・台詞・セーブ仕様・承認済み画像の変更はない。

[BLの配置・図鑑・作者演出](cast-layout-validation.md)、[BMのデート18体・銀婚式](cast-movie-layout-validation.md)の確認範囲も保持する。
今回は全18体の初遭遇とプロフィールを追加確認した。
物理iPhone/Safari・Android、全248形態の個別アニメーション、全恋人の全デートプラン/全記念日、ミニゲーム100本の手動完走は未確認。
全体開発は継続中。当該保存コミットのHEAD/tree/ActionsはPR #183本文とChecksへ記録し、明示的なマージ依頼までDraft・未マージで保持する。
