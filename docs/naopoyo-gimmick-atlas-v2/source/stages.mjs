// VERSION 2: physical puzzles; official D rules are unchanged.
export const stages=[
  {
    "title": "古城の入口",
    "difficulty": 1,
    "text": "分かれて扉を開き、奥から迎えに戻ろう。",
    "goal": "丸い床は乗っている間だけ。奥の解錠床で扉を開いたままに。",
    "hint": "1体を左上の床に残そう。もう1体で奥の床を踏んでから、2に合体。",
    "required": [
      "A",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 2,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          4,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          4,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [],
      "exits": [
        {
          "x": 6,
          "y": 5,
          "exact": 2
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 1
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "A",
            "x": 1,
            "y": 3,
            "hold": true,
            "label": ""
          },
          {
            "id": "B",
            "x": 6,
            "y": 3,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 4,
            "y": 4,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ]
      },
      "id": "castle-forest-11-v2"
    },
    "number": 11,
    "id": "11",
    "scene": "hall"
  },
  {
    "title": "閉ざされた扉",
    "difficulty": 1,
    "text": "ふたつの扉に、ふたりの留守番。",
    "goal": "それぞれの丸い床に1体ずつ。奥の解錠床で全員を呼び戻そう。",
    "hint": "3体に分け、最初の床、中央の床、奥へ進む係に分担。最後は3。",
    "required": [
      "A",
      "B",
      "C"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 3,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          3,
          2
        ],
        [
          5,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          3,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          5,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          3,
          5
        ],
        [
          5,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [],
      "exits": [
        {
          "x": 6,
          "y": 2,
          "exact": 3
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 2
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "A",
            "x": 1,
            "y": 2,
            "hold": true,
            "label": ""
          },
          {
            "id": "B",
            "x": 4,
            "y": 5,
            "hold": true,
            "label": ""
          },
          {
            "id": "C",
            "x": 6,
            "y": 5,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 3,
            "y": 4,
            "any": [
              "AHeld",
              "C"
            ],
            "needs": [
              "A"
            ]
          },
          {
            "x": 5,
            "y": 3,
            "any": [
              "BHeld",
              "C"
            ],
            "needs": [
              "B"
            ]
          }
        ]
      },
      "id": "castle-forest-12-v2"
    },
    "number": 12,
    "id": "12",
    "scene": "hall"
  },
  {
    "title": "ふたつのスイッチ",
    "difficulty": 1,
    "text": "門は2、出口は4。合図は奥から手前へ。",
    "goal": "A→Bの順に、重さ2で合図しよう。",
    "hint": "2ずつ門を通す。奥のAを踏んでから手前のB。早く4に戻すと門を通れない。",
    "required": [
      "sequence"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 4,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          4,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          4,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [
        {
          "x": 4,
          "y": 4,
          "exact": 2
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 6,
          "exact": 4
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 2
        }
      ],
      "water": [],
      "mechanisms": {
        "sequence": [
          "A",
          "B"
        ],
        "plates": [
          {
            "id": "A",
            "x": 6,
            "y": 3,
            "exact": 2,
            "label": "A"
          },
          {
            "id": "B",
            "x": 1,
            "y": 3,
            "exact": 2,
            "label": "B"
          }
        ],
        "doors": [
          {
            "x": 6,
            "y": 5,
            "needs": [
              "sequence"
            ]
          }
        ]
      },
      "id": "castle-forest-13-v2"
    },
    "number": 13,
    "id": "13",
    "scene": "hall"
  },
  {
    "title": "動く足場",
    "difficulty": 3,
    "text": "足場に乗る係と、動かす係を分けよう。足場が空なら動かないよ。",
    "goal": "上の部屋で2の合図。もう一度3に集まって出口へ。",
    "hint": "3を足場に乗せてから1で下の床へ。上のトゲで分け、2の床を押し、3に戻そう。",
    "required": [
      "L",
      "platformUsed",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": true,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 4,
          "x": 2,
          "y": 5
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          7,
          4
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [],
      "exits": [
        {
          "x": 3,
          "y": 2,
          "exact": 3
        },
        {
          "x": 0,
          "y": 5,
          "exact": 1
        }
      ],
      "spikes": [
        {
          "x": 3,
          "y": 5,
          "power": 1
        },
        {
          "x": 5,
          "y": 3,
          "power": 1
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "L",
            "x": 1,
            "y": 5,
            "label": "",
            "exact": 1,
            "requiresRider": true
          },
          {
            "id": "B",
            "x": 6,
            "y": 3,
            "exact": 2,
            "label": ""
          }
        ],
        "platforms": [
          {
            "x": 4,
            "y": 6,
            "rise": 2,
            "needs": "L"
          }
        ],
        "doors": [
          {
            "x": 0,
            "y": 5,
            "needs": [
              "B"
            ]
          },
          {
            "x": 3,
            "y": 2,
            "needs": [
              "B"
            ]
          }
        ]
      },
      "id": "castle-forest-14-v2"
    },
    "number": 14,
    "id": "14",
    "scene": "hall"
  },
  {
    "title": "落ちる床",
    "difficulty": 3,
    "text": "ひび床を落とした先にも、閉ざされた道。",
    "goal": "落下後、1体を床に残して奥を解錠。最後は3。",
    "hint": "トゲで分かれ、ひび床を空ける。下の左端に1体、もう1体で奥の床へ。",
    "required": [
      "F",
      "A",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": true,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 3,
          "x": 2,
          "y": 3
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [],
      "exits": [
        {
          "x": 6,
          "y": 6,
          "exact": 3
        }
      ],
      "spikes": [
        {
          "x": 3,
          "y": 3,
          "power": 2
        }
      ],
      "water": [],
      "mechanisms": {
        "floors": [
          {
            "id": "F",
            "x": 3,
            "y": 4
          }
        ],
        "plates": [
          {
            "id": "A",
            "x": 1,
            "y": 6,
            "hold": true,
            "label": ""
          },
          {
            "id": "B",
            "x": 5,
            "y": 6,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 4,
            "y": 6,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ]
      },
      "id": "castle-forest-15-v2"
    },
    "number": 15,
    "id": "15",
    "scene": "hall"
  },
  {
    "title": "ふくろうの番人",
    "difficulty": 3,
    "text": "番人の道は2。ふたりずつ通り、最後に4へ。",
    "goal": "門の先でも分担。床に2を残し、奥を解錠しよう。",
    "hint": "1と1を2にして門を通す。2体の2を早く合体させず、片方を床に残そう。",
    "required": [
      "A",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 4,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          3,
          3
        ],
        [
          5,
          3
        ],
        [
          7,
          3
        ],
        [
          7,
          4
        ],
        [
          3,
          5
        ],
        [
          5,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [
        {
          "x": 3,
          "y": 4,
          "exact": 2
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 5,
          "exact": 4
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 2
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "A",
            "x": 4,
            "y": 2,
            "hold": true,
            "exact": 2,
            "label": ""
          },
          {
            "id": "B",
            "x": 6,
            "y": 3,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 5,
            "y": 4,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ],
        "guardian": {
          "x": 5,
          "y": 1
        }
      },
      "id": "castle-forest-16-v2"
    },
    "number": 16,
    "id": "16",
    "scene": "hall"
  },
  {
    "title": "重さの仕掛け",
    "difficulty": 4,
    "text": "上に生まれた1が灯りをつけ、落ちて合体する。",
    "goal": "下では2ずつ通す。4への合体は最後まで待とう。",
    "hint": "上方分裂で高い床へ。下で2を作ったら先に門の左へ送り、残りを2に集めよう。",
    "required": [
      "H",
      "A",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": true,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 4,
          "x": 4,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
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
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
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
        ],
        [
          7,
          5
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [
        {
          "x": 4,
          "y": 6,
          "exact": 2
        }
      ],
      "exits": [
        {
          "x": 0,
          "y": 6,
          "exact": 4
        }
      ],
      "spikes": [
        {
          "x": 5,
          "y": 4,
          "power": 3
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "H",
            "x": 3,
            "y": 3,
            "label": ""
          },
          {
            "id": "A",
            "x": 3,
            "y": 6,
            "hold": true,
            "exact": 2,
            "label": ""
          },
          {
            "id": "B",
            "x": 0,
            "y": 6,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 6,
            "y": 5,
            "needs": [
              "H"
            ]
          },
          {
            "x": 1,
            "y": 6,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ]
      },
      "id": "castle-forest-17-v2"
    },
    "number": 17,
    "id": "17",
    "scene": "moss"
  },
  {
    "title": "森の道しるべ",
    "difficulty": 4,
    "text": "ふくろうの合図の先には、もうひとつの仕掛け。",
    "goal": "重さ2で道を教わり、奥の床では別々に行動しよう。",
    "hint": "2でふくろうへ合図。奥では1体を下の床に残し、別の1体で扉の向こうを解錠。",
    "required": [
      "owlHelp",
      "A",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 3,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          3,
          3
        ],
        [
          5,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          3,
          5
        ],
        [
          5,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [],
      "exits": [
        {
          "x": 6,
          "y": 5,
          "exact": 3
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 1
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "O",
            "x": 1,
            "y": 3,
            "exact": 2,
            "label": ""
          },
          {
            "id": "A",
            "x": 4,
            "y": 6,
            "hold": true,
            "label": ""
          },
          {
            "id": "B",
            "x": 6,
            "y": 3,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 3,
            "y": 4,
            "needs": [
              "owlHelp"
            ]
          },
          {
            "x": 5,
            "y": 4,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ],
        "owl": {
          "x": 5,
          "y": 1,
          "needs": "O"
        }
      },
      "id": "castle-forest-18-v2"
    },
    "number": 18,
    "id": "18",
    "scene": "moss"
  },
  {
    "title": "森の分かれ道",
    "difficulty": 4,
    "text": "2ずつ檻へ。4に集まると、クマさんを助けられる。",
    "goal": "大岩の先で、もう一度分かれて重さ2の床を押そう。",
    "hint": "2と2で門を通り、檻の床で4へ。救出後のトゲで分かれ、2の床を押して4に戻る。",
    "required": [
      "bearRescued",
      "bearHelp",
      "K",
      "B"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": false,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 4,
          "x": 1,
          "y": 4
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          3,
          3
        ],
        [
          5,
          3
        ],
        [
          7,
          3
        ],
        [
          7,
          4
        ],
        [
          3,
          5
        ],
        [
          5,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [
        {
          "x": 3,
          "y": 4,
          "exact": 2
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 5,
          "exact": 4
        }
      ],
      "spikes": [
        {
          "x": 2,
          "y": 4,
          "power": 2
        },
        {
          "x": 6,
          "y": 4,
          "power": 2
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "K",
            "x": 4,
            "y": 3,
            "weight": 4,
            "label": ""
          },
          {
            "id": "B",
            "x": 6,
            "y": 3,
            "exact": 2,
            "label": ""
          }
        ],
        "boulders": [
          {
            "x": 5,
            "y": 4,
            "parkX": 6,
            "parkY": 1
          }
        ],
        "doors": [
          {
            "x": 6,
            "y": 5,
            "needs": [
              "B"
            ]
          }
        ],
        "bear": {
          "x": 5,
          "y": 1,
          "needs": "K"
        }
      },
      "id": "castle-forest-19-v2"
    },
    "number": 19,
    "id": "19",
    "scene": "moss"
  },
  {
    "title": "古城の門",
    "difficulty": 5,
    "text": "高所の合図、3ずつの通過、分担、最後の大合体。",
    "goal": "6を早く集めると通れない。最後の足場で全員を合わせよう。",
    "hint": "上方分裂後、下で3ずつ作って門を通す。3を床に残して奥を解錠。足場で6に戻す。",
    "required": [
      "H",
      "A",
      "B",
      "W",
      "platformUsed"
    ],
    "board": {
      "w": 8,
      "h": 8,
      "gravity": true,
      "gravityRules": "supported-v1",
      "movementRules": "contact-v2",
      "terrainRules": "magic-gate-v2",
      "splitRules": "recombine-once-v1",
      "splitPriority": "D",
      "timeHand": {
        "maxSteps": 7,
        "resetHeading": false,
        "passGenerated": false
      },
      "actors": [
        {
          "id": "parent",
          "species": "dog",
          "level": 6,
          "x": 4,
          "y": 2
        }
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          2,
          2
        ],
        [
          7,
          2
        ],
        [
          1,
          3
        ],
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
        ],
        [
          5,
          3
        ],
        [
          7,
          3
        ],
        [
          7,
          4
        ],
        [
          1,
          5
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
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ]
      ],
      "gates": [
        {
          "x": 4,
          "y": 4,
          "exact": 3
        }
      ],
      "exits": [
        {
          "x": 1,
          "y": 2,
          "exact": 6
        }
      ],
      "spikes": [
        {
          "x": 5,
          "y": 2,
          "power": 3
        }
      ],
      "water": [],
      "mechanisms": {
        "plates": [
          {
            "id": "H",
            "x": 3,
            "y": 1,
            "label": ""
          },
          {
            "id": "A",
            "x": 3,
            "y": 4,
            "hold": true,
            "exact": 3,
            "label": ""
          },
          {
            "id": "B",
            "x": 0,
            "y": 4,
            "exact": 3,
            "label": ""
          },
          {
            "id": "W",
            "x": 0,
            "y": 4,
            "weight": 6,
            "label": ""
          }
        ],
        "doors": [
          {
            "x": 6,
            "y": 3,
            "needs": [
              "H"
            ]
          },
          {
            "x": 1,
            "y": 4,
            "any": [
              "AHeld",
              "B"
            ],
            "needs": [
              "A"
            ]
          }
        ],
        "platforms": [
          {
            "x": 0,
            "y": 5,
            "rise": 2,
            "needs": "W"
          }
        ]
      },
      "id": "castle-forest-20-v2"
    },
    "number": 20,
    "id": "20",
    "scene": "moss"
  }
];
