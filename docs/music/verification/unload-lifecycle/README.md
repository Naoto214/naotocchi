# 離脱保存時の実績ジングル取得を抑止

## CIで見つかった別の原因

HEAD `d24f459e24cdd5d3a39c00541845ea3560add672` の [Production 2.5D home](https://github.com/Naoto214/naotocchi/actions/runs/43590294014)、jungle job `132433490963` は、全24画面ケース・10実入力ケース・回転・保存復元を通過した後、WebKitの `jingle-achieve.m4a ... due to access control checks` で失敗した。`ci-before.log/json` と当時の最後の通常画面 `ci-before-webkit-jungle-28.png` を保存。画面画像自体にはネットワークエラーは表示されない。

実ゲームのfetch呼出スタックを取得すると、`beforeunload → saveState → checkAchievements → showStoryEvent → bgmJingle → fetch` が確認できた（`before-save-fetch.json`）。保存時の新しい実績通知が、離脱中に音源取得を開始する問題であり、住民選択や当たり判定の不具合ではない。WebKitの離脱中fetchを単独でも再現した（`minimal-webkit-reproduction.json`）。例外をcatchしてもブラウザーのアクセスエラーは発生するため、エラーフィルターでは解決しない。

## 最小修正

同期ロードされる `bgm-v2.js` がゲームの保存ハンドラーより先に `beforeunload` 状態を記録し、その処理中だけ新規ジングル取得・開始を抑止する。次タスクおよび `pageshow` で解除する。native beforeunloadは登録順で処理されるため、capture指定だけを根拠にせず、HTMLの同期タグとゲームより前の読み込み順をテストで固定した。

保存・実績判定・通常BGM・フェード・SFX/声・ゲームの操作や当たり判定には手を加えない。32曲の音源や台帳も変更しない。配信用キャッシュ参照とallowlistのSHAだけを新しいBGMモジュールへ更新した。

## 検証

- `browser-red.txt`：旧BGMでnative離脱時の新規fetchが1件発生し、回帰テストが失敗。
- `browser-green.txt` / `../navigation.json`：新BGMでChromium/WebKitともnative離脱保存、native離脱キャンセル後の実AAC再生、pageshow解除が成功。pageshowケースは合成イベントであり、native BFCache復元の実測ではない。
- `unit-red.txt` / `unit-green.txt`：取得抑止・復号待ち中の離脱・解除を検証。BGM、統合、選曲、既存ゲーム保護の36件が成功。
- `after-save-no-fetch.json`：実ゲームで5回保存・復元し、地域・住民・実績を保持。離脱中の取得0件、page error0件。通常再生時の取得は維持。
- `jungle-fixed.json`：修正後の両エンジンで24画面・10実入力・回転・保存復元が成功。元の操作テストのassertionやエラー検査は変更していない。
- `all32-browser.json` / `actual-routes.json` / `lifecycle.json` / `subapp-states.json`：公開用パッケージ上で32AAC復号、50配置、ホーム4時間帯、実効ゲイン0.36、通常/勝敗/帰還、フェード・二重再生・設定・SFX/声の経路を再検証。
- `library-preserved.json`：固定原盤一致、再解析0・既存32件再利用。`package-http.json`：配信ファイルのHTTP整合性。

独立レビューで重大・重要・軽微の指摘なし。旧音源・既存検証記録は保持。全CIが新HEADで成功するまでマージ・公開しない。Linux WebKitのデジタル経路検証を実iPhoneの可聴性確認とは扱わない。

キャッシュ参照の修正時に日付付きトークンへSHA-256/8を使用したため、全体試験のasset gateが不一致を検出した。既存仕様のSHA-1/8（`20261114-072fe9b2`）へ修正し、asset/BGM/保護34件を再通過（`asset-cache-check.txt`）。原盤のSHA-256方式やbytesは変更していない。全体試験は最終ソース固定後に再実行する。
