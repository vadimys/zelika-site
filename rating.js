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
      // 1b) karuzela opinii
      var track = document.getElementById("rev-track");
      if (track && Array.isArray(c.google_reviews_list) && c.google_reviews_list.length) {
        function escH(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
        track.innerHTML = c.google_reviews_list.map(function (rv) {
          var n = Math.max(1, Math.min(5, rv.rating || 5));
          var stars = "\u2605\u2605\u2605\u2605\u2605".slice(0, n);
          return '<figure class="rev-card"><div class="rev-stars">' + stars +
            '</div><blockquote>' + escH(rv.text) + '</blockquote><figcaption>\u2014 ' +
            escH(rv.author) + '</figcaption></figure>';
        }).join("");
      }
      // 2) widoczne elementy (jeśli dodasz badge z data-* — wypełni się samo)
      document.querySelectorAll("[data-google-rating]").forEach(function (n) {
        n.textContent = String(c.google_rating).replace(".", ",");
      });
      document.querySelectorAll("[data-google-reviews]").forEach(function (n) {
        n.textContent = c.google_reviews;
      });
    })
    .catch(function () {});
})();
