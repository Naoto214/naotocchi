# PR #490 CI追補（2026-10-31）

Draft維持、mainマージ・本番公開なし。[最終QA記録](FINAL-QA-20261031.md)のローカル成功と、その後に判明したCI失敗を区別する。最終HEADのCI結果はPR本文に追記する。

## 住民case6: タイムゾーン依存の解消

更新前`1206ff887`のRuntime/World regression、および`66dddcea`のproduction-contractsは、表情の比較より前の`c.tier === 1`で失敗した。実際はtier0だった。

Node22.23.4をローカルに用意して調査した。`clockNow:1000`はUTC/Japanでは1970-01-01、ホストのAmerica/Chicagoでは1969-12-31となる。`buildRegistry()`は`dailyKey()`の**ローカル日付**から仲間の滞在地域を決めるため、乱数を固定しても対象住民が変わった。UTCではmany_tail_fox/tier0、Chicagoではtanuki/tier1。`TZ=UTC`で修正前の失敗を再現した。Nodeバージョン自体が原因ではない。

fixtureの時計を**正の時刻となるローカル2026-10-02正午**に統一した。この日は対象tanukiが通常のnear/tier1となる。住民を動かしたりtierを直接代入したりせず、tier1の前提確認、6フレーム後の疲労・通常画像assertionを維持する。case13の乱数と最寄り選択修正も維持。UTC、America/Chicago、Asia/Tokyoそれぞれ18/18、失敗0。

レビュー途中で試した1969年の日付は、負のDate.now()によりbusy期限0との比較が変わるため不採用。正の日付で全試験をやり直した。途中の全体回帰は明示的に中断（exit130）し、完成結果に数えない。正の日付のNode22.23.4/UTC全回帰は3,745/3,745成功、失敗0、exit0で完走（32＋24＋3292＋159＋238）。

## 山・28体: 操作準備中の自律移動を分離

`66dddcea`の山job（124484976415）はChromium/390px/28体/dragで候補探索が失敗。直前の12表示条件、6体tap/drag、28体tapは成功していた。345個の地面候補が存在するが、保存snapshotで主役周辺にいるmonkey/chameleon/pandaの間を通る候補経路を得られず、pointerdown前に終了した。これは入力不達のEではない。生ログは入力座標未確定・move未呼出しを示す。

原因はfixtureの順序。対象の住民構成を作った後、`pauseAt(Date.now()+10000)`で時計を進め、再度同じ`scene()`を呼んでいた。既存の同地域・同人数のsyncは住民位置を保持する仕様なので、途中の自律移動を元に戻さない。なお10秒は壁時計の差であり、モデルの歩行時間10秒を意味しない（frameのdtは上限あり）。一時的な経路不足Dを、初期配置の操作試験へ持ち込んでいた。

時計を止めてから対象の地域/人数を初めて構成する順に変更。画像読込を確認し、時計を50msだけ通常進行させて描画後に再び停止した状態で候補を採る。経路・接地・衝突の条件、5px超の移動、入力source、全員の安全接地のassertionは同じ。本番コード・キャラクター座標・歩行可能領域は変更なし。ネイティブ24条件のtap→drag連続操作は従来どおり別試験で維持する。

修正後のおうち・山は各24/24表示、各8/8通常入力＋2/2会話停止（両engine）成功。最終CIはPR本文へ追記する。過去の成功を最終HEADのCI成功へ読み替えない。

## 証拠と残件

[CI追補証拠](ci-followup-20261031/)にCI失敗箇所、山の全snapshot/trace、UTCでの修正前再現、3タイムゾーンの修正後18/18ログを保存。元の`final-20261031/evidence.tar.gz`は前段の原票として保持。

最終CIの全成功確認、本人のiPhone Safari実機QAは未完了。過去19/24の正確な5条件一覧とchicken失敗のblockerは当時の原票不足により未確定。main・本番は引き続き変更しない。

## 都会WebKit: reload時の自動保存を正しく分離

`06e3bd980`では山jobとproduction-contractsは成功した。一方、都会WebKit/390px/28体/tapは候補2件から経路を得られず、入力前に失敗した（job124489244628）。先行するChromiumの全入力・WebKit6体tap/dragは成功していた。

`script.js`のbeforeunloadは正常にsaveState()を呼ぶ。そのためreloadは元のseedへのリセットではなく、直前に準備した地域・人数を復元する。これにより「時計を止めてから初めて対象構成を作る」という試験の前提が一部で成立しなかった。再読込直後のregion/count/partnerがoriginal seedと一致するassertionを追加し、ローカルChromiumでも `city/4companions/partnerあり` と `home/0companions/partnerなし` の差で決定的にredを確認。

各通常入力の開始時だけsessionStorageへ一回限りの印を置き、new documentのinit scriptでQA専用保存キーを元のseedに戻して印を消す。旧ページの自動保存より後、新ページのゲーム起動より前に実行する。QAページとQA保存キーだけが対象。本番の保存処理・保存形式は変更なし。診断recordをreloadより前に作り、復元seedと印の消費を毎回assertする。最終save/resumeの前には印がないことをassertし、実際の保存復元検証を保護する。

修正後の都会・おうちは各24/24表示、8/8通常入力、2/2会話停止（両engine）が成功。8通常入力の全てでoriginal seed（home/仲間0/partnerなし）への復元とリセット印の消費を確認し、最終save/resumeも成功。新HEADのCI結果はPR本文へ記録する。最終CIの全部成功確認前は未完了のまま。
