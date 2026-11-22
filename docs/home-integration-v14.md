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

## 本人限定の試遊と採用判断

[統合ホーム](https://naotocchi-home-integration-v14.kerzion214.chatgpt.site/)では、地域・時間帯・住民数を選んで試遊できる。通常プレイと試遊のセーブを分離した。V12の山での同一投影保持は、パンダの変位55.66→0px、主人公の歩行72.56pxをLinux WebKitで確認した。iPhoneでの安全性を確かめるため、[山の比較](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/foot-corridor.html)に残した。

#584では、山のナビゲーションが作り直された時は従来の配置処理を使う。V14のモデル同期に渡される住民情報には、原画・装備・実測した描画範囲がそろっていない。投影の更新番号も、交換前後の歩行床・遮蔽・カメラ枠が等しいことを示さない。さらに最初のモデル同期は、新しい描画範囲を反映したカメラ調整より先に実行される。

山の比較版（320px・10体）では、元の足位置に主人公用の通路が1本あり、保持後も同じ通路を歩けた。森の対照では通路が0本で、従来の配置に戻ると5本になり、主人公は67.42px歩いて到着した。これらは保存した場面の再生値。V14で同じ投影でも歩行床だけが変わる場合は、古い経路と目標を解除することをモデル試験で確認した。[Linux WebKitの山・森の再生結果](../tests/home-integration-v14/evidence/foot-witnesses-webkit.json) · [同じ投影で歩行床を変更する試験](../tests/home-integration-v14/mountain-reflow.test.mjs)

正式ホームの既定候補には、V11の表示差し替え時の足元保持、サイズB、接地用の草・波紋・影、落ち葉B、短距離入力・部分移動・直線の道譲り1体・混雑時の選択を含めた。森28体で通知・表情の差し替え時に起きたパンダの足飛びは22.74→0pxだった。375px・28体の主人公は本番33.17pxから45.77pxとなり、#572と同じ1.38倍になった。塗られた落ち葉の比較は16フレームすべてで画素差0だった。E3・E3+全体の採用は保留とした。

## 全地域の統合候補

13地域、1・4・10・20・28体、320・375・390・430pxの260条件を各30モデル秒進めた。実行した46,783区間は、自律歩行43,753、ドラッグ2,437、道譲り593。地形・遮蔽・速度・接触の検査で違反は0件だった。全条件で背景と住民を描画し、会話・進化・装備・住民増減・時間帯変更・画面幅変更・保存復帰の試験を通過した。[各条件の観測](../tests/home-integration-v14/evidence/regional-candidate.csv)

全260条件で狙った住民へのタップとドラッグ指示を確認した。233件はすぐ受理、20件は再試行で歩き、7件は指示方向で待機した。この7件は同じ住民・同じタッチ開始位置のまま空いている方向を指すと、すべて7〜8区間歩いた。おうち・430px・20体の自律歩行で見つけた接触は、すべての歩行で一歩の途中も接触条件を調べるようにして修正した。[同一操作の再現](../tests/home-integration-v14/evidence/swept-contact.json) · [方向を変えた7件](../tests/home-integration-v14/evidence/stationary-drags.json)

## 描画・保護・未検証

Linux WebKit・森28体の最終候補は、90秒×4試行でフレーム間隔中央値16ms、p95は52〜93ms、p99は62〜106ms。13,231区間中、250ms超3回、500ms超1回、1秒超0回。同じ試験で本番は32・3・2回、V11足元のみは38・3・1回だった。候補への48タップはすべて対象に届いた。390px正順では本番よりp95が35ms長く、逆順では116ms短かった。[全版のフレーム間隔と入力](../tests/home-integration-v14/evidence/performance.md)

更新対象はホームとその検証。52背景・キャラクター画像・BGM・カード・他ゲームの本番素材、セーブ形式は基準mainを維持した。本人限定サイトは容量制限に合わせて、高精細カード画像118枚だけを公開済みmainの固定ファイルから取得する。全件のSHA-256が一致し、通信に失敗すると同じカードの小さい原画を表示する。iPhone Safari実機の指入力・発熱・電池消費は本人確認に残る。

### 同じ260条件での本番と旧版の比較

| 版 | 実行した区間 | 区間途中の接触違反 | 狙った住民へのタップ・ドラッグ指示 | 即時受理 | 指示後に歩かなかった件数 |
|---|---:|---:|---:|---:|---:|
| 本番 | 46,060 | 68 | 260 | 244 | 14 |
| V11足元のみ | 48,408 | 0 | 259 | 232 | 5 |
| V13のA | 47,891 | 0 | 259 | 232 | 5 |
| V14最終候補 | 46,783 | 0 | 260 | 233 | 7 |

各版の地形・遮蔽・速度違反とページエラーは0件。安全検査は各区間を移動中の住民から他住民までの距離で評価し、もともと重なっていた2体が互いに離れる動きは許容した。タップ・ドラッグ指示の値は意図した住民へ入力を渡せた条件数で、待機件数は指示を渡した条件だけを数えた。本番と旧2版はGitHub実行の13地域・780条件、最終版はローカルChromiumの260条件。[旧版の条件別CSV](../tests/home-integration-v14/evidence/regional-controls.csv) · [最終版の条件別CSV](../tests/home-integration-v14/evidence/regional-candidate.csv)
