"""Generate current chapter rulings and preserve historical snapshots separately.

Only CURRENT_RULINGS is player-facing. Editorial transforms below are explicit:
source documents stay untouched, and every retained section keeps its heading.
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
FILES = ['01-core-rules.md', '02-main-system.md', '06-action-chain-checkpoint.md', '07-advanced-rules-checkpoint.md']
END = '# 第0弾テストデッキA'
# A value of None deliberately excludes a design-only or redundant heading.
CHAPTERS = [
 [1,3,1,8,10,11,11,13,13,15,13,8,14,14,2,2,4,9,9,9,9,10,8,12,None],
 [6,5,5,7,7,7,7,15,15,12,12,12,12,12,1,1,1,1,None,1,1],
 [8,None,13,9,13,13,13,13,13,13,13,15,13,15,15,12,12,12,12,None,None,14,14,14,14,14,None],
 [15,15,15,15,15,15,15,15,15],
]
# Replacements are local editorial/current-policy changes, not new game rules.
REPLACE = {
 '本編で出会った・経験したものがカード解禁される。': '全452枚を最初から閲覧でき、デッキに使用できる。コレクションの453種類目はデッキに入れない通常たまご。',
 '発見済みかつ手札にある': '手札にある',
 'レアは単純上位互換にしない。': '',
 '先攻R1も現状ドローあり（先攻有利が実測されたら再検証可）。': '先攻R1も通常ドローを行う。',
 'たまご籠もりの強さは模擬対戦で検証し、問題が出た場合はまずカード／能力側の調整を優先する。': '',
 '現時点の暫定名称は**「ときおくり」**。名称だけを暫定扱いとし、効果・処理は変更しない。': '',
 '通常カードの実体や新たな保存状態を追加しない。': '',
 'この改訂は配置・表示だけであり、ドロー・返却・たんじょう条件・効果・状態遷移を変更しない。将来の通常たまご→強化たまご→メインという表示層は想定するが、強化たまごのルール・効果・保存状態は本改訂に含めない。': '',
 'この例のために新カードや通常行動の割込みを追加しない。': '',
 '解決中の出来事に新規発動を間に合わせる必要がある旧本文は、61 U07のように個別改稿して整合させる。': '',
 '例外化する。': '例外とする。',
 '同じ期限を再質問しない。': '',
 '旧評価の訂正と再現例は[61](61-full-rules-and-card-text-audit.md)を参照。': '',
}
# These paragraphs are editorial records or design advice, without operative rules.
OMIT_PREFIX = [
 '2026-09-14、', '開始／終了時の各処理は下記', '開始順の骨格は',
 '73 V01で未記載だった', '旧05の',
 'この一語テーマは', '属性数・所属・名称を確定する。',
 '- 発動を無効にするカードを実際のカードプールへ', '- 時を大量増加',
 '- 小さな成果', '- 直接そだちを減らす妨害',
 '- 10は象徴的な', '- 補正目安', '- 隣接段階',
 '- 原則各カード固有能力', '- **8枚の別カード',
 '- 特定段階を経由した時だけ追加価値', '- 状況により',
 '- メインカードには原則として曖昧な', '- **「経由」**は設計',
]
# Entire replacements for mixed editorial/operative paragraphs retain their rules.
PARAGRAPH_REPLACE = {
 '75 V02に残っていた': 'こいびとカードを参照するだけのできごと／あいてむの効果までは無効にしない。こいびとを場から離すこと自体も、一律の能力取消しにはならない。',
 '**たまご自体は': 'たまご自体はカード効果で除去・移動・奪取できない。たまごはデッキ外の基礎ゲーム状態として扱う。たんじょうコスト等に対する個別カードの修正は、その本文に従う。',
 '「くさはうみに強い」': '「くさはうみに強い」等の基本有利不利表はない。属性は分類や複数種族を横断する組み合わせ、個別能力の参照情報として使う。',
 '得意分野は作るが': '属性によって基本行動は制限されない。例：全属性が通常のときおくりを行える。',

 '「解決した時」はカード能力': '「解決した時」は連鎖処理を説明する用語。実際の成果は「効果が適用された時」または具体的な結果を参照する。',
 '- **2026-09-14確定:**': '例：先攻が後攻R5中に100へ届いた場合、後攻R6の終了まで維持する。後攻が先攻R9中に100へ届いた場合、次の先攻ターンはR10なので早期勝利を行わず、R10の最終比較へ進む。',
 '**66のユーザー確定方針:**': 'カードゲームではメイン・こいびとに性別・恋愛対象・恋愛タイプを割り当てず、交際成立条件に使わない。へんしん・ときおくりでも相性再判定を行わない。必要な組み合わせ条件は個別カード本文に従う。',
 'メイン1体制のため、': 'メイン除去そのものに共通の固定時コストはない。個別カードの時・発動条件・代償・制限に従う。',
 '段階が低いことだけを理由に': '段階による共通の除去コスト補正・耐性はない。個別カードが「④以下」「⑦以上」等の段階を参照する場合は本文に従う。',
 '段階だけでなく、': 'ちから・ちえ・盤面状態等も個別カードの除去条件になり得る。ただし、ちから／ちえの低さ・高さによる共通の除去弱点／耐性はない。',
 '**自分のメインを任意に': '自分のメインを任意に捨ててたまごへ戻す基本行動はない。個別カードが明記する効果はその本文に従う。',
 'メイン除去も通常のカード効果': 'メイン除去も通常のカード効果と同じく反応・連鎖の対象。除去専用の防御判定や、ちから／ちえによる共通の耐性判定はない。防御・対象変更・除去耐性等は個別カード本文に従う。',
 '**メイン除去そのものには共通': 'メイン除去そのものに共通のそだち増減はない。除去した側の+5、除去された側の-5等は自動では発生しない。個別カードの能力があれば従う。',
 '**メイン除去に共通': 'メイン除去に共通の試合中回数制限はない。',
 'なお、除去されてたまごへ': '除去されてたまごへ戻ると、ちょうせんの対象外になり、手札を整えて別のメインで再出発できる。',
 '「メインを離れた時」のような': 'メインが除去された時に共通の能力は発生しない。移動元・移動先を含め、個別カード能力の発動条件を確認する。',
 '- この途中終了は基本ルール': '- 参加メイン離脱による途中終了は基本ルールで処理する。通常と異なる個別処理はカード本文に従う。',
 'なお、参加メインが場を離れた': '参加メイン離脱による途中終了は基本ルールで処理する。通常と異なる個別処理はカード本文に従う。',
 '- 両方向で使う新規・改稿本文': '- 「自分からちょうせんする時、または相手からちょうせんを受ける時」は両方向を指す。無指定の表記から暗黙に両方向の許可を推測しない。',
 '65の共通案に対する': '勝負は有効な宣言時に開始し、比較前に参加メインが場を離れた時点で途中終了する。「始まらなかった」「引き分けになった」とは扱わない。',
 '- セカイ: 2中心': '- セカイ: カードに記載された時コスト。',
 '- アクション: 1中心': '- アクション: カードに記載された時コスト。',
 '- 制限したい場合は': '- 「1連鎖に1回」等の制限が本文にあれば従う。',
 '- 回数制限は原則能力単位。': '- 回数制限は原則能力単位。カード全体の制限と明記された場合は、その本文に従う。',
 '- 再コピー等の特殊挙動は': '- 再コピー等の特殊な処理は、明記されたカード本文に従う。',
}

def clean(text):
    paragraphs = []
    for paragraph in text.strip().split('\n\n'):
        out = []
        for line in paragraph.splitlines():
            if any(line.startswith(p) for p in OMIT_PREFIX):
                continue
            replacement = next((v for p, v in PARAGRAPH_REPLACE.items() if line.startswith(p)), None)
            line = replacement if replacement is not None else line
            for before, after in REPLACE.items():
                line = line.replace(before, after)
            # Editorial labels and document cross-reference links do not belong in display text.
            line = re.sub(r'【[^】]*】', '', line)
            line = re.sub(r'\*\*(?:64開始手順との接続|63確定手順との接続|既存ルールとの接続):\*\*\s*', '', line)
            line = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', line)
            # Remove whole editorial reference sentences, never partial rule sentences.
            line = re.sub(r'(?:詳細は|詳細な区切り・回数の更新・期限切れで生じた誘発は|局面は|開始・進行の区別は|開始・進行の定義と具体局面は|63の確定記録と|65に確認局面を|64 第5節で確定済み)[^。]*。', '', line)
            line = re.sub(r'(?<![0-9])(?:01|02|06|07|64)(?:・(?:01|02|06|07))?の', '', line)
            line = re.sub(r'(?<![0-9])(?:01|02|06|07)(?:・(?:01|02|06|07))?(?:どおり|に従い)', '共通手順に従い', line)
            line = line.replace('別戦術として正式確定する。', '').replace('基礎0は作らない。', '印刷基礎値0はない。').replace('価値を作る。', '価値がある。')
            line = line.replace('**', '').replace('`', '')
            if line.strip():
                out.append(line)
        if out:
            paragraphs.append('\n'.join(out))
    return '\n\n'.join(paragraphs).strip()

sources, rulings = [], []
for file_index, name in enumerate(FILES):
    raw = (ROOT / 'docs/card-game' / name).read_text()
    end = END if file_index == 3 else None
    text = raw.split(end)[0] if end else raw
    sources.append(dict(path=name, endMarker=end, text=text, sha256=hashlib.sha256(text.encode()).hexdigest()))
    sections = re.split(r'^#{2,3} (.+)\n', text, flags=re.M)[1:]
    pairs = list(zip(sections[::2], sections[1::2]))
    assert len(pairs) == len(CHAPTERS[file_index]), (name, len(pairs), len(CHAPTERS[file_index]))
    for index, ((heading, body), chapter) in enumerate(zip(pairs, CHAPTERS[file_index])):
        if chapter is None:
            continue
        body = clean(body)
        if not body:
            continue
        title = re.sub(r'【[^】]*】|（(?:93|66|64)[^）]*）', '', heading)
        if heading == '初期時コスト基準':
            title = '通常の時コスト'
        rulings.append(dict(id=f'rule-{name[:2]}-{index+1}', chapter=chapter, title=title, text=body, source=dict(path='docs/card-game/'+name, heading=heading)))

# Player explanation verified against engine personUsed/relationshipUsed and real catalog text.
rulings.append(dict(id='rule-person-example', chapter=9, title='人物の通常配置と交際進行の例', text='なかま・こいびとの通常配置は、合わせて自分のターンに合計1人まで、時0です。なかま1人とこいびと1人を別々に数えません。交際進行は人物配置と別の行動・回数で、基本は自分ターン1回、時1です。\n\n例：このターンになかま「ただのはこ」を通常配置したら、同じターンに「がけのヤギさん」をこいびととして通常配置することはできません。逆に、こいびとを先に配置しても、なかまは追加配置できません。メインとこいびとがいて、交際進行の回数・時が残っていれば、人物を配置したターンでも、応答を終えてから交際を1段階進められます。\n\n「おともだちチケット」は山札上5枚から条件を満たす通常のなかま1枚を公開して手札に加えるカードです。盤面へ直接出す効果ではなく、このカードを使っても人物の通常配置の回数は増えません。カード効果の例外は、実際の本文に明記された処理だけに従います。', source=dict(path='docs/card-game/01-core-rules.md', heading='こいびと')))
# The egg exchange belongs in chapter 5 as well as the birth section's source.
birth = next(r for r in rulings if r['id'] == 'rule-02-1')
rulings.append(dict(id='rule-egg-start', chapter=5, title='たまごの開始時ドローと返却', text='通常ドロー後もたまごなら、さらに1枚引き、手札1枚を山札一番下へ戻します。返却は非公開、シャッフルなし。開始時の予約ドローより先に行い、この途中に通常たんじょうや別発動を挟みません。山札不足でも引ける分だけ引き、手札があれば1枚返します。通常ドローと追加ドローの両方ができなくても、返却は必要です。', source=birth['source'].copy()))
# Physical board section supplies preparation rules; the method chapter links their exact scope.
rulings.append(dict(id='rule-preparation-slots', chapter=11, title='準備枠と通常の使用機会', text='準備3枠は「みにつける」と「しかける」で共用します。任意廃棄・自由交換はできません。「すぐつかう」は準備枠が満杯でも使えます。通常のみにつける・しかけるは自分の行動機会だけ。しかけたターンでも、条件が成立して自分に発動機会があれば発動できます。', source=dict(path='docs/card-game/01-core-rules.md', heading='盤面')))

output = '// Generated by build-rulebook-sources.py. SOURCES preserves history; display CURRENT_RULINGS only.\n'
output += 'export const SOURCES = ' + json.dumps(sources, ensure_ascii=False, indent=2) + ';\n'
output += 'export const CURRENT_RULINGS = ' + json.dumps(rulings, ensure_ascii=False, indent=2) + ';\n'
(ROOT / 'prototypes/card-game/rulebook-sources.mjs').write_text(output)
print(f'Generated {len(rulings)} current rulings across {len(set(r["chapter"] for r in rulings))} chapters.')
