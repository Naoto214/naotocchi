# 470 — 400戦準備：離脱・回収・連続runtime接続bundle

469保存から継続。これは既存107入力による条件付き実装検証であり、本番400戦でも独立balance標本でもない。preflight-readyはまだfalse。seed生成・400戦入力固定・本番開始は0、新方式未採用、policy promotion=falseを維持する。

## 接続した共通責務

- 満員なかま交代：全3対象を現在候補表から列挙し、旧なかま・装備の捨て札移動、新なかま配置、共有人物回数、response入口を原子的に接続。77のきずなが防がない自分交代／コストと、開始・終了装備を区別する。安全無料配置とは判定しない。
- 離脱コストを伴う回収：C-cat_friendの通常行動／自分ターンresponse、対象固定、本人を山札下へ置く支払い、使用回数、離脱後もchainに残る発動参照、対象再確認、手札回収を接続。同じ支払い／解決を共用し、normalとresponseで別効果を実装しない。
- 捨て札回収quick：G-animal-shogiの全公開なかま対象と時2を既存quick／payments／chainへ接続。回収できた場合だけ山札上・下選択。465の指定sourceではないので旧116 seededのまま、policy許容へ拡張しない。
- 選択根拠：既存114先頭4優先の確定値だけで上位を分離できる場合に適用する。資源比較は未証明のまま、既存116で継続する限定接続。一意の既存上位勝者はpriority_unique。未知の資源、消費、将来結果を0や同値にしていない。その他の比較が残ればfail closed。旧72件を遡及変更しない。
- 468の同じstep loop・9scope・forced dispatcherを再利用。追加scopeは直列・非再入で復元する。新しい400戦用ゲームエンジンは作っていない。

## 検証範囲

専用TDD18件はPASS。REDログは能力入口、対象列挙、効果実行、通常選択、runtime replay、normal origin、上位一意、非再入等を含む。偽コストreceipt、偽runtime、解決前の対象消失も検査する。

中間合成結合で、既存115初期順＋固定zero policy rootsから両者10ターン、追加174event／132decision、R10比較まで到達した。これは新規独立入力ではなく、固定入力による実装診断である。旧116判断を含む。結果は全体適格性・balance結論に使わない。この完走は同時誘発など未到達ケースの網羅証明ではない。

中間probeには、結果の梱包時にsessionのbytesキーをJSONへ直接渡して失敗した試行がある。後続ではhex表現へ変換して保存した。失敗試行を検証PASSとは数えない。最終生成も同じ174event／132判断でR10比較まで完了し、実行前後のtools直下全Python source fingerprint一致を確認した。最終生成は同じ実行器の検証であり、別実装によるルール検証ではない。

関連300テストPASS、population系98テストPASS（専用／関連と重複あり）、npm406PASS、設計データerrors=[]。470では全proxy回帰の再実行は行っていない。468の全proxy1406件観測済み結果と今回の関連300件を混同しない。既存追跡ファイルの保護検査はverification/protected.jsonに保存。README索引以外の既存blobは変更していない。

## 独立レビュー

1回の独立レビューはCritical0／Important1／Minor1。Importantは旧instanceをそのまま再配置できる点で、6種の配置入口と直接交代に共通guardを追加し、105共有allocator接続までは停止させた。Minorは支払い0とfalseの同値受理で、canonical比較へ変更した。各RED→GREEN後、同一レビューcycleの修正差分確認で未解決0、対象4テスト独立PASS。全面レビューの再実施ではない。

## 継続事項

41 IDと通常入口から終了までの横断表は[data/proxy-population-runtime-completeness-470/runtime-cross-audit.md](data/proxy-population-runtime-completeness-470/runtime-cross-audit.md)。共通の残件は06誘発区分順／見送り／解決後誘発、再登場個体、開始源・予約・100維持履歴、および正の条件で未接続な既存handlerである。既存正本に規定がある事項は確認を挟まず続行する。

このbundleの保存を理由に停止しない。全判断機会網羅、実行器／真正入力／lockの統合、最終preflightまで継続し、seed生成・入力固定・400戦開始の直前に確認する。
