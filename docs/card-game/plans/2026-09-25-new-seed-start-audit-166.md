# 166 TDD計画：次手番開始response候補

165のraw SHAと独立再生から4開始時response stateを監査する。手札は114の全行動・時と、91 E-final-time/E-fateful-transform、79 G-archery-3d、83 G-asteroids-classicの公開条件を照合し、除外する条件不成立は本文と理由を残す。盤上C-chicken/C-batは72、06、144の誘発時点を使い、164の盤上存在を検証する。山札上や相手手札は候補決定に使わない。

REDは4候補監査と改ざん拒否の2テスト。GREENでは138の手札列挙を投影stateに再利用し、盤上能力を独立に証明する。C-chickenの合法発動があってもID形式が正本にない場合、IDを発行せずその経路を停止。ほかの経路の候補完全性は個別記録する。
