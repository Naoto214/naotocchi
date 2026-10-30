# 保存互換性と正式採用時の影響範囲

今回は正式保存形式・旧エンジン・正式CPUを変更していません。以下は、B1〜B3を正式CPUへ入れる場合の評価と提案です。

## 現在の仕組み（main `851cf09a` の確認結果）
| 項目 | 実装 | 根拠 |
|---|---|---|
| 対局の保存 | `engine.save` = `{version, seed, decks, commands}`。再開は操作列の再生 | `engine.mjs` `save`/`restore` |
| CPUの手の記録 | CPUの選択は通常のコマンドとして操作列に入る。再生にCPU方針は使わない | `cpu-session.mjs` `stepCpu` → `#inner.commit` |
| CPU対戦の保存 | `{version:'cpu-match-1', policy:POLICY_VERSION, humanSeat, difficulty, policySeed, step, guard, diagnostic, cpuDeck?, game}` | `cpu-session.mjs` `save` |
| CPU対戦の再開 | **`d.policy!==POLICY_VERSION` なら「CPU保存形式が異なります」で拒否** | `cpu-session.mjs` `restore` |
| 戦績 | 難易度・CPUデッキ・席・デッキ・結果。CPU方針のバージョンは持たない | `records.mjs` `validateMetadata` |
| 固定400戦 | Python の母集団・凍結edition。JSのCPU方針を使わない | 既存の証拠一覧（PR #489 第7節の前提、`full-audit-20261028/07-existing-evidence-map.md`） |

## 判定
1. **旧保存の操作記録は従来どおり再生される。** 過去の手は操作列として保存されており、方針を変えても再生結果（盤面・そだち・勝敗）は変わらない。base 条件の896戦で、実験コピー（全スイッチ無効）の保存sha256がPR #489の記録と全件一致した（`results/equivalence.json`）。
2. **再開後のCPUの行動は変わる。** CPUの次の手は新しい方針で選ばれるため、同じseed・同じ途中局面でも、再開後の展開は以前の方針と異なり得る。
3. **バージョン管理は必要。** 方針を変えると、同じ `heuristic-1` の表示のまま行動が変わり、検証記録（#404〜#407、#489、本実験）との対応が取れなくなる。一方、`POLICY_VERSION` を上げると、現行の `restore` は旧バージョンの途中保存を**拒否**する（進行中のCPU対戦が「続きから」で開けなくなる）。
4. **hotseat形式との関係はない。** `hotseat-2〜6` はエンジン（ルール）の版で、CPU方針とは独立。B1〜B3はエンジン・合法手を変えないため、hotseatの版を上げる必要はない。
5. **戦績**：過去の戦績は結果だけを保持しているため変わらない。ただし正式採用後は「中級」の集計に新旧の方針が混ざる。
6. **固定400戦の証拠**：影響なし（別実装・別母集団）。

## 提案（正式採用する場合）
- `POLICY_VERSION='heuristic-2'` を新設し、方針を版ごとに登録する（例：`POLICIES={'heuristic-1':旧, 'heuristic-2':新}`）。
- **途中保存の再開**：
  - 案P1（推奨）：保存に書かれた版の方針で続きを指す。旧保存は旧方針のまま終局まで進み、検証記録との対応も保たれる。`cpu-policy.mjs` の旧版を変更しない複製として残す必要がある。
  - 案P2：旧保存の再開を許し、続きは新方針で指す。旧版のコードを持たなくてよいが、同じ保存から以前と違う展開になる。
  - 案P3：現行どおり拒否する。進行中の対戦が失われるので推奨しない。
- **戦績**：将来、戦績の行に方針の版を足すと難易度の集計を版ごとに分けられる（保存形式の変更になるため、今回は提案のみ）。
- **テスト**：`tests/hotseat1-restore.test.mjs`・`tests/lover-text-fix.test.mjs` は `policy:'heuristic-1'` の保存を作って再開している。P1なら変更不要、P2なら版の検査の変更に合わせて追加が必要。

## 正式採用時の影響範囲（B1を例に）
| 対象 | 変更 |
|---|---|
| `cpu-policy.mjs` | `stepValue` の `stat`／`chosenStat`／`if` に勝負中の分岐（実験コピーの差分は約10行） |
| `cpu-observation.mjs` | `hints()` で `if` の `{variant}` 条件をヒントに含める（1行程度）。公開範囲は変わらない（自分のカードの静的な本文） |
| `cpu-session.mjs` | 版の登録と再開時の方針選択（上記P1） |
| `tests/` | B1のRED/GREENテストを正式テストへ移す |
| 変更しないもの | エンジン、ルール、カード、デッキ、hotseatの版、保存形式（CPU保存の `policy` 欄は既存） |

B2は `scoreCpuAction` と観測の `horizon`・`oppUsable`、B3は `place`（しかけ）の評価と観測の `trapHint` が加わる。どちらも同じ版の仕組みで扱える。
