# 固定配置50行

原表 `music/placements.json` の行ID・曲ID・場面を維持。原表の企画時記述（4秒クロスフェード等）は履歴として保護し、実装のフェード仕様は [PRODUCTION.md](PRODUCTION.md) に区別して記載。曲追加は別ファイル `music/extensions.json` に追記します。

| 行 | ゲーム | 場面 | 曲ID |
|---|---|---|---|
| scene-01 | ホーム | 2.5D ホーム 朝昼夕夜（おうち） | home-morning, home-day, home-evening, home-night |
| scene-02 | ホーム | 13地域（とかい〜きおくのみずうみ） | home-morning, home-day, home-evening, home-night |
| scene-03 | ホーム | メニュー・お店・アイテム・図鑑・実績・アルバム・シール・設定・旅行・つうしん | home-morning, home-day, home-evening, home-night |
| scene-04 | ホーム | めぐる（世界を 歩く） | home-morning, home-day, home-evening, home-night |
| scene-05 | ホーム | 成長・変身・そだち・中年の できごと | home-morning, home-day, home-evening, home-night |
| scene-06 | ホーム | 仲間の さそい・恋人に なった | home-morning, home-day, home-evening, home-night |
| scene-07 | ホーム | 睡眠（ねる〜おきる） | lullaby-a |
| scene-08 | ホーム | デートを 選ぶ 画面・デートの 映画 | event-2 |
| scene-09 | ホーム | 結婚記念日の 映画（1・10・25・50年） | event-2 |
| scene-10 | ホーム | 結婚した（お知らせ） | event-2 |
| scene-11 | ホーム | でんせつの であい（映画） | kisetsu |
| scene-12 | ホーム | お別れ（死亡・100さいの さいごの じかん・一生カード） | bgm-farewell |
| scene-13 | ホーム | たまごが かえる しゅんかん | var-ohayo-hatch2 |
| scene-14 | ホーム | 誕生日（年齢が 上がる お知らせ） | 無音／既存曲継続（原表による） |
| scene-15 | ホーム | 図鑑・実績の 達成（お知らせ） | jingle-achieve |
| scene-16 | ホーム | GAME CLEAR 画面（図鑑・すべての 実績）に とどまる 間 | jingle-achieve, event-1 |
| scene-17 | ホーム | たまご（かえるまで）・むげんモード・個性の 選択 | home-morning, home-day, home-evening, home-night |
| scene-18 | なおぽよ。 | 遊ぶ 画面・ステージ選択・おてほん・説明（第1章 地下牢 10ステージ） | poyo-1 |
| scene-19 | なおぽよ。 | 地下牢・苔・冷たい広間・夜明け（ステージの 雰囲気）・重力の ステージ | poyo-1 |
| scene-20 | なおぽよ。 | 旧ページ（ひかりの牢屋・こもれびの森・rescue の 洞窟/古城） | poyo-1 |
| scene-21 | なおぽよ。 | ステージクリア「みんな、おかえり。」 | var-poyo-clear |
| scene-22 | なおぽよ。 | 第1章クリア（地下牢を ぬけて 光へ） | var-poyo-chapter |
| scene-23 | なおぽよ。 | 失敗・やりなおし | 無音／既存曲継続（原表による） |
| scene-24 | なおぽよ。 | 第2章以降（地底洞窟・古城・光の森 … 時の塔） | poyo-1 |
| scene-25 | なおころ。 | タイトル・キャラクター選択・ひとやすみ・対戦コード | koro-1 |
| scene-26 | なおころ。 | すごろく盤（できごと・仲間・恋人・結婚・とき・へんしん・お店） | koro-1 |
| scene-27 | なおころ。 | 盤の ゲーム 2マス（通常ミニゲーム 15本） | game-1 |
| scene-28 | なおころ。 | 盤の クイック 4マス（45種） | bgm-game |
| scene-29 | なおころ。 | 最終ターンの ゴール | var-koro-goal |
| scene-30 | なおころ。 | 終盤（のこり 3ターン など） | koro-1 |
| scene-31 | なおころ。 | 人生アルバム「こんな人生に、なりました。」・過去の アルバム | var-koro-album |
| scene-32 | CARD GAME | はじめの メニュー・対戦の 準備・マイデッキ・コレクション・戦績・あそびかた・ルールブック | card-2 |
| scene-33 | CARD GAME | 通常の 対戦（ラウンド 1〜8） | card-2 |
| scene-34 | CARD GAME | 終盤の 逆転（ラウンド 9〜10・そだち100 目前） | var-card-late |
| scene-35 | CARD GAME | 勝利 | var-card-win |
| scene-36 | CARD GAME | 敗北・引き分け | jingle-card-lose |
| scene-37 | CARD GAME | 特別な カード演出（けっこん・おわかれ・たんじょう・成長の お知らせ） | card-2 |
| scene-38 | 通常ミニゲーム | アクション 32本 | game-1 |
| scene-39 | 通常ミニゲーム | ストラテジー 2本 | game-1 |
| scene-40 | 通常ミニゲーム | パズル 17本 | poyo-2 |
| scene-41 | 通常ミニゲーム | ボード・テーブル 12本 | board-b |
| scene-42 | 通常ミニゲーム | スポーツ 17本 | game-2 |
| scene-43 | 通常ミニゲーム | 釣り 4本 | fishing-a |
| scene-44 | 3D ゲーム | レース・シューティング 5本 | bgm-race |
| scene-45 | 3D ゲーム | 探検・ダンジョン 4本 | explore-1 |
| scene-46 | 3D ゲーム | 飛行・海 7本 | var-flight |
| scene-47 | クイックモード | クイックゲーム 50種（1つの ゲームとして 続けて 遊ぶ） | bgm-game |
| scene-48 | 通常ミニゲーム | ミニゲームの 結果 | home-morning, home-day, home-evening, home-night |
| scene-49 | ものがたり『微睡みの箱庭』 | 読む 画面すべて | 無音／既存曲継続（原表による） |
| scene-50 | 共通 | 起動直後（最初の タップまで）・BGM オフ設定 | 無音／既存曲継続（原表による） |
