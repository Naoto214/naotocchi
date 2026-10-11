# native source登録と検査責務の分離

基準4b520b3。共有existing.SUPPORTEDからsourceを取り除くとproducerと検査の両方が対象外へ変更し、実到来/挑戦occurrenceが消えても通過する欠落をRED2FAILで確認。

既存arrival/end/city/relationship predicateの責務から固定NATIVE_CARDSを構成。実474 connectionはCHALLENGE_CARDSの2種も明示要求する。collectごとにproducer登録の完全一致を要求し、出力のsource対応は固定責務から照合する。カードの発動条件・順序・値・選択計算は変更せず、開始/手札/終了dispatchの既存検査も保持する。登録欠落を単にunproved_sourcesへ落とさない。

独立review1回: C0/I0/Minor1。挑戦テストがarrival fixtureの再exportを誤importしていた軽微指摘。正しいchallenge_fixtureへ修正し、両挑戦sourceの正例/登録欠落拒否を確認。reviewerは別実行23PASSと本物の両挑戦fixtureを確認。最終39PASS30.860s/exit0、docs再帰Python1070前後一致。native-source-scope-final.log/summary.json/fingerprints.json.gz。初回tool出力ではGREEN28件を確認したが、保存logは途中で切れていたためnative-source-scope-intermediate-partial.logとし完全原本としない。最終39件は完全log/exit/指紋が揃う。REDは初回fixture誤用を含むため、到来の欠落は正当RED、挑戦の最終正例/拒否は修正後fixtureで確認したことを区別する。

これは現在native11sourceの登録/列挙責務の結合であり、全ルール・全自動dispatch・履歴起点の独立証明ではない。preflight-ready=false、gate閉鎖、生成/固定/400戦0。P09自動処理を含む最終機会合成、P10全許可read/公開履歴、P11その他operand、P14–18の最終共通gateは未完。

## 直前固定版の完全結合原本

4b520b3のconnected.reconstruct(bundle(), test-1A, 512)は143step/181event、completed=true/stop=null、8監査errors=[]、115.941s/exit0、再帰Python1070前後一致。旧115/零rootの既存fixtureのみ、生成/新規標本0。payment-connected-4b520b3-record.json.xzは元JSONとSHA256一致する可逆圧縮原本。summary.jsonとverification.json.gzを併置。これは本bundle追加前の固定版検証であり、本bundleの完全結合や全回帰としない。今回の39件には実初期入口10step検証を含む。復元を理由に両検証を反復しない。
