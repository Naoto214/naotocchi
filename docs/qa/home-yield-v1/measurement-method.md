# 測定手順と判定

この調査は本編を操作せず、凍結したV5と今回のモデルを入れた比較用ページをPlaywright Chromiumで操作する。初期配置・画面・カメラ・キャラクター・装備・つかみ位置・ドラッグ終点は、PR #559の `count-{人数}.json.gz` を復元する。対象は390×844 CSS px、とかい・夜、ヤドカリ段階5と紙の装備、恋人ゴリラの構成。

## 再現

比較ページの生成手順は [`tools/home-yield-v1/README.md`](../../../tools/home-yield-v1/README.md) を参照する。測定中の生成物を上書きしない。

```sh
REACH_DIST=/tmp/yield-comparison REACH_OUT=/tmp/yield-evidence YIELD_ONLY=manual node tools/home-yield-v1/measure.cjs
REACH_DIST=/tmp/yield-comparison REACH_OUT=/tmp/yield-evidence YIELD_VARIANTS=a YIELD_ONLY=autonomy YIELD_SECONDS=300 YIELD_AUTONOMY_DT=0.016666666666666666 YIELD_CONTROLLED=1 YIELD_FREEZE_CSS=1 node tools/home-yield-v1/measure.cjs
REACH_DIST=/tmp/yield-comparison REACH_OUT=/tmp/yield-evidence YIELD_VARIANTS=b,c YIELD_ONLY=autonomy YIELD_SECONDS=300 YIELD_AUTONOMY_DT=0.016666666666666666 YIELD_CONTROLLED=1 YIELD_FREEZE_CSS=1 YIELD_SEED_REFERENCE=/tmp/yield-evidence node tools/home-yield-v1/measure.cjs
REACH_DIST=/tmp/yield-comparison REACH_OUT=/tmp/yield-evidence YIELD_ONLY=live YIELD_COUNTS=4,28 node tools/home-yield-v1/measure.cjs
YIELD_REQUIRE_COMPLETE=1 node tools/home-yield-v1/report.cjs /tmp/yield-evidence /tmp/yield-report
```

`YIELD_COUNTS=28`、`YIELD_VARIANTS=b,c`、`YIELD_RECORDS=0,1,2,3` で絞り込める。Aを再利用する場合は、保存した `manual-N.json.gz` を別ディレクトリで展開し、そのディレクトリを `YIELD_REFERENCE` に指定する。再利用できるのはAと同じ開始配置・ポインター入力・カメラを使う場合だけ。生データには生成物のソースhashとA/B/Cの実モデルhashを保存する。

## 手動操作

毎回、同じ個体状態へ復元して退避状態・クールダウンをリセットする。画面内の足元をマウスでつかみ、保存された目的座標まで4イベントでドラッグし、離す。その後30秒分を進める。通常の自律移動を停止し、操作対象と道譲りに伴う移動のみ許す。したがって連続プレイより道譲りが発動しやすい条件である。

通常ステップは0.05秒、協調計画中は1/60秒。計画はフレーム単位に分割されるため、計画中まで粗いステップにすると3秒の探索上限へ先に達してしまう。この影響を避け、総観測時間は30秒に固定した。

- 進行成功：要求方向へ0.5 CSS pxを超えて進む。
- 安全目的地到達：同じ入力をAの単独配置で実行した足元位置から2 CSS px以内。B/Cが選んだ近い代替目的地は基準にしない。開始時から2px以内の入力は到達率の分母から除外する。
- ポインター終点到達：入力の終点から2px以内。終点には画面外・保護領域を含むため、安全目的地到達と分ける。
- 既存到達位置の後退：要求方向の最終足元がAより0.8 CSS pxを超えて後退する。
- 退避完了：退避側が退避先へ歩いたこと。操作対象の到達成功とは区別する。
- 通過進行：モデルが証明した通過点へ着き、元の目的地との距離を7.5 CSS px以上縮めたこと。最終目的地へ着いたこととは区別する。

各ステップで既存の接触楕円式・個体別描画境界・背景地面の安全判定を用いて、接触の新規発生／悪化、描画境界逸脱、地面外移動を検査する。元から接触距離が1未満の配置は、さらに悪化しないことを確認する。連続時間の全接触を数学的に証明する検証ではない。

## 自律移動と補足操作

最終測定は人数ごとにA/B/Cを同seed521・同じ初期配置から300秒進め、全方式のモデルステップを1/60秒に揃える。準備中の自律移動を明示的に停止し、背景／カメラの準備完了を待ち、乱数呼出回数・状態とモデル時刻を開始時に保存する。モデルの歩行・座る・観察などの行動は通常どおり実行する。CSSアニメーションと遷移のみ、数値比較環境では停止する。ブラウザの実時計による描画位相差を比較条件から除くための制御であり、過去の不一致原因がCSSだったと断定するものではない。本人限定試遊版のアニメーションは変更しない。

20体Cの最初の測定だけは準備中の乱数呼出数がA/Bと異なったため、不採用にした。最終20体CはQA応答内の生成器をAの保存済み状態へ戻してから再測定し、開始条件が一致することを検証した。元の値とリセット後の値を生データに保存する。再実行でもB/Cへ `YIELD_SEED_REFERENCE` を指定すると同じ制御を使える。このフックは比較用応答だけに挿入し、本編モデルへ追加しない。

歩行距離と停止時間は足元座標から測る。停止には休息・観察・同時移動数制限も含むため、停止時間をすべて接触失敗とは扱わない。道譲り後の乱数消費や行動履歴は分岐し得る。

途中の600秒測定では通常0.1秒／計画中1/60秒の可変刻みを使った。10秒区間の端数補正による微小な浮動小数点差だけでも時刻比較・乱数消費に影響し得るほか、同じ配置・時刻で道譲りのないA/Bも異なる軌跡を示した。旧600秒の不一致原因は再調査でも確定していない。原因を道譲り効果と誤認しないため、途中結果は `provisional-autonomy-600s.json.gz` に分離し、最終効果判定には使わない。`baseline-autonomy-*-a.json.gz` も途中保存した旧測定である。最終比較は同条件の300秒を使う `autonomy-*.json.gz` で行う。

発動イベントを各10秒区間で回収する。同一ペアの24秒未満の再発動、同一退避者の30秒以内の逆向き退避、同時退避人数を検査する。複数キャラクターの接触・境界も各ステップで確認する。

補足の `live-manual` は通常の自律移動を止めず、毎入力で新しい同seedページを開き、8秒後を比較する。通常歩行の位置変化も含むので、凍結配置の252方向の成功率に合算しない。

## 処理時間

偽時計では `performance.now()` が同期処理中に進まないため、Chromiumネイティブの `console.time/timeEnd` で `model.step` を囲む。ログはハーネス側で回収する。初回の `model.move` は別計測。計画エピソードの時間は次ステップから終了までを観測し、同期処理時間は対象ステップの計測値の和とする。

デスクトップ上の2〜4並列ジョブ、計測負荷、既存V5経路探索の負荷を含む。iPhoneのFPSや実機Safariの待ち時間は推定できない。95%点が小さくても、最大値が大きい場合の操作停止を無視しない。

## 保存した試作

- `strict-prototype-manual.json.gz`：単独目的地まで完全開通することを要求した初期案。全252方向を保持する。
- `unbounded-partial-manual-28.json.gz`：制限なし探索の部分到達案。長い同期処理が確認されたため85/112方向で停止した不採用案。
- `rejected-planner-performance.json`：その停止判断の処理時間。
- `baseline-timing-manual-28.json.gz`：Aの同じ先頭16入力の追加処理時間測定。
- `baseline-autonomy-*-a.json.gz`：変更のないAの600秒結果。

計測初期の比較生成物では時間帯背景用の資産ディレクトリが欠けていた。シーンの地域・時間帯と全幾何ファイルは正しかったが、描画は代替背景を使っていた可能性がある。最終比較版は52背景を揃えた。資産修正前後のモデル・地面・ナビゲーションhash一致と、修正後の同じポインター入力の足元・カメラ一致を別途検証し、数値測定への影響と見た目の検証を分離する。

最終候補の生データと集計は `manual-*.json.gz`、`autonomy-*.json.gz`、`live-manual-*.json.gz`、`measurements.md`、`summary.json` に分ける。未完了の途中経過を最終結果として数えない。

## 最終コードとの対応

複数体の測定はソースhash `bb1ba1395f680d2b8ce35288b448e24135b2b60b1632b2379f04ff5e5e396f53` の候補で行った。その後、1体なのに道譲りを計画する無駄を省く `actors.length<2` の早期returnだけを加え、最終hashは `9481baaade3f91ba7dfd327276f970d251fd8e8c74d441d505983f2bee3aa6b9` となった。1体のB/C手動4方向ずつとCの300秒自律移動を最終版で再実行し、道譲り要求／計画0、既存到達点と通常の自律結果が一致することを確認した。複数体は追加条件が偽になる同じ処理であるが、最終hashで全条件を再測定したとは記載しない。各生データに実際のhashを残す。
