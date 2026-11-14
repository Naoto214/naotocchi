# VERSION 2の物理ルール照合

採用版の基準はPR #504の正式第1章。マージ `f6498ff4` とPR #535のVERSION 1 `93e5bb72` で、第1章のエンジン・Dの候補探索・盤面・解法、および参照先の共通エンジン・条件判定の内容は同じ。PR #523の比較時点 `9ebcda6d` でも同じ物理コードを使っている。既存の保護テストと今回の回帰テストで、正式の物理コードとその共通依存ファイルを採用時のSHA-256で照合する。 [PR #504](https://github.com/Naoto214/naotocchi/pull/504) · [PR #523](https://github.com/Naoto214/naotocchi/pull/523) · [PR #535](https://github.com/Naoto214/naotocchi/pull/535)

## 正式実装と試作の境界

| 経路 | 手の解決 |
| --- | --- |
| 正式第1章 | `createState` と `move`。一歩の妥当性、上りの足場、接触、門の天面、D分裂、重力、救出を共通エンジンで処理する。 |
| PR #523 | 古城側の `castleMove` が共通 `move` を呼び、城の扉・板・昇降床などを独自に更新する。 |
| PR #535 | `createGameState` が共通 `createState` を呼ぶ。`gameMove` は上りに共通 `canAscend` を使い、`externalMove` 経由で `move` と同じ内部処理を呼ぶ。追加素材が動かす盤面を同期し、必要に応じて共通 `settle` と強制移動を解決してから手数を進める。 |

試作は採用値 `supported-v1`、`contact-v2`、`magic-gate-v2`、`recombine-once-v1` と固定Dを使う。針は進入の真後ろへ伸び、障害に当たると時計回りに90度曲がる。曲がった向きを保ち、生成済みの1を通過せず、最大7体を生む。追加素材の `canEnter` と `canFall` は水や片開き、箱、開閉する足場などの条件を共通エンジンに渡す。 [正式エンジン](../../prototypes/naopoyo-time-hand-chapter1/engine.mjs) · [Dの候補探索](../../prototypes/naopoyo-time-hand-chapter1/priorities.mjs) · [試作アダプター](../../prototypes/naopoyo-100/engine.mjs)

重力標識は通行や落下に影響しない。VERSION 1の番号面データでは重力のある18面に標識の座標 `(0,0)` が記録されている。VERSION 2の表示は盤面の重力設定を読み、正式版と同じ左下 `(0,7)` に標識を置く。18面で標識の記録座標だけを左下に移す確認も行い、解法の物理イベントと通過素材は一致した。

## 照合結果

- 正式第1章の全10面で解法52手を両方の経路で実行した。各手の前に盤上の全個体で八方向を試し、隣接試行688件のうち成功201件、拒否487件が一致した。各試行で個体ID・位置・種族・段階、門の開閉状態、救出内訳、手数、次の生成ID、戻り値、拒否理由、イベントの順序と内容を比較した。
- 原本の物理・門・接触テストを参照し、八方向のD進入、7体上限、岩・仲間・門・出口・トゲによる出生遮断、曲がった向きの保持、生成済みの1、門の天面と斜め経路、合体と余り、異種族の交換、重力による再合体、出口条件違いを追加で固定した。 [差分回帰テスト](../../prototypes/naopoyo-100/tests/formal-parity.test.mjs)
- 追加素材の状態管理フィールドと、強制移動用の `heading` はアダプター内部の値として比較対象から外した。拒否時に正式版がイベント欄を省略し、試作が空配列を返す差は、どちらもイベントなしとして扱った。成功イベントや拒否理由はそのまま比較した。
- 追加調査では、重力あり・なしを交互にした合成盤面1,000枚で4万入力を比較し、共有物理の差は見つからなかった。試作の全100面では収録済みの776手を元の盤面と交換JSONから読み戻した盤面で再生し、両方で全員救出した。

照合した共有物理に差がなかったため、VERSION 2でもVERSION 1のアダプターを使用する。追加素材のある手は、動的な通行・足場・強制移動も含めて解決するため、正式第1章の盤面と同じ結果を比較できる範囲は共有ルールに限られる。回帰テストは全到達状態の列挙や追加素材の全組み合わせの探索を含まない。

```sh
node --test tests/puzzle-runtime.test.mjs tests/puzzle-stages.test.mjs tests/puzzle-protection.test.mjs prototypes/naopoyo-100/tests/formal-parity.test.mjs prototypes/naopoyo-time-hand-chapter1/tests/{physics,replay,presentation-v6,compatibility}.test.mjs
```
