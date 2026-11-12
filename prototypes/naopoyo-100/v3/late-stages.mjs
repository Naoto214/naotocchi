// VERSION 3 authored late-stage replacements; preserve internal IDs and board contracts.
export const replacements = [
  {
    "id": "93",
    "number": 93,
    "difficulty": 93,
    "title": "氷の先で受け継ぐ鍵",
    "text": "一時の支えを、氷の向こうの記憶へ渡す。",
    "goal": "全員を星の出口へ。出口の条件は ＝2・＝1。",
    "hint": "1は下の板で待つ。2が氷の先の留め具を踏んだら、1も板を離れられる。",
    "idea": "1で板を保持して2を通し、2が対岸の留め具を点けてから保持役を解放する。",
    "difference": "同じ扉を開く条件が、一時保持から対岸の永続記憶へ切り替わる。",
    "learning": "複合",
    "mainGimmick": "fixture.plate.hold",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.exit",
      "terrain.ice",
      "fixture.door",
      "fixture.latch"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit",
      "terrain.ice",
      "fixture.door",
      "fixture.plate.hold",
      "fixture.latch"
    ],
    "board": {
      "id": "naopoyo-100-93",
      "title": "氷の先で受け継ぐ鍵",
      "w": 8,
      "h": 8,
      "gravity": false,
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
          3
        ],
        [
          1,
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
          0,
          4
        ],
        [
          1,
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
          0,
          5
        ],
        [
          1,
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
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 3,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 2,
          "exact": 2
        },
        {
          "x": 7,
          "y": 3,
          "exact": 1
        }
      ],
      "gates": [],
      "spikes": [
        {
          "x": 2,
          "y": 2,
          "power": 1
        }
      ],
      "tiles": [
        {
          "x": 3,
          "y": 2,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 4,
          "y": 2,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 5,
          "y": 2,
          "catalogId": "fixture.door",
          "params": {
            "any": [
              "T",
              "P"
            ]
          }
        },
        {
          "x": 2,
          "y": 4,
          "catalogId": "fixture.plate.hold",
          "params": {
            "id": "T",
            "exact": 1
          }
        },
        {
          "x": 6,
          "y": 2,
          "catalogId": "fixture.latch",
          "params": {
            "id": "P",
            "exact": 2
          }
        }
      ]
    },
    "solution": [
      {
        "x": 0,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 2,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 4,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 2,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 2,
        "dx": 1,
        "dy": 1
      }
    ]
  },
  {
    "id": "98",
    "number": 98,
    "difficulty": 98,
    "title": "三拍の波、二拍の出口",
    "text": "三拍の波の入口と、二拍の出口を別々に読む。",
    "goal": "全員を星の出口へ。出口の条件は さかな＝3・さかな＝1。",
    "hint": "1で下の留め具を点ける。波の入口は三拍目、右の時計は二拍目。二つの周期は同じではない。",
    "idea": "小さい鍵役で水路を開き、三拍目だけ入れる波と二拍の出口を順に通る。",
    "difference": "脇道では時計の出口へ抜けられず、二人とも波の連続移動と出口の別周期を通過する。",
    "learning": "複合",
    "mainGimmick": "field.wave",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.exit",
      "terrain.water",
      "field.current",
      "fixture.door",
      "fixture.phase",
      "fixture.latch"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit",
      "terrain.water",
      "field.current",
      "field.wave",
      "fixture.door",
      "fixture.phase",
      "fixture.latch"
    ],
    "board": {
      "id": "naopoyo-100-98",
      "title": "三拍の波、二拍の出口",
      "w": 8,
      "h": 8,
      "gravity": false,
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
          6,
          3
        ],
        [
          0,
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
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ]
      ],
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 4,
          "species": "fish",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 2,
          "exact": 3,
          "species": "fish"
        },
        {
          "x": 7,
          "y": 3,
          "exact": 1,
          "species": "fish"
        }
      ],
      "gates": [],
      "spikes": [
        {
          "x": 1,
          "y": 4,
          "power": 1
        }
      ],
      "tiles": [
        {
          "x": 2,
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 2,
          "y": 2,
          "catalogId": "field.current",
          "params": {
            "orientation": "E"
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.wave",
          "params": {
            "orientation": "E",
            "period": 3,
            "phase": 2
          }
        },
        {
          "x": 4,
          "y": 2,
          "catalogId": "fixture.door",
          "params": {
            "id": "D",
            "needs": [
              "T"
            ]
          }
        },
        {
          "x": 6,
          "y": 2,
          "catalogId": "fixture.phase",
          "params": {
            "period": 2,
            "phase": 1
          }
        },
        {
          "x": 3,
          "y": 4,
          "catalogId": "fixture.latch",
          "params": {
            "id": "T",
            "exact": 1
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "fixture.phase",
          "params": {
            "period": 3,
            "phase": 2
          }
        }
      ]
    },
    "solution": [
      {
        "x": 0,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 2,
        "y": 3,
        "dx": -1,
        "dy": 1
      },
      {
        "x": 1,
        "y": 4,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 4,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 4,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 4,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 4,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 2,
        "dx": 1,
        "dy": 1
      }
    ]
  },
  {
    "id": "99",
    "number": 99,
    "difficulty": 99,
    "title": "渡さないための相棒",
    "text": "送り先をふさぐことが、送り出す前の仕事になる。",
    "goal": "全員を星の出口へ。出口の条件は いぬ＝2・かえる＝1。",
    "hint": "かえるをすぐ動かさない。土の出口が埋まっていれば、左の1は入口に残れる。留め具を点けた後に渡そう。",
    "idea": "かえるで土の出口をふさぎ、転送されない1を左岸の留め具へ通す。その後は出口を空け、二人の1を渡して2にする。",
    "difference": "転送の成功ではなく、相棒が送り先にいて転送が起きない状態を先に必要とする。",
    "learning": "複合",
    "mainGimmick": "fixture.burrow",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.latch",
      "fixture.door"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.burrow",
      "fixture.latch",
      "fixture.door"
    ],
    "board": {
      "id": "naopoyo-100-99",
      "title": "渡さないための相棒",
      "w": 8,
      "h": 8,
      "gravity": false,
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
          4,
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
          4,
          4
        ],
        [
          6,
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
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 1,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 5,
          "y": 2,
          "level": 1,
          "species": "frog",
          "id": "actor-2"
        },
        {
          "x": 0,
          "y": 3,
          "level": 1,
          "species": "dog",
          "id": "actor-3"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 3,
          "exact": 2,
          "species": "dog"
        },
        {
          "x": 7,
          "y": 4,
          "exact": 1,
          "species": "frog"
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 2,
          "y": 2,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "B",
            "role": "entrance",
            "orientation": "E",
            "exact": 1,
            "species": "dog"
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "fixture.latch",
          "params": {
            "id": "L",
            "exact": 1,
            "species": "dog"
          }
        },
        {
          "x": 5,
          "y": 2,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "B",
            "role": "exit"
          }
        },
        {
          "x": 6,
          "y": 3,
          "catalogId": "fixture.door",
          "params": {
            "id": "D",
            "needs": [
              "L"
            ]
          }
        }
      ]
    },
    "solution": [
      {
        "x": 0,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 2,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 2,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 0,
        "y": 3,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 6,
        "y": 3,
        "dx": 1,
        "dy": 0
      }
    ]
  },
  {
    "id": "100",
    "number": 100,
    "difficulty": 100,
    "title": "最後の合体は二度待つ",
    "text": "訪問役、箱を押す役、細道を通る大きさを、順に失わず引き継ぐ。",
    "goal": "全員を星の出口へ。出口の条件は いぬ＝6・かえる＝1。",
    "hint": "左のふくろうは1と、隣のかえる。箱は上の板へ。かえるは土へ入り、二人の3は細道を渡る。右のふくろうに会うまで6にしない。",
    "idea": "左のふくろうには1を残し、1と2を合わせて二人の3を用意する。箱を上へ置き、かえるは土、いぬは3の細道を渡る。右の訪問を終えてから6にする。",
    "difference": "分裂では取り戻せない役割を、二度の合体の前に使い切る。箱の置き方・種族別の片道・二地点の相棒待ちが互いの条件になる。",
    "learning": "複合",
    "mainGimmick": "npc.owl",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.plate.weight",
      "object.crate",
      "fixture.burrow",
      "fixture.door",
      "terrain.tunnel"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.plate.weight",
      "object.crate",
      "npc.owl",
      "fixture.burrow",
      "fixture.door",
      "terrain.tunnel"
    ],
    "board": {
      "id": "naopoyo-100-100",
      "title": "最後の合体は二度待つ",
      "w": 8,
      "h": 8,
      "gravity": false,
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
          0,
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
          0,
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
          4,
          4
        ],
        [
          5,
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
          6,
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
          6,
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
      "actors": [
        {
          "x": 1,
          "y": 2,
          "level": 3,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 1,
          "y": 3,
          "level": 2,
          "species": "dog",
          "id": "actor-2"
        },
        {
          "x": 3,
          "y": 3,
          "level": 1,
          "species": "dog",
          "id": "actor-3"
        },
        {
          "x": 1,
          "y": 4,
          "level": 1,
          "species": "frog",
          "id": "actor-4"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 5,
          "exact": 6,
          "species": "dog"
        },
        {
          "x": 7,
          "y": 6,
          "exact": 1,
          "species": "frog"
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 3,
          "y": 1,
          "catalogId": "fixture.plate.weight",
          "params": {
            "id": "P",
            "exact": 2
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "object.crate",
          "params": {
            "id": "C",
            "min": 3,
            "weight": 2
          }
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "npc.owl",
          "params": {
            "id": "O",
            "exact": 1,
            "species": "dog",
            "partner": "frog"
          }
        },
        {
          "x": 4,
          "y": 3,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "F",
            "role": "entrance",
            "orientation": "E",
            "exact": 1,
            "species": "frog"
          }
        },
        {
          "x": 5,
          "y": 3,
          "catalogId": "fixture.door",
          "params": {
            "id": "D",
            "needs": [
              "O",
              "P"
            ]
          }
        },
        {
          "x": 5,
          "y": 3,
          "catalogId": "terrain.tunnel",
          "params": {
            "exact": 3,
            "species": "dog"
          }
        },
        {
          "x": 7,
          "y": 3,
          "catalogId": "npc.owl",
          "params": {
            "id": "Q",
            "exact": 3,
            "species": "dog",
            "partner": "frog"
          }
        },
        {
          "x": 6,
          "y": 4,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "F",
            "role": "exit"
          }
        },
        {
          "x": 7,
          "y": 4,
          "catalogId": "fixture.door",
          "params": {
            "id": "J",
            "needs": [
              "Q"
            ]
          }
        }
      ]
    },
    "solution": [
      {
        "x": 1,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 4,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 3,
        "y": 3,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 3,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 3,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 5,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 6,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 7,
        "y": 3,
        "dx": -1,
        "dy": 1
      },
      {
        "x": 6,
        "y": 4,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 6,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 6,
        "y": 4,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 7,
        "y": 5,
        "dx": 0,
        "dy": 1
      }
    ]
  }
];
