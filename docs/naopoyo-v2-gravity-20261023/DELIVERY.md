# なおぽよ。v2 最終引き渡し

- Draft PR: https://github.com/Naoto214/naotocchi/pull/428
- 新ブランチ: feat/naopoyo-v2-gravity-20261023
- 基点main: b3f8f4f7e3e0e87402c98d23657040d6e0df4bfb
- 実装保存コミット: d28ff73ad2c13219d70bfb02e975fc9d2e028289
- 実装tree: 9c6a7ba11a0a8d3b203d836c36f80924d4d67774
- 上記の後にこの引き渡し資料と最終ログのみを追記。最終HEAD/treeはPRと完了報告に記載。

## 本人限定試遊
https://naopoyo-v2-gravity-20261023.kerzion214.chatgpt.site

Site project appgprj_6ada2c10588c819197b0f442bed5065b、version 1、deployment appgdep_6ada3170eda08191b817bd92439291f3、status succeeded。
Site source commit 2b1626787be7945a46eb36c9090437aad186311f。49配信ファイルをversion.jsonのSHA-256に照合し全一致。HTMLはSitesの同一origin URL正規化307をたどって200・ハッシュ一致。匿名アクセス403、認証付きmanifest200。owner1名のみ、editor・group・external visitorなし。認証情報は資料やGitHubへ保存していない。
既存の正式版・PR422試遊・先行v2試遊は上書きしていない。Safariで同じChatGPTアカウントにサインインして開く。

## 検証の確定結果
- v2専用156/156成功。
- 正式なおぽよ専用205/205成功。
- 元のpackage.jsonの全テスト列（各node --testのみ--test-concurrency=2追加）は終了コード0。26+24+3212+128 = 3390件、smoke/dialogue/visual QAも成功。
- 既定並列のnpm testはメモリ圧迫で10ファイルのプロセス失敗。既定実行の全成功とは報告しない。成功・失敗両ログをevidenceに圧縮保存。
- 独立レビューCritical/Importantなし。全24場面の72再生・1440入力経路・200重力盤面も確認。
- 実描画375/390/430pxの通常・タッチ直後・合体・分裂と画面端を記録。実iPhone Safariは未確認。

## 保存方法と保護
CLIのGitHub pushは認証なしで拒否されたため、接続済みGitHub APIでblob/tree/commitを作成し新規refを保存。ローカル検証treeとGitHub treeの完全一致を確認した。mainや既存ブランチへのforce更新はしていない。
main、正式12面、#422追加12面、既存画像原本・保存・クリア記録・本編・CARD GAME・旧ドロップ/スライド・Pagesを変更していない。差分はprototypes/naopoyo-v2とこのdocsディレクトリの追加だけ。#422はopen Draft、head 88ab41e1fd1fdd8f4b1b33528e157b7e96fba444のまま。

## 本人の最初の試遊
場面10で左から右へなぞり、トゲで5になったら1マス戻して6へ。指を離さず完了できるか、数字が読みやすいかを確認。場面20で重力余剰、21で分裂直後の積み重なり、24でトゲ上の仲間を足場にして指を離す動作を確認。Undoは一筆全体、リトライはその比較場面を戻す。

## 残課題と移行
Safari実機、実指の高速軌跡、指による遮蔽、回転・バックグラウンド復帰・発熱、操作の楽しさは本人評価待ち。トゲの足場扱い・同一重力連鎖1回発動・初期重力なしの裁定はSPEC.mdに明示。正式採用は別承認で、旧24面の再設計・難易度・セーブ互換を再評価する。今回mainマージ・本番Pages更新は行わない。
