# version 7 公開記録

- Existing owner-private Site: https://naotocchi-home-diorama-20261022.kerzion214.chatgpt.site/
- Project: `appgprj_6ad9985c831c8191917df5cec1594a69`
- Version: **7** / `appgprj_6ad9985c831c8191917df5cec1594a69~appgver_fab1b13a96188191925fdfaa5a63f3ce`
- Deployment: `appgdep_6adb017627888191a3e99cefe3ed871b` / **succeeded**, 2026-10-23 15:41 JST.
- Site source: `5574c7dbdb0c585e3ade5c4c9380b697829fd63f`. Source workflowで既存checkoutを使用し、commit/pushした同一sourceからarchiveを作成してprivate publication。
- GitHub runtime + evidence: `1ae634da90be19e9dd41233ae0ada8e423c24ece`.
- Verified local build commit: `ed8554044efc1505123b1b51c0f21c8b61103057`.
- Exact shared tree: `864857f2c6c68252c32032c1627368292700c3ce`. 通常HTTPS pushの認証が使えなかったため、接続済みGitHubアプリで73ファイルのblob SHAとtree SHAを照合し、既存PRブランチを非force/expected SHA付きで更新。新しいPRは作成していない。
- 最新remote main `acd4ece17c293c9365a41216b0ac4492174ffcf5` はruntime commitの祖先。mainマージ・本番GitHub Pages更新なし。
- Source byte照合: 試遊4,056ファイル、不一致0。保存キーは `naotocchi-home-diorama-preview-v1`、本番のキー文字列を試遊scriptに含めないことを確認。
- 公開後access: current user=owner、custom、allowed owner=1、groups=0、external visitors=0。公開対象の拡大なし。
- 公開後browser: exact URLへ到達し「サインインが必要です」の認証ゲートを確認。このクラウドブラウザで所有者ログイン後の画面を確認したとは扱わない。実操作・画像QAは公開sourceとbyte一致したmanaged previewで実施。
- Local official tests: **3,468/3,468 PASS**, Python packaging **15/15 PASS**。GitHub connectorの当該commit workflow/status照会は空配列であり、GitHub CI greenとは主張しない。
- 最終採用は本人のiPhone Safari実機QA後。ブラウザのCanvas互換描画はSafari/WebGLの画質・性能を保証しない。
