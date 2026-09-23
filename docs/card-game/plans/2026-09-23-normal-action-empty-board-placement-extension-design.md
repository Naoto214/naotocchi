# 125 通常行動の空盤面・人物配置候補拡張 設計

状態: 124の4停止点を読み取り専用で監査した結果。121・124と全保護対象を変更しない後続契約。

## 共通不足と根拠

124の次プレイヤーの現在盤面は空であり、121の`board_card_action` inventoryは空familyに付ける理由がないため4件とも`missing_exclusion_reason`で停止した。121を改変せず、後続の現在state監査で`no_board_source`を空family専用のinventory reasonとして登録する。根拠は現在プレイヤーの公開盤面5 zoneと01基本ルール。handも空なら`no_hand_source`を別に登録する。いずれも空zoneの証拠でありカード合法性や新しい行動を裁定しない。空familyを省略せず6 familyと0件を記録する。

空盤面を説明して121の残りを試験的に再評価すると、全4件が次に`missing_candidate_id_grammar`で停止する。114のtemplateが示す通常機会の時0人物配置には117で保存・検証済みの`candidate-place-companion-{instance_id}`、`candidate-place-partner-{instance_id}`がある。後続契約ではこの2 grammarだけを117の正本から継承し、source instance、variant、targetに結び付け、衝突とdetail逆生成を検査する。pass=`pass`、birth grammar、response-pass分離は121のまま。

## 監査・情報境界

各現在stateのactor公開/owner既知viewを121の投影器で作り、source inventory、114のtemplate、全variant/target、採否、reason、IDを改めて構成する。121の既存17 reasonと10 stop codeを再利用し、追加のempty family理由2件のみ登録する。121の12条件を独立再計算し、保存booleanを信用しない。現在stateの両hash、instance mapping、公開履歴連続性を検査する。相手hand/deck順や未来を候補選択へ渡さない。

zero-cost人物配置の対象と制限は01・114・116・117の既存正本どおり。合法候補の比較は107/114、比較不能なら116のseeded fallbackを適用し、fallback使用経路は独立balance標本へ算入しない。配置handlerは117の汎用処理を移植してsource card IDで分類する。未知の配置後誘発、response処理、カード本文が必要な時点ではその経路だけ真正停止する。対象card copy、order、経路を合法性条件にしない。

## 成果物と範囲

125独立adapter/validator/test、4経路の124停止stateからの再開記録、新plan/evaluation/stop、報告、README、PR本文。JSONをcanonical UTF-8 indent2 LF末尾改行1件で保存し、builder bytesと直接比較する。121/124を含む既存証拠は読み取り専用。新規カード本文/数値/裁定を追加せず、全452枚汎用対戦エンジンを構築しない。再開結果を先に固定せず、次の未解決predicate/handlerでは真正停止する。
