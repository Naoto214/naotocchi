# Bounded approval read implementation — verified checkpoint

A案の共通実装を保存。検証source: `873e8cd276c425c1c2ea7793728f0f509b029a10`。
保存検証edition: `d76d36de731cb2d97c2cd3be01575d9293e71775`。
実preflight: true / errors=[]。launch_authorized=false。

- 明示allowlist GETの502/503/504・通信timeoutのみ、同一検証呼出内で観測全体を取り直す。
- 初回含め3回、全体120秒、待機2/5秒。期限以後の証拠を受理しない。
- requestと入力を固定。失敗観測の部分証拠は再利用しない。不一致・編集・取消・認証失敗・不正JSON・redirectは真正停止。
- 消費前の入力/edition/binding/remote/本人確認を共通化。消費時とclaim公開後・worker前のfreshガードも維持。
- 読取endpoint/試行/UTC/HTTP状態/打切り理由を保持。後続ガードや保存の失敗でも外側の停止エラーに残す。
- 消費・GitHub書込・supervisor・worker・対戦にはretryを追加していない。終了したsupervisorは終端のまま。B回復機構なし。

検証: 専用・関連認証49 tests、別supervisor/attempt7 tests、全192 modules/929 testsがexit0。全回帰中Python1099ファイルの前後指紋一致。非本番test-1A fixtureは328 eventsでcompleted、stop=null、exit0。design exit0/errors=[]。
独立レビューの重要3件は著者がRED→GREENで修正。レビュー原文・修正記録を保存。独立再レビューを行ったとは扱わない。未解決指摘なし。
保護3668ファイル一致。開始時5196ファイルのうち意図したPython6ファイルだけを変更し、その他5190ファイルは一致。旧入力、request、binding、manifest、claim、停止原本に変更なし。

本番400戦・旧attempt再開・retry・承認消費・新request発行はいずれも0。6159857990を再利用していない。新しい固定入力結合/publication/requestと本人承認は別工程。
この結果保存はlaunch publicationではない。将来は証拠保存を完了してからeditionをcaptureし、binding publicationと外部requestのHEADを固定する既存公開順序を守る。
