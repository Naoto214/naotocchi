# 152 新seedR1たまご交換 TDD計画

1. 151保存JSONのraw SHA・再生成・event/hashを検証する。
2. RED: 3経路の7候補完全列挙、116のseeded fallback、各1 decision/event、開始時responseへの復帰、独立balance標本0を先にテストする。
3. 117のたまご交換意思決定を現在の手札7枚へ適用し、選んだ現物を山札の一番下へ戻す。135/138の既存開始時response windowを、次のactor・event seqで作成する。
4. 全event seq・game/continuation hash・canonical bytes・設計検査・全proxyを検証しGitHubへ保存。次checkpointで現在response候補を監査する。
