# 正式裁定反映：通常08＋10表情 最終contact sheet

[最終contact sheet](final-contact-sheet.png)／[人間裁定正本](decision.md)／[候補status・provenance](selection.json)／[保持検証](verification.json)

人間裁定を先にGitHub commit `1e2fd4f82eb37810f90ac7d4016feea42df4592a`（tree `a3245b4affb29f4bc3e6390e04a3c1ec4ef29c85`）へ保存し、その選択表から資料を作成した。strained A・critical Aを正式選択、両Bは不採用履歴。tired D4、wantsPlay WP-CL1、hungry現状維持、sick等その他の現在候補を維持。旧本番や不採用Bを最終一覧へ混入させていない。

128／104／80／64pxを同倍率・共通背景で一覧化。顔の同座標6倍、脚・腹部2倍、後方粒子・軌跡2倍を併記。翅・触角・全体構造は本体4サイズの一覧で確認できる。状態マーク・汗なし。Pillow NEARESTの静止資料で、実Homeブラウザー・iPhoneのDPRや補間は未検証。原寸判定は資料を100%で表示し、画面幅への自動縮小と区別する。

## 最終確認の観察

- 11枚とも同じ褐色の頭部・縞状腹部・淡色の網目翅・細い触角と脚を持ち、同一個体・画風の比較としてまとまっている。今回の並べ直しによる身体変形・欠損・追加はない。入力ファイル自体がbyte不変である。
- strained Aは狭い目と控えめな口のまま。薄い笑顔にも読める点を消す修正は行わず、人間が選んだ128pxの自然さを維持。意味は既存の正式状態マークで補完する裁定を継承。
- critical Aは他表情より微小点が多く、後方に散る密度・大粒と細粒の混在・細い軌跡がそのまま見える。これを今回の裁定に反して異常／要修正へ戻さない。顔や翅が粒子で全面的に覆われる見え方は見出さなかった。
- happyの笑い目、wantsPlayの開眼と明るい口、sleepingの閉眼、sulkyの内向きの目元などが残る。80／64pxでsick・weak・tired・critical等の細かな状態差が弱まる点もそのままで、顔単独の10状態完全識別は要求しない。
- sickの脚脇小成分、hungryの自然な眼の非対称、WP-CL1の縮小時白点消失を追加修正していない。D4と既承認16枚も保持。

これは既存画像の表示確認であり、新たな採否をAIが決定するものではない。最終contact sheetの人間確認を待つ。

## 保存・検証範囲

- 今回の本番PNG／既存候補PNG変更0、新規候補0、新規生成0。新規画像は比較PNG1枚のみ。
- 開始remoteの既存4,048ファイルをGit blobと照合。チェックリスト1ファイルだけ裁定を追記し、他4,047ファイルは全一致。既存PNG2,927枚すべて保持。新旧候補・承認済み16枚・全本番・通常08も含む。
- selection.jsonの通常＋10画像、両BのSHAを再検証。全11画像の選択元pixel変更0。critical Aの既存代理測定53成分／189画素／5.93%を固定。通常08実在RGBの既存対応・色調方針は変えていない。
- [generate.py](generate.py)は選択元を読むだけで、今回資料だけを書き出す。同じ選択表から比較PNG・verification.jsonを再作成しbyte一致を検証。
- focused testsの今回結果は[focused-test.log](focused-test.log)と[test-summary.json](test-summary.json)。全体テスト・quick-mode・実Homeは今回未実行。既知quick-mode問題を解決扱いしない。
- 保存前のgit diff --check／staged差分検査、保存後のremote HEAD／tree／実main／PR／競合／CIはfresh確認して最終回答へ記載する。CI0件／pendingを成功扱いしない。

**裁定の記録と比較資料作成まで。本番一括置換・手順5・Ready化・main取り込み・競合解消は行わず、人間確認待ちで停止。**
