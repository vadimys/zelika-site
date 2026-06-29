/* Booksy-віджет при відкритті форми викликає window.scroll(0, dialog.top), через
   що сторінка під оверлеєм стрибає вгору. Діалог у нас фіксований і центрований,
   тож цей скрол зайвий. Нейтралізуємо window.scroll/scrollTo ЛИШЕ поки відкритий
   оверлей Booksy — навігація сайту (якоря тощо) не зачіпається. */
(function () {
  "use strict";
  var _scroll = window.scroll;
  var _scrollTo = window.scrollTo;
  function overlayOpen() {
    return !!document.querySelector(".booksy-widget-overlay");
  }
  window.scroll = function () {
    if (overlayOpen()) return;
    return _scroll.apply(window, arguments);
  };
  window.scrollTo = function () {
    if (overlayOpen()) return;
    return _scrollTo.apply(window, arguments);
  };
})();
