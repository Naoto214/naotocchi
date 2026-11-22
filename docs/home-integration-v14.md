# 正式ホーム統合 VERSION 14

基準mainは `9539e462e78452ad6da5f72d454911679b4ec20e`。#561はマージ済み。その他の対象PRはすべて独立した比較記録として保存されている。ベース欄はGitHubのPR設定を示す。
# 関連PRと採用判断

| PR | ベース | 照合した先端 | 対象 |
|---|---|---|---|
| [#561](https://github.com/Naoto214/naotocchi/pull/561) | main | `985a369d6b` | 本番の基礎。自律・会話・地形・接触を継承。 |
| [#567](https://github.com/Naoto214/naotocchi/pull/567) | main | `fae83a2191` | 13地域のE3候補。全体の標準化は保留。 |
| [#568](https://github.com/Naoto214/naotocchi/pull/568) | main | `2935622edf` | E3+の雪・雨・花びらは比較資料。 |
| [#569](https://github.com/Naoto214/naotocchi/pull/569) | main | `28628cf336` | 採用済みの落ち葉B。動きと表示を抽出。 |
| [#570](https://github.com/Naoto214/naotocchi/pull/570) | main | `e07d2cc53e` | 役割別サイズBと人数・幅補間、84%表示の廃止を採用。 |
| [#572](https://github.com/Naoto214/naotocchi/pull/572) | main | `a0df9061c2` | 接地・入力性能の差分を選別。診断UIは除外。 |
| [#575](https://github.com/Naoto214/naotocchi/pull/575) | draft/home-finish-v5 | `5db9835478` | 安全な終点・部分移動・反応の供給元。 |
| [#576](https://github.com/Naoto214/naotocchi/pull/576) | draft/home-drag-finish-v6 | `e1f4a74368` | 短距離入力と混雑時の回復を評価。 |
| [#578](https://github.com/Naoto214/naotocchi/pull/578) | draft/home-mobility-v7 | `6b2e2a22ab` | 複数住民への支援と描画安定化の比較資料。 |
| [#579](https://github.com/Naoto214/naotocchi/pull/579) | draft/home-mobility-v8 | `be5db6804b` | コウモリ・柴犬の再配席は採用保留。 |
| [#580](https://github.com/Naoto214/naotocchi/pull/580) | draft/home-mobility-v9 | `ed671e26f5` | 全員の歩行を目的にする初期配置探索は終了。 |
| [#581](https://github.com/Naoto214/naotocchi/pull/581) | draft/home-mobility-v10 | `5f899a2de8` | 同一表示差し替え時の足元同期を採用。目的地の事前変更・拒否後探索は保留。 |
| [#582](https://github.com/Naoto214/naotocchi/pull/582) | draft/home-mobility-v11 | `bff63b9db6` | 同一投影の足元保持は実機確認候補。曲がる道譲りは保留。 |
| [#583](https://github.com/Naoto214/naotocchi/pull/583) | draft/home-mobility-v12 | `fb1c8238f9` | 正式ホーム用の独立パッチと対照Aを使用。地形B〜D・初期席・接触緩和は除外。 |

# 確認範囲

320pxの森で安全な経路を持たない住民の待機を許容する。入力の受理、足元の保持、安全な到着を個別に確認する。実機Safariでの指操作、長時間の発熱と電池消費は本人確認に残る。
