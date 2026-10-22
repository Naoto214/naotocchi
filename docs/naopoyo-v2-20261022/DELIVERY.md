# 共通ルールv2 配信完了

- Draft PR: https://github.com/Naoto214/naotocchi/pull/427
- 本人限定試遊: https://naopoyo-v2-continuous-20261022.kerzion214.chatgpt.site
- 実装HEAD: `840e45748d90b851785f82c98fbb0dc1ff0dc6f4`
- 実装tree: `362d7db7dbab2ee2a9793972a59472148aa4f0c9`
- 本ファイルを含む最後のdocsコミットは実装コードを変更しない。最終HEAD/treeはPR本文に記載。
- Site source: `ed1669095bfce20f8b877b1e9f454c348807e4c6`
- Site project: `appgprj_6ad9c5f5d8e88191a4e178ce8bb831c1`
- Version: `appgprj_6ad9c5f5d8e88191a4e178ce8bb831c1~appgver_b03e9cd01e1081918e621b906f372ee9`
- Deployment: `appgdep_6ad9cc2f914c81918344c22603b9adb6`, **succeeded**
- 所有者1名、追加viewer/editor/groupなし、外部訪問者0。公開設定変更なし。
- 正規サービス認証で50ファイル（HTML/JS/CSS/32画像/version）をGETし **全件HTTP200・SHA256一致**。認証なしルート403。`evidence/delivery-http.json`に記録。
- 配信マニフェストの全ソース・画像がGitHub実装treeのバイトと一致。
- 通常git pushはexecutorのGitHub認証未提供で失敗したため、GitHub connectorのblob/tree/commit/branchで同一treeを保存。公開branchをfetchしローカルtree一致確認、作業ブランチを同期。無関係なbranchへのpushなし。
- 保護確認: main `f69310c79131f51ceed043417cf4c39cab925331`、#422 `88ab41e1fd1fdd8f4b1b33528e157b7e96fba444` / open・Draftを再確認。mainマージ・Pages本番更新なし。

## CIと評価の限界
実装HEADのPages runtime package成功。Runtime smoke test / Home layout / World visual qualityは確認時に実行中。ローカル全体テストは全完走・成功。最終docsコミットのCI完了は未確認。
iPhone実機・操作の気持ちよさは本人確認待ち。回数表示80上限の軽微な制限、候補重力、A/B、旧24面移行評価はQA.md参照。

## 再開時
新たな作業前に最新main・#422・#427を再確認する。本人の反応は01/05/10/11/12/13の場面IDに紐づけて記録。正式統合は別途承認まで行わない。
