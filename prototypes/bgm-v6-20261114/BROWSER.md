# 比較・試遊版の確認

- Chromium（システム版）とPlaywright WebKit 2336、390×844・タッチ設定で操作確認。
- 全32行、ホーム4曲先頭。V5/V6の全64 AACを両エンジンで取得・復号。
- 17秒へシークし、一時停止中のV5/V6切替で位置維持。再生中の連続切替でも位置と共通GainNode音量を維持。
- 「いつものにわ」34秒ジャンプ、ループ接続、周回後のループ解除で位置維持、別曲への切替を確認。
- ゲーム既存bgm-v2.jsにV6 catalogを読み込ませ、home-day.m4aのV6ハッシュ付きURLを取得・再生。再生コードと保存処理は変更なし。
- WebKit用の不足ライブラリはDebian公式パッケージをSHA-256照合して作業領域へ展開。OSの構成は変更していない。Playwrightの標準ライブラリ検索は追加パスを認識しないため、その事前探索だけを省略して実ブラウザーを起動・検証した。
- 物理iPhone Safariでの音質・長時間バックグラウンド再生は未確認。エンジン検証を実機試聴とは表現しない。

コマンドと実出力は `verification/`。WebKit環境は `PLAYWRIGHT_BROWSERS_PATH` と `LD_LIBRARY_PATH` が必要。Chromium実行パスはこの環境の `/usr/bin/chromium`。

## 公開確認

GitHub Pages run `43549142729` は成功。配信コミット `9020b5f3e6763e4eb980db73c3450894a43f01d2`。

固定URL `https://naoto214.github.io/naotocchi-playtest/bgm-v6/` をTLS検証付きHTTPで取得し、比較ページ3ファイルと比較V5/V6・実ゲームV6の計96音源をSHA-256照合。V5比較ページの参照先とV6 catalogの全32ハッシュも確認。

公開URLをPlaywrightで直接開く追加確認は、この環境のプロキシCAをブラウザーが信頼せず `ERR_CERT_AUTHORITY_INVALID` となった。TLS検証は無効化していない。操作テストは公開物とバイト一致するローカル配信でChromium/WebKitとも成功している。公開サイトの不具合と実行環境の証明書問題は区別する。
