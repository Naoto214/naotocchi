// Authored mechanism candidates; see expansion-audit.json for search limits.
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
    "revision": 1,
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
    "hint": "星は4と8。いまいるのは5と5と2。"
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
    "revision": 1,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 4,
    "discovery": "トゲで分かれながら段差を越え、向こう側で必要な4と支える8を作り直す。",
    "lesson": "ほどける場所にも、立っていられる。",
    "story": "岩の切れ目に、二本のトゲが光っていた。",
    "ending": "こわかった場所が、渡るための足場になった。",
    "hints": [
      "トゲのマスでは、分かれた本体が止まる。",
      "4をそのまま運ぶことにこだわらず、向こう側で4と8を作り直そう。",
      "左の8を右上へ動かし、4との落下合体で上下に分かれよう。トゲを越えた後も、小さな仲間を置き去りにしないで。"
    ],
    "hint": "トゲのマスでは、分かれた本体が止まる。"
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
    "revision": 1,
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
    "hint": "上の8を先に帰すには、トゲの向こうで8を作る必要がある。"
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
    "revision": 1,
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
    "hint": "3の星は、これまでより一段高い。"
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
      ]
    ],
    "gates": [
      {
        "x": 3,
        "y": 7,
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
    "revision": 1,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 6,
    "discovery": "6＋6の余剰を重力で回収して二つの8を作り、門の先で3と5へ組み直す。",
    "lesson": "通るための大きさと、帰るための大きさ。",
    "story": "門には8。けれど、森の向こうに8の星はなかった。",
    "ending": "大きくなって渡り、小さく分かれて帰った。",
    "hints": [
      "全員で16。星は3と5だけ。",
      "二つの8で門を越え、その先で5と3を二組作ろう。分裂で上下に散る1の回収も考えて。",
      "左端の6を右上へ動かして落下合体。8を右の4へ動かすと、上に余った4も下へ集まる。"
    ],
    "hint": "全員で16。星は3と5だけ。"
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
        5,
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
    "revision": 1,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 7,
    "discovery": "3と5の出口から必要な組み合わせを逆算し、8の門が小さい仲間を止める性質を足場として使う。",
    "lesson": "行き止まりに見える場所が、支えになる。",
    "story": "右の星は高い。足もとには、8しか通れない門があった。",
    "ending": "帰り道を決めてから、支える場所を選んだ。",
    "hints": [
      "8の門は、5を通さない。上から落ちる5もそこで止まれる。",
      "全員で16。3を二回、5を二回帰す形を考えよう。5を門の上へ上げる横の支えを残して。",
      "二つの8を中央へ。トゲを右下側から使い、3の材料と5を分けて置こう。"
    ],
    "hint": "8の門は、5を通さない。上から落ちる5もそこで止まれる。"
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
        4,
        5
      ],
      [
        4,
        4
      ],
      [
        7,
        6
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
    "revision": 1,
    "theme": "forest",
    "showSpecies": false,
    "difficulty": 8,
    "discovery": "8で下の門を通り、左右で3と4を作って上の作業場へ運び7にする。残る9を3ずつ回収する。",
    "lesson": "支える場所も、分かれる順番も、きみたちで。",
    "story": "ふくろうが、枝の上から静かに見ていた。「通れる大きさと、帰れる大きさは違うよ」",
    "ending": "最後の光が星へ届くと、枝の向こうに水のきらめきが見えた。——第2章 おわり——",
    "hints": [
      "下の門は8。上の門は3と4。でも上の星は7。",
      "7は上の門を通れない。門の向こうで3＋4を組もう。その材料を残しつつ、下の3の星から先に仲間を帰そう。",
      "まず左端の6を右上へ重ねて落とす。できた8を右の4へ動かし、二つの8にしてから下の門を渡ろう。"
    ],
    "hint": "下の門は8。上の門は3と4。でも上の星は7。",
    "narrator": {
      "id": "owl",
      "name": "ものしりふくろう",
      "asset": "assets/characters/companions/owl.png"
    }
  }
];
