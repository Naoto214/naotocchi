(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HomeOpeningSeats = api;
})(typeof window === 'undefined' ? null : window, () => {
  // Artwork-normalized feet, in native initialPoint order (hero, partner, companions).
  // These four layouts were evaluated after V5's two native seating passes on the
  // short phone. V5 still validates terrain, per-resident bounds, contacts and exits.
  const compactSeats = {
    forest: [
      [0.54, 0.76], [0.564967, 0.600265], [0.596026, 0.542649], [0.597053, 0.835585],
      [0.449073, 0.795077], [0.664305, 0.931391], [0.251424, 0.75766], [0.612583, 0.480287],
      [0.298013, 0.676645], [0.680861, 0.86362], [0.647748, 0.467042], [0.349735, 0.79585],
      [0.285563, 0.851921], [0.550464, 0.653245], [0.401457, 0.714834], [0.334205, 0.69298],
      [0.696391, 0.439779], [0.550464, 0.9166], [0.632219, 0.890883], [0.418013, 0.583929],
      [0.614636, 0.797395], [0.481159, 0.57223], [0.778146, 0.414062], [0.430464, 0.809095],
      [0.433543, 0.88702], [0.71397, 0.86517], [0.34768, 0.87377], [0.54636, 0.4772],
    ],
    river_lake: [
      [0.56, 0.77], [0.24935, 0.50365], [0.455, 0.584], [0.38489, 0.51921],
      [0.07029, 0.38366], [0.815, 0.844], [0.89715, 0.69219], [0.06927, 0.55972],
      [0.4501, 0.82465], [0.7285, 0.74363], [0.38324, 0.89113], [0.76572, 0.91583],
      [0.5153, 0.92984], [0.36731, 0.6891], [0.49977, 0.68987], [0.87854, 0.76935],
      [0.31455, 0.80908], [0.64571, 0.61348], [0.25038, 0.72806], [0.18312, 0.63766],
      [0.64981, 0.84728], [0.93631, 0.88136], [0.1713, 0.87826], [0.64768, 0.9449],
      [0.31661, 0.59946], [0.13652, 0.44989], [0.11734, 0.70933], [0.76367, 0.66183],
    ],
    city: [
      [0.66, 0.8], [0.41596, 0.53017], [0.76364, 0.86207], [0.2649, 0.74364],
      [0.68189, 0.95634], [0.46666, 0.88856], [0.56497, 0.73194], [0.89712, 0.88702],
      [0.4501, 0.69298], [0.50079, 0.58238], [0.53288, 0.95479], [0.81126, 0.94232],
      [0.34871, 0.64], [0.28454, 0.55898], [0.10139, 0.6634], [0.79676, 0.73194],
      [0.94679, 0.95788], [0.93023, 0.75689], [0.15106, 0.59717], [0.58358, 0.64938],
      [0.86504, 0.6517], [0.51325, 0.80755], [0.63222, 0.55898], [0.61258, 0.87532],
      [0.84437, 0.81218], [0.21728, 0.6634], [0.39838, 0.76859], [0.74503, 0.61274],
    ],
    home: [
      [0.55, 0.74], [0.39837, 0.57375], [0.91268, 0.79507], [0.64776, 0.5987],
      [0.68293, 0.91737], [0.10239, 0.82465], [0.82989, 0.72806], [0.10136, 0.53169],
      [0.72849, 0.67508], [0.25141, 0.62596], [0.72849, 0.41171], [0.49874, 0.92907],
      [0.3994, 0.79816], [0.31558, 0.4382], [0.78125, 0.51273], [0.32081, 0.69139],
      [0.46768, 0.64936], [0.7978, 0.95634], [0.33419, 0.95634], [0.25243, 0.51845],
      [0.92923, 0.59561], [0.16862, 0.69065], [0.46563, 0.40078], [0.5682, 0.97939],
      [0.61464, 0.86052], [0.59706, 0.37197], [0.86301, 0.46624], [0.23177, 0.87377],
    ],
  };

  function makeSeats(nav, spec, width, height) {
    if (height < width) return null;
    if (width <= 360 && height / width < 1.76) {
      const layout = compactSeats[spec.region];
      return layout ? layout.map(([x, z]) => nav.project({x, z})) : null;
    }

    // In taller portraits the path has room for the native companion seats.
    // Find a legal partner point on the side chosen by the original illustration.
    const [lead, partner] = spec.seats;
    const side = partner[0] > lead[0] ? 1 : -1;
    const target = nav.project({x: lead[0] + side * .17, z: lead[1] - .035});
    const left = Math.max(.10, Math.min(...spec.ground.map(p => p[0])));
    const right = Math.min(.91, Math.max(...spec.ground.map(p => p[0])));
    const far = Math.max(.32, Math.min(...spec.ground.map(p => p[1])));
    const near = Math.min(.97, Math.max(...spec.ground.map(p => p[1])));
    let mate = null;
    let shortest = Infinity;
    for (let i = 1; i <= 256; i++) {
      // Unequal, low-discrepancy sequences avoid rows across irregular terrain.
      const x = left + (i * .7548776662466927 % 1) * (right - left);
      const z = far + (i * .5698402909980532 % 1) * (near - far);
      const point = nav.project({x, z});
      const distance = Math.hypot(point.x - target.x, point.y - target.y);
      if (distance < shortest && nav.valid(point)) {
        shortest = distance;
        mate = point;
      }
    }
    return mate ? [null, mate] : null;
  }

  function withOpeningSeats(nav, spec, width, height) {
    let proposed;
    return {...nav, initialPoint(index, count) {
      if (count !== 28) return nav.initialPoint(index, count);
      if (proposed === undefined) proposed = makeSeats(nav, spec, width, height);
      return proposed?.[index] || nav.initialPoint(index, count);
    }};
  }

  return {withOpeningSeats};
});
