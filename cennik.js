/* Studio Zelika — synchronizacja cennika z botem (/api/content → finance).
   Ceny, czasy i nazwy pochodzą z bota (jedno źródło). Które usługi są PUBLICZNE
   i w jakiej kategorii — kurujemy tutaj (żeby wewnętrzne pozycje finansowe nie
   trafiły na stronę). Statyczny cennik w index.html zostaje jako fallback. */
(function () {
  "use strict";
  var API = "https://hooks.zelika.pl/api/content";

  // Kategorie (kolejność + które usługi publiczne). Nazwy dopasowujemy do bota
  // (porównanie znormalizowane: bez wielkości liter i nadmiarowych spacji).
  var CATS = [
    {
      title: "Makijaż permanentny brwi",
      feature: true,
      note: "Trwały, naturalny efekt dopasowany do kształtu twarzy. Cena zawiera konsultację, brow mapping i dobór koloru.",
      names: [
        "Makijaż permanentny brwi",
        "Dopigmentowanie do 6 tygodni po pierwszym zabiegu",
      ],
    },
    {
      title: "Brwi",
      names: ["Regulacja brwi", "Regulacja + farba brwi", "Laminacja brwi (regulacja+farba)"],
    },
    { title: "Rzęsy", names: ["Laminacja rzęs (farba)", "Koloryzacja rzęs"] },
    { title: "Pozostałe", names: ["Depilacja wąsika"] },
  ];

  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
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

      // lookup znormalizowanych nazw → pozycja (name/price/duration z bota)
      var byName = {};
      c.cennik_items.forEach(function (it) {
        if (it && it.name) byName[norm(it.name)] = it;
      });

      var html = "";
      var num = 0;
      CATS.forEach(function (cat) {
        var rows = cat.names.map(function (n) { return byName[norm(n)]; }).filter(Boolean);
        if (!rows.length) return; // brak danych z bota → pomijamy kategorię
        // Клас "in" ОБОВʼЯЗКОВО: .reveal стартує opacity:0, а IntersectionObserver
        // додає "in" лише елементам, що були в DOM на старті. Динамічно вставлені
        // без "in" лишились би невидимі → одразу ставимо кінцевий (видимий) стан.
        if (cat.feature) {
          html +=
            '<div class="cat feature reveal in d1"><div class="cat-h"><span class="cat-num">&#10022;</span><h3>' +
            esc(cat.title) + "</h3></div>" +
            (cat.note ? '<p class="feat-note">' + esc(cat.note) + "</p>" : "") +
            rows.map(row).join("") + "</div>";
        } else {
          num += 1;
          var nn = (num < 10 ? "0" : "") + num;
          html +=
            '<div class="cat reveal in d1"><div class="cat-h"><span class="cat-num">' + nn +
            "</span><h3>" + esc(cat.title) + "</h3></div>" + rows.map(row).join("") + "</div>";
        }
      });
      if (html) container.innerHTML = html; // podmiana statycznego cennika świeżymi cenami
    })
    .catch(function () {}); // fetch padł → zostaje statyczny cennik (fallback)
})();
