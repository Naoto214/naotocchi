# 137 開始時responseのID設計判断

基準: 136保存HEAD `360aa8c7eac80a320038435ef016c9435b1477c0`、tree `3a036d2230fd21e94c1ea1a433678d1fe910956b`。135の4停止state、01・02・06・64・114・119・120・128を照合。今回は設計選択の記録のみで、対戦、候補判定、保存state/hash、カード本文は変更しない。

## 確定済みの境界

- 開始処理では、たまご交換の後に未処理の予約・誘発を検査し、ターン側から両者にresponse機会を渡す。両者が連続passし、chainと未処理誘発が空になってから通常行動へ進む（01・02・06・64）。119の`post_placement_response`専用adapterは開始時の証明には使わない。
- 135の全4状態は両者のboard・prepared・reservations・discardが空。ただしこれを将来の一般局面に固定せず、各stateで証明する。相手の非公開手札・山札上・未公開の結果は候補比較に使わない。
- 02-AのG-hit-blowは山札と時の条件を満たし、宣言7種類の別候補を要する。02-BのI-c_coin2は時の条件を満たす対象なし候補。120のpass-only列挙を完全な候補集合として採用できない。01の先手2状態では今の手札から使える候補はpassのみ。
- 119は`response-pass`と`response-use-event-{source_instance_id}-target-{target_instance_id}`を実例で固定。128は通常行動の複数variantに`candidate-{action_type}-{source_instance_id}-{candidate_variant}`を使う。両者とも新しいresponseの対象なし／宣言variant IDは定義していない。

## 判断が必要な記録形式

同じ合法行動を一意に表せる選択肢は複数ある。**推奨A**は119のresponse接頭辞を保ち、128のvariantを末尾へ足す。

| 案 | G-hit-blowの例（`main`宣言） | I-c_coin2の例 | 比較 |
| --- | --- | --- | --- |
| A：発動種別・source・variantを明示 | `response-use-play-A-001#1-variant-main` | `response-use-item-B-033#1` | 119のresponse名前空間を保持。宣言をIDで区別し、対象なしは余分な擬似対象を作らない。 |
| B：通常行動のvariant IDをresponseにも使用 | `candidate-use-play-A-001#1-main` | `candidate-use-item-B-033#1-single_no_target` | 128の形に近いが、119のresponse名前空間と`response-pass`との統一を失う。 |

この選択はゲームの合法性を変えないが、decision/eventのstable ID、再生・再検査の保存形式を固定する。既存正本からA/Bのどちらかが唯一とは証明できないため、選択が確定するまでIDを発行しない。Aを採用するなら、`response-use-{play|item|event}-{source_instance_id}`を対象なしの基形とし、宣言があるときだけ`-variant-{canonical_variant}`を付ける。対象あり119の既存ID、通常行動128の既存ID、`response-pass`は保持する。variantは114表の登録値に限り、重複や欠落を拒否する。

## 確定後のTDD実装境界

1. 135保存raw・game hash・event seq2を読み取り検査する、開始時専用adapterをテスト先行で作る。開始時の空予約・誘発・chain・公開情報を検査し、未証明ならstop。119の既存adapterは変更しない。
2. 手札の「すぐつかう」を正本文・114の条件・時・対象から列挙し、各sourceの採用または除外を証拠化する。G-hit-blowの7宣言、I-c_coin2の対象なし、条件不成立のG-baseball-batting/E-final-time、相手手札の非使用、未知カードの停止をテストする。114の`normal_action_opportunity`はresponse除外の証拠にしない。
3. 確定ID形式で候補を正準ソート・重複検査する。119の優先・pass・seed契約へ接続し、支払い・chain・解決が証明できない箇所では真正停止する。山札上を宣言選択に用いない。
4. 135の4停止stateから独立再開し、新規event/hashの連鎖とcanonical bytesを検査する。過去の保存JSONや112 fixtureを変更しない。R1でseeded fallback使用済みのため、完走時も独立balance標本0。

136の監査後、今回の新規対戦・decision・event・snapshot・balance標本は各0。117旧テストの期待190／実測263は既知の別件として維持する。
