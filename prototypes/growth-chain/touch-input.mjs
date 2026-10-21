// One owner per button; no input survives pointer cancellation or a lost window.
export function bindHold(
  element,
  action,
  {
    releaseTarget = window,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    delay = 280,
    interval = 90,
  } = {},
) {
  let owner = null,
    timer = null,
    generation = 0;
  const stop = () => {
    owner = null;
    generation++;
    clearTimer(timer);
  };
  const repeat = (token) => {
    if (token !== generation || owner === null) return;
    if (element.disabled) {
      stop();
      return;
    }
    action();
    if (token === generation && owner !== null)
      timer = setTimer(() => repeat(token), interval);
  };
  const down = (e) => {
    if (
      element.disabled ||
      owner !== null ||
      (e.button !== undefined && e.button !== 0)
    )
      return;
    e.preventDefault();
    owner = e.pointerId;
    const token = ++generation;
    element.setPointerCapture?.(e.pointerId);
    action();
    if (token === generation && owner !== null)
      timer = setTimer(() => repeat(token), delay);
  };
  const up = (e) => {
    if (e.pointerId === owner) stop();
  };
  const click = (e) => {
    if (!e.detail && !element.disabled) action();
  };
  element.addEventListener("pointerdown", down);
  element.addEventListener("click", click);
  element.addEventListener("lostpointercapture", up);
  releaseTarget.addEventListener("pointerup", up);
  releaseTarget.addEventListener("pointercancel", up);
  releaseTarget.addEventListener("blur", stop);
  return {
    stop,
    dispose() {
      stop();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("click", click);
      element.removeEventListener("lostpointercapture", up);
      releaseTarget.removeEventListener("pointerup", up);
      releaseTarget.removeEventListener("pointercancel", up);
      releaseTarget.removeEventListener("blur", stop);
    },
  };
}
