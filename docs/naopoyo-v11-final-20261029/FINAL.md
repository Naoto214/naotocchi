# なおぽよ。VERSION 11 — 最終報告

2026-10-29。VERSION 11を既存本人限定URLへ配信済み。Draft PR #436を検証済みHEADへfast-forwardし、Draft・競合なしを確認。mainへのmerge/push、本番GitHub Pages更新、第1章の直接変更は行っていない。

**CI最終確認中:** 統合前の検証PR475では同一HEAD/treeの9ワークフローすべて成功。PR436更新により同一コードの9ワークフローが再度起動しており、その終了を確認中。以下の検証済み結果と実行中のCIを混同しない。

## A. 作業環境（1〜5）

1. 開始時空き: 共用32GBディスク約2.7GB。
2. 原因: 既存の複数作業・重複checkout/QA資料で共用領域が逼迫。実行中に0〜90MBまで減少。他作業の増加もあり、本作業だけを原因とは断定しない。
3. 対策: 本作業をRAM上のtmpfsへ移し、Gitオブジェクトを共有、必要資料のみ復元、TMPDIRを指定。自分が生成したPages配布物2組は各4,057件のhash・件数・symlinkなしを検査し、再生成可能性を確認して整理。過去に拒否されたclone削除の迂回はしていない。他Work、Git履歴、制作素材、保存データは削除していない。
4. 対策後: 08:53 UTC付近の共用ディスク空き17,440,768 bytes、tmpfs空き277,250,048 bytes。共有領域の逼迫を恒久解決したとはいえず、今回の検証は別領域と分割実行で完走した。今後も同一環境で大きな並列実行を繰り返さず、十分な専用容量を用意する。
5. Runtime完走: 最新HEADのGitHub上で単一npm test成功。ローカルも全対象を分割再試験まで含めて網羅した。

## B. 実装・QA（6〜13）

6. 継承: 11〜20面のおてほん、実エンジン/ForestSession入力、前後移動、自動/停止/再開/最初から、対象・方向表示、専用終了、通常状態分離、通常の分裂先予告非表示、100面設計メモ。元WIP3本のHEADを変更せず保護。
7. 今回の変更: mainとの3競合を解消し、さらに新mainのメニュー12項目・作品情報等36ファイルを統合。indexはmainと同一blob。Pages検査を弱めず両立、allowlistを検証。ゲームの新機能追加・物理・ステージ再設計なし。V10に対し第1章/v2/chapter2のstages/session/progressは不変。変更一覧は[changes-from-wip.txt](changes-from-wip.txt)（main取込みも含む）。
8. 11〜20面: 全10解答416手をエンジン/Sessionで検証し全員救出。手数5/5/10/11/23/70/26/19/91/156。全10面の初手ブラウザー証跡は既存WIPを継承し、今回も代表面を実操作。
9. 20面: 実Chromeで0→156手連続自動再生、最終16/16、専用終了、次へ/再生無効を確認。低速環境で約9分。19面34手で20秒以上停止・不変、前へ33/次へ34、再開47まで確認。11面のリセット、途中閉じる/再度開くも確認。
10. 145〜147手: 既存の実ブラウザー重点記録（145の7移動、146の1移動、147の7救出）を、当該コードを変えず継承。今回の全156手自動完走・全416手の合法性/状態回帰と合わせて確認。今回この3手を再度個別スクリーンショット採取したとは扱わない。13手目の分裂も既存証跡を継承。
11. 保存保護: 実ドラッグ2手→停止→おてほん前後/リセット/自動→閉じるで全保存キーraw値・canvas・Undo有効状態一致。再読込後の盤面一致とUndo2回成功。実際に通常5手で11面クリア、次面開放、★クリア表示を確認し、非ゼロclear・unlock・他面保存を含む再比較も全キー一致。正式キー/形式不変。共有プレビュー他セッションの干渉をQA専用キーで切り分けた。再読込後raw値は時計再開で変わるため、完全同一と主張しない。
12. 画面QA: 320×480/375×667/390×650/430×750、横向き650×390、上下47/34px余白相当を確認。44pxボタンが画面内に収まる。320×480+余白では盤面270×225へ圧縮。タッチ相当のドラッグをChromeで検証したが、実際の指の押しやすさの評価は未実施。
13. Safari: iPhone Safari/WebKit実機は未確認。reduced-motionはテストmatchMedia相当で11面0→5手/3体救出。OS設定やSafari固有viewportの検証ではない。Home CIのWebKit検証を第2章Safari検証と混同しない。

## C. 回帰・GitHub（14〜22）

|番号|対象|最新統合treeでの結果|
|---|---|---|
|14|Runtime|3,504/3,504（32+24+3,289+159）＋smoke/dialogue/visual。GitHub単一npm testでfail/skip/cancel0。|
|15|第1章＋共通v2|257/257。最新全パズル群にも含まれ成功。|
|16|第2章|283/283。全パズル群784/784、10面416手含む。|
|17|CARD GAME|494/494。正式データの独自変更なし。|
|18|Pages|unit16/16、配布4,057/4,057 HTTP/SHA-256一致、欠落/不一致0。213,581,374 bytes、452カード/904画像。reader追加7/7。|
|19|競合|index・Pages公開テスト・allowlistを解消。mainメニュー等保護、独立レビューCritical/Importantなし。GitHub mergeable=true。|
|20|GitHub CI|統合前同一HEADの9ワークフロー成功。PR436側の再起動分は最終追記を参照。|
|21|HEAD/tree|実装5284d5e42cab98c9c6d7080e04d04c0aadcb3d51 / tree85c732f3ebdd0d0d9d2f090c6366029e4075327f。|
|22|PR436|open・Draft、同HEADへexpected-old-SHA付きfast-forward。mainへmergeせず。検証PR475は未マージでclose、ブランチ保持。|

取り込みmain `d0cfd40f4bdd05782ceb45469ba151da3199c9a6`。ローカル検証 `de5494ecc04d5ab1c977626c1b24c1a9a7689af2`、PR475 CI合成 `e5ebf78b26344c608f22cab95ca215b77dcd3a51`、PR436 CI合成 `7db53e826f3172450b298bfeb335292c5dfd1583` は同じtree。

Runtime失敗履歴を隠さない: 初回の疎なcheckoutで正本ヒトデ候補資料不足6件が失敗し、正本復元後256/256成功。最新mainでのローカル並列実行は7ファイルのプロセス単位失敗でexit1（2,887成功+7失敗）。全7ファイルを逐次実行し93+309=402/402成功、2,887+402=3,289で網羅、末尾159件も成功。元のnpmコマンドを成功とは扱わない。cgroup8GBにOOM履歴があるが、7件との直接因果はログから確定できない。製品/テスト変更、skip、例外握りつぶしなし。GitHubのクリーン環境では最新HEADの単一npm testが成功した。

## D. 公開（23〜27）

23. 本人限定配信: 2026-10-29 08:51 UTC、succeeded。ゲームVERSION 11、Sites保存番号13。初回の内部エラーでは保存版が増えていないことを確認し、同じarchiveを作業領域へコピーして再送し成功。
24. URL: https://naopoyo-komorebi-20261024.kerzion214.chatgpt.site/prototypes/naopoyo-chapter2/qa.html
25. 配信: 認証付きHTTPで84/84ファイルが保存版とSHA-256完全一致、全HTTP200、VERSION11、sourceCommit5284d5e4、不一致0。未認証HTTP403、ブラウザーはサインイン画面。owner1名、外部0、groups0維持。QAハーネス・QA専用キー変更は正式配信に含まない。[全照合結果](private-delivery.json)。
26. 本番Pages: 更新なし。PR用Pagesワークフローのbuild成功、deploy skipped。main refは上記取り込みSHAのまま。本人限定SitesとGitHub Pagesを区別。
27. 未確認/制約: 本人のiPhone Safari実機・実際の指操作・主観的視認性/難度、公開URLにログインしたブラウザーでの操作は未確認。公開前の実Chrome操作/保存保護と公開後の全配信hash一致は完了。共有ディスク逼迫は残り、今回の別領域での完走を恒久的容量回復と表現しない。managed previewの断続的JSON404失敗は記録し、成功に数えない。公開後HTTPでは全例題JSONを含め84件一致。

Site source: `17316bfc99c2f216a5bb9daa7601b42b39964f2d`

Deployment: `appgdep_6ae308e507248191a862c06812a5d1cd`

Version ID: `appgprj_6adc23fed6a08191946282f35ecfd94a~appgver_cebdfdfeeb008191b08c5c23a890b496`

詳細な経緯・初回失敗・旧HEADとの区別は[REPORT.md](REPORT.md)、圧縮した全ログは[logs](logs)に保存。
