# Relationship Expression 設計承認記録

日付: 2026-09-30

## 前提
- PR #278 の通常31系統 Expression System は main 着地・GREEN・人間承認済み。
- 通常31系統の画像、resolver、hunger、z-order は保護対象。本設計では変更しない。
- なおとは作者シークレットの既存1枚を維持し、Relationship Expression 対象外。

## Relationship Expression
なかま・こいびとには通常10表情を複製しない。

共通状態:
- normal: 既存PNG
- positive: 関係が良くなるイベントに対する一時Reaction
- lonely: 関係値が30未満のpersistent Expression

優先順位: positive > lonely > normal

Expression状態そのものはsaveしない。runtime状態から表示時に解決する。

### なかま
- positive: じゃれる成功
- lonely: bond < 30
- 通常のじゃれる成功では代表1体をpositive。
- lonelyからbond >= 30へ回復した個体は、代表抽選に関係なく該当個体すべてpositive。その後normal。
- 新規画像: 26体 x 2 = 52枚。

### こいびと
- positive: 求愛、恋人成立、仲直り、結婚等。
- lonely: affection < 30
- 恋人成立・結婚等の強度差は専用PNGを増やさず、会話・ハート・既存ムービー等で表現。
- 新規画像: 18体 x 2 = 36枚。

合計新規画像: 88枚。既存画像変更: 0枚。

## なかま bond 減衰個体差
基本は30年。明確なキャラクター性がある場合のみ±5年。

### 寂しがり: 25年（8体）
すばしっこいうさぎ／おっちょこちょいリス／あそびずきカワウソ／まねっこサル／ごろごろアザラシ／すべりたがりペンギン／ひとなつっこいしばいぬ／せっかちなカタツムリ

### 標準: 30年（10体）
いたずらたぬき／ほおぶくろハムスター／おしゃべりオウム／ふわふわヒツジ／はやおきニワトリ／びっくりハリネズミ／とけかけのぷにゅ／しっぽのおおいきつね／サングラスのカメレオン／まよいこんだユニコーン

### マイペース: 35年（8体）
きまぐれなねこ／ものしりふくろう／ぐうたらパンダ／よふかしコウモリ／むひょうじょうのせきぞう／じかんにルーズなとけい／みているなにか／ただのはこ

将来追加は30年をdefaultとし、明確な設定根拠がある場合のみ25/35年。

## 結婚進行
新しい結婚条件:
- 交際3年以上
- 交際後の求愛3回以上
- 交際後のデート4回以上
- affection 70以上

デートクールダウン候補: 0.5年（30秒）。

そだち50「こいのきざし」は求愛成功率アップとデート解禁を維持し、結婚必要求愛回数を減らす旧効果は終了。新条件の求愛3回は全員共通。

affectionは70以上を結婚条件の良好ライン、30未満をlonely、0を既存どおり別れとする。

## save / migration 方針
Relationship Expression自体はsaveしない。

新結婚進行の実装にはpartnerへ最小限の進行情報が必要:
- 交際開始時点
- その恋人への求愛回数
- その恋人とのデート回数

既婚の既存saveは絶対に未婚へ戻さない。旧未婚saveのbondCountはmigration設計時に安全に扱い、旧進捗から突然結婚を成立させない。実装前にmigration仕様を別途確定する。

## resolver 方針
通常31系統の10状態resolverへRelationship固有条件を混在させない。再利用するのは「一時Reactionがpersistent stateより優先」という仕組み。Relationship側は positive > lonely > normal の薄いresolverとする。

## pilot
全量88枚を先に制作しない。

第一候補:
- なかま: あそびずきカワウソ
- なかま: じかんにルーズなとけい
- こいびと: もりのクマさん
- こいびと: いわばのタコさん

各positive/lonelyの2枚、合計8枚。

成功条件:
- 同一個体性
- 身体構造保持
- 128pxでの自然さ
- Home小表示での可読性
- positive / lonely の識別
- positive > lonely > normal
- lonely救済（lonely -> positive -> normal）
- save互換
- 非対象asset hash保持
- 通常31系統への回帰0
- 将来キャラ追加への展開可能性

## 停止条件
この文書保存時点では画像生成、画像修正、runtime実装、resolver実装、schema変更、migration追加を行わない。pilot制作は別工程として人間承認後に開始する。
