# 142 新seed開始時G-hit-blowの発動・逆順解決

141 raw/state/hash、138の宣言済みdecision、135の開始順を照合する。02-Aのみ現在選択済みの宣言variantを一般response ID規則で検証し、06の宣言→支払い→発動領域→交互応答→双方pass→逆順解決を実行する。カード効果は87のG-hit-blow本文のみを対象とするが、発動linkのsource・variant・支払い・対象なしの記録はカードcopy/pathに依存しない。山札上は解決時にだけ参照し、response判断に使わない。

TDD: RED→GREENで宣言保持と発動時時1支払い、連続passの順、山札一致／不一致／1枚の分岐、eventとstate/hash連鎖、保存3経路の非変更、原本改ざん拒否を検査する。未証明の後続通常行動判断へは進まず停止する。card本文・数値・登録区分と過去停止記録は変更しない。
