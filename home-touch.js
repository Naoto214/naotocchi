/* CSS fixes the layout; cancel a one-finger pan before iOS can rubber-band
   the central pane. Text keeps its own scroll, and pinch zoom stays native. */
(() => {
  const device = document.getElementById('device');
  if (!device) return;
  let gesture = null;
  const locked = () => device.dataset.homeFixed === 'true'
    && !(window.visualViewport?.scale > 1);

  document.addEventListener('touchstart', event => {
    gesture = null;
    if (!locked() || event.touches.length !== 1 || event.target.closest?.('#device') !== device) return;
    const finger = event.touches[0];
    gesture = { x:finger.clientX, y:finger.clientY,
      text:event.target.closest?.('#speechText, #message') };
  }, { passive:true, capture:true });

  document.addEventListener('touchmove', event => {
    if (!gesture) return;
    if (!locked() || event.touches.length !== 1) { gesture = null; return; }
    const finger = event.touches[0];
    const dx = finger.clientX - gesture.x, dy = finger.clientY - gesture.y;
    gesture.x = finger.clientX;
    gesture.y = finger.clientY;
    const text = gesture.text;
    if (text && Math.abs(dy) > Math.abs(dx)) {
      const limit = text.scrollHeight - text.clientHeight;
      if (limit > 1 && ((dy < 0 && text.scrollTop < limit - 1)
        || (dy > 0 && text.scrollTop > 0))) return;
    }
    if (event.cancelable) event.preventDefault();
  }, { passive:false, capture:true });

  // A gesture that involved two fingers remains native until a new touchstart.
  document.addEventListener('touchend', () => { gesture = null; }, { passive:true, capture:true });
  document.addEventListener('touchcancel', () => { gesture = null; }, { passive:true, capture:true });
})();
