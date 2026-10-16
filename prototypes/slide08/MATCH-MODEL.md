# 対戦状態モデル v1（設計のみ）

オンライン通信・サーバーは今回未実装。実装前に時刻幅と障害判定を負荷試験する。

## 正本
matchId, ruleVersion/hash, 設定・seed・初期盤面hash・証明hashを開始前に固定。
両者へ同じ盤面/卵/ゲージを配る。解法は試合終了まで配信しない。
serverがengine.stepで操作を裁定。操作は(playerId,epoch,sequence,previousHash,action)。
各playerのsequenceは単調増加し、一意キーで重複配送を再適用しない。
不正操作は不受理、資源・手数・勝敗時刻を変えない。受理操作と結果hash・サーバー時刻を追記ログに永続化してからACK。
クライアント時刻/自己申告クリアを勝敗正本にしない。再同期は最後の確定sequence/hashから。

## 状態遷移
|現在|イベント|遷移/処理|
|WAITING|両者readyかつ初期hash一致|COUNTDOWN。サーバー開始時刻とepoch配信|
|COUNTDOWN|双方確認・開始時刻到達|RUNNING|
|RUNNING|通常操作/アイテム選択|時計継続。選択はローカル、確定操作のみserver裁定|
|RUNNING|初回クリアを含む裁定tick|SETTLING。同tickの相手操作を処理して結果確定|
|SETTLING|同tick双方クリア|FINISHED(draw)|
|SETTLING|そのtick片方だけクリア|FINISHED(winner)|
|RUNNING|片方が行き詰まり申告|そのplayerをWAIT_RESULT、相手は継続|
|RUNNING|双方WAIT_RESULT|FINISHED(draw)|
|RUNNING|切断/離脱をserverが検知|PAUSED。両者のゲーム時計停止・入力凍結、epoch更新|
|PAUSED|全員復帰かつhash同期・双方ACK|RESUMING。共通再開時刻を配信|
|RESUMING|双方ACK後に再開時刻到達|RUNNING。epoch更新|
|PAUSED/RESUMING|猶予超過・中断回数超過|下記帰責規則でFINISHEDまたはNO_CONTEST|
|任意の未確定状態|server障害|SERVICE_HOLD。個人への不戦敗を保留|
|SERVICE_HOLD|正本・ログ・時刻整合性を回復|PAUSEDで再同期、またはNO_CONTEST|
|FINISHED/NO_CONTEST|遅延・重複イベント|結果は不変。監査ログのみ|

## 30秒・各3回
- 各playerにpauseEpisodes、returnDeadlineを保持。独立に離脱したplayerだけカウントする。
- 1〜3回目は、serverによるその離脱検知時刻+30秒を期限とする。4回目で負け候補。
- 同じPAUSED期間の再接続失敗/再離脱は同一episode。ACK再送で期限を延ばさない。
- 相手が離脱したため停止した接続中playerは回数を消費しない。
- 後から離脱したplayerには、その離脱時点から独立した30秒期限。同期中に新たなepisodeを無限に延長しない。
- 両者の自発的離脱について最初に超過した時点で単独違反なら相手勝ち。同一裁定tickで双方違反なら引分け。
- 接続・同期ACKが各player期限内に必要。通信やサーバーの障害である疑いが残る場合、個人違反として即確定せずSERVICE_HOLDへ。
- RESUMING中のserverによるカウントダウン待機は復帰済みplayerの期限判定対象外。
- WAIT_RESULT playerも接続義務は維持し、離脱による対戦放棄は同じ規則。行き詰まりは不可逆な投了待機（撤回不可）。

## 同時達成・遅延・処理順
暫定案: server受付時刻を50msの裁定tickに量子化。同tickの双方クリアは引分け。
これは「物理的に同時」を保証するものではなく、明示した同時判定幅。
同じtickでは受付済み合法操作→08消滅判定→行き詰まり→離脱/期限違反の順に裁定。
同一playerの複数操作はsequence順。1tick内の操作数上限は両者共通にし実装時に決定。
client timestampの遡及採用はしない。未ACK操作の再送は元の受理tickを保持、未受理操作を過去tickへ戻さない。
PAUSED境界より後の操作は拒否して再同期。直前までに受理した操作でクリアなら結果優先。
相手に未配信でもserverで確定済みなら有効。確定ログが失われて検証不能ならNO_CONTEST。

受付時刻方式にはネットワーク遅延による不利が残る。公平性を完全に保証したと主張しない。
実装前にRTTの上限・マッチング条件・同時tick幅（例50/100/200ms）の比較、障害検知の誤判定、モバイルの画面離脱検知を測定する。
遅延補償のためclient時刻を信頼する方式は不正の余地があるので採用しない。

## server障害
単一playerのheartbeat欠落だけでserver障害とは断定しない。service health、ログ永続化失敗、接続監視を併用。
SERVICE_HOLDは両者の期限・中断回数を停止し、障害時間を個人30秒へ算入しない。
検証済みcheckpointから両者同時に戻せる場合のみ再開。片方の履歴だけ巻き戻さない。
回復不能/試合正本に曖昧さがある/復旧待ち上限超過ならNO_CONTEST（勝敗・レート不変）。
復旧待ち上限（例120秒）は運用時に確定。障害中の結果を推測しない。

## 未決定
50ms同時幅、heartbeatの切断検知時間、開始/再開カウントダウン、復旧待ち上限、RTT適格基準、1tick操作上限。
手数・得点・アイテム数は記録のみ、勝敗には使わない。
