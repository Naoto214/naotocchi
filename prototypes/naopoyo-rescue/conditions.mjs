// Door and exit share this contract; only their effects differ.
export function matchesCondition(actor, condition) {
  return (!condition.species || condition.species === actor.species)
    && (condition.exact === undefined || actor.level === condition.exact)
    && (condition.min === undefined || actor.level >= condition.min)
    && (condition.max === undefined || actor.level <= condition.max);
}
export function conditionLabel(condition) {
  const digits = value => String(value).padStart(2, '0');
  if (condition.exact !== undefined) return `=${digits(condition.exact)}`;
  if (condition.min !== undefined) return `≥${digits(condition.min)}`;
  if (condition.max !== undefined) return `≤${digits(condition.max)}`;
  return 'ALL';
}
