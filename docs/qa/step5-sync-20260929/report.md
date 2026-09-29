# 手順4全体完了・手順5同期（2026-09-29）

手順4は26/26本番反映を実ファイルで確認して完了。手順5は承認名称・説明正本・確認Siteの同期。**最終GREENではなく、手順6は未着手。**

## 再開と手順4ゲート

GitHub fresh HEAD `1bde42db88ec06206cd1a6bca3633fde345b0e21`、tree `fa07ee15674a9f95129369772c27e1a502d0cd1c`を唯一の開始基準とした。実mainは `05b31dfd4c2c2ebecc5890ffc2a23efbcfd1d032`。PR278 Draft/open/未マージ、競合判定は一時unknownから再取得でmergeable=false/dirty。main取り込み・競合解消なし。

|対象|本番照合|証拠|
|---|---:|---|
|犬03 wantsPlay|1/1|局所補修after SHA-256とlocked16一致|
|ウスバカゲロウ07 strained/hungry/tired/weak/critical|5/5|同上|
|ヒトデ08全10表情|10/10|同上。泡の再監査はしない|
|ウスバカゲロウ08全10表情|10/10|正式選択元と本番byte一致|

ウスバカゲロウ08はtired D4、wantsPlay CL3、hungry B、strained A、critical A、その他は正式方式D候補を維持。CL3の非対称、critical Aの多い粒子、64pxでの微細要素消失を再課題化しない。

手順4開始 `2b0969ac4fc64a636e12673a25740c59793f8ca5` の対象外character PNG **2,755枚不変**。未反映0。[26枚の実測SHA・照合結果](verification.json)。原制作manifestの生成時provenanceを保持したうえで、ウスバカゲロウ07指定5枚・ヒトデ08の10枚のfinal SHA/status参照を承認afterへ同期。犬03の採用根拠は既存局所補修manifestとlocked16。本番画像のコピー・補修は今回0。

## 名称と説明正本

- ゲーム正本の承認名称を維持し、preview名称表のヒトデ・サクラ・世界樹・unknown、およびunknownテスト期待値を同期。
- 31系統248段階を名称正本と照合。男女メニューの既存「（男）／（女）」は識別補助表記として保持。
- `principles.visuals`とregressionChecksの旧種子除外規定を修正。開始待機の卵は別枠、承認済みの種・蛹・変態等を成長段階として維持。
- `growthInterpretation`に鉢クラゲ型参考、サンゴの一群・群体と海の豊かさ、ヒトデ幼生経路の非普遍性、描画上の大型化、カクレクマノミの社会状況に基づく代表的物語、既存空腹semanticの注意を記録。説明データのみでゲーム処理を変更しない。
- 開発checkpoint冒頭の矛盾する規定を修正し、日付付き旧制作記録は履歴であることを明示。旧QA・過去の生成指示を新たな修正命令に書き換えない。

## 確認Site

既存の同一Site／同一URL／owner-only customアクセスを維持。別Site作成、公開範囲変更なし。詳細は[Site保存・配信記録](site.json)。

- 既存育成プレビューを現行generatorから再作成。通常画像・名称・状態マーク・セーブ分離を維持。
- 既存全2480表情ギャラリーの248段階シートを現行PNG／現行accentForから再構成。ヒトデ01〜03新基準と04〜08、犬03、ウスバカゲロウ07/08、ヒトデ08を含む。画像再生成ではなく確認資料の静的合成。
- ギャラリーの初期対象を全表情へ。フィルター・選択・メモ・コピー機能、保存キーを保持。
- runtimeの差分は旧Siteから必要なpet-expression JS/CSS・名称正本のみ。asset 2,862ファイルは現リポジトリとbyte一致。
- 資料生成で見つかった相対参照hunger SVG欠落をdata URI埋め込みで解消。静的合成の旧描画順を本番と同じ本体→汗→状態マークへ同期。本番resolver/z-orderは非変更。
- 初回描画の日本語フォント不足をNoto Sans CJK JPで解消し、空腹マークと文字をサンプル目視確認。旧中間version73は公開せず、修正版を公開。
- 既存final-auditページは9月23日の履歴として保持し、先頭で現行資料へ誘導。旧比較画像を現行の修正課題として扱わない。

全体の実機見た目・動作を最終承認したものではない。静的ギャラリーの汗は既存の静止近似であり、実Homeの最終QAは手順6。

## 検証

|項目|結果|
|---|---|
|名称の修正前限定テスト|既知4 FAIL再現、原因確認済み|
|同じ限定テスト修正後|8 PASS / 0 FAIL|
|preview・hunger-profile・expression assets/resolver/integration・cast-layout|1,214 PASS / 0 FAIL|
|runtime focused別実行|1,138 PASS / 0 FAIL（上記と重複、合算しない）|
|31系統／248段階名称・2,728asset参照|PASS|
|248シートhunger SVG埋込・静的z-order|PASS|
|hunger resolver・248期待割当|focused内PASS|
|本番 本体→汗→状態マーク回帰|focused内PASS|
|既存画像hash|3,280ファイル不変（PNG/SVG/WebP/JPEG/GIF）|
|本番画像変更|0枚|
|git diff --check|PASS|

[テスト集計](test-summary.json)、[ログ](focused.log)、[ギャラリー検証](gallery-verification.json)。今回新規FAILなし。最初の既知名称4 FAILは修正前証拠として保存。

本番pet-expression.js/CSS、care-attention.css、script.js、cast-bounds.js、cast-layout.js、emotion-state.jsは開始HEADとhash一致。ゲーム数値・死亡/回復/恋愛条件・セーブ形式・食事カテゴリ・resolverを再設計しない。なかま／こいびと／なおと、他作業へ進まない。

fresh全体npm test、quick-mode既知FAILの最終追跡、全保存経路のセーブ互換、実Home、最終確認Site QA、CIは手順6に残す。Actions/check-runs/statusesが0、pendingなら成功と扱わない。PR Draft/open/未マージを維持。
