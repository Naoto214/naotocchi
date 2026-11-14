// Individually authored VERSION 3 replacements. Legacy ids remain stable.
export const replacements = [
  {
    "id": "03",
    "number": 3,
    "difficulty": 3,
    "title": "すれ違う星",
    "text": "出口が二人の背中側にあり、一列の途中で場所を交換する。",
    "goal": "全員を星の出口へ。右はいぬ＝1、左はかえる＝1。",
    "hint": "いぬの行き先は右、かえるは左。通路の途中で重なる向きへ進もう。",
    "idea": "両端の種族別出口を交差させ、異種族交換を必須にする。",
    "difference": "前の仲間を先に救出して道を空ける方法では解けない。",
    "learning": "導入",
    "mainGimmick": "fixture.exit",
    "supportGimmicks": [],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit"
    ],
    "board": {
      "id": "naopoyo-100-03",
      "title": "すれ違う星",
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
        ]
      ],
      "actors": [
        {
          "x": 2,
          "y": 3,
          "level": 1,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 4,
          "y": 3,
          "level": 1,
          "species": "frog",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 5,
          "y": 3,
          "exact": 1,
          "species": "dog"
        },
        {
          "x": 1,
          "y": 3,
          "exact": 1,
          "species": "frog"
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": []
    },
    "solution": [
      {
        "x": 2,
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
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 3,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 3,
        "dx": -1,
        "dy": 0
      }
    ]
  },
  {
    "id": "20",
    "number": 20,
    "difficulty": 20,
    "title": "氷の受け手",
    "text": "通れない門を持つ相棒が、氷の途中の止まり木になる。",
    "goal": "全員を星の出口へ。下はいぬ＝2、右はかえる＝1。",
    "hint": "かえるを中央の氷へ。いぬの門が入れ替わりを止めるので、いぬは下へ曲がれる。",
    "idea": "相棒が戻れない種族門を利用して、氷上の交換を阻み停止位置を作る。",
    "difference": "かえるを先に救出すると、いぬは分岐を滑り過ぎる。相棒の配置が先。",
    "learning": "応用",
    "mainGimmick": "terrain.ice",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.oneway",
      "fixture.gate"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.ice",
      "fixture.oneway",
      "fixture.gate"
    ],
    "board": {
      "id": "naopoyo-100-20",
      "title": "氷の受け手",
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
        ]
      ],
      "actors": [
        {
          "x": 1,
          "y": 2,
          "level": 2,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 3,
          "y": 3,
          "level": 1,
          "species": "frog",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 2,
          "y": 4,
          "exact": 2,
          "species": "dog"
        },
        {
          "x": 6,
          "y": 2,
          "exact": 1,
          "species": "frog"
        }
      ],
      "gates": [
        {
          "x": 2,
          "y": 2,
          "species": "dog"
        }
      ],
      "spikes": [],
      "tiles": [
        {
          "catalogId": "terrain.ice",
          "x": 2,
          "y": 2,
          "params": {}
        },
        {
          "catalogId": "terrain.ice",
          "x": 3,
          "y": 2,
          "params": {}
        },
        {
          "catalogId": "terrain.ice",
          "x": 4,
          "y": 2,
          "params": {}
        },
        {
          "catalogId": "fixture.oneway",
          "x": 2,
          "y": 3,
          "params": {
            "orientation": "S"
          }
        }
      ]
    },
    "solution": [
      {
        "x": 3,
        "y": 3,
        "dx": 0,
        "dy": -1
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
        "dx": 0,
        "dy": 1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 3,
        "y": 2,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
      }
    ]
  },
  {
    "id": "42",
    "number": 42,
    "difficulty": 42,
    "title": "帰りは返事をしない",
    "text": "奥の鍵を取った帰りに、反転板を踏み直すか回り込むかを選ぶ。",
    "goal": "全員を左下の星へ。出口の条件は＝2。",
    "hint": "行きに反転板を点け、奥の留め具へ。帰りは板の下を回れば点灯を保てる。",
    "idea": "往路で開いた反転板を復路では避け、二つの合図を同時に残す。",
    "difference": "往復の同じ道が同じ結果にならない。最短では反転板を一度だけ踏む。",
    "learning": "応用",
    "mainGimmick": "fixture.toggle",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.door",
      "fixture.latch"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.toggle",
      "fixture.door",
      "fixture.latch"
    ],
    "board": {
      "id": "naopoyo-100-42",
      "title": "帰りは返事をしない",
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
          "x": 1,
          "y": 2,
          "level": 2,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 1,
          "y": 5,
          "exact": 2
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "catalogId": "fixture.toggle",
          "x": 2,
          "y": 2,
          "params": {
            "id": "A"
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 3,
          "y": 2,
          "params": {
            "id": "D",
            "needs": [
              "A"
            ]
          }
        },
        {
          "catalogId": "fixture.latch",
          "x": 5,
          "y": 2,
          "params": {
            "id": "B"
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 1,
          "y": 4,
          "params": {
            "id": "V",
            "needs": [
              "A",
              "B"
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
        "x": 2,
        "y": 2,
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
        "dy": 0
      },
      {
        "x": 5,
        "y": 2,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 2,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 2,
        "dx": -1,
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
        "dy": 1
      }
    ]
  },
  {
    "id": "51",
    "number": 51,
    "difficulty": 51,
    "title": "重さの違う二つの席",
    "text": "二つの箱を重さの合う板へ置いて、両方の合図を残す。",
    "goal": "全員を右の星へ。出口の条件は＝2。",
    "hint": "重さ2の箱は右へ。重さ1の箱は右側に回って左へ押そう。",
    "idea": "重さの異なる二箱を、反対向きの押し方でそれぞれの板に配る。",
    "difference": "一箱だけでは二つの入力が揃わない。自分で踏んでも遠い扉まで保持できない。",
    "learning": "複合",
    "mainGimmick": "object.crate",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.plate.weight",
      "fixture.door"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "object.crate",
      "fixture.plate.weight",
      "fixture.door"
    ],
    "board": {
      "id": "naopoyo-100-51",
      "title": "重さの違う二つの席",
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
        ]
      ],
      "actors": [
        {
          "x": 1,
          "y": 2,
          "level": 2,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 3,
          "exact": 2
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "catalogId": "object.crate",
          "x": 2,
          "y": 2,
          "params": {
            "id": "A",
            "min": 2,
            "weight": 2
          }
        },
        {
          "catalogId": "object.crate",
          "x": 4,
          "y": 4,
          "params": {
            "id": "B",
            "min": 1,
            "weight": 1
          }
        },
        {
          "catalogId": "fixture.plate.weight",
          "x": 3,
          "y": 2,
          "params": {
            "id": "P",
            "exact": 2
          }
        },
        {
          "catalogId": "fixture.plate.weight",
          "x": 3,
          "y": 4,
          "params": {
            "id": "Q",
            "exact": 1
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 6,
          "y": 3,
          "params": {
            "id": "D",
            "needs": [
              "P",
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
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 5,
        "y": 4,
        "dx": -1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 4,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 4,
        "dx": 1,
        "dy": -1
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
    "id": "54",
    "number": 54,
    "difficulty": 54,
    "title": "同じ相を一息で",
    "text": "二つの時計が同じ相で開く。波ならその間に次の時計まで届く。",
    "goal": "全員を右の星へ。出口の条件はさかな＝4。",
    "hint": "流れに入る時の相を見よう。波が動く一手の中なら、二つの時計を続けて通れる。",
    "idea": "一手内では時計の相が変わらない性質を使い、流れと波で同期した二扉を渡る。",
    "difference": "波を外すと二つの時計の間で止まり、相棒も次の手を助けられず渡れない。",
    "learning": "複合",
    "mainGimmick": "field.wave",
    "supportGimmicks": [
      "fixture.exit",
      "terrain.water",
      "field.current",
      "fixture.phase",
      "fixture.gate"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.water",
      "field.current",
      "field.wave",
      "fixture.phase",
      "fixture.gate"
    ],
    "board": {
      "id": "naopoyo-100-54",
      "title": "同じ相を一息で",
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
        ]
      ],
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 3,
          "species": "fish",
          "id": "actor-1"
        },
        {
          "x": 5,
          "y": 2,
          "level": 1,
          "species": "fish",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 2,
          "exact": 4,
          "species": "fish"
        }
      ],
      "gates": [
        {
          "x": 6,
          "y": 2,
          "exact": 4
        }
      ],
      "spikes": [],
      "tiles": [
        {
          "catalogId": "terrain.water",
          "x": 2,
          "y": 2,
          "params": {}
        },
        {
          "catalogId": "field.current",
          "x": 2,
          "y": 2,
          "params": {
            "orientation": "E"
          }
        },
        {
          "catalogId": "terrain.water",
          "x": 3,
          "y": 2,
          "params": {}
        },
        {
          "catalogId": "field.wave",
          "x": 3,
          "y": 2,
          "params": {
            "orientation": "E",
            "period": 3,
            "phase": 1
          }
        },
        {
          "catalogId": "fixture.phase",
          "x": 3,
          "y": 2,
          "params": {
            "period": 3,
            "phase": 1
          }
        },
        {
          "catalogId": "fixture.phase",
          "x": 4,
          "y": 2,
          "params": {
            "period": 3,
            "phase": 1
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
      }
    ]
  },
  {
    "id": "70",
    "number": 70,
    "difficulty": 70,
    "title": "相棒が進める時計",
    "text": "二つの同じ時計の間では、もう一人の一歩が次の通過を作る。",
    "goal": "全員を星へ。本体2は右、子1は右下。",
    "hint": "子を下の留め具へ。時計の間で止まったら相棒を動かそう。最後の救出も時計の一手になる。",
    "idea": "分裂した二人を交互に操作し、一方の前進や救出をもう一方の時計合わせにする。",
    "difference": "二枚の同期した時計は同じ個体だけの連続操作では通れない。鍵役にも通過順がある。",
    "learning": "応用",
    "mainGimmick": "fixture.phase",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.latch",
      "fixture.door",
      "fixture.spike"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.phase",
      "fixture.latch",
      "fixture.door",
      "fixture.spike"
    ],
    "board": {
      "id": "naopoyo-100-70",
      "title": "相棒が進める時計",
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
          7,
          3
        ],
        [
          0,
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
        ]
      ],
      "actors": [
        {
          "x": 0,
          "y": 3,
          "level": 3,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 3,
          "exact": 2
        },
        {
          "x": 5,
          "y": 4,
          "exact": 1
        }
      ],
      "gates": [],
      "spikes": [
        {
          "x": 2,
          "y": 3,
          "power": 1
        }
      ],
      "tiles": [
        {
          "catalogId": "fixture.phase",
          "x": 3,
          "y": 3,
          "params": {
            "period": 2,
            "phase": 1
          }
        },
        {
          "catalogId": "fixture.phase",
          "x": 4,
          "y": 3,
          "params": {
            "period": 2,
            "phase": 1
          }
        },
        {
          "catalogId": "fixture.latch",
          "x": 1,
          "y": 4,
          "params": {
            "id": "A",
            "exact": 1
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 5,
          "y": 3,
          "params": {
            "id": "D",
            "needs": [
              "A"
            ]
          }
        }
      ]
    },
    "solution": [
      {
        "x": 0,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 2,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 1,
        "y": 4,
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
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 4,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 5,
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
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 1
      }
    ]
  },
  {
    "id": "78",
    "number": 78,
    "difficulty": 78,
    "title": "橋を渡して床を開ける",
    "text": "いぬが足場を使い終えると、その床がかえるの通路に変わる。",
    "goal": "全員を星へ。上はいぬ＝2、下はかえる＝1。",
    "hint": "いぬを板から隣の扉へ。消えた足場の場所を、あとからかえるで通ろう。",
    "idea": "同じ崩れる床を、先に上の支え、後で下の通路として使い分ける。",
    "difference": "かえるが先に足場を崩すといぬの道を失う。押し板と崩落の両方が必要。",
    "learning": "複合",
    "mainGimmick": "fixture.crumble",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.plate.hold",
      "fixture.door",
      "sign.gravity"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.plate.hold",
      "fixture.door",
      "fixture.crumble",
      "sign.gravity"
    ],
    "board": {
      "id": "naopoyo-100-78",
      "title": "橋を渡して床を開ける",
      "w": 8,
      "h": 8,
      "gravity": true,
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
          "x": 1,
          "y": 3,
          "level": 2,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 2,
          "y": 4,
          "level": 1,
          "species": "frog",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 5,
          "y": 3,
          "exact": 2,
          "species": "dog"
        },
        {
          "x": 5,
          "y": 5,
          "exact": 1,
          "species": "frog"
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "catalogId": "fixture.plate.hold",
          "x": 3,
          "y": 3,
          "params": {
            "id": "P",
            "species": "dog"
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 4,
          "y": 3,
          "params": {
            "id": "D",
            "needs": [
              "P"
            ]
          }
        },
        {
          "catalogId": "fixture.crumble",
          "x": 3,
          "y": 4,
          "params": {
            "id": "C"
          }
        },
        {
          "catalogId": "sign.gravity",
          "x": 0,
          "y": 0,
          "params": {}
        }
      ]
    },
    "solution": [
      {
        "x": 1,
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
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 4,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 5,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 5,
        "dx": 1,
        "dy": 0
      }
    ]
  },
  {
    "id": "83",
    "number": 83,
    "difficulty": 83,
    "title": "鍵役も門の向こうへ",
    "text": "子が脇道の鍵を残し、最後には自分も同じ扉を通る。",
    "goal": "全員を右の星へ。上は3、下は1。",
    "hint": "1を下の留め具へ。本体を通したあと、鍵役も留め具を離れて右の扉へ戻ろう。",
    "idea": "分裂で作った1を一時的な鍵役にし、保持された合図で本人も脱出させる。",
    "difference": "鍵役の出口も扉の先に移したため、留め具の保持性を最後まで使う。",
    "learning": "複合",
    "mainGimmick": "fixture.latch",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.door",
      "fixture.spike"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "fixture.door",
      "fixture.latch",
      "fixture.spike"
    ],
    "board": {
      "id": "naopoyo-100-83",
      "title": "鍵役も門の向こうへ",
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
          5,
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
          1,
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
          "level": 4,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 2,
          "exact": 3
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
          "catalogId": "fixture.door",
          "x": 5,
          "y": 2,
          "params": {
            "id": "D",
            "needs": [
              "A"
            ]
          }
        },
        {
          "catalogId": "fixture.latch",
          "x": 4,
          "y": 4,
          "params": {
            "id": "A",
            "exact": 1
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
        "dy": 1
      },
      {
        "x": 3,
        "y": 3,
        "dx": 1,
        "dy": 1
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
        "x": 4,
        "y": 4,
        "dx": 0,
        "dy": -1
      },
      {
        "x": 4,
        "y": 3,
        "dx": 1,
        "dy": -1
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
    "id": "89",
    "number": 89,
    "difficulty": 89,
    "title": "小さい仲間の風の便",
    "text": "大きい本体は上を通り、小さい子だけが風で下の鍵へ分かれる。",
    "goal": "全員を星へ。本体3は右、子1は右下。",
    "hint": "本体を風の先へ逃がしてから、1を風へ。矢印の通路の先で留め具を点けよう。",
    "idea": "段階条件の風を分岐装置にし、同じ入口から本体と鍵役を別経路に送る。",
    "difference": "小さい仲間が風を避けて鍵へ行く横道を閉じ、進入方向の矢印で搬送路を固定する。",
    "learning": "複合",
    "mainGimmick": "field.wind",
    "supportGimmicks": [
      "fixture.exit",
      "fixture.oneway",
      "fixture.door",
      "fixture.latch",
      "fixture.spike"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "field.wind",
      "fixture.oneway",
      "fixture.door",
      "fixture.latch",
      "fixture.spike"
    ],
    "board": {
      "id": "naopoyo-100-89",
      "title": "小さい仲間の風の便",
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
          2,
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
          "level": 4,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 7,
          "y": 2,
          "exact": 3
        },
        {
          "x": 5,
          "y": 5,
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
          "catalogId": "field.wind",
          "x": 3,
          "y": 2,
          "params": {
            "orientation": "S",
            "exact": 1
          }
        },
        {
          "catalogId": "field.wind",
          "x": 3,
          "y": 3,
          "params": {
            "orientation": "E",
            "exact": 1
          }
        },
        {
          "catalogId": "field.wind",
          "x": 4,
          "y": 3,
          "params": {
            "orientation": "E",
            "exact": 1
          }
        },
        {
          "catalogId": "fixture.oneway",
          "x": 3,
          "y": 3,
          "params": {
            "orientation": "S"
          }
        },
        {
          "catalogId": "fixture.oneway",
          "x": 4,
          "y": 3,
          "params": {
            "orientation": "E"
          }
        },
        {
          "catalogId": "fixture.oneway",
          "x": 5,
          "y": 3,
          "params": {
            "orientation": "E"
          }
        },
        {
          "catalogId": "fixture.door",
          "x": 5,
          "y": 2,
          "params": {
            "id": "D",
            "needs": [
              "P"
            ]
          }
        },
        {
          "catalogId": "fixture.latch",
          "x": 5,
          "y": 4,
          "params": {
            "id": "P",
            "exact": 1
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
        "x": 5,
        "y": 3,
        "dx": 0,
        "dy": 1
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
        "x": 5,
        "y": 4,
        "dx": 0,
        "dy": 1
      }
    ]
  }
];
