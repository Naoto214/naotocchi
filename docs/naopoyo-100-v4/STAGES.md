# V3全100面・V4比較評価

100/100合法・最短。主条件93解なし/5対象外/2未確定。補助86条件:67解なし/15省略可/4未確定。exhaustedのみ指定条件下の全探索証明。limitは未確定。見た目・面白さは本人評価待ち。

|面|タイトル|主禁止|補助禁止|優先度|順序・選択|類似系列|
|---:|---|---|---|---|---|---|
|1|ひとすじの星|対象外||低:導入役割を確認|右へ二歩進んで最初の星に触れる。||
|2|底で光る星|exhausted||低:導入役割を確認|足場の切れた場所を一方向の落下路にする。||
|3|石戸の向こう|exhausted||低:導入役割を確認|板を離れた瞬間と一歩の通過を比較する。||
|4|ちいさな門番|exhausted||低:導入役割を確認|二つの門のうち、自分の段階が合う方を選ぶ。||
|5|離れた石環|exhausted||低:導入役割を確認|壁で離れた小部屋を同じ印の環で渡る。||
|6|二つの名札|対象外||低:導入役割を確認|近さではなく種族で出口を選ぶ。||
|7|離れても灯る|exhausted||低:導入役割を確認|記憶の留め具は空に戻っても開きを保つ。||
|8|反対側の大きさ|exhausted||低:導入役割を確認|数の足りない二体を門の手前で一つにする。||
|9|すれ違う星|対象外||低:導入役割を確認|両端の種族別出口を交差させ、異種族交換を必須にする。||
|10|白い曲がり角|exhausted||低:導入役割を確認|氷へ斜めに入り、滑る先の下の足場へ渡る。|13|
|11|片方だけの横断|exhausted||低:導入役割を確認|矢印の左側へ回って、同じ向きから入る。||
|12|壁まで届く風|exhausted||低:導入役割を確認|複数の風をつないで吹き抜けた先の道を読む。|19|
|13|止まる場所はひとつ|exhausted||低:導入役割を確認|氷の途中では曲がれない。滑り終わる右端から出口へ向きを変える。|10|
|14|土の下は片道|exhausted|terrain.tunnel:exhausted|低:導入役割を確認|小さい体で、矢印の向きから地中へ入る。||
|15|二つにして通る|exhausted|fixture.gate:exhausted|低:導入役割を確認|門を通るために全体を分ける。||
|16|青い道と石の道|exhausted||低:導入役割を確認|水を渡れるさかなと、陸を回る犬を分ける。||
|17|流れの終点|exhausted|terrain.water:exhausted|低:導入役割を確認|下へ続く水の停止点を読み、星までの横道へ。||
|18|二度踏むと戻る|exhausted||低:導入役割を確認|一度離れて同じ板へ入ると開閉が反転する。||
|19|下から回り込む風|exhausted||低:導入役割を確認|折れた風の最後を予測して進入点を選ぶ。|12|
|20|輪の先に待つ時間|exhausted||低:導入役割を確認|離れた2を送って、対岸の1と合わせる。||
|21|気流の階段|exhausted||低:導入役割を確認|段差を上る代わりに気流の止まり際へ出る。||
|22|箱の横顔|exhausted||低:導入役割を確認|箱を動かして曲がり角までの道を空ける。||
|23|飛び石の段差|exhausted||低:導入役割を確認|低い支えから一段ずつ斜め上へ乗り継ぐ。||
|24|逆風の岸|対象外|terrain.water:shortest|中:省略できる補助を再評価|逆向きの流れを避けて、別の流れから右岸に着く。||
|25|わけ前は一つだけ|exhausted||低:導入役割を確認|分裂の残り3と生まれた1を違う出口に渡す。||
|26|門の屋根道|exhausted||低:導入役割を確認|門の上面を足場として扱う。||
|27|門の向こうで会おう|exhausted||低:導入役割を確認|合体できる二体を門より後で合わせる。||
|28|道を留める箱|exhausted|object.crate:shortest|中:省略できる補助を再評価|箱の手前を停止点にして下へ折れる。||
|29|石戸が息をする|exhausted||低:導入役割を確認|成功した一手で時計が進むので、横の空きで位相を調整する。||
|30|押し風と横道|exhausted|object.crate:exhausted|低:導入役割を確認|風は箱に当たって止まる。止まった後の自分の手で箱を押す。||
|31|白い階段、黒い穴|exhausted||低:導入役割を確認|氷の先の穴を落下の入口にする。||
|32|水の縦窓|exhausted|terrain.water:exhausted|低:導入役割を確認|泡で水中から持ち上がり、上の横穴へ抜ける。||
|33|氷の受け手|exhausted|fixture.gate:exhausted / fixture.oneway:exhausted|低:導入役割を確認|相棒が戻れない種族門を利用して、氷上の交換を阻み停止位置を作る。||
|34|波を待つ小湾|exhausted|terrain.water:exhausted|低:導入役割を確認|逆向きの波がない相を選んで上の近道を抜ける。||
|35|箱を置くくぼみ|exhausted||低:導入役割を確認|押した先をふさがないよう横道の奥へ箱を逃がす。||
|36|八と余りの二|対象外||低:導入役割を確認|上限8の合体で手前に余剰2を作る。||
|37|押し出された環|exhausted|object.crate:exhausted|低:導入役割を確認|環を出た後で、箱を先に動かせる位置を確保する。|41|
|38|二つの合図|exhausted||低:導入役割を確認|手前に見える2番を先に押さず、1番へ回る。||
|39|流されて出会う|exhausted|terrain.water:exhausted|低:導入役割を確認|下の1を停止点へ置き、流れて来る2を合体で受ける。|44|
|40|ひとつの水門|exhausted||低:導入役割を確認|泳げる二種族が狭い水中ですれ違う。||
|41|受け取り場所を空ける|exhausted||低:導入役割を確認|受け取り側を空けてから転送する。|37|
|42|同じ相を一息で|exhausted|fixture.gate:exhausted / terrain.water:exhausted / field.current:shortest / fixture.phase:exhausted|中:省略できる補助を再評価|一手内では時計の相が変わらない性質を使い、流れと波で同期した二扉を渡る。||
|43|風を越すための三|exhausted|fixture.spike:exhausted / fixture.oneway:exhausted|低:導入役割を確認|軽い体を吹き戻す風の前で3に合体し、通過後に2と1へ分け直す。||
|44|ふたつの風の棚|exhausted||低:導入役割を確認|上下で風に流される順序を使い、右岸で合体する。|39|
|45|二段の吹き上げ|exhausted||低:導入役割を確認|一つ目の気流の途中から、別の気流へ乗り継ぐ。||
|46|板に残る重さ|exhausted|fixture.plate.weight:exhausted|低:導入役割を確認|箱を板の上に残し、重さを一人で二箇所に配る。||
|47|同じ氷、違う出口|exhausted||低:導入役割を確認|二種族を氷へ送る順序と、氷を避ける道を比較する。||
|48|三の釣り合い|exhausted||低:導入役割を確認|二体を合わせてちょうど3を作り、留め具に乗せる。||
|49|針が上へ曲がる小窓|exhausted|fixture.gate:exhausted|低:導入役割を確認|真後ろの一マスの先が壁なので、残りの針は時計回りに上へ伸びる。||
|50|同じ岸へ、別の環|exhausted||低:導入役割を確認|それぞれが通れる環に別々に入り、向こうで3をつくる。||
|51|終点で針が伸びる|exhausted|fixture.spike:exhausted|低:導入役割を確認|氷から針へ入る向きで、1が戻る足元を読む。||
|52|水の環と石の環|exhausted|terrain.water:exhausted|低:導入役割を確認|同じ岸の二種族を水中と地上の別々の環で送る。||
|53|帰れない合流点|exhausted||低:導入役割を確認|二つの一方通行を通った先でだけ合体する。||
|54|土の入口へ回る|exhausted|fixture.spike:exhausted|低:導入役割を確認|1を針で作り、入口の左に立てる場所へ持っていく。||
|55|帰りは返事をしない|exhausted|fixture.latch:exhausted|低:導入役割を確認|往路で開いた反転板を復路では避け、二つの合図を同時に残す。||
|56|一歩ぶんの橋|exhausted||低:導入役割を確認|橋の上を離れてから低い戻り道を作る。||
|57|落ちた順にひとつ|exhausted||低:導入役割を確認|下段の仲間を落下先へ置いて空中から合体する。||
|58|二つの時計はずれる|exhausted||低:導入役割を確認|二つの周期の位相を一緒に考えて前室へ入る。||
|59|重さの違う二つの席|exhausted|fixture.plate.weight:exhausted|低:導入役割を確認|重さの異なる二箱を、反対向きの押し方でそれぞれの板に配る。||
|60|二つの着地点|exhausted||低:導入役割を確認|分裂した個体を別々の落下口へ仕分ける。||
|61|背を貸して、返して|exhausted||低:導入役割を確認|かえるで着地点の高さを調整してから犬を救出する。||
|62|足場の受け渡し|exhausted||中:表示の説明を改善|下の仲間を横移動させ、上の仲間の足を運ぶ。||
|63|先に通すのは誰|exhausted||低:導入役割を確認|かえるで扉を保持し、犬を先に通す。||
|64|氷の片道券|exhausted|fixture.oneway:exhausted|低:導入役割を確認|上の滑走路と下の片道通路から右岸へ別々に渡る。||
|65|右行きと左行き|exhausted||低:導入役割を確認|上と下で渡れる向きが反対なので、担当する道を変える。||
|66|時計係を残す|exhausted|fixture.oneway:exhausted|低:導入役割を確認|犬が片道入口に来たら、別の仲間の移動で時計を回す。||
|67|谷の相棒|exhausted||低:導入役割を確認|ふくろうの位置に犬、隣にかえるを揃えて道を借りる。||
|68|戻さない留め具|exhausted|fixture.toggle:exhausted|低:導入役割を確認|切替で一度通し、その奥で記憶式へ引き継ぐ。|81, 94|
|69|鍵役も門の向こうへ|exhausted|fixture.spike:exhausted|低:導入役割を確認|分裂で作った1を一時的な鍵役にし、保持された合図で本人も脱出させる。||
|70|箱は小さな壁|exhausted|fixture.spike:exhausted|低:導入役割を確認|箱を脇へ逃がしてから針へ入り、出口を分ける。||
|71|滑りすぎた合体|exhausted|fixture.spike:exhausted / fixture.gate:shortest|中:省略できる補助を再評価|滑走で合体を起こす位置をつくり、その後一つだけ切り離す。||
|72|ちいさな押し手|exhausted|fixture.spike:exhausted|低:導入役割を確認|箱のためだけに一時的に3を作り、仕事後に分ける。|95|
|73|泡に乗る荷の重さ|exhausted|fixture.spike:exhausted / terrain.water:exhausted|低:導入役割を確認|針で2に整えた時だけ泡が本体を持ち上げる。||
|74|泡の上、石環の下|exhausted|fixture.spike:exhausted / terrain.water:exhausted / fixture.warp:exhausted|低:導入役割を確認|3は泡で上がり、1は下の水際へ分かれる。||
|75|風が届かない重さ|exhausted|fixture.spike:exhausted|低:導入役割を確認|針で3にした本体を持ち上げ、小さい1を下へ落とす。||
|76|二つの水路、ひとつの星|exhausted|fixture.spike:shortest / fixture.gate:shortest / terrain.water:exhausted|中:省略できる補助を再評価|上は2、下は1。先に合体せず別々の水路を通ってから3へ戻す。||
|77|相棒が進める時計|exhausted|fixture.spike:exhausted / fixture.latch:exhausted|低:導入役割を確認|分裂した二人を交互に操作し、一方の前進や救出をもう一方の時計合わせにする。||
|78|順序と重量の違い|exhausted||低:導入役割を確認|1と2を別々に残したまま順番に押し、最後に合体する。||
|79|橋番の代わり|exhausted|fixture.plate.weight:exhausted|低:導入役割を確認|先に小さい仲間をどかして押す列をつくり、箱で板を保持する。||
|80|八を先に通す|exhausted|fixture.gate:shortest|中:省略できる補助を再評価|余剰2を鍵役にし、8を門の向こうへ残す。||
|81|合図を引き継ぐ|exhausted|fixture.latch:exhausted|低:導入役割を確認|一時の保持を記憶式の入力へ渡す。|68, 94|
|82|足跡の帰らない森|exhausted|fixture.spike:exhausted / fixture.gate:shortest / terrain.tunnel:shortest / fixture.warp:shortest|中:省略できる補助を再評価|1は細道、3は条件門を経て環。違う道を越えて両側の星へ。||
|83|水に二つの数字|exhausted|fixture.spike:exhausted / fixture.gate:exhausted|低:導入役割を確認|大きい個体を水路の細い門のために分け、後で2をつくる。||
|84|橋を渡して床を開ける|exhausted|fixture.plate.hold:exhausted|中:表示の説明を改善|同じ崩れる床を、先に上の支え、後で下の通路として使い分ける。||
|85|ふくろうの合図と星時計|exhausted|fixture.phase:exhausted|中:表示の説明を改善|二種族の合図が揃った後、相棒が最後の時計合わせも助ける。||
|86|天井の針と床の針|exhausted||中:表示の説明を改善|高さの違う二つの針で、本体と子の落ち方を調整する。||
|87|氷上の合鍵|exhausted|fixture.spike:exhausted / fixture.latch:shortest|中:省略できる補助を再評価|氷の先で二度割り、開錠役と救出役を分ける。||
|88|小さい仲間の風の便|exhausted|fixture.spike:exhausted / fixture.oneway:exhausted / fixture.latch:exhausted|低:導入役割を確認|段階条件の風を分岐装置にし、同じ入口から本体と鍵役を別経路に送る。||
|89|逆向きの着地|exhausted|fixture.spike:exhausted / fixture.latch:exhausted|低:導入役割を確認|片岸の留め具を点け、対岸の出口へ順番に送る。||
|90|うずの外から|exhausted|fixture.spike:exhausted / terrain.water:exhausted / fixture.latch:exhausted|中:表示の説明を改善|閉じた水路に飛び込む前に、脇道で小さい開錠役をつくる。||
|91|石屋根と二人の背|exhausted||中:表示の説明を改善|異種族の足場を二段につくり、上から解体する。||
|92|一と三のあいだ|exhausted||中:表示の説明を改善|1が両端の合図を受け持ち、2は真ん中の作動役になる。|97|
|93|二人ぶんの合図|exhausted|fixture.latch:exhausted|中:表示の説明を改善|二つの板に別々の1を置き、合体を避ける。||
|94|氷の先で受け継ぐ鍵|exhausted|fixture.spike:exhausted / terrain.ice:shortest / fixture.latch:exhausted|中:省略できる補助を再評価|1で板を保持して2を通し、2が対岸の留め具を点けてから保持役を解放する。|68, 81|
|95|二枚の板と借りた重さ|exhausted|fixture.plate.weight:exhausted / fixture.latch:exhausted|中:表示の説明を改善|押す3をつくり、かえるで別条件を記憶させ、箱を保持役にする。|72|
|96|土と氷の二重底|exhausted|fixture.spike:exhausted / terrain.ice:shortest / terrain.tunnel:shortest / fixture.warp:limit|高:補助の必須性未確定|二人の1を片道へ送り、氷を避けた3を環から渡す。||
|97|星の合図は三つ|limit|fixture.spike:exhausted|高:必須性未確定|二人の1と本体3を別々に使って合図し、合図後に1同士を合わせる。|92|
|98|三拍の波、二拍の出口|exhausted|fixture.spike:exhausted / terrain.water:exhausted / field.current:shortest / fixture.phase:exhausted / fixture.latch:exhausted|中:省略できる補助を再評価|小さい鍵役で水路を開き、三拍目だけ入れる波と二拍の出口を順に通る。||
|99|渡さないための相棒|exhausted|fixture.latch:exhausted|中:表示の説明を改善|かえるで土の出口をふさぎ、転送されない1を左岸の留め具へ通す。その後は出口を空け、二人の1を渡して2にする。||
|100|最後の合体は二度待つ|limit|fixture.plate.weight:limit / object.crate:exhausted / fixture.burrow:limit / terrain.tunnel:limit|高:補助の必須性未確定|左のふくろうには1を残し、1と2を合わせて二人の3を用意する。箱を上へ置き、かえるは土、いぬは3の細道を渡る。右の訪問を終えてから6にする。||
