// Authored definitions; contact-v1 evidence: docs/naopoyo-contact-20261025/
export const expansionStages=[
  {
    "id": "komorebi-fall-order",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        0,
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
      ]
    ],
    "gates": [],
    "exits": [
      {
        "x": 4,
        "y": 5,
        "exact": 4
      },
      {
        "x": 7,
        "y": 7,
        "exact": 8
      }
    ],
    "spikes": [],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 5,
        "level": 5,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 2,
        "y": 5,
        "level": 5,
        "species": "dog"
      },
      {
        "id": "c",
        "x": 1,
        "y": 7,
        "level": 2,
        "species": "dog"
      }
    ],
    "number": 14,
    "title": "14 落とす順番",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 3,
    "discovery": "先に5を下の2へ落として7にし、次の5との合体で8と4を上下に作る。",
    "lesson": "同じ場所へ落ちても、順番で道が変わる。",
    "story": "二つの枝の下に、小さな仲間が待っていた。",
    "ending": "落ちた光が、帰り道の高さを変えた。",
    "hints": [
      "星は4と8。いまいるのは5と5と2。",
      "下の2へ5を先に落とすと7。そこへ次の5を合わせると、8と余った4になる。",
      "左の枝の5を右上へ動かし、下の2へ落とそう。その後、右の枝の5を左へ動かして7と合わせよう。"
    ],
    "hint": "星は4と8。いまいるのは5と5と2。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-thorn-ledge",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        2,
        7
      ],
      [
        4,
        6
      ],
      [
        5,
        6
      ]
    ],
    "gates": [],
    "exits": [
      {
        "x": 5,
        "y": 5,
        "exact": 4
      },
      {
        "x": 7,
        "y": 7,
        "exact": 8
      }
    ],
    "spikes": [
      {
        "x": 2,
        "y": 6,
        "power": 2
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 8,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 4,
        "species": "dog"
      }
    ],
    "number": 15,
    "title": "15 ほどける足場",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 4,
    "discovery": "トゲで分かれながら段差を越え、向こう側で必要な4と支える8を作り直す。",
    "lesson": "トゲは仕掛け。その下の岩が足場。",
    "story": "岩の切れ目に、二本のトゲが光っていた。",
    "ending": "岩に支えられながら、ほどけた仲間を集め直した。",
    "hints": [
      "トゲは足場にならない。このトゲの下には岩があるよ。",
      "4をそのまま運ぶことにこだわらず、向こう側で4と8を作り直そう。",
      "左の8を右上へ動かし、4との落下合体で上下に分かれよう。トゲを越えた後も、小さな仲間を置き去りにしないで。"
    ],
    "hint": "トゲは足場にならない。このトゲの下には岩があるよ。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-woven-path",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        2,
        7
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
      ]
    ],
    "gates": [],
    "exits": [
      {
        "x": 5,
        "y": 5,
        "exact": 8
      },
      {
        "x": 7,
        "y": 5,
        "exact": 5
      },
      {
        "x": 7,
        "y": 7,
        "exact": 5
      }
    ],
    "spikes": [
      {
        "x": 3,
        "y": 6,
        "power": 3
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 8,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 5,
        "species": "dog"
      }
    ],
    "number": 16,
    "title": "16 小さな橋を編む",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 4,
    "discovery": "分裂体の置き場所を変え、上側で8を再構成する。残り5は下の道から回収する。",
    "lesson": "小さく分かれた仲間が、道をつなぐ。",
    "story": "遠くの星は8。でも、そこへ続く足場にはトゲがあった。",
    "ending": "ばらばらの光が、岩の上でもう一度集まった。",
    "hints": [
      "上の8を先に帰すには、トゲの向こうで8を作る必要がある。",
      "分かれた1は、数を足す材料にも、次の仲間が届く足場にもなる。",
      "左の8を右上へ重ねて上下を作り、8を中央のトゲへ。残った5も岩の上へ運ぼう。"
    ],
    "hint": "上の8を先に帰すには、トゲの向こうで8を作る必要がある。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-relay-foothold",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        2,
        7
      ],
      [
        4,
        6
      ],
      [
        5,
        5
      ],
      [
        5,
        6
      ],
      [
        7,
        5
      ],
      [
        7,
        6
      ]
    ],
    "gates": [],
    "exits": [
      {
        "x": 5,
        "y": 4,
        "exact": 3
      },
      {
        "x": 7,
        "y": 7,
        "exact": 8
      }
    ],
    "spikes": [
      {
        "x": 2,
        "y": 6,
        "power": 3
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 8,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 3,
        "species": "dog"
      }
    ],
    "number": 17,
    "title": "17 支える役を交代",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 5,
    "discovery": "二段上の星へ3を届けるため、分裂後の仲間を再配置して段階的に支える。",
    "lesson": "同じ足場に、ずっと頼ることはできない。",
    "story": "見上げた先に、もう一段高い枝があった。",
    "ending": "進む役と支える役が、静かに入れ替わった。",
    "hints": [
      "3の星は、これまでより一段高い。",
      "トゲを越えただけでは届かない。途中の岩の高さと、支える8の場所を考えよう。",
      "左の8を右上へ。上下に分かれてからトゲへ入り、右側に運ぶ仲間と残す仲間を選ぼう。"
    ],
    "hint": "3の星は、これまでより一段高い。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-remainder-lift",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        3,
        4
      ],
      [
        3,
        5
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
        4,
        7
      ],
      [
        3,
        7
      ]
    ],
    "gates": [
      {
        "x": 3,
        "y": 6,
        "exact": 8
      }
    ],
    "exits": [
      {
        "x": 6,
        "y": 5,
        "exact": 3
      },
      {
        "x": 7,
        "y": 5,
        "exact": 5
      }
    ],
    "spikes": [
      {
        "x": 4,
        "y": 6,
        "power": 3
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 6,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 6,
        "species": "dog"
      },
      {
        "id": "c",
        "x": 2,
        "y": 7,
        "level": 4,
        "species": "dog"
      }
    ],
    "number": 18,
    "title": "18 あまりを上へ",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 6,
    "discovery": "6＋6の余剰を重力で回収して二つの8を作り、魔法岩の先で3と5へ組み直す。",
    "lesson": "通るための大きさと、帰るための大きさ。",
    "story": "魔法岩には8。けれど、森の向こうに8の星はなかった。",
    "ending": "大きくなって渡り、小さく分かれて帰った。",
    "hints": [
      "全員で16。星は3と5だけ。",
      "二つの8で魔法岩を越え、その先で5と3を二組作ろう。分裂で上下に散る1の回収も考えて。",
      "二つの8を作ろう。下の岩へ登って8の魔法岩を渡り、右隣のトゲで分けよう。"
    ],
    "hint": "全員で16。星は3と5だけ。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-reverse-stars",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        2,
        6
      ],
      [
        4,
        6
      ],
      [
        7,
        6
      ]
    ],
    "gates": [
      {
        "x": 2,
        "y": 7,
        "exact": 8
      },
      {
        "x": 6,
        "y": 7,
        "exact": 8
      }
    ],
    "exits": [
      {
        "x": 5,
        "y": 5,
        "exact": 3
      },
      {
        "x": 7,
        "y": 5,
        "exact": 5
      }
    ],
    "spikes": [
      {
        "x": 3,
        "y": 6,
        "power": 3
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 8,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 8,
        "species": "dog"
      }
    ],
    "number": 19,
    "title": "19 星から逆算",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 7,
    "discovery": "3と5の出口から必要な組み合わせを逆算し、8の魔法岩が小さい仲間を止める性質を足場として使う。",
    "lesson": "行き止まりに見える場所が、支えになる。",
    "story": "右の星は高い。足もとには、8しか通れない魔法岩があった。",
    "ending": "帰り道を決めてから、支える場所を選んだ。",
    "hints": [
      "8の魔法岩は、5を通さない。上から落ちる5もそこで止まれる。",
      "全員で16。3を二回、5を二回帰す形を考えよう。5を魔法岩の上へ上げる横の支えを残して。",
      "二つの8を中央へ。トゲを右下側から使い、3の材料と5を分けて置こう。"
    ],
    "hint": "8の魔法岩は、5を通さない。上から落ちる5もそこで止まれる。",
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  },
  {
    "id": "komorebi-forest-trial",
    "w": 8,
    "h": 8,
    "gravity": true,
    "walls": [
      [
        3,
        4
      ],
      [
        3,
        5
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
        5
      ],
      [
        7,
        6
      ],
      [
        5,
        3
      ]
    ],
    "gates": [
      {
        "x": 3,
        "y": 7,
        "exact": 8
      },
      {
        "x": 5,
        "y": 5,
        "exact": 3
      },
      {
        "x": 7,
        "y": 5,
        "exact": 4
      }
    ],
    "exits": [
      {
        "x": 6,
        "y": 3,
        "exact": 7
      },
      {
        "x": 7,
        "y": 7,
        "exact": 3
      }
    ],
    "spikes": [
      {
        "x": 4,
        "y": 6,
        "power": 3
      },
      {
        "x": 6,
        "y": 6,
        "power": 2
      }
    ],
    "water": [],
    "guests": [],
    "events": [],
    "actors": [
      {
        "id": "a",
        "x": 0,
        "y": 7,
        "level": 6,
        "species": "dog"
      },
      {
        "id": "b",
        "x": 1,
        "y": 7,
        "level": 6,
        "species": "dog"
      },
      {
        "id": "c",
        "x": 2,
        "y": 7,
        "level": 4,
        "species": "dog"
      }
    ],
    "number": 20,
    "title": "20 森の結び目",
    "revision": 3,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 8,
    "discovery": "二つの8で魔法岩を越え、片方を足場にもう片方を分ける。上の作業場で7を組み、足場役も3ずつ回収する。",
    "lesson": "支える場所も、分かれる順番も、きみたちで。",
    "story": "ふくろうが、枝の上から静かに見ていた。「通れる大きさと、帰れる大きさは違うよ」",
    "ending": "最後の光が星へ届くと、枝の向こうに水のきらめきが見えた。——第2章 おわり——",
    "hints": [
      "全部で16。上の星は7、下の星は3。帰す組み合わせから考えよう。",
      "下の魔法岩の先では、もう一人を足場にしてトゲへ登ろう。7の材料と、支える仲間を同時に残したい。",
      "3の魔法岩の向こうの作業場で7を作ろう。7は左上の岩を回って星へ。下に残った仲間は3ずつ帰そう。"
    ],
    "hint": "全部で16。上の星は7、下の星は3。帰す組み合わせから考えよう。",
    "narrator": {
      "id": "owl",
      "name": "ものしりふくろう",
      "asset": "assets/characters/companions/owl.png"
    },
    "gravityRules": "supported-v1",
    "movementRules": "contact-v1"
  }
];
