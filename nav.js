/* Уніфікований каркас — поведінка шапки (єдине джерело, підключається воркером
   на кожній сторінці): мобільний drawer (бургер) + прозорий хедер головної,
   що стає непрозорим при скролі. Ідемпотентний, безпечний скрізь. */
(function () {
  "use strict";
  // Шрифти без блокування рендеру: <link rel="stylesheet" media="print" data-async-css>
  // → media="all", щойно CSS завантажено (те саме, що onload="this.media='all'" на
  // головній, але без inline-обробника — CSP блогу/послуг/404 не має 'unsafe-inline').
  var css = document.querySelectorAll("link[data-async-css]");
  for (var i = 0; i < css.length; i++) {
    (function (l) {
      var on = function () { l.media = "all"; };
      if (l.sheet) on();
      else l.addEventListener("load", on);
    })(css[i]);
  }

  var nav = document.querySelector("header.nav");
  if (!nav) return;

  // Мобільне меню (drawer)
  var b = nav.querySelector("#burger");
  var nl = nav.querySelector(".nav-links");
  if (b && nl) {
    var setMenu = function (open) {
      nl.classList.toggle("open", open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.innerHTML = open ? "&times;" : "&#9776;";
    };
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(!nl.classList.contains("open"));
    });
    nl.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (nl.classList.contains("open") && !e.target.closest("header.nav")) setMenu(false);
    });
  }

  // Головна: прозорий хедер → непрозорий при скролі
  if (nav.classList.contains("home")) {
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
