/* Уніфікований каркас — поведінка шапки (єдине джерело, підключається воркером
   на кожній сторінці): мобільний drawer (бургер) + прозорий хедер головної,
   що стає непрозорим при скролі; sticky CTA головної — після кнопки hero.
   Ідемпотентний, безпечний скрізь. */
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

  // Sticky CTA «Umów wizytę» (головна, телефони; стилі — у index.html): прихована, поки на
  // екрані будь-яка головна кнопка сторінки — бронювання з hero (на першому екрані смуга
  // перекривала саму кнопку) або «Podaruj bon» секції акції (#promo-band, worker.js: дві
  // однаково вагомі зелені кнопки з різними цілями поруч розмивають ієрархію й провокують
  // хибний дотик). Видима, коли жодної не видно — проскролено або на низькому екрані кнопка
  // hero ще нижче згину. Без IntersectionObserver — показ після прокрутки >60% висоти екрана.
  // Смуга без кнопки hero поруч (інші сторінки) — видима, як раніше. Клік і конверсія — без
  // змін: той самий <a data-booksy>.
  var bar = document.querySelector(".sticky-cta");
  if (bar) {
    var heroCta = document.querySelector(".hero-actions [data-booksy]") || document.querySelector(".hero-actions");
    var setBar = function (show) {
      bar.classList.toggle("sc-off", !show);
    };
    if (heroCta) {
      setBar(false);
      if (typeof window.IntersectionObserver === "function") {
        // кнопка під фіксованою шапкою або під банером cookie внизу — вже «не видно».
        // Висоту банера шле /consent.js (подія zconsent:bar): показ, зміна розміру, закриття —
        // тоді спостерігач перебудовується з новим нижнім відступом.
        // Кнопка «видна», коли на екрані щонайменше половина її висоти (1 px з-під банера —
        // це не видно).
        var targets = [heroCta, document.querySelector("#promo-band:not([hidden]) .ev-sec-acts")].filter(Boolean);
        var vis = new Map();
        var headH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
        var io = null;
        var watch = function (bottomH) {
          if (io) io.disconnect();
          vis.clear();
          io = new IntersectionObserver(
            function (es) {
              es.forEach(function (e) {
                vis.set(e.target, e.isIntersecting && e.intersectionRatio >= 0.5);
              });
              setBar(!Array.from(vis.values()).some(Boolean));
            },
            { rootMargin: "-" + headH + "px 0px -" + (bottomH || 0) + "px 0px", threshold: [0, 0.5] }
          );
          targets.forEach(function (t) {
            io.observe(t);
          });
        };
        var zc = document.getElementById("zconsent-bar");
        watch(zc ? Math.ceil(zc.getBoundingClientRect().height) : 0);
        window.addEventListener("zconsent:bar", function (e) {
          watch(e && e.detail ? e.detail.h : 0);
        });
      } else {
        var onBarScroll = function () {
          setBar(window.scrollY > window.innerHeight * 0.6);
        };
        onBarScroll();
        window.addEventListener("scroll", onBarScroll, { passive: true });
      }
    }
    bar.classList.add("sc-js");
  }

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
