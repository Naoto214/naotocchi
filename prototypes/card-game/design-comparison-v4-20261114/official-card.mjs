// The baseline uses production markup and the unmodified production stylesheet.
// Shadow DOM prevents prototype styles from changing its appearance.
let records;
export function configureOfficialCards(cards) { records = cards; }
class OfficialCard extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const card = records?.get(this.dataset.id);
    if (!card) return;
    const shadow = this.attachShadow({mode:'open'});
    shadow.innerHTML = `<link rel="stylesheet" href="official/style.css"><style>
      :host{display:block;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;font-size:15px;color:#f6f0dc;color-scheme:dark;--gold:#d7bc76;--line:#57736b;--muted:#bdd0c1}
    </style>${this.dataset.compact==='true'?card.officialCompact:card.officialFull}`;
  }
}
customElements.define('official-card', OfficialCard);
