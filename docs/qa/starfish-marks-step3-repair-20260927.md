# 手順3補修：ヒトデ02・03の左汗／銀マーク

人間確認により01の全10表情・配置、02/03の身体・顔・表情は採用。今回は02/03の左汗と「いやだ」銀マークだけを補修した。表情の再生成0、PNG変更0。最終の位置比較は人間確認待ち。

開始 remote HEAD `40f921123d0a5de523e1b2aefcbd36b3cb58f201`、tree `8828e93920b6bea04193d827ecf64f6c080b6b85`。実main `d686838199e754d1e2883d867e292acd726a2f73`。PR #278 Draft / open / 未マージをfresh確認、ローカル開始ツリー一致・未保存変更0。main取り込み0。

## 最小補正

目的は頭上への統一でなく、**64pxで身体と状態マークの間に明確な余白を作り、身体の付属物に見せないこと**。既存 `MARK_PLACEMENT` 内の2段階×2項目のみ更新。追加のif／stage override構造／API／CSSは不要。既存配置生成ツールは保存済みsweat・marksを保持する構造のまま。

|対象|旧設定→新設定（104px座標系）|移動方向|64pxでの移動|80pxでの移動|104pxでの移動|
|---|---|---|---|---|---|
|02 左汗|leftInner 36.375→20.375|左のみ|左9.85px|左12.31px|左16px|
|02 銀|[-3.5,18.5]→[-16.5,32]|左＋下|左8px・下8.31px|左10px・下10.38px|左13px・下13.5px|
|03 左汗|leftInner 38.5→29.5|左のみ|左5.54px|左6.92px|左9px|
|03 銀|[-1,14.5]→[-15,28]|左＋下|左8.62px・下8.31px|左10.77px・下10.38px|左14px・下13.5px|

汗の右側・top・travel・サイズ・色・回転・アニメーションは不変。銀の大きさ・形・色は不変。

左汗は各段階の全10表情を重ねた輪郭に対し、回転18度と全移動距離を覆う矩形包絡を使って横方向に0.5設計単位ずつ比較。64/80/104pxすべてで約2pxの輪郭余白を満たす最初の横移動量を選んだ。02と03の必要量は異なる。

銀を真左へ動かすだけでは、補正後の左汗と重なる。身体から離すと同時に汗の全移動包絡からも離れる位置を比較し、下方向を加えた。単に上へ逃がすより小さい移動で、顔の左上〜左側に属する位置を維持できる。02はほぼ同じ移動距離の候補中、横移動が主となり上下変化が少ない案を選択。03は残存幼生部分の輪郭と汗の両方を避ける案を独立に選んだ。数学的な全方向・連続座標の絶対最適を主張するものではなく、限定探索と実サイズ目視による最小限の補正。

## 比較・目視

- [02/03 修正前→修正後（64/80/104px）](starfish-marks-step3-repair-20260927.svg)
- [01 最終10表情・非変更の比較基準](starfish-expressions-step3-20260927-01.svg)
- [02 最終10表情＋病気併存10表情](starfish-expressions-step3-20260927-02.svg)
- [03 最終10表情＋病気併存10表情](starfish-expressions-step3-20260927-03.svg)

比較は同一PNG・同一マーク・同一サイズ・背景・汗位相で位置だけを変更。前半に通常状態、後半に全10状態＋左右汗。01資料はバイト単位でそのまま使用。

64px：左汗と身体の間に余白を視認。銀も突起・青い部位の延長に見えにくくなり、汗と銀の分離を確認。80/104pxでもキャラクターとの関連を保った距離。03は星型側の顔1つ、青い残存部は同じ身体の一部として保持。PNG非変更のため身体の分割・第二の顔の追加はない。

02/03各10表情の病気併存を確認。左汗が身体へ再接触せず、銀＋汗も分離。右汗と既存の疲労等のマークの接触関係は元のまま、今回は変更していない。食事マーク・その他9状態の位置も不変。

資料は静的合成で汗形状は近似。実ブラウザー撮影ではなく、CSSのぼかし影や端末固有の補間を完全再現した証明ではない。機械検査では汗の回転・全移動包絡を含めた。実HomeのHUD/overflow最終確認は既存残件として維持する。

## fresh検証

- 追加回帰2件：修正前は02/03とも64pxで身体と左汗の余白不足を検出してFAIL。修正後2 PASS。
- 回帰検査は全10PNGの輪郭と実runtime銀SVGを4倍解像度で比較。3サイズで左汗全移動包絡と身体1.75px以上、銀と身体1.75px以上、銀と左汗1.25px以上を要求。影を除く輪郭の保守的検査。
- 既存配置検査を01〜03に限定：30マーク／18汗包絡、交差検出0、終了0。対象外の再配置なし。
- 248段階の公開APIを開始時と比較：差分は02/03のstrained出力2件と左汗2段階のみ。右汗・top・travel、他状態、画像参照、248食事意味は不変。
- 配置表以外のpet-expression.jsコードはバイト一致。ゲーム数値・セーブ・resolver選択ロジック・CSS・z-order非変更。
- 全追跡character資産と食事SVGのSHA-256を開始時と比較し一致。30表情の存在・寸法128×128・alpha0/255・30unique hash・期待キーは関連資産テストで再確認。
- 01の10PNG、02/03の20PNG（身体・顔・色含む）、04〜08の50PNG、他系統PNG、通常基準248枚、15食事SVG変更0。通常名も変更0。01 contact sheet非変更。

関連5ファイル（表情資産・表情resolver・表情統合・空腹profile・cast layout）は1,138 PASS / 0 FAIL。`git diff --check` PASS。全体テスト結果は完了後に追記。既知名称4 FAIL、quick-mode原因未特定は維持し、無関係な修正はしない。

## 停止・残件

指定4位置の補修・比較資料を保存したら人間確認で停止。ヒトデ08小泡、犬03左前脚、ウスバカゲロウ07の5表情／08の10表情、名称同期4 FAIL、quick-mode原因調査、最終確認Site・セーブ互換・最終GREEN、なおとは未実施のまま。PR Ready化・mainマージなし。

### 全体テスト結果

`npm test` fresh実行：1,850件、**1,846 PASS / 4 FAIL**、終了1、461.9秒。開始時の手順3ログと失敗名・actual/expected/operatorが同一、新規FAIL0。

既知4件はいずれも `tests/cat-expression-preview-test.cjs`：

1. starfish preview uses all eight canonical stage names
2. sakura preview uses all eight canonical stage names
3. world_tree preview uses all eight canonical stage names
4. unknown preview uses canonical punctuation and suppresses disposable rare achievement flashes

quick-modeの `quick mode chains 3-6 second games: cue, immediate play, judge, next game within the result flash` は全体実行内PASS。初回FAILの原因は未特定のまま。解消済み・既知flaky・全体GREENとは扱わない。

保存差分はpet-expression.jsの2レコード、回帰テスト、02/03一覧更新、補修比較SVG・本QA・handoffの7ファイル。PNG変更0。保存後のremote HEAD/tree/実main/PR/CIはfresh取得し最終報告に記載する。
