// The original two-seat experiment remains available on the reference entry.
// At every tested width there are native directions that it removes. Keep the
// ordinary native sync for V10 until a placement has an egress certificate.
function patchSeats(source) {
  const flag = '    let consideredFreshSeats=false;\n';
  const begin = '      if (!consideredFreshSeats && next.compareFreshSeats === true && actors.length === 28';
  const after = '      if(arrange){clearRelief();';
  if (source.split(flag).length !== 2 || source.split(begin).length !== 2 || source.split(after).length !== 2) {
    throw new Error('Expected one V9 optional seat experiment with its original sync boundaries');
  }
  const start = source.indexOf(begin), end = source.indexOf(after, start);
  if (end === -1 || !source.slice(start,end).trimEnd().endsWith('}')) {
    throw new Error('Could not identify the complete V9 optional seat experiment');
  }
  return source.slice(0,start).replace(flag,'') + source.slice(end);
}

module.exports = {patchSeats};
