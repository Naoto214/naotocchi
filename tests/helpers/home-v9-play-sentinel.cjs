// Runs as a Playwright init script in every new document.
module.exports = function seedPlaySentinel(origin) {
  // about:blank during lifecycle checks has no storage origin. Do not seed
  // unrelated documents; real storage errors on the test origin must still fail.
  if (location.origin !== origin) return;
  if (!localStorage.getItem('naotocchi-home-v9-play-v1')) {
    localStorage.setItem('naotocchi-home-v9-play-v1', 'existing-play-save-sentinel');
  }
};
