/* Studio Zelika — synchronizacja oceny Google z botem (/api/content) */
(function () {
  "use strict";
  var API = "https://hooks.zelika.pl/api/content";
  fetch(API)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c || !c.google_rating || !c.google_reviews) return;
      // 1) JSON-LD aggregateRating
      var el = document.getElementById("ld-business");
      if (el) {
        try {
          var ld = JSON.parse(el.textContent);
          ld.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: String(c.google_rating),
            reviewCount: String(c.google_reviews),
            bestRating: "5",
            worstRating: "1",
          };
          el.textContent = JSON.stringify(ld);
        } catch (e) {}
      }
      // 2) widoczne elementy (jeśli dodasz badge z data-* — wypełni się samo)
      document.querySelectorAll("[data-google-rating]").forEach(function (n) {
        n.textContent = c.google_rating;
      });
      document.querySelectorAll("[data-google-reviews]").forEach(function (n) {
        n.textContent = c.google_reviews;
      });
    })
    .catch(function () {});
})();
