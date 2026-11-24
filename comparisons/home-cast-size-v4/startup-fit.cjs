// Embedded only in the new V4 controller by its pinned builder.
function createOpeningFit(onRetain = () => {}) {
  let scope, previousOffer, lastOffer, lastPublished, retainedInner;
  let reversals = 0;

  function containsBands(outer, inner) {
    if (!outer || !inner) return outer === inner;
    const rowsByHeight = new Map(outer.map(row => [row[0], row]));
    return inner.every(([y, up, down]) => {
      const row = rowsByHeight.get(y);
      return row && row[1] >= up && row[2] >= down;
    });
  }
  function contains(outer, inner) {
    return outer && ['width','height','count'].every(key => outer[key] === inner[key]) &&
      outer.left <= inner.left && outer.right >= inner.right && outer.top <= inner.top &&
      outer.bottom >= inner.bottom && outer.above >= inner.above && outer.below >= inner.below &&
      outer.side >= inner.side && containsBands(outer.fitVertical, inner.fitVertical) &&
      containsBands(outer.vertical, inner.vertical);
  }

  return function retainOpeningFit(current, next, nextScope, projection) {
    if (scope !== nextScope) {
      scope = nextScope;
      previousOffer = lastOffer = lastPublished = retainedInner = undefined;
      reversals = 0;
    }
    const published = JSON.stringify(current), proposed = JSON.stringify(next);
    if (published === proposed) return true;
    if (published === lastPublished && proposed === retainedInner) return true;
    retainedInner = undefined;

    // The camera used for each measurement and the complete native ink envelope
    // must recur exactly. Only keep a fit that already contains every new ink band.
    const camera = projection && [projection.x,projection.y,projection.scaleX,projection.scaleY,
      projection.bodyScale,projection.bodyScaleLimit].join(',');
    const offer = camera + '|' + proposed;
    reversals = published === lastPublished && offer === previousOffer ? reversals + 1 : 0;
    if (projection && reversals >= 3 && contains(current, next)) {
      retainedInner = proposed;
      onRetain();
      return true;
    }
    previousOffer = lastOffer;
    lastOffer = offer;
    lastPublished = proposed;
    return false;
  };
}
module.exports = {createOpeningFit};
