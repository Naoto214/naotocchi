# ヒトデ正式基準01〜03反映 — 手順2の独立保存

人間承認済み候補を同一バイトで正式パスへ反映する工程。30表情再制作は未実施。PR全体のGREEN判定ではない。

## 基準と承認資産

開始remote HEAD: `4b87ef704064c91b0e49b442f6c9c83ee3a8e9f5`。
開始tree: `e3162dbfaf2a888a4a5fcd056a45d0864900942b`。
実main: `5a53933bff7b1f2cbca14840407b5482319732b8`。
branch: `feat/cat-expression-pilot-20260915`。PR #278 Draft/open/未マージ。

承認元は `docs/qa/starfish-baseline-candidates-20260925/01-candidate.png`〜`03-candidate.png`。
保存manifestのSHA-256・実ファイル・後続の人間決定（`growth-hunger-final-248-20260926.md`）を照合し、実画像も確認した。
当時の候補README/manifestにある「保留」は歴史的状態であり、その後の正式採用決定を巻き戻さない。

|段階|承認名|正式パス|承認画像＝正式画像のSHA-256|
|---|---|---|---|
|01|浮遊幼生|assets/characters/starfish/01.png|bab2be337b112e256b5991bc3c90ce802f67e60638cb30f15a8436c5688eac39|
|02|後期浮遊幼生|assets/characters/starfish/02.png|d2bea1405df2b329785fadbd13e12f69887c8701c0653894ba989b8d5bfa225d|
|03|着底・変態期|assets/characters/starfish/03.png|220666ce63326a72b2125d4621bb587f3edbc01271faefe38671162947c06bb0|

03は一身体・一顔。青い残存幼生部分からピンク〜橙の星型側へ主体が移る。顔は星型側のみ。青い部分へ第二の顔を追加していない。

承認原本は1254×1254 RGBA。今回は「保存済み承認画像そのもの」という指定に従い、128pxへの縮小・再正規化・再圧縮を行っていない。従来128px前提の制作ツールへ無条件に投入できることを保証するものではない。手順3での制作・正規化方針は別承認工程とする。

旧画像は開始HEADのGit履歴に保持。候補・比較履歴を削除していない。旧SHA-256は01 `dcbd67f8016518b3492842ccccded235137b81fb7584cbd6fd422632a98183d7`、02 `c96b74fd84f18ab534b46f7c21289a3ec151b5beca47df726c0e2a0ef756f28f`、03 `b7224acbc062e564eede8d8b7588a7da15c0f20b1b82f54f56d64aa51e6b5ac9`。

## 表示・中間状態

[正式8段階＋64/80/104px比較](starfish-baseline-step2-20260927.svg)。正式ファイルを直接読み込み、現在の `accentFor` 出力・既存下端補正で静的合成した。食事SVG・思考バブル・offsetは変更なし。

- 01→02は青い浮遊幼生から細長い後期幼生、03で青い部分を残し星型を形成、04で星型へ移る連続性を確認。
- 04〜08は既存基準をそのまま表示。アート統一を理由に加工しない。
- 新基準＋空腹位置の診断合成は、64/80/104pxで顔の隠れ、足元由来、身体への明確な不自然な重なりを認めなかった。01は右上へ離れた配置だが、バブルによるつながりが読み取れる。位置変更は0。
- 実際のhungry時は引き続き旧基準由来の表情PNG。診断用「新基準＋マーク」と現行hungry表示を資料の上下で明確に分けた。
- `cast-bounds.js` の既存128座標の形状情報・顔座標等は変更していない。新画像の輪郭を再抽出したという意味ではない。将来30表情の制作後に実表示・当たり範囲を再確認する。
- normal/未対応表情のassetForは正式パスを参照する。既存表情経路はそのまま。
- 実ブラウザーHomeは `net::ERR_BLOCKED_BY_CLIENT` で未確認。静的合成・ファイル参照・VM描画テストの確認を実ブラウザー成功と扱わない。

## 非変更監査

開始時ローカルtreeがremote treeと一致することを確認し、そのtreeとのGit blob比較を実施。

|対象|結果|
|---|---|
|通常31系統×8段階|248枚中3枚変更／その他245枚非変更|
|ヒトデ04〜08基準|5枚すべて非変更|
|通常育成表情|2,480枚変更0（他の保存済み表情PNGも変更0）|
|15食事SVG|変更0|
|248食事割当・resolver|変更0、既存248期待値テストPASS|
|位置・キノコ07 B|コード差分0、既存位置テストPASS|
|名称・ゲーム数値・セーブ・CSS|変更0|
|候補画像・旧比較資料|削除・上書き0|

01〜03の表情テストは、意図した中間状態に合わせて「新基準と同じ輪郭」から「旧基準の輪郭と承認済み30表情hashの保持」に限定更新した。その他の128px／bounds条件は維持。新基準の承認hash一致テスト3件を追加し、コピー前に3件FAIL、コピー後にPASSを確認した。

## fresh検証

- 関連：`node --test tests/pet-expression-assets-test.cjs tests/hunger-profile-test.cjs tests/pet-expression-test.cjs tests/pet-expression-integration-test.cjs tests/cast-layout-test.cjs` — **1,135 PASS / 0 FAIL**。
- 全体：`npm test` — **1,847件：1,843 PASS / 4 FAIL**、約453秒。新規3テスト追加のため前回より総数3増。既知4件の対象およびactual/expected配列は手順1ログと一致、新規FAIL 0。
- quick-mode該当テスト：今回の全体実行内でPASS（約218ms）。原因未特定の追跡継続。
- `git diff --check`：PASS。

既知4名称FAIL（starfish/sakura/world_tree/unknown、`tests/cat-expression-preview-test.cjs`）は今回修正対象外。quick-mode初回「solving dodge counts」FAILは原因未特定として追跡継続し、今回PASSしても解消／既知flakyとはしない。

## 次工程への停止線

手順2の基準反映のみ実施。人間確認前に手順3へ進まない。

未完了：ヒトデ01〜03の30表情、04〜08の既存50表情保持、08小泡確認、犬03 wantsPlay左前脚、ウスバカゲロウ07の5表情／08の10表情、承認名称の最終同期、既知4 FAIL、quick-mode原因、実ブラウザー・確認Site・最終セーブ互換・画像hash・fresh全体テスト・最終GREEN。なおと制作なし。

保存後HEAD/treeはこの資料を含むGitHubコミットを参照（自己参照hashは埋め込まない）。最新HEADのActions/check-runs/statusesをfresh確認し、0件/pendingをCI成功としない。
