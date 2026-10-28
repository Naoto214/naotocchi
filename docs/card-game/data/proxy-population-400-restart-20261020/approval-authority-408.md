# 承認権威の移転：PR #259 → PR #408（2026-10-20 本人決定）

本人指示（2026-10-20、本セッション）：「承認チェックをPR #259からPR #408へ移行してください。ただし、PR番号以外の承認条件・既存の承認履歴・安全ゲートは維持してください。PR #408が現在の実行承認先として適切であることを確認し、既存の承認を無条件に新しい承認へ読み替えないでください。」

## #408の適格性（GitHub APIで確認）

- 番号408、open、draft、未マージ。headのrepoは `Naoto214/naotocchi`、ブランチは `claude/fixed400-restart-20261020`、baseは main。
- repo所有者は Naoto214、数値ID 323909980、type User。既存の承認主体と同一。

## 変更点

- `proxy_population_approval_transport.py`：`PULL_REQUEST=408`。許可するGET経路を `/pulls/408` と `/issues/408/comments` にした。#259の経路は拒否する。
- `proxy_population_external_approval.py`：`PR=transport.PULL_REQUEST`、`BRANCH='claude/fixed400-restart-20261020'`。#259は `HISTORICAL_PULL_REQUESTS` として記録だけ残した。
- `proxy_population_remote_publication.py`：公開refを `refs/heads/claude/fixed400-restart-20261020` に変更した。

## 維持している条件

- 本人ID 323909980（type User）
- 本文の完全一致（canonical requestのdigest）
- 編集禁止（created_at=updated_at）
- 取消コメントの全ページ検査
- PRが open・draft・未マージで、headが承認時の公開commitと完全一致
- 120秒・3観測のbounded read
- 消費時・claim公開後・worker前のfresh検証
- 排他的消費記録と再消費禁止

## 既存承認を読み替えない根拠

requestのdigestには `pull_request` が含まれる。#259宛てrequestは `_validate_request` で拒否され、#408宛てのdigestとも一致しない。#259上のコメントは `issue_url` と `html_url` の照合で拒否される。消費済みの 6122359186、6122537210、6127373548、6159857990、6162350238 の記録はいずれも変更していない。

## 検証

`verification/approval-authority-408-related.log`：承認・公開・認可・supervisor・attemptの10モジュール70テストがPASS。新規の `test_proxy_population_approval_authority_408.py` で次を確認した。

- 定数と公開refの整合
- #259宛てrequestの拒否
- #259上のコメントで#408宛てrequestを承認できないこと
- merged、closed、非draft、旧ブランチ、番号不一致のfail-closed
- 経路allowlistによる#259の拒否
