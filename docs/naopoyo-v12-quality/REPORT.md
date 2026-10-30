# なおぽよ。VERSION 12 独立比較版

## 実装
- ステージ20: 156→97手、斜め47→25。19: 91→78手。実エンジンで検証済み短縮版。最短性は未証明。
- 全10面の旧解答、全操作前後盤面、新解答、探索候補と指標をこのフォルダへ保持。
- おてほんの再生位置はステージ別の独立localStorageキーへ保存。移動列の正規化JSONを厳密な解答識別子として保存し、同手数でも内容が変われば0へ。メタデータだけの変更なら同じ盤面のため位置を維持。再開は一時停止状態。
- Undoの原因: WorldSession.undoがpaused=trueにし、appもuserPaused=trueにして、#pausedの半透明白い盤面被覆と▶再開案内を表示していた。ページ遷移やゲーム再作成ではない。ForestSessionだけ元のpause状態を保持し、appの強制pauseを撤去。履歴復元・motion消去・save形式は既存処理を維持。

## 正本と並行作業
- 起点 PR436 5284d5e42cab98c9c6d7080e04d04c0aadcb3d51。
- 開始時 main 953b9c34d551bfa230f275a15c58b4ec72663e3c。
- 作業中PR436にab937a22e2ae246b87b58932815dad2c4e8a2d87追加。物理は無変更、接触調査の資料と109テストのみと確認して本V12ブランチへmerge。新旧例題手数の固定値のみV12用に78/97へ合わせ、その他のテストは保持。
- base: feat/naopoyo-chapter2-gravity-pilot-20261024、head: feature/naopoyo-v12-quality。積み重ね型Draft。PR436へのpush、mainへのmerge、本番Pages更新なし。V11 URLは維持。
- 物理engine、WorldSession、第1章、stages、通常progress/saveスキーマに変更なし。将来ルールが変わる場合は新ルールで全解答を再検証する。

## 検証
- パズル（第1章・第2章・Insight・World・v2・Rescue）947/947。
- Pages単体16/16。既存解答design verify、audit成功。
- 新旧全手再生、段階合計・合法性・通常入力とおてほん一致、各手Undo・保存復帰、split/merge/overflow/swap/rescue/fallを検証。
- ブラウザー390×650 iframeで80手保持、再開、前後、自動再生/停止、通常盤面と履歴保護、連続Undo、移動再開、reload後位置保持/Undo、最初からを確認。
- 再生位置の破損/範囲外/容量エラー/同手数別解答のリセットをunit検証。
- 独立レビュー: 重大問題なし。メタデータのみ変更で位置を維持する判断は盤面不変のため安全。未使用importとhashというテスト名を訂正。

## 制限
- iPhone Safari実機・実指操作は本人確認待ち。クラウドChromeのiframe寸法を用いたQAはWebKit実機検証ではない。
- localStorage全体を拒否するブラウザーでは既存mount側の非ガード参照が残る。新しい再生位置保存はエラーを捕捉するが、アプリ全体のストレージ拒否対応は今回追加していない。
- 初期ローカル回帰でsparse checkoutの未展開資料/画像のENOENTあり。必要ファイルを正本から展開したが、ローカルRuntime全成功には至らず2894成功/24失敗。完全checkoutのGitHub CIでは3504/3504成功。失敗記録と確定結果はDELIVERY.mdを参照。テスト削除・無効化なし。
- GitHub CI、公開先、配信照合の確定結果は後続のDELIVERY.mdへ記載。
