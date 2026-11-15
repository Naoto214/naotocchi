// Independent comparison variants; V3 source boards are never mutated.
export const puzzles = [
  {
    "id": "air",
    "number": 75,
    "difficulty": 75,
    "title": "気流の前で、姿を分ける",
    "text": "上へ運ばれる3と、下へ落ちる二人の1を作る場所を考える。段階条件付き気流の比較で、飛行能力ではありません。",
    "goal": "全員を星の出口へ。出口の条件は ＝3・＝1。",
    "hint": "針で3と1。3だけ気流へ乗れる。1は針の下へ。",
    "idea": "上へ運ばれる3と、下へ落ちる二人の1を作る場所を考える。段階条件付き気流の比較で、飛行能力ではありません。",
    "difference": "先に分けないと重力と風のどちらも出口に届かない。",
    "learning": "複合",
    "mainGimmick": "field.updraft",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.exit",
      "sign.gravity"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit",
      "field.updraft",
      "sign.gravity"
    ],
    "board": {
      "id": "v4-air",
      "title": "気流の前で、姿を分ける",
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
          "level": 5,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 1,
          "exact": 3
        },
        {
          "x": 6,
          "y": 5,
          "exact": 1
        }
      ],
      "gates": [],
      "spikes": [
        {
          "x": 3,
          "y": 3,
          "power": 2
        }
      ],
      "tiles": [
        {
          "x": 3,
          "y": 1,
          "catalogId": "field.updraft",
          "params": {
            "exact": 3
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.updraft",
          "params": {
            "exact": 3
          }
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "field.updraft",
          "params": {
            "exact": 3
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
        "y": 1,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 1,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 1,
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
        "y": 5,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 5,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 5,
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
        "x": 2,
        "y": 3,
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
      },
      {
        "x": 5,
        "y": 5,
        "dx": 1,
        "dy": 0
      }
    ],
    "world": "sky",
    "source": {
      "id": "74",
      "number": 75
    }
  },
  {
    "id": "water",
    "number": 75,
    "difficulty": 75,
    "title": "泡に乗る前の分かれ道",
    "text": "4を3と1へ分け、3を泡で上へ、1を下の出口へ。水中で移動できる魚と、泡の段階条件を区別します。",
    "goal": "全員を星の出口へ。出口の条件は ＝3・＝1。",
    "hint": "針で3と1。3だけ気流へ乗れる。1は針の下へ。",
    "idea": "4を3と1へ分け、3を泡で上へ、1を下の出口へ。水中で移動できる魚と、泡の段階条件を区別します。",
    "difference": "先に分けないと重力と風のどちらも出口に届かない。",
    "learning": "複合",
    "mainGimmick": "field.updraft",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.exit",
      "sign.gravity"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit",
      "field.updraft",
      "sign.gravity"
    ],
    "board": {
      "id": "v4-water",
      "title": "泡に乗る前の分かれ道",
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
          "level": 4,
          "species": "fish",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 1,
          "exact": 3,
          "species": "fish"
        },
        {
          "x": 6,
          "y": 5,
          "exact": 1,
          "species": "fish"
        }
      ],
      "gates": [],
      "spikes": [
        {
          "x": 3,
          "y": 3,
          "power": 1
        }
      ],
      "tiles": [
        {
          "x": 3,
          "y": 1,
          "catalogId": "field.bubble",
          "params": {
            "exact": 3
          }
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.bubble",
          "params": {
            "exact": 3
          }
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "field.bubble",
          "params": {
            "exact": 3
          }
        },
        {
          "catalogId": "sign.gravity",
          "x": 0,
          "y": 0,
          "params": {}
        },
        {
          "x": 3,
          "y": 1,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 4,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 5,
          "catalogId": "terrain.water",
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
        "y": 1,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 1,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 1,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 2,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 3,
        "y": 4,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 4,
        "y": 5,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 5,
        "dx": 1,
        "dy": 0
      }
    ],
    "world": "sea",
    "source": {
      "id": "74",
      "number": 75
    }
  },
  {
    "id": "earth",
    "number": 54,
    "difficulty": 54,
    "title": "細道へ送る順番",
    "text": "先に1を分け、入口の向きを合わせる。2は別の出口へ。地中通路の配置条件であり、犬の穴掘り能力ではありません。",
    "goal": "全員を星の出口へ。出口の条件は ＝1・＝2。",
    "hint": "2は手前の星。1で針のマスに立ち、右へ入口へ入ろう。",
    "idea": "先に1を分け、入口の向きを合わせる。2は別の出口へ。地中通路の配置条件であり、犬の穴掘り能力ではありません。",
    "difference": "段階に加えて進入方向も条件になる。",
    "learning": "応用",
    "mainGimmick": "fixture.burrow",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit",
      "fixture.burrow"
    ],
    "board": {
      "id": "v4-earth",
      "title": "細道へ送る順番",
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
          7,
          3
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
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 3,
          "exact": 1
        },
        {
          "x": 2,
          "y": 4,
          "exact": 2
        }
      ],
      "gates": [
        {
          "x": 1,
          "y": 4,
          "exact": 2
        }
      ],
      "spikes": [
        {
          "x": 1,
          "y": 3,
          "power": 1
        }
      ],
      "tiles": [
        {
          "x": 2,
          "y": 3,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "A",
            "role": "entrance",
            "orientation": "E",
            "exact": 1
          }
        },
        {
          "x": 4,
          "y": 3,
          "catalogId": "fixture.burrow",
          "params": {
            "pairId": "A",
            "role": "exit"
          }
        },
        {
          "x": 5,
          "y": 3,
          "catalogId": "terrain.tunnel",
          "params": {
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
        "dy": 1
      },
      {
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 0,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 1,
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
        "x": 5,
        "y": 3,
        "dx": 1,
        "dy": 0
      }
    ],
    "world": "earth",
    "source": {
      "id": "59",
      "number": 54
    }
  },
  {
    "id": "warp",
    "number": 99,
    "difficulty": 99,
    "title": "環をふさいで、先に鍵へ",
    "text": "相棒が環をふさぐ間に1を鍵へ通す。その後に環を空け、二人を渡す。先に相棒を救出するとどうなる？",
    "goal": "全員を星の出口へ。出口の条件は いぬ＝2・かえる＝1。",
    "hint": "かえるをすぐ動かさない。土の出口が埋まっていれば、左の1は入口に残れる。留め具を点けた後に渡そう。",
    "idea": "相棒が環をふさぐ間に1を鍵へ通す。その後に環を空け、二人を渡す。先に相棒を救出するとどうなる？",
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
      "id": "v4-warp",
      "title": "環をふさいで、先に鍵へ",
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
          "catalogId": "fixture.warp",
          "params": {
            "pairId": "B",
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
          "catalogId": "fixture.warp",
          "params": {
            "pairId": "B",
            "exact": 8,
            "species": "dog"
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
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 3,
        "y": 2,
        "dx": -1,
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
    ],
    "world": "cave",
    "source": {
      "id": "99",
      "number": 99
    }
  },
  {
    "id": "crates",
    "number": 59,
    "difficulty": 59,
    "title": "二つの箱、奥から手前へ",
    "text": "重2の箱を上の板、重1の箱を下の板へ。右の箱を先に下へ。左の箱を先に押すと、右の箱の上に回れなくなる。",
    "goal": "全員を右の星へ。出口の条件は＝2。",
    "hint": "重さ2の箱は右へ。重さ1の箱は右側に回って左へ押そう。",
    "idea": "重2の箱を上の板、重1の箱を下の板へ。右の箱を先に下へ。左の箱を先に押すと、右の箱の上に回れなくなる。",
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
      "id": "v4-crates",
      "title": "二つの箱、奥から手前へ",
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
          "y": 3,
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
          "x": 4,
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
        "dy": 1
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
        "dy": -1
      },
      {
        "x": 4,
        "y": 2,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 4,
        "y": 3,
        "dx": -1,
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
      }
    ],
    "world": "forest",
    "source": {
      "id": "51",
      "number": 59
    }
  }
];
