# 439 独立レビュー指摘への対応

独立レビューは1回、読み取り専用で実施。原文はindependent-review.md。Critical0、Important2、Minor0。新たな独立レビューは実施しない。

## I1 — window起点と実カード使用の取り違え

共通response_play_occurrencesを追加し、119のwindow anchorを維持したまま、そのwindow内の実際のカード使用を検出する。すぐつかうの印刷された使用方法を再照合し、board能力とpreparedからの後日発動を除外する。W-cityは実際の2枚目イベントを選択に結合し、activate_responseのtrigger_origin_event_seqにも反映する。既存の回数判定と履歴独立再構成を再利用する。M3の正の未接続条件をunmetへ変換せず停止する。

TDD: 旧実装でW-city候補消失とM3不発分類が再現。修正後は候補・実起点・使用済み再列挙・board/prepared除外を確認する。

## I2 — 最後のquick解決後の未接続能力を素通り

共通guard_applied_effect / guard_resolution_resultを追加し、全forced quick解決（既存委譲を含む）の結果を受理する前に正の未接続義務を確認する。M6はsource55節全体へ結合し、own turn、現在main、手札world支払候補、捨て札world対象、元のすぐつかうlink、実effect receiptを確認する。正ならsource参照付きで停止し、receipt未証明も停止する。新response window・新裁定は作らない。

通常候補への直接入口と履歴の独立provenance再検証も同じguardを通す。M6効果そのものは今回の実行editionでは未接続であり、適格条件を不発とみなさない。

TDD: state.validateが通る実際のE-big-illness解決境界を基礎に、旧batch forced adapterが素通りすることを再現。修正後は正の条件・receipt未証明で停止し、world支払欠如・相手turn・明示的no-effect・board sourceを除外する。

## 検証

追加専用10件を含む関連5モジュール91件PASS。review-red-tests.logとprepared-count-red.logは修正前の意図したFAIL証拠。修正後の継続・関連回帰37モジュール339件PASS、npm406件PASS、8実行＋各独立再実行を2回全生成してpaired/manifest byte一致。350 source SHA一致、505原本・114/414・過去833 data不変。実8結果は修正前後もbyte一致。最終439検証ログへ保存済み。

## レビューが判断対象外とした事項

全505 engine網羅と再入場個体、balance/採用/112は範囲外を維持し、能力が未接続の正の条件ではfail-closedを要求する。remote PR状態と833旧dataの独立照合はrootが別途検証する。main mergeもpromotionも行わない。
