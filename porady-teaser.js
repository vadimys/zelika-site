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
  fetch("https://hooks.zelika.pl/api/posts")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var posts = d && d.posts ? d.posts : [];
      if (!posts.length) return hide();
      box.innerHTML = posts
        .slice(0, 3)
        .map(function (p) {
          var img = p.image
            ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">'
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
