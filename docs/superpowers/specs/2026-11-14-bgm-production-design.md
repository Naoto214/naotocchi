# 完成版BGM本番統合・楽曲ライブラリ設計

ユーザーの今回の指示が採用・統合・検証後のmainマージ／本番公開の承認。追加の作曲・音源加工は禁止。実装者が合理的な技術選択を行い、段階保存して最後まで進める。

## 統合方法
最新main105dba519890c2dc17e94a8c9d1b7679720fddf3を基準に新規ブランチ。古いPRの連鎖マージは行わない。#540はmainとの競合があり、必要な音声接続だけを現在のmainへ適用。#549=01a5591のAAC/FLAC/MIDI/楽譜/配置/receiptを直接固定し、#550=bea117bの別ページ0.36を適用。ゲームのscript.jsへの変更はBGMイベント呼出しと分類取得のみ。効果音の新規変更はしない。ゲームエンジン・キャラクター・UI・保存形式は変更しない。

代替案は旧PR一括マージ（不要な試作と競合を持ち込む）と試遊版全体置換（最新mainを失う可能性）で、採用しない。実装者の選択は必要ファイル／最小差分だけの移植。

## 正式ライブラリ
`music/library.json`を台帳、`music/approved32.lock.json`を初回32曲の固定境界とする。32ID/正式名/音源SHA/旋律fingerprint/個別gain0を記録。AACは`assets/bgm/`、FLACとMIDIは`music/masters/<id>/`、楽譜・receipt・ライセンス・sample hashes・旧PRの固定URLは`music/provenance/`に保管。PagesはAACと再生コードだけ。旧原盤／Draftを削除しない。

台帳: ID、名前、用途、種類、BPM/拍子/調性、秒数/フレーム数/loopStart/loopEnd、旋律/編曲参照、楽器、音源IDとライセンス、3ファイルpath/SHA、I/M/S/TP/LRA、採用状態、履歴。調性の出典が無い場合は不明と明示し、推定を正式情報として偽らない。配置50行は元のまま保管し、歴史上の4秒fade記述と実装1.2秒in/0.9秒outは別記。

## 新曲CLI
Python CLI `tools/music/library.py`: init、register、verify、approve、build。生成器を呼ばず、明示された新曲ファイルだけ登録／分析する。構造検証→ファイルとSHA→承認済みライセンス→AAC/FLAC音量・ピーク・波形整合・ループ→receiptを原子的に保存。ファイル・メタデータ・測定器条件fingerprintが同じ曲は重い解析をskip。ハッシュ照合は毎回行う。中断後は保存済みreceiptから再開。

不正ID/重複/空名/パストラバーサル/範囲外ループ/未知のライセンス/既存32変更を拒否。新曲はcandidateとして登録、明示的approval記録が無ければ本番catalogに入れない。buildでapprovedのみcatalogを生成し、候補を含む試聴manifestは別途生成。追加配置は独立したextensionsに記録し、旧50行を変更しない。試聴はネイティブHTMLAudioElementで同一音量・位置の比較と新曲一覧を用意。正式一覧にテスト曲は残さない。

## 再生・音量
共通BGMゲイン0.36を再生モジュールで一元化。本体は既存master0.9/bgmBus0.28を変えずfileBusに逆算して接続。サブアプリは同じ定数を使用。SFX/声/ユーザー設定は変えない。曲ごとのgainは0dB。既存選曲条件、1.2/.9fade、.25jingle切替、duckを維持。ホームは背景と同じ端末時刻/時間モード。旧なおぽよページも配置対象を確認して必要な入口だけ接続、読書ページは無音。

BGMオフ・読込中の停止・音声中断で保留音が遅れて鳴る競合を試験する。再現した不具合だけ最小修正。V7のAudioSession playback宣言とWeb Audio出力方式を保持/取り込み、ジェスチャー・visibilityで再開を検証。実iPhoneの物理可聴性を自動試験の主張にしない。

## 検証と公開
新機能はテスト先行。32原盤/3158旋律/50配置、ゲイン経路、全ゲーム分類、4時間帯、BGMオンオフ/フェード/二重再生/中断/再接続/SFX/声/保存、模擬33曲目の登録・再開・承認前後の配信境界を検証。既存npm testとサブアプリ試験、Pages許可リスト・容量・HTTP確認。最新main/開発PR重複を記録。独立レビュー後、全検証が成功した正確なHEADだけマージ。本番Pages成功後に公開32AAC SHAと主要画面を確認。問題が残る場合は未マージで理由と対応を報告。

## Builder reviewで具体化した境界
承認はファイルSHA＋正規化メタデータ＋測定policy/tool versionのfingerprintに結び付ける。変更後のapprovalは失効し、本番buildを拒否。成功receiptのみskip可能、壊れた/途中の記録は再検証。更新は排他lockとatomic replace。固定32 lockはeditable台帳から再生成しない。AAC整合は44.1kHzデコード、開始位置±1024サンプルの相関で位置合わせ、相関0.98以上、長さ差0.1秒以下、TP−1dBTP以下、clip0、loop境界差の許容上限は0.08または通常差分99.9百分位の2倍の大きい方。用途別LUFSは警告・報告で、強制正規化しない。新曲の採用時も人の承認は別途必要。
本番payloadはapproved catalog＋approved AACの明示リストのみをPages allowlistへ反映。模擬33曲目は候補段階でcatalogにもpayloadにも存在しないことを試験。既存原盤の過去receiptは改変せず、新しい測定結果は別保存。新曲のloopStart/loopEndはcatalog経由で再生部が明示的に尊重する。
ジングルは要求tokenで遅延読込とstop/offの競合を防止。完了はAudioBufferSource.onendedで判定し、キャンセルは後続曲を呼ばない。中断時のイベントジングルは取消し、ループはジェスチャー/visibilityの復帰で再開。stale errorは現在のBGMを失敗扱いしない。
