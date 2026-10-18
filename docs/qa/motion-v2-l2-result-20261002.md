# Motion v2 L2 — 実装・検証結果（2026-10-02 JST）

実装、Node自動検証、実Home QA準備まで完了。人間目視承認待ち。main未マージ。
実ブラウザ自動検証は実行環境の制約で未完了。これをGREENとは扱わない。

## 正本と保存

- 開始時main HEAD: `ebffaad921da29bf2b8b42e1bdccc97c922db280`
- 開始時main tree: `492ea3b8e88e6eea3318fcf13b336fa892469eac`
- PR #370: fresh確認でMERGED。開始時mainは報告HEADから進んでいなかった。
- 関連open L2 PRなし。回復用branchは再利用せず、新しい専用branchを作成。
- 作業branch: `feat/motion-v2-l2-20261002`
- 検証済みコードHEAD: `ae9e37878fa8652da08eaf8d363a6e51c4ea8084`
- 検証済みコードtree: `c8568067397a9d505b056322d7be4a432c3913ce`
- 本結果資料はコード検証後の文書追記。最終branch HEAD/treeは完了メッセージに記載。
- GitHub API保存後、fetchでローカルとremoteのtree一致を確認。

## 動作

| イベント | スコープ | 通常時のL2レシピ |
|---|---|---|
| ごはん | SELF | 準備→むしゃむしゃ→6.5pxの満足反応→soft settle→原点。1000ms |
| じゃれる | 基本SELF | 準備→8pxの嬉しい跳躍→着地→小さな余韻。960ms |
| くすぐったいじゃれる | SELF | 上向き5.5pxを含む短いwiggle→原点。820ms |
| 掃除 | GROUP | 全員が共通の10pxジャンプを1回→柔らかく原点。1100ms |
| 起床 | SELF | 準備→7pxの上向きstretchを保持→柔らかく原点。1400ms |

L2 focused budgetは10px。26体でもambient用1pxへ縮小しない。
ごはんは前方向を仮定しない。食べすぎ／annoyed／疲労・休みたい台詞は喜びへ戻さない。
既存の食後happy余韻・表情の条件判定は維持。大きなL2を会話後半で再発させない。

RELATIONSHIPは既存court／partner_new／marriageの所有契約を継続。
じゃれるの代表positive・lonely救済対象も従来どおり。L3を再設計していない。

掃除は個体差を付けずcastResponseの親レイヤーを一緒に上へ移動する。
個体の配置・サイズ・水平方向は変更しない。上方向のみなので床reserveを追加消費しない。
主役だけに別の大きなmotionを重ねる構造は今回は採らない。

## 検証

すべて実行済みのNodeテスト結果。重複する集合は足し合わせない。

| 検証 | 結果 |
|---|---:|
| 変更前cast-motion＋emotion契約 | 73 PASS / 0 FAIL |
| L2専用 | 13 PASS / 0 FAIL |
| L2＋cast-motion＋emotion integration | 86 PASS / 0 FAIL |
| Home layout/touch/viewport/UI/overlay/QA | 80 PASS / 0 FAIL |
| Relationship expression/integration/reaction | 80 PASS / 0 FAIL |
| asset integrity/version＋expression assets | 264 PASS / 0 FAIL |
| レビュー修正後Home＋Relationship＋asset/cache | 168 PASS / 0 FAIL |
| 最終全npm test | **2,899 PASS / 0 FAIL、skip 0、exit 0** |

全npm testはNode前半2,819＋Relationship80。
smoke、dialogue、visual-qaの先行スクリプトも成功。
途中の全体実行2回は最終修正に伴い中断（exit130）；GREENに数えていない。
最終修正版で全npm testを再実行して完了。先行Node群728315ms、Relationship群5556ms。

- 26体：focused travel、装備の同一フレーム、掃除の配置・サイズ保持、原点復帰を確認。
- Relationship：positiveと掃除GROUPの共存、owner-attached heart/aura、既存ring契約の回帰PASS。
- reduced-motion：全4イベントの身体motionを抑止。話者表示を保持。メニュー中断もPASS。
- 小viewport：既存のlayout/viewport計算テストPASS。実ブラウザ描画は下記のとおり未確認。
- recover：元のmotionFramesと56通りのsize/id/gentle条件で完全一致。
- assets：変更パス0。save/progression/balance/めぐる本体の変更なし。

## 独立レビュー

1回実施。重要指摘1件をRED→GREENで修正。
掃除中に実際のごはんボタンを押すと、既存の140ms復帰motionを新SELF beatが
即キャンセルしていた。SELFはその復帰を保持するよう修正し、実ボタン＋非原点poseで検証。
修正後86件と全npm testを実行。recoverの既存処理は変更しない。

軽微な残件：L2 browser runnerは標準32ケース（4動作×4構成×2viewport）。
rescue/lonely/reduced-motion/割り込みのブラウザ自動化は追加していない。
Node契約と人間チェックリストには含め、実ブラウザ確認待ちとして残す。

実装判断：新規clone＋専用branchで作業を隔離。追加worktreeは作らない。
既存作業コピーへ影響しないため、この判断による統合上の追加リスクはない。

## 実Home QAと制約

手順：`motion-v2-l2-human-check-20261002.md`。
`/__qa`に16標準シーン＋rescue26/lonely26の2シーンを追加。
390×844・320×568で、実際のごはん／じゃれる／掃除／おきるボタンを使って再生できる。
公開済みQA URLはない。通常のPCで開発サーバーを起動して確認する手順。

この環境でViteを127.0.0.1にbindし、QA route HTTP200とfixture配信を確認済み。
0.0.0.0起動はsandboxのnetworkInterfaces取得制限で失敗。
PlaywrightはあるがChromium本体がなく、取得も不正／欠損ZIPで失敗。
`tests/motion-l2-browser.cjs`は起動を試行したがbrowser launch前に失敗、実行ケース0。
ブラウザやSafari、可愛さ・見た目の承認を自動PASSへ読み替えない。

人間目視承認前にmainへmergeしない。今回mainへのcommit/merge/公開ゲーム更新はしていない。
