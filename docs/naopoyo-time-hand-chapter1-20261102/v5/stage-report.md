# V5 stage redesign evidence

All coordinates are zero-based (x,y), screen y increases downward. All boards are new 8×8 layouts with identical D/rule/timeHand base settings, no gates or new rules. Existing scene sequence cell/moss/hall/dawn and stage IDs 01–10 remain. Board IDs end in -v5. Solutions are confirmed legal witnesses, not proven shortest.

| Stage | Confirmed moves | Learning evidence |
|---|---:|---|
| 01 めざめ | 3 | Select parent; three horizontal moves to exit. |
| 02 はじめての分裂 | 4 | One rear birth at (3,3); exact1 exit requires both bodies to be level1. |
| 03 時の針 | 7 | Two rear births (4,5),(3,5), a straight line; exact1 exit requires separation. |
| 04 曲がり角 | 10 | Westward births meet wall (2,4), clockwise90 to north at (3,3). |
| 05 再会 | 4 | Two dog2 actors merge to dog4; exact4 exit prevents independent rescue. |
| 06 石の迷路 | 20 | Six births travel west→north→east, two separate clockwise90 turns. |
| 07 仲間の力 | 17 | Frog moves (2,4)→(2,5); third birth changes from (2,5) to (3,4). Frog also escapes. |
| 08 ななめの道 | 10 | Diagonal southeast entry; northwest rear chain turns northeast. Closed corner is tested. |
| 09 地下回廊 | 3 | Supported departure, split, falling merges restore dog4, exact4 rescue. |
| 10 地下牢の出口 | 13 | A wall column x4 with only spike opening (4,4) forces crossing. Births west→north; each level1 crosses, reunions and friend1 restore5 at exact5 exit. |

## Difficulty and alternatives

01–03 use 3/4/7 moves, isolated one-row boards and one concept each. 04/06 retain low per-actor travel; the six-birth demonstration in06 takes20 moves, deliberately longer than early lessons. 07/08 ask for prediction and diagonal gestures.09 demonstrates support/gravity compactly in3 moves.10 integrates a compulsory spike crossing, clockwise turn, collection, companion reunion and exact-total rescue in13 moves. No romantic partner appears.

Exact1 exits require splitting on02–04/06–08, but players can choose different spike entry directions on open boards.07 companion positioning changes the real birth trace; other placements remain legal solutions.09 retains an ordinary diagonal drop alternative which can avoid its spike. Its example and learning tests demonstrate split/gravity/recombination; the lesson is encouraged, not a hidden win requirement. No bespoke learning condition blocks an otherwise valid escape.10's full-height separator makes bypassing its spike impossible; collecting the total5 is mandatory.

## Board maps

Actors are [id,species,level,x,y]. Spikes are [x,y,power], exits [x,y,exact-or-all]. Walls list every blocked cell.

### 01

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      1,
      2,
      2
    ]
  ],
  "walls": [
    [
      0,
      1
    ],
    [
      0,
      3
    ],
    [
      1,
      1
    ],
    [
      1,
      3
    ],
    [
      2,
      1
    ],
    [
      2,
      3
    ],
    [
      3,
      1
    ],
    [
      3,
      3
    ],
    [
      4,
      1
    ],
    [
      4,
      3
    ],
    [
      5,
      1
    ],
    [
      5,
      3
    ],
    [
      6,
      1
    ],
    [
      6,
      3
    ],
    [
      7,
      1
    ],
    [
      7,
      3
    ]
  ],
  "spikes": [],
  "exits": [
    [
      5,
      2,
      "all"
    ]
  ]
}
```

### 02

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      2,
      3,
      3
    ]
  ],
  "walls": [
    [
      0,
      2
    ],
    [
      0,
      4
    ],
    [
      1,
      2
    ],
    [
      1,
      4
    ],
    [
      2,
      2
    ],
    [
      2,
      4
    ],
    [
      3,
      2
    ],
    [
      3,
      4
    ],
    [
      4,
      2
    ],
    [
      4,
      4
    ],
    [
      5,
      2
    ],
    [
      5,
      4
    ],
    [
      6,
      2
    ],
    [
      6,
      4
    ],
    [
      7,
      2
    ],
    [
      7,
      4
    ]
  ],
  "spikes": [
    [
      4,
      3,
      1
    ]
  ],
  "exits": [
    [
      5,
      3,
      1
    ]
  ]
}
```

### 03

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      3,
      4,
      5
    ]
  ],
  "walls": [
    [
      0,
      4
    ],
    [
      0,
      6
    ],
    [
      1,
      4
    ],
    [
      1,
      6
    ],
    [
      2,
      4
    ],
    [
      2,
      6
    ],
    [
      3,
      4
    ],
    [
      3,
      6
    ],
    [
      4,
      4
    ],
    [
      4,
      6
    ],
    [
      5,
      4
    ],
    [
      5,
      6
    ],
    [
      6,
      4
    ],
    [
      6,
      6
    ],
    [
      7,
      4
    ],
    [
      7,
      6
    ]
  ],
  "spikes": [
    [
      5,
      5,
      2
    ]
  ],
  "exits": [
    [
      6,
      5,
      1
    ]
  ]
}
```

### 04

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      4,
      4,
      4
    ]
  ],
  "walls": [
    [
      2,
      4
    ],
    [
      2,
      5
    ],
    [
      3,
      5
    ],
    [
      4,
      5
    ],
    [
      5,
      5
    ]
  ],
  "spikes": [
    [
      5,
      4,
      3
    ]
  ],
  "exits": [
    [
      6,
      4,
      1
    ]
  ]
}
```

### 05

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      2,
      3,
      2
    ],
    [
      "friend",
      "dog",
      2,
      3,
      4
    ]
  ],
  "walls": [
    [
      2,
      2
    ],
    [
      2,
      3
    ],
    [
      2,
      4
    ],
    [
      4,
      2
    ],
    [
      4,
      3
    ],
    [
      3,
      5
    ],
    [
      4,
      5
    ],
    [
      5,
      5
    ]
  ],
  "spikes": [],
  "exits": [
    [
      5,
      4,
      4
    ]
  ]
}
```

### 06

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      7,
      5,
      5
    ]
  ],
  "walls": [
    [
      2,
      5
    ],
    [
      3,
      3
    ],
    [
      4,
      3
    ],
    [
      5,
      3
    ],
    [
      6,
      3
    ]
  ],
  "spikes": [
    [
      6,
      5,
      6
    ]
  ],
  "exits": [
    [
      7,
      5,
      1
    ]
  ]
}
```

### 07

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      4,
      4,
      5
    ],
    [
      "friend",
      "frog",
      1,
      2,
      4
    ]
  ],
  "walls": [
    [
      2,
      3
    ],
    [
      3,
      3
    ],
    [
      4,
      3
    ]
  ],
  "spikes": [
    [
      5,
      5,
      3
    ]
  ],
  "exits": [
    [
      6,
      5,
      1
    ]
  ]
}
```

### 08

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      4,
      4,
      2
    ]
  ],
  "walls": [
    [
      2,
      0
    ],
    [
      2,
      1
    ],
    [
      3,
      0
    ]
  ],
  "spikes": [
    [
      5,
      3,
      3
    ]
  ],
  "exits": [
    [
      6,
      3,
      1
    ]
  ]
}
```

### 09

```json
{
  "gravity": true,
  "actors": [
    [
      "parent",
      "dog",
      4,
      4,
      4
    ]
  ],
  "walls": [
    [
      3,
      4
    ],
    [
      4,
      5
    ]
  ],
  "spikes": [
    [
      5,
      4,
      3
    ]
  ],
  "exits": [
    [
      6,
      7,
      4
    ]
  ]
}
```

### 10

```json
{
  "gravity": false,
  "actors": [
    [
      "parent",
      "dog",
      4,
      3,
      4
    ],
    [
      "friend",
      "dog",
      1,
      6,
      4
    ]
  ],
  "walls": [
    [
      4,
      0
    ],
    [
      4,
      1
    ],
    [
      4,
      2
    ],
    [
      4,
      3
    ],
    [
      4,
      5
    ],
    [
      4,
      6
    ],
    [
      4,
      7
    ],
    [
      1,
      4
    ]
  ],
  "spikes": [
    [
      4,
      4,
      3
    ]
  ],
  "exits": [
    [
      7,
      4,
      5
    ]
  ]
}
```

## Verification

`node --test prototypes/naopoyo-time-hand-chapter1/tests/learning-v5.test.mjs` — 18 passed. Every witness step is legal, validState passes and mass/species totals are preserved; every board completes with all actors rescued. Additional assertions cover exact birth coordinates, clockwise turns, frog redirection, diagonal corner refusal, gravity falling merges and final5 rescue. No engine, input, timing, render, shared physics or controls files were edited by this task.
