// Approved 2026-10-18. Art-production source only; battle UI integration requires separate approval.
export const ATTRIBUTE_COLORS = Object.freeze({
  "ひと": "#F17D9D",
  "けもの": "#95603C",
  "みずべ": "#27D3C5",
  "うみ": "#2878E8",
  "むし": "#F2D12E",
  "くさ": "#269451",
  "げんそう": "#B58BE3",
  "ふしぎ": "#35316E"
});
export const CATEGORY_COLORS = Object.freeze({
  "companion": "#C68A32",
  "partner": "#C04479",
  "world": "#568A9D",
  "play": "#EF9860",
  "item": "#B7A48C",
  "event": "#9298A5"
});
export const DARK_MARK_INK = '#353024';
export const LIGHT_MARK_INK = '#FFFDF1';
// Includes grass: the existing gradient lightens its white-line background.
const darkInkAttributes = new Set(['ひと','みずべ','むし','くさ','げんそう']);
export function cardArtColors(card) {
  const color = card.type === 'main' ? ATTRIBUTE_COLORS[card.attribute] : CATEGORY_COLORS[card.type];
  if (!color) throw new Error(`Unknown card classification: ${card.id}`);
  return {color, markInk: card.type === 'main' ? (darkInkAttributes.has(card.attribute) ? DARK_MARK_INK : LIGHT_MARK_INK) : null};
}
export function applyArtColors(face, card) {
  const {color, markInk} = cardArtColors(card);
  face.style.setProperty('--card-color', color);
  const mark = face.querySelector('.card-attribute .icon');
  if (mark && markInk) mark.style.color = markInk;
}
