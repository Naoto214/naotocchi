# VERSION 5 共通素材・図鑑・配置試作

## 第1工程：調査
開始HEAD d8d32b89df57abf7417044fbd5cbf5a1c27a293c。最新remoteと一致。
PR535: Draft、base design/naopoyo-gimmick-atlas-v1-20261109。
PR532: fce9067b41ed4c6b6640791ec13bd610c5b6bde3（図鑑45項目、Draft）。PR504: ee9db5a6d405843a71c281f293305387da9d2b83（closed）。PR523: 9ebcda6d40d57634fe94dc7e80b5e7b66be65a18（Draft）。別PRへ変更しない。

- catalog.jsonの45 IDを保持。未実装候補も含むため、配置可否は100面engine.materialRulesと正式exchange検証で区別する。
- 31系統248段階はcharacter-world-master.v1.jsの成長定義。正式パズルexchangeの操作種族はdog/frog/fish/penguin、各1〜8。全系統が操作可能と扱わない。
- fish/penguinの水中移動は既存100面adapterルール。自由飛行・掘削は正式能力として追加しない。描画側は能力を判定しない。
- engineのserializeBoard/deserializeBoard、solver/replay、boardSignature/replayActions、TouchController、GestureHistory、V4の新ワープPresentationを再利用。
- 現在のboardSignatureは盤面JSON全体。世界・素材の表示・装飾は盤面外のsidecarへ置き、物理盤面署名に混入させない。
- 既存V3保存キーは触らず、V5専用キーと明示的な独立交換形式を使用。物理編集は盤面署名を変更、世界/装飾編集はプレイ記録を維持する。
- V4は盤面全体の描画。V5ではセルの素材IDと8近傍マスクで接続し、装飾を別レイヤーに分ける。V4旧案を破壊せず独立実装する。

調査時回帰234件成功。第2工程以降は本ファイルへ追記。100面一括反映・mainマージ・本番公開は禁止。
