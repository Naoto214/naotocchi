# PR #462 version 8 description preserved before version 9 update

## version 8 本人限定公開 — 実機QA待ち

指定HEAD `5376d2e6ca29652cd8ae30ada37ec2e91aff43f9` の検証済み候補を、既存の本人限定Sitesへ公開しました。Draftのまま、main・本番GitHub Pagesには反映していません。

- 比較ページ: https://naotocchi-art-25d-20261028.kerzion214.chatgpt.site/home-v8.html
- 通常試遊: https://naotocchi-art-25d-20261028.kerzion214.chatgpt.site/home-v8-play.html
- v7入口: https://naotocchi-art-25d-20261028.kerzion214.chatgpt.site/home-v7.html

### 公開対象と結果

|項目|確認結果|
|---|---|
|開始時/公開時GitHub HEAD|`5376d2e6ca29652cd8ae30ada37ec2e91aff43f9`。コード変更なし|
|CI|[run 40919981248](https://github.com/Naoto214/naotocchi/actions/runs/40919981248)、同じHEADで全43ジョブ成功|
|CI上の全体回帰|3,690成功・失敗/スキップ/キャンセル0。250+26+24+3,225+138+9+18|
|追加ホーム回帰|100件成功、パッケージ回帰2件成功|
|v8比較候補|8ジョブすべて成功。各候補48条件：Chromium/WebKit、4幅、昼夜、1/6/28体|
|配信ソース|`11817e1abd0092be1d4d00aaba87621fb3fd0e3e`。保存候補を復元し、変更せず使用|
|Site保存バージョン|11（ゲームのversion 8とは別の管理番号）|
|デプロイ|`appgdep_6ae4145f74e081918e467185d5237304`、succeeded|
|公開後アクセス|owner本人1人、グループ0、外部閲覧者0。匿名ブラウザーはサインイン要求|
|公開ファイル照合|4,272/4,272ファイル一致（マニフェスト本体1件＋記載4,271件）。SHA256・サイズ一致、不一致0、gzipバイナリJS0|
|配信容量|ファイル合計255,829,758 bytes。展開後アーカイブ259,112,960 bytes＝247.109375 MiB、上限まで8.890625 MiB|
|保存アーカイブ|4,273ファイル（hosting設定を含む）、SHA256 `e464c9654701ab785fe346e3a677a585bb5184e077b2371fd25624720910a4c3`|

前回はv8未配信で404でしたが、今回の明示的な公開承認に基づき切り替えています。配信された `release-v8.json` と `release-v8-delivery.json` のGitHub HEADを確認しています。前回のローカルnpm実行終了結果は環境整理でログがなく未確認ですが、CI成果物による上記3,690件の成功は確認済みです。

### 配信・セーブ・実機QAの区別

認証付きHTTPでv8の比較・通常試遊とも200を確認し、HTMLのSHA256が候補と一致しました。サインインHTMLではありません。v7の比較・通常試遊も200で取得できています。

- v8比較HTML SHA256: `19bb679afd27c3a3836bdab15ea39977ffda340eb50e77e968655afd4d498f0b`
- v8通常試遊HTML SHA256: `b7fff7d70f53b398184d30a921feb2f30395d4a0cd3da17a36d5b099ae9d730a`

全配信ファイルの合計はマニフェスト込み255,829,758 bytesで、復元した保存候補と一致しています。

通常試遊の保存キーは `naotocchi-home-v8-play-v1` とそのbackup/snaps/writer、会話は `naotocchi-home-v8-play:` 接頭辞です。比較QA/sheet/playの保存区分もビルダーで分離され、配信コードは保存候補と同一です。CIでは保存復帰を検証しています。本番セーブや本人の既存データを読み書きしていません。

**認証後の実ブラウザー操作は未確認です。** クラウドブラウザーはChatGPTサインイン画面で止まっています。認証付きHTTPによる取得・ハッシュ一致と、実ブラウザーでの表示/操作成功は区別します。本人のiPhone Safariで次を確認してください。

1. 海A/B/B2、旧/新星空、旧/新湖の比較と背景読み込み。
2. 通常試遊の卵・育成・会話/Reaction、タップ選択・地面移動・ドラッグ。
3. 28体、縦横回転、通知42px/会話76px、文字欠け、描画負荷、reduced-motion。
4. 再読込後の保存復帰と、v7/現行v22/本番との保存分離。

認証情報は承認済みの同一Sites originへの必要なHTTPヘッダーと非表示stdinのみで使用。認証情報のファイル・GitHub・PR・ログ・画像への記録や、別サービスへの送信はしていません。

### v7の復旧手段と保護対象

正常v7の保存バージョン7は削除していません。

- 保存ID: `appgprj_6ae1a850a91c8191a9053a4b9662b620~appgver_ad7e4ac0287881918561b081a1e97ad9`
- ソース: `fc71158c690b0056ec02dcbf82f3c8141f268d30`
- 復旧用アーカイブ: 267,888,640 bytes / 4,245ファイル、SHA256 `544ce4e1b2efcc1aff8832307287172226a0f533a6fb847b4dd6c972d5539347`

PR #426、現行v22、main、本番GitHub Pages、本番セーブは変更していません。背景原画・比較候補・正式画像・既存WIPを削除せず、ゲームルールや台詞・頻度・育成/加入/恋愛条件を変更していません。新背景や52枚の時間帯別制作は開始していません。

### 修正の原因・保護・再検証

- 容量超過：カード画像約131.2 MiB、正式キャラ約37 MiB、JS約21.4 MiB、旧背景WebP8枚約18.1 MiBが主要部分。重複168,351 bytesだけでは解決できず、旧背景8枚を保存PNGから品質94以上/1024×1536で配信用に生成。最小PSNR35.2893 dB。正式キャラ/カード3,773件は正常v7と同一。原画・QA資料はGitHubに保持。
- 配信除外：開発資料 `prototypes/card-game/UI-IMPLEMENTATION.md`、`assets/home-art-recovered-20261029/README.md` の2件のみ。旧比較・全13地域・海A/B/B2・新旧星空/湖は保持。
- JS不一致：gzipバイナリを.js名で格納してHTTPで二重圧縮していた。現在は平文JSを維持しgzipシグネチャを拒否、構文と実配信ハッシュを検査。復元候補の256 JS/MJS構文検査に成功。
- 地面タップ：テスト座標が主役のヒット領域内だった。全キャラを避けて合法な地面を探索し、実ポインターと5px超移動の判定は維持。
- readiness：実レンダラー `webgl` を誤判定していたテスト前提を修正。画像ロード必須条件は維持。
- 星空回転：大型キャラと結婚リング/ハートの足元帯を確保するv8限定380pxの最低高さ。歩行領域や衝突条件を緩めていない。
- 旧星空430px/28体：6つのQA移動候補だけでは合法な斜め経路を見落とした。QAのみ4pxグリッド探索を追加。昼夜の捕捉fixtureは修正前失敗・修正後成功。最終ブラウザー成果物48条件すべて移動・保存復帰成功。
- 元のCIは36成功/7失敗、中間は41成功/1失敗/1checkout時間切れ。最終HEADでは43件すべて成功。通常試遊JSは最後のQA修正前後で同一。

[容量・原因の記録](https://github.com/Naoto214/naotocchi/blob/5376d2e6ca29652cd8ae30ada37ec2e91aff43f9/docs/qa/home-v8/stabilization-20261029/STATUS.md) / [追加修正・再現条件](https://github.com/Naoto214/naotocchi/blob/5376d2e6ca29652cd8ae30ada37ec2e91aff43f9/docs/qa/home-v8/stabilization-20261029/FOLLOWUP-20261030.md)。これらは当時のチェックポイントであり、公開状態は本PR本文が最新です。

残るのは認証後の実ブラウザー操作および本人iPhone Safari実機QAです。本人の確認前にmainマージ・本番公開・既存ホームの正式置換は行いません。


