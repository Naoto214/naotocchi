# 475との整合確認

2026-10-10。475は本人承認Aの現行版追補。01/06/64/72/77/83/93/449を読み、番号付き正本の捨て札＋同時/順序指定も検索した。参照ファイルのSHAはdeparture-order-source-pins.json、検索出力はdeparture-order-source-scan.txt。

- 01は装備先離脱で装備も捨て札、満員なかまは旧人物退場→新人物配置。人物先行はこれを満たす。
- 06/64/93の一続きの処理・後続誘発を維持。内部ordinalを独立event_seqや新窓にしない。
- 72のC-cat_friendは本人を山札下へ支払う。本人を捨て札へ入れず装備のみを追加する。
- 77のI-bond1は自分による交代・コスト支払・山札移動を防がない。I-bowtie/I-sleepboost1の開始・終了条件も退場内部窓を要求しない。
- 72/83の捨て札回収は従来の対象条件と選択を維持。順序に価値がないとは扱わず、具体的配列順を保存する。山札下の「好きな順」は個別効果の別指定であり475で削除しない。
- 449の複数装着順未証明は当時の結果として不変。475を適用した現行経路のみ局所順序証明を追加する。

独立read-only reviewer departure_order_review: 重大な不具合なし。関連11件PASS。人物→準備枠順、hash構築前の変更、incarnation wrapper、receipt欠落/改竄拒否、本文整合を確認。軽微2docstringの旧説明を指摘し修正。後から追加したcat再実行テストは実装者による確認として区別する。全判断機会・全情報利用・標本適格性はレビュー対象外。

実装は退場前stateからordered receiptを作り、既存処理の保存則・prefixが合うことを確認してから、現行scopeのevent/hash構築前に配列順を固定する。共有旧detach_targetは書き換えない。人物先行の移動記録と装備のordinalはevent digestへ含まれる。既存sorted equipment IDはmembership用に残す。

検証中の補足: 最初の実複数装備replayテストはcanonicalへtupleを渡したためERRORとなり、JSON arrayへ修正。cat再実行テストは最初に内部recovery.activateを直接呼んでactivation-reference scopeを迂回していたためFAILとなり、実入口triggers.activateへ修正。これらはテスト側接続誤り。初回の相対path編集は誤cwdで不成立だったが、次の正しいpath編集で反映済み。最終結果はdeparture-order-final.logを参照する。
