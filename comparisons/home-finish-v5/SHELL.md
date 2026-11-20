# 本人限定ホームの試遊と再構築

`/v5/` は、`/game/finish.html` のゲームを1つだけ開く。住民数と地域を変更すると、新しい世帯のセーブをメモリ内に作り、前のゲームを破棄する。時間帯、再生・停止、足元の切り替えは同じゲームに適用する。「元の足元」と「新しい足元」は停止中も切り替えられる。住民をタップ・ドラッグする場所はゲーム本体である。

ゲームを直接開く場合も、B案の人数ごとの線形増加と検証済みの初期配置を使用する。保存した試遊URLは `region`、`time`、`count`、`paused=0|1`、`ground=on|off` を引き継ぐ。新しい足元、みずべ、昼、28体、再生が初期値。主人公の元の110%を含む正式ホーム比で、28体・375px以上の最終倍率は主人公・恋人138%、仲間120.75%。画面サイズ・地域・世帯に対応するV4の初期配置がある場合にその配置を使い、それ以外は同じ地形の元の配置から開始する。

## 再現手順

#570 の `e07d2cc53eca36ff23e02142ab385d6001e0521b` で作成したV4配布物を `V4_DIST` に用意する。下記はこのディレクトリから実行する。

```sh
node build.cjs "$FINISH_DIST" --baseline "$V4_DIST"
node --test shell.test.mjs
node verify_policy.cjs "$FINISH_DIST"
python -B regression_protect.py "$V4_DIST" "$FINISH_DIST" --out /tmp/finish-package.json
python -m http.server 8305 --bind 127.0.0.1 --directory "$FINISH_DIST"
```

別のシェルで以下を実行する。システムのChromiumを使う場合、`--chromium /path/to/chromium` で指定できる。Python版Playwrightと対応するブラウザーが必要。

```sh
python -B verify_shell.py http://127.0.0.1:8305 --engine chromium
python -B verify_shell.py http://127.0.0.1:8305 --engine webkit
```

ビルドは3,920ファイルの相対パスと内容のSHA-256からV4の指紋 `f9b927c65ea9f683dead97b906d569c2216f7334bad7e70e1ee915635c56f90a` を確認する。V4のファイルをコピーし、V5のHTML、制御、地面表現、ネイティブの描画・ナビゲーションを別名で追加する。ゲームのコントローラーとワールドには、mainの候補から変更した部分を移植し、逆変換した値がmain基準の元のSHA-256に戻ることを確認する。V4のカメラ収束、E3+の描画、落ち葉B、配置のコードはこの経路を引き継ぐ。元の生産コードが別ディレクトリにある場合は `--source-root NATIVE_SOURCE_DIR` で指定する。ビルドにはGit履歴もネットワークも使わない。

## ブラウザーでの確認

Linux Chromium 156とWebKit 26.5で、375×812 CSS pxの画面からホームを操作した。ゲーム内は375×760px。停止したおうち28体の足元表現、昼→夜を切り替えた3場面で、全住民の足座標の指紋は一致した。その後19体・もりに変更し、再生に戻した。実際のタッチと設定パネルを使った全7場面で、地形と全員の影の描画を確認した。試遊中にブラウザーの外側へ置いた確認用の値を保ち、ゲーム内の一時セーブは外側のストレージに現れなかった。ゲームを直接開き、別の倍率を指定した場合もB案の人数ごとの線形増加が適用された。[Chromiumでの記録](evidence/shell-chromium.json) ／ [WebKitでの記録](evidence/shell-webkit.json)

`nativeFrames` はゲーム本体が15フレームごとに出す任意の値。WebKitで初回の計数前に描画が整った場面は `null` のまま記録し、背景の描画幅、各住民の影、V4から引き継いだカメラ確定通知を確認した。

本体の承認済みソースを入力にし、7件の差分を一時ファイル上で適用する。各モジュールを適用前後のSHA-256で照合する。ビルドには標準の `patch` コマンドを使用する。
