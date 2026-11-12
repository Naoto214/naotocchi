export const replacements = [
  {
    "id": "10",
    "number": 10,
    "difficulty": 10,
    "title": "白い曲がり角",
    "text": "氷は、入った向きを保って滑る。斜めの道も見つけよう。",
    "goal": "全員を星の出口へ。出口の条件は ＝1。",
    "hint": "一歩右へ。そこから右下の氷へ入ると、下の足場へ滑っていける。",
    "idea": "氷へ斜めに入り、滑る先の下の足場へ渡る。",
    "difference": "氷の縁を斜めに渡って効果を省ける上端の足場を閉じた。",
    "learning": "導入",
    "mainGimmick": "terrain.ice",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.ice"
    ],
    "board": {
      "id": "naopoyo-100-10",
      "title": "白い曲がり角",
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
        ],
        [
          2,
          2
        ]
      ],
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 1,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 5,
          "exact": 1
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 1,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 2,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
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
    ]
  },
  {
    "id": "13",
    "number": 13,
    "difficulty": 13,
    "title": "青い道と石の道",
    "text": "盤面は一つでも通行できる地形は種族で異なる。",
    "goal": "全員を星の出口へ。出口の条件は さかな＝1・いぬ＝1。",
    "hint": "さかなは水の中から右へ。犬は下の石道を使おう。",
    "idea": "水を渡れるさかなと、陸を回る犬を分ける。",
    "difference": "さかなの出発点を水路内へ移し、犬との交換で陸路へ逃がす抜け道を閉じた。",
    "learning": "導入",
    "mainGimmick": "terrain.water",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.water"
    ],
    "board": {
      "id": "naopoyo-100-13",
      "title": "青い道と石の道",
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
          2
        ]
      ],
      "actors": [
        {
          "x": 2,
          "y": 2,
          "level": 1,
          "species": "fish",
          "id": "actor-1"
        },
        {
          "x": 1,
          "y": 3,
          "level": 1,
          "species": "dog",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 5,
          "y": 2,
          "exact": 1,
          "species": "fish"
        },
        {
          "x": 4,
          "y": 4,
          "exact": 1,
          "species": "dog"
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 2,
          "y": 2,
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
          "x": 4,
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
        }
      ]
    },
    "solution": [
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
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": 1
      },
      {
        "x": 2,
        "y": 4,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 3,
        "y": 4,
        "dx": 1,
        "dy": 0
      }
    ]
  },
  {
    "id": "15",
    "number": 15,
    "difficulty": 15,
    "title": "止まる場所はひとつ",
    "text": "入口の向きが、到達できる側道を決める。",
    "goal": "全員を星の出口へ。出口の条件は ＝2。",
    "hint": "左のくぼみから氷へ。右端へ滑ったあと、出口のある下の道へ向きを変えよう。",
    "idea": "氷の途中では曲がれない。滑り終わる右端から出口へ向きを変える。",
    "difference": "斜めに入って氷の効果を省く足場を閉じ、右端の停止位置を読む問題にした。",
    "learning": "応用",
    "mainGimmick": "terrain.ice",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.ice"
    ],
    "board": {
      "id": "naopoyo-100-15",
      "title": "止まる場所はひとつ",
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
          4,
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
        ],
        [
          2,
          2
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
          "x": 6,
          "y": 4,
          "exact": 2
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 2,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 3,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
        },
        {
          "x": 4,
          "y": 3,
          "catalogId": "terrain.ice",
          "params": {}
        }
      ]
    },
    "solution": [
      {
        "x": 1,
        "y": 2,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 1,
        "y": 3,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 5,
        "y": 3,
        "dx": 1,
        "dy": 1
      }
    ]
  },
  {
    "id": "16",
    "number": 16,
    "difficulty": 16,
    "title": "下から回り込む風",
    "text": "同じ一手の途中で風が直角に曲がる。",
    "goal": "全員を星の出口へ。出口の条件は ＝1。",
    "hint": "右へ二歩。風は右、下、下、右とつながる。止まった先から星へ。",
    "idea": "折れた風の最後を予測して進入点を選ぶ。",
    "difference": "途中の風が壁で止まらないようにし、斜めの抜け道を閉じた。連続する風の向きが必須になった。",
    "learning": "応用",
    "mainGimmick": "field.wind",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "field.wind"
    ],
    "board": {
      "id": "naopoyo-100-16",
      "title": "下から回り込む風",
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
          2,
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
          3,
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
      "actors": [
        {
          "x": 1,
          "y": 2,
          "level": 1,
          "species": "dog",
          "id": "actor-1"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 4,
          "exact": 1
        }
      ],
      "gates": [],
      "spikes": [],
      "tiles": [
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.wind",
          "params": {
            "orientation": "E"
          }
        },
        {
          "x": 4,
          "y": 2,
          "catalogId": "field.wind",
          "params": {
            "orientation": "S"
          }
        },
        {
          "x": 4,
          "y": 4,
          "catalogId": "field.wind",
          "params": {
            "orientation": "E"
          }
        },
        {
          "x": 4,
          "y": 3,
          "catalogId": "field.wind",
          "params": {
            "orientation": "S"
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
        "x": 5,
        "y": 4,
        "dx": 1,
        "dy": 0
      }
    ]
  },
  {
    "id": "46",
    "number": 46,
    "difficulty": 46,
    "title": "同じ氷、違う出口",
    "text": "同じ停止点を使えるが、必要な出口は上下に違う。",
    "goal": "全員を星の出口へ。出口の条件は いぬ＝2・かえる＝1。",
    "hint": "二人とも左上の氷へ。出口の種族を見て、滑った先で進路を分けよう。",
    "idea": "二種族を氷へ送る順序と、氷を避ける道を比較する。",
    "difference": "氷を使わず下側へ抜ける斜めの足場を閉じた。",
    "learning": "応用",
    "mainGimmick": "terrain.ice",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "terrain.ice"
    ],
    "board": {
      "id": "naopoyo-100-46",
      "title": "同じ氷、違う出口",
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
          7,
          2
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
          7,
          3
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
          3,
          3
        ]
      ],
      "actors": [
        {
          "x": 0,
          "y": 2,
          "level": 2,
          "species": "dog",
          "id": "actor-1"
        },
        {
          "x": 0,
          "y": 3,
          "level": 1,
          "species": "frog",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 2,
          "exact": 2,
          "species": "dog"
        },
        {
          "x": 6,
          "y": 3,
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
          "catalogId": "terrain.ice",
          "params": {}
        },
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
        "x": 5,
        "y": 2,
        "dx": 1,
        "dy": 0
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
      }
    ]
  },
  {
    "id": "77",
    "number": 77,
    "difficulty": 77,
    "title": "二つの水路、ひとつの星",
    "text": "水路ごとの数字を保ち、合流先で元の重さに戻す。",
    "goal": "さかなを3に戻して右上の星へ。",
    "hint": "針で2と1に分ける。2は上の門、1は下の水路から右へ。合流して3になってから星へ。",
    "idea": "上は2、下は1。先に合体せず別々の水路を通ってから3へ戻す。",
    "difference": "2の本体と1の子を別の水路へ通し、合流後に3を作る。",
    "learning": "複合",
    "mainGimmick": "field.current",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.gate",
      "fixture.exit",
      "terrain.water"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.gate",
      "fixture.exit",
      "terrain.water",
      "field.current"
    ],
    "board": {
      "id": "naopoyo-100-77",
      "title": "二つの水路、ひとつの星",
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
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 2,
          "exact": 3,
          "species": "fish"
        }
      ],
      "gates": [
        {
          "x": 4,
          "y": 2,
          "exact": 2,
          "species": "fish"
        },
        {
          "x": 3,
          "y": 3,
          "exact": 1,
          "species": "fish"
        }
      ],
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
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.current",
          "params": {
            "orientation": "E"
          }
        },
        {
          "x": 2,
          "y": 3,
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
          "y": 3,
          "catalogId": "field.current",
          "params": {
            "orientation": "S"
          }
        },
        {
          "x": 5,
          "y": 3,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 5,
          "y": 3,
          "catalogId": "field.current",
          "params": {
            "orientation": "N"
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
        "dx": 1,
        "dy": 1
      },
      {
        "x": 3,
        "y": 4,
        "dx": 1,
        "dy": 0
      },
      {
        "x": 4,
        "y": 4,
        "dx": 1,
        "dy": -1
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
    "id": "90",
    "number": 90,
    "difficulty": 90,
    "title": "水に二つの数字",
    "text": "水に入れる種族でも門には段階制限がある。",
    "goal": "全員を星の出口へ。出口の条件は さかな＝2・さかな＝1。",
    "hint": "門は1だけ通れる。右岸へ渡る順と、出口の2をどこで作るかを考えよう。",
    "idea": "大きい個体を水路の細い門のために分け、後で2をつくる。",
    "difference": "条件門も水のマスにし、水への進入を斜め移動で省く抜け道を閉じた。",
    "learning": "複合",
    "mainGimmick": "terrain.water",
    "supportGimmicks": [
      "fixture.spike",
      "fixture.gate",
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.gate",
      "fixture.exit",
      "terrain.water"
    ],
    "board": {
      "id": "naopoyo-100-90",
      "title": "水に二つの数字",
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
          "x": 1,
          "y": 2,
          "level": 2,
          "species": "fish",
          "id": "actor-1"
        },
        {
          "x": 2,
          "y": 3,
          "level": 1,
          "species": "fish",
          "id": "actor-2"
        }
      ],
      "exits": [
        {
          "x": 6,
          "y": 2,
          "exact": 2,
          "species": "fish"
        },
        {
          "x": 5,
          "y": 4,
          "exact": 1,
          "species": "fish"
        }
      ],
      "gates": [
        {
          "x": 4,
          "y": 2,
          "exact": 1,
          "species": "fish"
        }
      ],
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
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
        },
        {
          "x": 4,
          "y": 2,
          "catalogId": "terrain.water",
          "params": {}
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
        "dx": 0,
        "dy": 1
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
        "dx": 0,
        "dy": 1
      }
    ]
  },
  {
    "id": "62",
    "number": 62,
    "difficulty": 62,
    "title": "針が上へ曲がる小窓",
    "text": "背中の壁で曲がる針。その先の空きを先に読む。",
    "goal": "四人の1を、右上の星へ。",
    "hint": "針へ入る方向で、後ろに生まれる場所が変わる。上側の1を先に出し、残りも一人ずつ門へ。",
    "idea": "真後ろの一マスの先が壁なので、残りの針は時計回りに上へ伸びる。",
    "difference": "分裂した4人を合体させず、奥から出口へ順に送る。",
    "learning": "応用",
    "mainGimmick": "fixture.spike",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.spike",
      "fixture.exit"
    ],
    "board": {
      "id": "naopoyo-100-62",
      "title": "針が上へ曲がる小窓",
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
          "id": "actor-1",
          "x": 2,
          "y": 4,
          "level": 4,
          "species": "dog"
        }
      ],
      "exits": [
        {
          "x": 5,
          "y": 2,
          "exact": 1
        }
      ],
      "gates": [
        {
          "x": 4,
          "y": 2,
          "exact": 1
        }
      ],
      "spikes": [
        {
          "x": 3,
          "y": 4,
          "power": 3
        }
      ],
      "tiles": []
    },
    "solution": [
      {
        "x": 2,
        "y": 4,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 3,
        "y": 3,
        "dx": 0,
        "dy": 1
      },
      {
        "x": 3,
        "y": 3,
        "dx": 1,
        "dy": -1
      },
      {
        "x": 3,
        "y": 4,
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
        "x": 3,
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
      }
    ]
  },
  {
    "id": "35",
    "number": 35,
    "difficulty": 35,
    "title": "風を越すための三",
    "text": "重さを借りて風を越え、仕事が終わってから返す。",
    "goal": "右上へ2、右下へ1を送り出そう。",
    "hint": "まず2と1を合わせる。3なら風で下へ押されない。右の針を使うのは風を越えてから。",
    "idea": "軽い体を吹き戻す風の前で3に合体し、通過後に2と1へ分け直す。",
    "difference": "出口は3を受け取らない。合体は風を渡る間だけ借りる重さ。",
    "learning": "応用",
    "mainGimmick": "field.wind",
    "supportGimmicks": [
      "fixture.exit"
    ],
    "materials": [
      "terrain.wall",
      "terrain.floor",
      "fixture.exit",
      "field.wind"
    ],
    "board": {
      "id": "naopoyo-100-35",
      "title": "風を越すための三",
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
          "id": "a",
          "x": 0,
          "y": 2,
          "level": 2,
          "species": "dog"
        },
        {
          "id": "b",
          "x": 2,
          "y": 2,
          "level": 1,
          "species": "dog"
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
          "x": 6,
          "y": 2,
          "power": 1
        }
      ],
      "tiles": [
        {
          "x": 3,
          "y": 2,
          "catalogId": "field.wind",
          "params": {
            "orientation": "S",
            "max": 2
          }
        },
        {
          "x": 4,
          "y": 2,
          "catalogId": "fixture.oneway",
          "params": {
            "orientation": "E"
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
  }
];
