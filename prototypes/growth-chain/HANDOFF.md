# 引き継ぎ — 2026-10-12

## 作業対象と承認

- Repository: Naoto214/naotocchi
- Branch: feat/growth-chain-prototype-20261012
- Draft PR: https://github.com/Naoto214/naotocchi/pull/380
- 承認済み起点: 59ef60ec3cd398dacf157407245f4d234772e517
- 実装保存HEAD: 69944a0b1695365043cc4ac4a3d246584deba31e。その子コミットに本引き継ぎと測定証拠を保存。
- mainへのマージ・本番公開は禁止。PRをDraftのまま維持する。
- ユーザーは設計および連続したTDD実装・自動検証・比較測定・安全なcommit/pushを承認済み。再承認は不要。Human QAの判断のみ確認する。

設計: docs/superpowers/specs/2026-10-12-growth-chain-prototype-design.md
計画: docs/superpowers/plans/2026-10-12-growth-chain-prototype.md
変更範囲は上記文書と prototypes/growth-chain/。既存れんさパズル、ミニゲーム、カードゲーム、World、Character 3D、save/schemaを保護する。

## 実装済み

- 純粋・不変の共通エンジン、seed付きバッグ、セッション、リプレイ、到達可能な配置探索。
- 同時判定→進化/08消滅→重力→再判定。2〜5体、6体以上、競合、卵、単体/全体へんしん。
- 配置/へんしん/全体へんしんのアンカー、全消費/5体消費、成分/互いに重ならない候補、ペア優先、08種類条件、卵境界・個数、ゲージ、得点、終了条件を設定化。正式ルール未選定。
- 試遊UI、キー/タッチ操作、NEXT3、資源、盤面編集、プレビュー、波ごとの表示、ログ入出力、自然成立3/5連鎖ボタン。検証設定は独立UI内だけに存在。
- オフラインHTML、ランダム/戦略的1手読み/上位2候補の2手読み、比較ジョブ48条件。
- コードレビューで指摘された終了判定、設定欠落import、長い合法移動履歴、偽のactive状態importをRED→GREENで修正。

## 自動検証

- プロトタイプNodeテスト45/45 PASS。DOMおよびstandalone DOMテストPASS。
- 全48条件・3,840試行・95再現ログ・554,528操作の独立リプレイ照合PASS。
- 既存 minigame-lifecycle / quick-mode の選択回帰テスト47/47 PASS。
- ルートnpm testはsparse checkoutで画像assets/characters/author/naoto.pngが欠けるため途中停止。全体回帰PASSとは扱わない。
- 実ブラウザはChromium起動時のsocket EPERMで未実施。画面の見た目、スマホ/Safari、操作感・テンポは未確認。DOM合格で代用したと主張しない。

## 測定条件と結果

通常落下500組で打切り。初期資源0。主要比較は各200seed、追加比較・beam2は各40seed。
4/5/6種類の主比較バッグは各種類4体を維持した16/20/24体。固定20体方式も別比較。
同seedでも種類数が違えば同じ出現列ではない。同種類数のルール比較ではバッグ列を共有。
戦略方策は公開情報を使う限定的な探索で、最適方策や人間の実力を表さない。

通常落下のみ・戦略方策、各200試行:

|盤面|種類|平均落下組数|通常落下の2連鎖以上率|最大連鎖|
|---|---:|---:|---:|---:|
|6×12|4|114.06|35.54%|6|
|6×12|5|93.705|30.10%|6|
|6×12|6|81.47|25.13%|5|
|7×12|4|140.66|37.66%|7|
|7×12|5|115.83|32.41%|5|
|7×12|6|100.78|27.74%|5|

これらは全て08到達0%、500組以内ゲームオーバー100%。beam2追加比較でも08到達0%。n=200の0件のWilson95%上限は約1.88%であり、不可能という意味ではない。
通常落下だけの合法履歴で3連鎖(seed0、13組目)、5連鎖(seed11、52組目)を確保。natural-fixtures.mjsと結果内の盤面JSONを参照。人工的なfixtures.mjsとは区別する。

5種類6×12・各40seedの資源比較:

|条件|平均組数|08到達|500組以内終了|最大連鎖|資源使用|
|---|---:|---:|---:|---:|---|
|アイテムなし|93.78|0/40|40/40|—|なし|
|共通ゲージ16・通常方策|182.575|0/40|40/40|6|単体1401、大0|
|共通ゲージ8・通常方策|414.375|25/40|33/40|6|単体7375、大1、卵1|
|大のみ・ゲージ16（探索的）|223.875|15/40|40/40|12|大575|
|大のみ・変更位置アンカー（探索的）|256.975|22/40|40/40|9|大683|

平均組数には500組で打切った試行も含む。ゲージ8は単体へんしん約2.25組に1回で、通常操作への介入が多い。
最大12連鎖の合法履歴も保存（bulk-only-16、seed21、maximum-chain-witness.json）。
通常方策は単体へんしんにゲージを使うため、大へんしんをほぼ試せていない。大のみの補助方策で違いを確認したが、公平な最適戦略比較の結論ではない。
通常配置の変更位置アンカーは比較40seedで平均201.425組、通常落下2連鎖以上28.05%、最大5。底アンカーの182.575組、26.47%、最大6と優劣が一方向ではない。
卵供給は極少。ゲージ16通常方策では0、ゲージ8でも普通卵1個。卵あり/なしがほぼ同じでも、卵が無価値という結論にはできない。
31件の人工プローブで卵境界1/2/3/4と1/3/5/7、08の6体消滅で1個/3個、6/10/12体の消費範囲、同時全体変身などを確認。これらを自然出現率に混ぜない。
操作数指標は最短合法移動経路の下限代理値。人間の理解負担や所要時間を実測した値ではない。

## 暫定推奨と残作業

1. 6×12・5種類を比較基準として維持し、易しい条件4種類/7列も試遊対象に残す。正式選定はしない。
2. 全成分消費・同時一括判定は説明が単純な候補。5体消費/競合方式、底/変更位置アンカーを残し、予測しやすさと大連鎖をHuman QAで比較する。
3. 08/卵までの到達が課題。ゲージ16と8の間の供給や、単体/大を使い分ける方策を次の仮説とする。ゲージ8の頻繁な介入を無条件に採用しない。
4. 卵境界・獲得個数は自然供給不足で優劣未判定。人工条件の収支試遊と追加測定が必要。未決定ルールを正本化しない。
5. 実ブラウザでPC/スマホの見た目、回転・移動、テンポ、連鎖表示、資源操作を確認する。Human QAで爽快感と長期戦略性を判断する。
6. assetsを含む環境でルート全体回帰を実行する。失敗した場合は既存不具合と今回の影響を切り分ける。

再測定前にREADME記載の証拠アーカイブを展開し、既存ログを活用する。実装・測定を最初からやり直す必要はない。
ローカルgit pushはHTTPS認証不足で失敗したため、接続済みGitHub Git Data APIでexpected_sha付き非force更新を使用した。再開時はリモートHEADとDraft状態を確認し、並行変更を上書きしない。

## 2026-10-13 継続QA追記

実装HEAD 323e94b8から継続し、実装・測定は再作成していない。詳細は `QA-20261013.md`。
完全checkoutでルートnpm testを完走: smoke/dialogue/visual QA成功、主要3,130/3,130＋Relationship80/80 PASS、exit 0。画像欠落の制約は解消済み。専用45/45も再確認。
実Chromium起動は同じsocket EPERMで停止したため、PC/スマホ実ブラウザとHuman QAは引き続き未確認。次はstandaloneで試遊。未決定ルール・Draft・保護境界は維持。

## 2026-10-13 スマホ試遊UIの実装追記

最新の実装・制約は `MOBILE-QA-20261013.md`。上記のブラウザ起動不可は旧環境の記録。
今回の起点は remote/local 5d8d554c、実装保存は abd87644。共通engine/sessionと測定正本は変更せず再利用した。
ユーザー承認の試遊基準（最下段左・全成分一括・6体以上全消費/+4）を維持し、比較設定を削除していない。正式ルールの確定ではない。
道具は着地/連鎖後から次の2体を動かす前だけ。毎ターン待機し、自動落下ONでも道具時間を飛ばさない。移動中の道具案は承認後の指示に従って採用していない。
道具ボタン/結果プレビュー/長押し/段階別演出/検証モードを実装。standaloneも再生成。
専用50/50、DOM3本、mutation6/6、Chromium 134の4画面サイズPASS。レビューの3指摘は回帰テストと修正後の再レビューで解消。
iPhone実機SafariとHuman QAは未確認。実機での対象セル選択・スクロール・テンポと、根本ルールの正式判断が残る。
今回の全体回帰結果と実行証拠は MOBILE-QA-20261013.md / qa-mobile-20261013/ を参照。
本番統合・公開・mainマージは禁止。Draft PR380を維持し、再開時に必ずremote HEAD/treeを確認する。
改修後のassets込みルートnpm testも完走: exit0、smoke/dialogue/visual QA、3,130/3,130＋80/80 PASS（fail/skip 0）。

## 2026-10-13 最終仕様統合の欠落監査

ユーザーが後続の「独立ゲーム完成・最終仕様統合」を指定。上記e32ebb5eの完了は旧仕様の範囲であり、新仕様の完了ではない。
7項目の現物監査は FINAL-SPEC-AUDIT-20261013.md。新仕様の系統解放/2D画像/落下中道具/縦の道具右/8対12比較は未実装。新仕様受入テストは未実施。
旧専用50を再実行してPASSしたが、新仕様の検証証拠には使用しない。元依頼全文を未回収のため、仕様情報の取得が必要。実装許可の再承認を求めるものではない。


## 2026-10-14 final integration checkpoint
Full user specification received; FINAL-SPEC-20261014.md supersedes earlier provisional intermission. Standard preset added without changing legacy configuration defaults. Canonical read-only roster, stable replay species IDs, selected20 bag, live tool transactions, character images and portrait rail implemented. Review found/fixed pre-merge egg collision and unlock-order/recreation mapping regressions. New acceptance and DOM tests exist; full regression is running at checkpoint (do not claim final PASS until QA report). PR must remain Draft/open/unmerged.

### Final verification completed
See FINAL-QA-20261014.md for the complete coverage/operations/balance/Human QA report. Dedicated77, DOM5, mutation12/12, Chromium4viewports, root3130+80 all freshly PASS. New200trials/36005actions replay PASS; legacy3840trials/554528actions replay PASS. iPhone hardware Safari remains unverified. Gauge8/24 is recommended for Human QA, not finalized. Natural egg supply was zero in all200trials; artificial16probes are separate. Source checkpointf2804c80 plus final evidence/follow-up commit. All changes confined to this prototype. No merge/deploy.


## 2026-10-14 最終バランス検証

[BALANCE-REPORT-20261014.md](BALANCE-REPORT-20261014.md)を参照。576試行、自然卵獲得は初期0でも成立。ただし自然な卵由来の再獲得循環は未確認。8／24推奨はユーザー決定待ち。確定ルール・本番挙動は変更なし。旧0/200と今回の探索的結果を混同しない。


## なおぽよ進化卵・08レース検証結果
最新正本/手順はEGG-REVISION-20261014.md、結果はEGG-REPORT-20261014.md。進化04〜07の卵報酬を標準化。主192＋上限感度64試行、59,683操作一致。旧776試行も再生一致。卵由来の再獲得/08寿命を確認。ただし方策順位は道具操作機会の設定に敏感。対戦は独立検証のみ、標準UIはエンドレス維持。iPhone実機未確認。

最終ゲート: 専用100、DOM6、mutation12＋3＋7、全体回帰3,130＋80、Chromium4サイズPASS。256試行59,683操作を独立再検算。iPhone実機Safariは未確認。詳細はEGG-REPORT-20261014.md。

## 2026-10-14 停止後の08消滅最適化復旧

最新成果はOPTIMIZATION-REPORT-20261014.md、RECOVERY-20261014.md、optimization-evidence-index-20261014.jsonを参照。
9047ec55に保存されていた実装・固定条件を再利用し、失われたv2測定証跡を復元。488試行170,590操作の共通replay/live合法性/指標検算PASS（同一legacy8試行の重複を明示し独立証拠に加算しない）。
確認群32seed: 現行8/24は1成功、12/36は1成功、標準盤面・種類の2/6は25成功。4種類+4/12は10成功、7列+2/6は16成功。2/6をHuman QA第一候補とするが、標準8/24は変更していない。人間の達成率・所要時間・爽快感は未確認。
専用108、DOM6、mutation12+3+7+6、全体3130+Relationship80 PASS、失敗/skip0。製品ソースは9047ec55から無変更。PR380 Draft/open/未merge、main統合・公開なし。
次回はrawアーカイブを展開して完了結果を利用し、同じ測定を最初から繰り返さない。全体ログはqa-recovery-20261014/root.log.gz。停止原因は不明。今回の確認群分割のための明示的中断とは区別。
