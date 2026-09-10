# ミニゲーム小物の現行棚卸し — 2026-09-10

追記：#228マージ後、収穫・桜・落ち葉タワーの3件に既存atlasを接続した。
[続きの実装と検証](seasonal-stack-illustrations-2026-09-10.md)を参照。
以下の100本の一覧は元の調査HEADの記録。描画方式・ゲーム数は変えていない。
次の表の優先1はコード実装済みで、実ブラウザーの見え方確認は残っている。

基準はPR #228の `e2dc59fc759e2b762ea605c2b42e5d89e0b90eb8`。`games.js` は今回バイト変更0。100本すべてを実際の登録オブジェクトから生成関数へ対応付けた。既存Canvasの描画を優先して保持する。

記号欄は start 関数本文と生成引数の静的候補で、HUD・結果表示も含む。共通定数や共有描画ヘルパーの全記号を列挙したものではない。Canvasの有無は描画経路の検出であり、操作・画面品質の合格ではない。全100本の実機確認は未実施。

## 次の制作単位

| 優先 | 対象 | 進め方 |
| --- | --- | --- |
| 1 | 収穫・桜・落ち葉タワー | 麦／桜／紅葉の既存atlasを使える。Canvasへ描く小物だけを置換し、積み木・判定・サイズを維持する。 |
| 2 | ケーキ・弁当 | いちご・チョコ・さくらんぼ／おにぎり・卵・えび・ブロッコリーが必要。お世話の茶碗や顔のない孵化卵を別用途へ流用しない。 |
| 3 | 道路・宇宙・走行 | 収集物と障害物を区別した小物セットを検討。共通roadの変更は通常・地域版に波及する。 |
| 4 | 神経衰弱・上海・スライド | 小さくても区別できる同一寸法の絵を使う。数値・牌の識別性と入力領域を先に保護する。 |
| 5 | 釣り・ダンジョン・敵キャラ | 既存PNGと固有Canvas絵を個別確認。魚種や敵の強さの違いを同じ汎用絵で消さない。 |

ボール・ピン・盤・コース・車体などの既存Canvasは維持。単純に「絵文字があるから全部描き直す」という扱いにはしない。画像読込失敗・Canvas描画状態・終了後の入力解除は、各制作単位で確認する。今回ミニゲーム本体への変更はない。

## 100本の対応

| 安定ID | 生成関数 | 経路 | 記号候補（HUDを含む） |
| --- | --- | --- | --- |
| `road-themed` | `makeRoadGame` | Canvas | 🍎 🍙 🍬 🍇 🪨 🚧 🛢️ ⚠️ ⭐ 🌟 ✨ 🍀 ☄️ ⚡ 🛰️ 🐟 🐠 🦐 🐚 🥫 🪤 🕸️ 🦈 ◀ ▶ 💥 |
| `stack-themed` | `makeStackGame` | Canvas | 🟦 🥞 🍰 ✨ 💥 ⏰ |
| `stack-snowman` | `makeStackGame` | Canvas | ⚪ ✨ 💥 ⏰ |
| `falling-block-puzzle` | `makeFallingBlockPuzzleGame` | DOM | ◀ ▶ ⏬ ✨ |
| `crane-game-3d` | `makeCraneGame` | Canvas | 🧸 🎁 👑 🍬 🪙 ▶ 💪 🎉 |
| `pinball-physics` | `makePinballGame` | Canvas | ◀ ▶ 🎉 |
| `haunted-house-3d` | `makeHauntedHouseGame` | Canvas | 🕸️ 🕯️ 🪦 🎃 🔑 🚪 👻 |
| `bowling-3d` | `makeBowlingGame` | Canvas | ◀ ▶ 💨 🎳 ✨ |
| `archery-3d` | `makeArcheryGame` | Canvas | 🎯 |
| `breakout-classic` | `makeBreakoutGame` | Canvas | ❤️ ◀ ▶ 🐢 💦 🎉 🏆 ⏰ |
| `dragDecorate-cake` | `makeCakeDecorateGame` | DOM | 🍓 🍫 🍒 🍰 🎂 |
| `dragDecorate-bento` | `makeBentoBoxGame` | DOM | 🍙 🥚 🍤 🥦 🍱 |
| `p3-space` | `makeRoadGame` | Canvas | ⭐ 🌟 💫 🪙 ☄️ 🪨 🛰️ 👾 🚀 ◀ ▶ 💥 ✨ |
| `p3-drive` | `makeRoadGame` | Canvas | 🪙 💎 ⛽ 🍔 🚙 🚚 🚧 🛢️ 🏎️ ◀ ▶ 💥 ✨ |
| `fp-dungeon` | `makeFirstPersonDungeonGame` | Canvas | 🧰 🕳️ 🕯️ 🚪 ✨ 🏆 |
| `race-3d` | `makeRoadRaceGame` | Canvas | 🌴 🌳 🏢 🪧 🌵 🪨 🏜️ 🏙️ 🌃 🗼 🏬 ◀ ▶ 🏁 💥 |
| `rhythm-highway-3d` | `makeRhythmHighwayGame` | Canvas | 🥁 🎸 🎹 🍩 🍭 🍪 🌟 🪐 ☄️ ◀ ▶ |
| `tilt-maze-3d` | `makeTiltMazeGame` | Canvas | ⭐ 🏁 🍬 🎁 ❤️ ◀ ▶ 🖤 🕳️ 🎉 |
| `space-gunner-3d` | `makeSpaceGunnerGame` | Canvas | 👾 🛸 🤖 👹 ☄️ 🪨 🛰️ 🌑 🛡️ ◀ ▶ 💔 💥 |
| `mini-golf-physics` | `makeMiniGolfGame` | Canvas | 🦅 🐦 ⛳ 💦 ⬆ ⬇ ➡ ⬅ 🏆 |
| `real-fishing` | `makeRealFishingGame` | Canvas | 🎣 🎉 💥 🪝 🔴 |
| `basketball-3d` | `makeBasketballGame` | Canvas | 🏀 🔥 |
| `pingpong-3d` | `makePingPongGame` | Canvas | 🎉 🤖 🏆 |
| `chain-puzzle` | `makeChainPuzzleGame` | Canvas | ◀ ▶ ⏬ |
| `street-fight` | `makeStreetFightGame` | Canvas | 👹 🏮 ⛩️ 🎋 🤖 🛰️ 💡 ⚙️ 🔋 🥷 🌙 🏯 🍃 ◀ ▶ 👊 🦵 🛡️ 🔥 💥 🏆 |
| `free-kick-3d` | `makeFreeKickGame` | Canvas | ⚽ 🧱 🧤 🧍 ✖ |
| `tower-defense` | `makeTowerDefenseGame` | Canvas | 🏹 💣 ❄️ 💰 ❤️ ▶ ⬆️ 🐇 👾 🐌 🐗 🦂 🐉 🚪 🏰 🏆 |
| `roguelike-dungeon` | `makeRoguelikeGame` | Canvas | ❤️ ⚔️ 💰 🧪 🪜 ⏳ ◀ ▶ 👺 🐗 🧟 🦇 🐀 🕷️ 🏆 |
| `grand-prix-3d` | `makeGrandPrixGame` | Canvas | ◀ ▶ 🌳 🏁 🌲 📣 🎪 🏢 🚀 💦 🔥 🏆 |
| `sky-shooter` | `makeSkyShooterGame` | Canvas | ❤️ ◀ 💣 ▶ 👾 🛸 🐝 🦇 ⚠️ 🎆 💥 ⚡ 🐙 🏆 |
| `jump-quest` | `makeJumpQuestGame` | Canvas | 🐢 🐌 👾 ❤️ 🪙 ◀ ▶ 🚩 🔺 |
| `push-puzzle` | `makePushPuzzleGame` | Canvas | 📦 ↩ ◀ ▶ ✅ 🏆 |
| `reversi-6` | `makeReversiGame` | Canvas | 🏆 |
| `billiards-6` | `makeBilliardsGame` | Canvas | 🎱 💦 ✨ 🏆 |
| `animal-shogi` | `makeAnimalShogiGame` | Canvas | 🦁 🦒 🐘 🐤 🐔 🏆 |
| `minesweeper-8` | `makeMinesweeperGame` | Canvas | 💣 🚩 ❌ 💥 🏆 |
| `snake-classic` | `makeSnakeGame` | Canvas | 🍎 ⭐ ◀ ▶ 💫 🎉 |
| `baseball-batting` | `makeBaseballGame` | Canvas | 🏟 ◀ ▶ 💥 ⚾ 🤾 🧍 |
| `ring-flight-3d` | `makeRingFlightGame` | Canvas | 🐚 🐬 🪙 ⭕ ◀ ▶ 🎯 ☁ 🛬 |
| `bubble-shooter` | `makeBubbleShooterGame` | Canvas | 💥 ⬇ 🏆 💦 |
| `catapult-castle` | `makeCatapultGame` | Canvas | 👻 🎉 🏆 |
| `connect-four` | `makeConnectFourGame` | Canvas | 🔴 🟡 🏆 |
| `puzzle-2048` | `makeTwentyFortyEightGame` | Canvas | ◀ ▶ ✨ |
| `frogger-road` | `makeFroggerGame` | Canvas | ❤️ 🏠 🪵 ◀ ▶ 🐢 🚗 🚚 🏎️ 🚙 🚕 🚌 💫 🚪 🏆 |
| `ski-jump` | `makeSkiJumpGame` | Canvas | 🔥 💫 🏅 |
| `air-hockey` | `makeAirHockeyGame` | Canvas | 🔥 ⚽ 💦 🏆 |
| `submarine-3d` | `makeSubmarineGame` | Canvas | 💎 ❤️ 🫧 ◀ ▶ 💥 ⚡ 🌊 |
| `match-3` | `makeMatchThreeGame` | Canvas | 🍓 🍋 🍇 🍏 🫐 🍊 🔥 ✨ |
| `gomoku-9` | `makeGomokuGame` | Canvas | 🏆 |
| `tank-battle` | `makeTankBattleGame` | Canvas | ❤️ 💥 🔥 ◀ ▶ 💫 🏆 |
| `tennis-rally` | `makeTennisGame` | Canvas | ◀ ▶ 🎾 ⭐ 💦 🤖 🧑 👩 👦 👵 🏆 |
| `picross-5` | `makePicrossGame` | Canvas | 🏆 |
| `darts-board` | `makeDartsGame` | Canvas | 🎯 |
| `hang-glider-3d` | `makeHangGliderGame` | Canvas | 📏 🎈 ◀ ▶ 🌀 🌳 🏡 🛬 ⏰ |
| `bomber-maze` | `makeBomberGame` | Canvas | ❤️ 👾 💣 ◀ ▶ 💫 🔥 👟 🏆 |
| `blackjack-21` | `makeBlackjackGame` | Canvas | 🪙 ♠ ♥ ♦ ♣ 🎉 💦 🏆 |
| `pipe-connect` | `makePipeConnectGame` | Canvas | 🚰 🌻 💧 🥀 🏆 |
| `fruit-slice` | `makeFruitSliceGame` | Canvas | 🍎 🍊 🍉 🍌 🍓 🥝 🍍 ❤️ 💣 💥 ✨ |
| `track-field` | `makeTrackFieldGame` | Canvas | 🏃 ◀ ▶ 🧑 👩 🧒 ❌ 🔥 🏁 🦘 📏 |
| `voxel-mine` | `makeVoxelMineGame` | Canvas | ❤️ ⚫ ⛓ 🟡 💎 🔥 ◀ ▶ 🌳 ⛏️ |
| `sushi-belt` | `makeSushiBeltGame` | Canvas | 🍣 🍤 🍙 🍮 🥚 🍵 🐟 🦑 🌶 ⚡ ✅ ❌ 🧑‍🍳 |
| `asteroids-classic` | `makeAsteroidsGame` | Canvas | ❤️ ◀ ▶ 🔥 🌊 💥 |
| `yacht-dice` | `makeYachtDiceGame` | Canvas | 🎲 🔒 |
| `lights-out` | `makeLightsOutGame` | Canvas | ✨ 🏆 |
| `doodle-jump` | `makeDoodleJumpGame` | Canvas | 📏 ⭐ ◀ ▶ 🔴 💥 ⏰ |
| `curling-ice` | `makeCurlingGame` | Canvas | 🔴 🟡 🧹 🏆 |
| `jenga-tower` | `makeJengaGame` | Canvas | 😱 💥 |
| `line-trace` | `makeLineTraceGame` | Canvas | 🌟 |
| `checkers-6` | `makeCheckersGame` | Canvas | 🔴 ⚫ 👑 🏆 |
| `memory-cards` | `makeMemoryCardsGame` | Canvas | 🍎 🐶 🚗 ⭐ 🌸 🎵 🐟 🎈 🍰 🦋 ⚽ 🌙 ✨ ✅ 🏆 |
| `halfpipe-skate` | `makeHalfpipeGame` | Canvas | 🌀 ✨ 💫 🛹 |
| `domino-run` | `makeDominoRunGame` | Canvas | 🔔 👉 💦 🔕 👆 🏆 |
| `sudoku-mini` | `makeSudokuGame` | Canvas | ❌ 🎉 🏆 |
| `mancala-kalah` | `makeMancalaGame` | Canvas | 🟢 🟠 ✨ 🏆 |
| `plane-landing` | `makePlaneLandingGame` | Canvas | ⬛ 💦 💥 🌟 ✨ ⬆ ⬇ |
| `dot-eater` | `makeDotEaterGame` | Canvas | ❤️ ⭐ ◀ ▶ 🎉 👻 💫 💀 |
| `missile-command` | `makeMissileCommandGame` | Canvas | 💥 🏙 🎉 |
| `area-claim` | `makeAreaClaimGame` | Canvas | ❤️ ✨ ◀ ▶ 🌸 🍰 🐳 🌈 🎈 🦋 🎉 💫 💀 |
| `solitaire-klondike` | `makeSolitaireGame` | Canvas | ♠ ♥ ♦ ♣ 🏠 ⤴ 🎉 |
| `hit-blow` | `makeHitBlowGame` | Canvas | 🔴 🟡 🟢 🔵 🟣 🟠 🎯 💨 🎉 |
| `lunar-lander` | `makeLunarLanderGame` | Canvas | 🚀 ⛽ ◀ ▶ 🔥 🎉 💥 ↔ |
| `shanghai-tiles` | `makeShanghaiGame` | Canvas | 🌸 🍀 🍁 🌙 ⭐ 🐟 🐢 🦋 🍑 🍇 🎐 🏮 🐉 🎋 🍵 🪷 🀄 💡 🔀 🎉 ✨ |
| `beach-volley` | `makeBeachVolleyGame` | Canvas | ◀ ▶ 🏐 🎉 😣 ⚡ 🐧 🏆 |
| `slide-puzzle` | `makeSlidePuzzleGame` | Canvas | 👀 🐱 🌸 ⭐ 🎈 🍰 🍓 🍒 ✨ 🐳 🐟 🫧 🐚 🦄 🌈 💫 🎉 |
| `sugoroku-race` | `makeSugorokuGame` | Canvas | 💰 🎲 ➕ ➖ ⭐ 💤 🐧 🦊 🏁 🏆 |
| `takoyaki-grill` | `makeTakoyakiGame` | Canvas | 🐙 ✨ 😋 💦 🔥 |
| `road-city` | `makeRoadGame` | Canvas | 🍩 ☕ 🎫 💰 🐦 🚧 🗑️ ⚠️ ◀ ▶ 💥 ✨ |
| `stack-harvest` | `makeStackGame` | Canvas | 🌾 ✨ 💥 ⏰ |
| `stack-acorn` | `makeStackGame` | Canvas | 🌰 ✨ 💥 ⏰ |
| `downhill-mountain` | `makeDownhillGame` | Canvas | 🚩 🪵 ◀ ▶ 🌲 🪨 🏁 💥 |
| `downhill-snow` | `makeDownhillGame` | Canvas | 🚩 🪵 ◀ ▶ 🌲 🪨 🏁 💥 |
| `fishing-sea` | `makeRealFishingGame` | Canvas | 🎣 🎉 💥 🪝 🔴 |
| `fishing-deepsea` | `makeRealFishingGame` | Canvas | 🐡 🦑 🐙 🦀 🦈 🐋 🎣 🎉 💥 🪝 🔴 |
| `fishing-river` | `makeRealFishingGame` | Canvas | 🐟 🦐 🐸 🦞 🐢 🐊 🎣 🎉 💥 🪝 🔴 |
| `road-jungle` | `makeRoadGame` | Canvas | 🍌 🥭 🥥 ⭐ 🐍 🌵 🕸️ ⚠️ ◀ ▶ 💥 ✨ |
| `road-desert` | `makeRoadGame` | Canvas | 💧 🍈 ⭐ 🧢 🦂 🐍 ☠️ 🔥 ◀ ▶ 💥 ✨ |
| `stack-sakura` | `makeStackGame` | Canvas | 🌸 ✨ 💥 ⏰ |
| `ring-flight-summer` | `makeRingFlightGame` | Canvas | 🐚 🐬 🪙 ⭕ ◀ ▶ 🎯 ☁ 🛬 |
| `stack-leaves` | `makeStackGame` | Canvas | 🍁 ✨ 💥 ⏰ |
| `curling-winter` | `makeCurlingGame` | Canvas | 🔴 🟡 🧹 🏆 |
