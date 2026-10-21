# 466 inline計画 — bundleから真正な初回判断位置への接続

Spec: 459/463/464/465。既存正本・旧tools・保存結果は変更しない。新seed/root採取、実験用入力固定、新対戦、保存run再実行なし。歴史115反復in-memory bundleと固定合成rootによるunit検証のみ。

1. Source pin付き一般化初期loaderをTDD。465 bundleから行/owner/先後/40現物を取り出し、既存117の初期state規約（5手札/そだち20/時0/たまご）へ構成。135 path/seed profileを使わない。供給bundleの独立性/lockは別gate。
2. 初回開始bridgeをTDD。01/02/64由来の固定処理順でR1/通常draw/たまご追加draw/全7現物/mandatory O/選択適用/最初のresponse境界を結合。保存選択を入力しない。464乱数、465局所候補/適用を使用。
3. 初回義務ledgerとevent/snapshot/hash/continuationを全fieldでvalidator再構成。通常draw直後の途中state、判断前state、終了stateを区別。最初のresponse以降や後続turn/effect Oは未証明。full match適格へ昇格しない。
4. 関連TDD・回帰、独立レビュー1回、保護確認、GitHub保存。

Review focus: mirror owner/seat・7現物・draw順・初期state/lookup結合、Oをcallerやログ件数から取得しない、カードlookup除外の旧game hashをbundle/全体hashで補う、116結果改名なし、既存2event形式とcontinuation接続、欠落/追加/型/順序改変拒否、他機会/全対戦を暗黙0にしない。

追加工程: 最初のresponse合法候補までsource-boundに接続する。初期107の全41IDについて、空の盤面/捨て札/予約・非challenge・先手時1という境界を明示。全手札現物から手札quick/非quick/準備済み専用を分離し、G-hit-blowの7宣言とI-c_coin2以外の初回有償候補はコスト/対象/発動条件で除外を説明する。通常/responseの選択根拠は変更・補完しない。複数候補へMRPを適用しない。
