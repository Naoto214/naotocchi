# 142 新seed開始時G-hit-blowの発動・連鎖解決

141保存JSON raw SHA `5870424513be6d04660ab6bd0cf7f3fdac23fbb327216dc3d89056c933f7fcbb` を固定入力とし、138の開始時response候補8件から116/119 seedで選択済みの宣言 `partner` を再検証した。141までの停止JSON、event/state/hash、カード本文・数値・登録区分は変更しない。

119の公開遷移器は `after_normal_action` のみを受付ける。開始時窓の `window_kind=turn_start` を履歴に維持し、06で共通のpriority・chain操作だけを119の合成状態へ投影して独立検証した。発動linkにはsource instance/copy、宣言variant、時1支払い、対象なしを保持する。119本体や既存の保存状態は変更しない。

02-AではAのG-hit-blowを宣言後に手札から発動領域へ置いて時1を支払い、発動者A→相手Bの順に双方がpass。逆順解決時にだけ山札上 `A-019#1` を公開した。公開カードの登録種は `partner` で宣言と一致したため、そのカードを手札へ加え、Aのそだち+5。発動元は捨て札へ移した。山札上の種類・個体は発動前の候補選択と追加応答の判断に利用しない。

| 経路 | 141最終event→142最終有効event | 142新event | 142停止 |
| --- | ---: | ---: | --- |
| `probe-01-a-first` | 5→5 | 0 | 141の配置後response候補未証明を保持 |
| `probe-01-b-first` | 5→5 | 0 | 同上 |
| `probe-02-a-first` | 2→6 | 発動1・pass2・解決1 | 解決後の通常行動候補未証明 |
| `probe-02-b-first` | 5→5 | 0 | 141の終了窓response候補未証明を保持 |

新decision 2／event 4／snapshot 4、completed 0、独立balance標本0。宣言は138のdecisionで既に記録されており、新しいseed選択として二重に数えない。原本最終game/continuation hashから最初のevent before hash、連番、各snapshot・両hashの連鎖、最終hashと正準bytesを再生成で検査する。一致・不一致・山札1枚で不一致の効果分岐を専用テストで確認した。

残る近接課題は、01-A/Bの盤上源を含む配置後response、02-BのI-c_coin2を含む終了窓response、02-Aの解決後通常行動候補の完全性。旧経路やカードcopyだけの分岐を足さず、現在stateから一般の発動機会として証明する。

## 検証

142専用3件PASS（実装前のREDを確認）、保存JSON `--check` 再生成一致（raw SHA `162f4de66bc0352b80e215f48a6651d00019c2897904c78d50023deda885b64b`）、設計データ検査 `errors=[]`。全proxy回帰は38ファイル・426件中425件PASS、FAIL 1件、ERROR 0件。唯一のFAILは117旧テストの歴史的件数期待190・実測263であり、142由来の新規失敗0件。全件GREENとは扱わない。141原本raw SHAとそれ以前の保存証拠を変更せず、`git diff --check` を通過した。
