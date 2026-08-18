/* Studio Zelika — synchronizacja cennika z botem (/api/content → finance).
   Ceny, nazwy, czasy I KATEGORIE pochodzą z bota (jedno źródło). Mistrzyni zarządza
   wszystkim w bocie: 💰 Finanse → ⚙️ Cennik. Usługa BEZ kategorii = wewnętrzna,
   nie trafia na stronę. Statyczny cennik w index.html zostaje jako fallback. */
(function () {
  "use strict";
  var API = "https://hooks.zelika.pl/api/content";

  // Prezentacja (stała): kolejność sekcji, która jest wyróżniona i jej opis.
  // Nowe kategorie z bota, których tu nie ma, dokleją się na końcu automatycznie.
  var ORDER = ["Makijaż permanentny brwi", "Brwi", "Rzęsy", "Usta", "Oczy", "Pozostałe"];
  var FEATURE = "Makijaż permanentny brwi";
  var NEW_CATS = ["Usta", "Oczy"]; // нові зони (сертифікати 2026) — бейдж «Nowość»
  // канонізація категорії: bot може віддати "Oczy " / "oczy" / "OCZY" → зводимо до ORDER,
  // інакше категорія тихо впаде в кінець після "Pozostałe" (див. фікс ORDER-матчингу).
  var CANON = {};
  ORDER.forEach(function (t) { CANON[t.toLowerCase()] = t; });
  function canonCat(s) { var t = String(s == null ? "" : s).trim(); return CANON[t.toLowerCase()] || t; }
  var NOTE =
    "Trwały, naturalny efekt dopasowany do kształtu twarzy. Cena zawiera konsultację, brow mapping i dobór koloru.";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtPrice(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    var s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
    return s + " zł";
  }
  function row(it) {
    var dur = it.duration ? '<span class="pdur">' + esc(it.duration) + "</span>" : "";
    return (
      '<div class="price-row"><span class="pname">' + esc(it.name) + dur +
      '</span><span class="price">' + esc(fmtPrice(it.price)) + "</span></div>"
    );
  }

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c || !Array.isArray(c.cennik_items) || !c.cennik_items.length) return;
      var container = document.querySelector(".svc-cats");
      if (!container) return;

      // grupujemy usługi po kategorii (którą nadaje bot)
      var byCat = {};
      c.cennik_items.forEach(function (it) {
        if (!it || !it.category) return;
        var cat = canonCat(it.category);
        (byCat[cat] = byCat[cat] || []).push(it);
      });
      // kolejność: najpierw ORDER, potem nowe kategorie z bota (na końcu)
      var cats = ORDER.filter(function (t) { return byCat[t]; }).concat(
        Object.keys(byCat).filter(function (t) { return ORDER.indexOf(t) < 0; })
      );
      if (!cats.length) return;

      // Klasa "in" OBOWIĄZKOWO: .reveal startuje z opacity:0, a IntersectionObserver
      // nadaje "in" tylko elementom obecnym na starcie — dynamiczne bez "in" byłyby
      // niewidoczne, więc od razu dajemy stan końcowy (widoczny).
      var html = "";
      var num = 0;
      cats.forEach(function (title) {
        var rows = byCat[title] || [];
        if (!rows.length) return;
        if (title === FEATURE) {
          html +=
            '<div class="cat feature reveal in d1"><div class="cat-h"><span class="cat-num">&#10022;</span><h3>' +
            esc(title) + "</h3></div><p class=\"feat-note\">" + esc(NOTE) + "</p>" +
            rows.map(row).join("") + "</div>";
        } else {
          num += 1;
          var nn = (num < 10 ? "0" : "") + num;
          var badge = NEW_CATS.indexOf(title) >= 0 ? '<span class="cat-new">Nowość</span>' : "";
          html +=
            '<div class="cat reveal in d1"><div class="cat-h"><span class="cat-num">' + nn +
            "</span><h3>" + esc(title) + "</h3>" + badge + "</div>" + rows.map(row).join("") + "</div>";
        }
      });
      if (html) container.innerHTML = html; // podmiana statycznego cennika świeżymi danymi
    })
    .catch(function () {}); // fetch padł → zostaje statyczny cennik (fallback)
})();
