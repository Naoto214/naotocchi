# P11 比較根拠の扱い：確認待ち案（未採用）

読取・条件付き診断の基準はc274534b9c76555c7909c50071ec9feee8a1e71b。preflight-ready=false。生成・固定・400戦・新規標本0。これは実装仕様の承認記録ではない。既存114/116/119と過去結果を変更しない。

## 確認した具体例

既存 test_proxy_population_information_use.supplied('normal_action','I-poop1') を現行scopeのexecuteで1回診断。新しいseedや本番入力を生成せず、既存条件付きfixtureを使った。verification/p11-comparison-gap-probe.jsonを参照。

| 候補 | 敗北/途中終了回避 | 100維持/阻止 | 確定成長差 | 解決後時 | 支払 |
|---|---:|---:|---:|---:|---:|
| I-poop1設置 | 0 | 0 | 0 | 1 | 1 |
| pass | 0 | 0 | 0 | 2 | 0 |

実選択はpriority_unique/pass。支払監査と比較計算はtrue、operand_provenance_verifiedはfalse。これは誤った勝者を証明する反例ではなく、計算一致とoperand根拠の間に残る不足を示す診断である。

根拠: 107の4節と114の3節は上位3項目の順位を定める。114の「同じ解決内」は時収支に明示される。現行candidates._scoresとdeparture.select_verified_zero_immediateは0を構築するが、局所delta0/分類/現在100未満だけを一般の上位比較根拠へ昇格できない。selection_basisは自ら計算限定・operand未証明を明示し、admissionも未証明を保持している。これを勝率算入済みのバグとして報告しない。

## 確認したい変更案

比較期間・新しい値・期待値・有限先読みは導入しない。実際に比較で使用するoperandについて、局面/候補/正本/実状態・履歴から確認できた根拠と、根拠が未確定のものを分離する。未知に依存する優越除外はしない。下位の時/支払が確認できても、上位unknownを同値0として飛び越さない。既存116の完全合法集合・frontierの取扱い・除外規則を維持し、指定5種policyへ昇格しない。

これはカード種・行動種を一括で全unknownに固定する案ではない。ただし根拠を確認できる上位値が一つもない局面では、結果として全候補の上位比較がunknownとなり、従来priority_uniqueだった選択が既存116の未証明選択へ移る可能性がある。その場合も証明済み支払/copy IDと根拠は保存する。全候補unknownを許す結果と比較根拠の新しい接続は、引継ぎで未確定とされていたため、ここでは未実装・未採用のまま確認する。

既存のchallenge/direct growth/reveal/countryside専用unknown guardは再実装しない。新R10 pass guardも作らない。確認後もP09/P10/P14–18の共通合成と最終固定版検証は別途必要。P11の回答だけで本番gateは開かない。

独立read-only文書レビュー1回: C0/I0/Minor0。正本/実コード/保存probeの項目対応を確認。probe実行の独立再試験はしていない。frontierは集合そのものの不変を意味しないよう「取扱い・除外規則」と精密化した。未採用案のまま、Python変更なし。
