# 425 — 開始イベントと歴史的応答候補scopeの不一致調査

GitHubのfresh PR259 HEAD `0612eb170ad91550d49a4b43df35ad3ee907a672`、tree `c47605b9b9201e1039ba80a7c505b0d05cbd16b8`（424）から再開。PR259 Draft/open/unmerged。画像の423よりremoteが進んでいたため424を正本とした。

## 判明した根拠

01-Bのseq84は、pass後ではなくR5の最初の`egg_exchange_bottom`直後である。window=`turn_start`、priority actor=A、origin seq84、response opportunity index=1。

- 318の`audit_response`は、144 `matches`へ実イベント名`egg_exchange_bottom`を渡す。144が要求する`turn_start`とは異なるため、C-chickenを`trigger_condition_not_met`として除外する。
- 401／424は、166／206の初回開始応答と同じくたまご交換後を`turn_start`として確認し、C-chickenを候補へ含める。
- 同じgame hash・continuation hashで、保存318候補は`response-pass`のみ、fresh候補は`response-activate-ability-A-015#1`と`response-pass`。これは比較不能ではなく、歴史的候補scopeの不一致である。

「pass後の再発動が原因」という最初の仮説は実イベント照合で否定した。その試験変更は不採用として全て戻した。失敗ログは検証ディレクトリに保存する。原本318・144・505 JSONを変更せず、保存されたpassを正解としてコピーしない。

## 採用した変更と検証

実行方針・候補・選択・event・stateを変えず、真正停止の証跡へ公開origin eventのseq/action/actor、window、応答index、参照契約を追加した。追加testは停止がseq84の支払前であること、候補差とwinner欠測を検証する。

8軌跡を135からfresh生成し、各々を独立再実行した。完了0・停止8・未実施0、旧4経路の到達prefixは歴史的event/stateと一致。424との結果差は01-B旧runの`stop_evidence`1 fieldだけで、choice/event/state/snapshot変更0。

保存は`trajectory-checkpoint-425/paired-delta.json`。424の署名付きgzipを展開し、指定されたresult index/run ID/fieldを置換し、sort_keys/indent2/末尾newlineで再serializeすれば425の全fresh出力を復元できる。base raw SHAと復元後raw SHAを保持し、復元bytesとfresh生成bytesの完全一致を確認した。これは保存表現の差分であり、生成や独立再生の省略・実行cacheではない。

原本505 raw差分0、414仕様・114候補表非変更、npm test exit0、既定設計検査errors0、空白検査成功。専用16/16 PASS（40.210秒）。専用最終ログは`verification/task-5-scope-evidence-green-425.log`。

Task 5の完了、R10再現、Task 6評価、全proxy回帰、最終独立レビューは未完了。新方式を正本化しない。独立balance標本0、112の6fixture未実施を維持する。

## 次作業

まず318のイベント名判定を、166／206／401の開始時分類と比較して歴史的source契約の互換profileとして扱えるかを監査する。同一profileを両policyに適用する場合でも、比較選択を保存履歴からコピーしない。互換性を証明できなければこの局面は真正停止のまま保持する。

並行した別実装は行わず、残るE-first-date条件・main/partner board応答・通常coin解決などの実際に到達した不足を、既存契約とRED→GREENで順に接続する。未対応を盤面形成・方針効果・完了対戦へ読み替えない。
