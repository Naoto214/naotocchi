# 200 新seed通常pass2経路 TDD計画

199意思決定、198候補、197保存stateのraw SHAを固定。確定時収支で選ばれた01-A/01-Bの通常passを既存normal.transitionで適用し、終了response入口へ移す。対象外2経路の保存state/hashは保持。テストを先にREDにし、decision/event/snapshot/hashとcanonical JSON、設計データを検査してGitHubへ保存する。
