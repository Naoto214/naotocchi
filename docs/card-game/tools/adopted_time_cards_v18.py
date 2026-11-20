"""Read only the seven approved additive sources; historical452 audits are unchanged."""
import json
import re


def adopted_cards(root):
    path = 'docs/card-game/482-time-reversal-cards.md'
    text = (root / path).read_text()
    approved = json.loads((root / 'tools/card459-adoption-v18-20261120.json').read_text())['cards']
    blocks = re.findall(r'^### ([WE]-[^ ]+) — ([^\n]+)\n\n([^#]+?)(?=\n##|\Z)', text, re.M)
    if len(blocks) != 7 or {b[0] for b in blocks} != set(approved):
        raise ValueError('VERSION18 requires exactly the seven approved card headings')
    result = []
    for card_id, name, body in blocks:
        if name != approved[card_id]['displayName']:
            raise ValueError(f'VERSION18 formal name differs: {card_id}')
        event = card_id.startswith('E-')
        result.append(dict(id=card_id, name=name, text=body.strip(),
                           type='できごと' if event else 'セカイ', time=2,
                           rarity='normal', path=path,
                           **({'method': 'すぐつかう'} if event else {})))
    return result
