/* Tizer rubryki «Porady i inspiracje» na stronie głównej: pobiera 3 najnowsze
   posty z bota (/api/posts) i rysuje karty. Osobne strony /porady/* są SEO;
   tizer tylko zachęca i linkuje. Brak postów / błąd → chowamy sekcję. */
(function () {
  "use strict";
  var box = document.getElementById("porady-teaser");
  var sec = document.getElementById("porady");
  if (!box) return;
  var hide = function () { if (sec) sec.style.display = "none"; };
  var esc = function (t) {
    var e = document.createElement("div");
    e.textContent = t == null ? "" : t;
    return e.innerHTML;
  };
  // Okładka jak w workerze (mediaSrc/pageImgSrc): zdjęcie z bota (https://hooks.zelika.pl/api/media/<id>.jpg)
  // → własne /media/<id>.jpg, plik strony (https://zelika.pl/…) → ścieżka względna. CSP strony głównej ma
  // img-src 'self' — innych adresów nie wstawiamy (przeglądarka i tak by je zablokowała: pusta karta z alt).
  var MEDIA_PREFIX = "https://hooks.zelika.pl/api/media/";
  var OWN_ORIGIN = /^https:\/\/(www\.)?zelika\.pl(?=\/(?![\/\\]))/i;
  var coverSrc = function (img) {
    var s = String(img == null ? "" : img).trim();
    if (OWN_ORIGIN.test(s)) {
      s = s.replace(OWN_ORIGIN, "");
    } else if (s.indexOf(MEDIA_PREFIX) === 0) {
      var m = s.slice(MEDIA_PREFIX.length).match(/^([A-Za-z0-9_-]{1,128})\.jpg$/);
      s = m ? "/media/" + m[1] + ".jpg" : "";
    }
    return /^\/(?![\/\\])/.test(s) ? s : "";
  };
  fetch("https://hooks.zelika.pl/api/posts")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var posts = d && d.posts ? d.posts : [];
      if (!posts.length) return hide();
      box.innerHTML = posts
        .slice(0, 3)
        .map(function (p) {
          var src = coverSrc(p.image);
          var img = src
            ? '<img src="' + esc(src) + '" alt="' + esc(p.title) + '" loading="lazy">'
            : "";
          var desc = esc(String(p.meta_description || "").slice(0, 120));
          return (
            '<a class="ptease-card" href="/porady/' + esc(p.slug) + '">' +
            img +
            '<div class="ptease-body"><h3>' + esc(p.title) + "</h3><p>" + desc + "</p></div></a>"
          );
        })
        .join("");
    })
    .catch(hide);
})();
