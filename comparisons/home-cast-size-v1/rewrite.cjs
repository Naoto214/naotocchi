function replaceOnce(source, needle, replacement) {
  if (source.indexOf(needle) < 0 || source.indexOf(needle) !== source.lastIndexOf(needle))
    throw new Error('Expected one pinned comparison anchor: ' + needle);
  return source.replace(needle, () => replacement);
}
module.exports = {replaceOnce};
