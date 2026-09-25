# 158 新seed現在response再開 TDD計画

1. 157保存JSONのraw SHA、canonical再生成、event/hashを照合する。
2. RED: 01-A/B/02-Bの配置後response各2 passと通常行動復帰、02-Aのpass後ターン終了入口を先にテストする。
3. 72のC-chicken/C-bat、74のP-cliff_goatの現在trigger不成立を配置eventで証明する。手札・しかけの候補を優先者ごとに独立列挙し、唯一のresponse-passだけを119の遷移で適用する。
4. 02-Aは既存122の通常pass終了要求bridgeを適用する。7件のevent seq、dual SHA、snapshotとcanonical bytesを検証して保存する。
5. 全proxyは保存HEADの固定別作業領域で実行し、後続の編集と検査母集団を混在させない。
