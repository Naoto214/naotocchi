# 横断的な確認事項

カード単位34件とは別の10論点。仕様上の違い・注意点・未確定事項を含むため、10件の不具合という意味ではない。詳細根拠は `cross-series-findings.json`。

|ID|区分|確認内容|
|---|---|---|
|X01|documentation_drift|Master spec explicitly marks old counts (75 achievements, 168 forms, seasonal games) historical; runtime tables are current authority.|
|X02|mapping_caution|Official IDs retain old thresholds; use exact condition, not numeric ID suffix. Examples minigame-50 requires30; games-complete-100 uses current pool length; record-rank-s-15 requires10; feed-100 requires30.|
|X03|documentation_drift|All10 region and4 seasonal games always available; location/season affect weighting, not exclusivity. games.js comments near line68 and seasonal definitions are stale.|
|X04|conditional_progress_blocker|Equipped gamepass1 returns before actionCounts.play, environment-play and game record increment. Unequip it to earn actual-play and rank achievements.|
|X05|documentation_drift|Old achievement preamble says dex-complete excluded, but current endingProgress includes all ACHIEVEMENTS.|
|X06|mapping_caution|downhill-mountain now names やまの岩場のぼり and uses makeRockClimbGame. Preserve official save ID.|
|X07|confirmed_cosmetic_gap|Five goal tiers but four ENDING_CELEBRATIONS entries; PERFECT tier4 has no particle configuration. Explicit source-known gap, not an unlock blocker.|
|X08|unconfirmed_species|レスキューfishには正式本編種族の対応根拠がない。dogも本編8姿の絵をまだ採用していない。clownfish/salmonへの自動対応は禁止。|
|X09|multiple_cards_same_content|31種族それぞれから8段階カードがある。同じ出典種族から複数カードがあるが、重複事故ではない。|
|X10|legacy_or_name_similarity|旧スノーボード・うそつきしょうぶ・キャッチボール・かくれんぼ案は現452の独立4カードではない。G-slide-puzzleはなおぽよスライドの由来と認定しない。なおぽよ01–08の段階と問題01–10も別軸。|
