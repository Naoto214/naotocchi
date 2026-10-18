// RH-6: browser テストの context.route の 中で fetch が こけても(CI で まれに ECONNRESET)、
// unhandled rejection で process ごと 落とさない。retry は しない(原因を かくさない)。
// どの case の どの URL が、どの code で、case の 開始から 何 ms で こけたかを 記録して、その case を 赤に する。
function guardedRoute(context, pattern, label, sink, handler) {
  const started = Date.now();
  return context.route(pattern, async (route) => {
    try {
      await handler(route);
    } catch (error) {
      sink.push({ label, url: route.request().url(), code: (error && error.code) || null,
        message: String((error && error.message) || error), msSinceCaseStart: Date.now() - started });
      await route.abort('failed').catch(() => {});
    }
  });
}
module.exports = { guardedRoute };
