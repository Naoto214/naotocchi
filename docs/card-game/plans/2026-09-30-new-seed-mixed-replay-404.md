# 404 R9のAターンを連続再生

403のremote HEAD `e3316cbdc9aee5cfd05b06b99fd4cd7ebbb471f6`、tree `d22ca3498712e61a82b98b1ec4e88846f8829dd6`、PR #259のDraft/open/未マージを再取得した。保存state raw SHA256 `0c385e99ebc38392b1845e0eda9b34aff640eaf404e14da5b548e6265f76b436`、GitHub blob `54f33b92bd83b29e4d1d7e372d278d6fba7020dd`を照合して再開する。

専用REDを確認し、401/402の到達済みadapterで4経路のA交換・開始時応答/能力・通常選択・終了前応答・六段階終了・Bドローまでまとめて進める。終了証拠へ401〜403の保存event/snapshotを連続追加し、全中間hashと正準JSONをGREENで確認する。全proxy回帰は環境更新後に旧process/logが残っておらず、完了結果を取得できていないため未完了と記録する。既知119/120件数errorの個別再現記録は403を正本とする。

実施結果: 初回専用REDを確認。到達したコイン候補を138/188で完全列挙し、通常比較は131/141、開始時連鎖は142/154/155/196を再利用した。4ターン36 event/snapshot、24 decision。専用3件GREEN、canonical JSON・全hash連鎖・六段階終了検査を通過。未公開山札順の選択不変、候補欠落とhash改変の拒否、逆順解決と源領域を検査した。405のBターンへ継続する。
