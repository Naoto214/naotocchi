# 通常表示・旧比較版・保存データの保護

## 84%の一覧表示で取り除いたもの

#570の正式ホーム由来のコントローラーは、ボタンを一つ生成し、6体以上で右上に表示する。クリックするとコントローラー内の `overview` が反転し、表示名が「みんなを見る」と「いつもの表示」の間で変わる。通常表示は1.00、一覧表示は0.84。倍率は小人数用と大人数用の双方の配置枠に掛かる。[ボタン作成とクリック](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/home-production-diorama.js#L289) ／ [倍率の適用](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/home-production-diorama.js#L136)

最終版はボタン要素、6体以上の表示条件、クリック処理、状態、状態の取得関数、0.84の乗算を取り除いた。ゲーム本体のスクリプトにある参照は、通常の配置を計算するときの引数と、クリック後に再配置するコールバックの2か所だけ。生成先の `script-v2.js` はその2か所を除くと、#570の `script.js` と完全一致する。セーブにはこの切替状態のキーがなく、旧セーブの値の書き換えは不要。通知、実績、会話、成長は元のゲームの処理を使う。[配置引数](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/script.js#L15279) ／ [再配置コールバック](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/script.js#L15451)

コードにはほかにも「overview」という名前がある。縦画面での `homeTinyOverview` は背景の投影と歩ける地面の計算に使い、すごろくの `overview` は盤面カメラを操作する。両方を保持した。旧比較用のコントローラーとスタイルは旧版を再現するために残っている。最終版のホームは専用コントローラーを読み込み、0.84状態への入口を持たない。[縦画面の投影](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/home-production-world.mjs#L32)

## ファイルの照合

基準は #570 の保存コミット `e7d881b825622efddac61857075c2c1658da706f`。その確定済みゲーム配布物3,886ファイルの名前と全バイトを比較し、全件一致した。最終版は同じディレクトリに6ファイルを足し、原画や機能を共用する。52背景すべてを公式の地域・時間帯表から引いて検査した。キャラクター関連2,869ファイル、BGM32曲、CARD GAME関連547ファイル、自然環境描画14モジュール、移動V5の住民モデルもすべて同一だった。[ファイル別保護の結果](evidence/guard-package.json)

`/v1/` では元の比較ページ・スタイル・操作コードをバイト単位で保存した。フレームの入口は元の `/game/index.html` に同じクエリを渡す。既存の現行・A・B・手動モードはこの旧版で利用できる。以前公開した森・とかい・おうちの直接リンク3本と、倍率または旧案を指定したリンクも旧版で開く。最終版の通常倍率は主人公120%、恋人120%、仲間105%で、主人公のもとの110%は既に#570の表示に含まれている。

## 位置・倍率・環境描画

移動モデルは元の `home-production-model.js` を読み込む。28体の初回配置に候補の足元を渡す処理だけが地形の初期座標APIに加わる。このAPIは候補を渡した後の移動、衝突、ドラッグのたびには呼ばれない。新しい立ち位置が変わると、同じルールでも歩く経路や話し相手が変わり得る。[初期位置の採用条件](https://github.com/Naoto214/naotocchi/blob/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/home-production-model.js#L94)

13地域×4画面サイズの地形オブジェクトで、経路探索・到達可能判定・歩行可能判定・遠近倍率・投影と逆投影の各関数が同じ関数オブジェクトであることを確認した。1・4・10・20体の初期位置は1,820箇所すべて基準と一致した。28体時も短い縦画面で重点4地域を除く9地域の252枠、長い縦画面3サイズで恋人を除く1,053枠、横画面での364枠は元の初期座標に一致した。旧0.84の設定値を渡す単体試験でも1・4・5・6・10・20・28体の全74枠が通常表示に一致した。実画面での重なりや移動は別途計測した。[地形APIの検証](evidence/guard-navigation.json)

Linux Chromiumの390×844・DPR 2で、森の昼・28体を固定し、旧比較の通常表示と最終版を実際に起動した。古いボタンは旧画面で2方向に作動し、最終画面では要素自体が0個だった。住民28体の画像パスとモデル寸法は一致した。主人公のHTML設定110%を維持し、描画要素の実際の縦横倍率をカメラと奥行きで補正すると、最終版では主人公1.20・恋人1.20・仲間1.05になった。旧比較からの倍率変更メッセージでも値は変わらなかった。親ページの4つのセーブ識別値とタブ保存値を使った独立テストでは、試遊フレームの読み書きが親の保存領域に届かないことを確認した。[ブラウザーの照合結果](evidence/guard-browser.json)

旧版でリボンを外して作った28体のセーブを、最終版のゲーム自身の読込・再保存処理に渡した。恋人、ペアの指輪、装備、所持品、育成値、進化段階、28体の構成が復元できた。[旧セーブの引き継ぎ試験](evidence/interaction-restore.json)

実際の描画用Canvasから全52背景について晴れ・曇りの切り替え・春の花びら・夏の雨・冬の雪・動きを減らす設定を含む312枚を生成した。各画像の全RGBA画素の集合ハッシュが#569の落ち葉Bと一致した。同じ時計で実ホームの背景Canvasも一致した。[環境312条件の結果](evidence/guard-pixels.json)

## 並行作業との重複

継続先の#570を除くGitHub上の開いているPR89件、変更10,121ファイルについて、改名前のパスも含めて調べた。今回追加する `comparisons/home-cast-size-v2/` と専用CIに重なるPRは0件だった。作業開始時のmainは `38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053`。実ゲームの修正を含む他PRと同じファイルに差分を載せず、基準コミットから試遊用ページとスクリプトを生成する。[調査日時と全PRのHEAD](evidence/guard-overlap.json)

| 保護する比較PR | 調査時のHEAD |
| --- | --- |
| #567 全13地域のE3 | `fae83a21915f9ada92f4ac13ac1aaacd397e333d` |
| #568 E3+の落下モーション | `2935622edf9ccdc6f8a36f2297dd86b789022b87` |
| #569 落ち葉B案 | `28628cf336a8ed92efe4e9e197ca03298b798a1e` |

## #570の前回コミットで発生したCIエラー

V1の保存コミット `e7d881b` からV2着手前の状態を確認した。mainとの差分56ファイルは旧比較ディレクトリとその専用ワークフローに限られる。専用比較CI、Runtime smoke test、BGM、保存領域ガード、Pagesのビルドは成功した。Pagesのデプロイジョブはスキップされた。[旧コミットのチェック一覧](https://github.com/Naoto214/naotocchi/commit/e7d881b825622efddac61857075c2c1658da706f/checks)

World visual qualityはmain宛てPRすべてが起動対象。captures、corridor、visibility、character-integrationの4ジョブは、Playwrightの動作に必要なOSパッケージの取得中にUbuntu配信元がHTTP 503を返し、終了コード100で止まった。4ジョブとも描画の検査には到達していない。regressionとbrowser smokeは成功した。[当時の実行ログ](https://github.com/Naoto214/naotocchi/actions/runs/44517477008)

Home layoutは比較ページのHTML・CSS・JavaScript・JSONにも一致するパス条件を持つ。`home-v21` はChromium・WebKitのインストール手順で停止した。2026年11月19日12:28 UTCの確認時点でワークフロー全体は実行中で、依存取得の個別エラーまでは確認できていない。Production 2.5D homeはmain宛てPRすべてが対象で、この時点では完了待ちだった。[Home layoutの失敗ステップ](https://github.com/Naoto214/naotocchi/actions/runs/44517476877/job/135537133115) ／ [Production 2.5D homeの旧実行](https://github.com/Naoto214/naotocchi/actions/runs/44517477419)
