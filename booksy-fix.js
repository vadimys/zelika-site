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

  /* Прогресивне покращення: будь-яке посилання з [data-booksy] (nav, hero…)
     відкриває той самий вбудований оверлей Booksy, що й кнопка в картці.
     Якщо віджет ще не намалював кнопку (повільна мережа / JS-помилка) —
     не заважаємо: спрацює звичайний href (редірект на Booksy). */
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("[data-booksy]");
    if (!link) return;
    var btn = document.querySelector(".booksy-widget-button");
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });
})();
