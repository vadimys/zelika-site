// ===== Studio Zelika — edge-SSR rubryki «Porady i inspiracje» =====
// Worker renderuje /porady (index) i /porady/<slug> jako gotowy HTML z danych
// bota (/api/posts) — pełne SEO (meta, OG, Article/Blog JSON-LD), natychmiastowa
// publikacja, jedno źródło prawdy w bocie. Reszta ścieżek → statyka (env.ASSETS).

const POSTS_API = "https://hooks.zelika.pl/api/posts";
const SITE = "https://zelika.pl";
const BOOKSY = "https://booksy.com/pl-pl/dl/show-business/334211";
const SECTION_TITLE = "Porady i inspiracje";
const SECTION_DESC =
  "Porady, inspiracje i ciekawostki o makijażu permanentnym, brwiach i rzęsach — od Anny Zelinskiej, ekspertki PMU ze Studia Zelika w Wieluniu.";

// --- utils ---
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function absImg(img) {
  if (!img) return SITE + "/og-image.jpg";
  return /^https?:\/\//.test(img) ? img : SITE + (img.startsWith("/") ? img : "/" + img);
}

function excerpt(post, n = 155) {
  const base = post.meta_description || post.body || "";
  const flat = String(base).replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n - 1).trimEnd() + "…" : flat;
}

function plDate(iso) {
  if (!iso) return "";
  const m = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Ciało: linia „## ” → <h2> (zawsze osobno); ciągłe linie → <p> (pusta linia
// rozdziela akapity). Odporne na nagłówek tuż nad akapitem (pojedynczy \n).
function renderBody(body) {
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${esc(para.join(" "))}</p>`);
    para = [];
  };
  for (const raw of String(body || "").replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      out.push(`<h2>${esc(line.slice(3).trim())}</h2>`);
    } else {
      para.push(line);
    }
  }
  flush();
  return out.join("\n");
}

async function fetchPosts() {
  try {
    const r = await fetch(POSTS_API, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (r.ok) return (await r.json()).posts || [];
  } catch (_) {}
  return null; // null = błąd (odróżniamy od pustej listy)
}

async function fetchPost(slug) {
  try {
    const r = await fetch(POSTS_API + "/" + encodeURIComponent(slug), {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

// --- wspólny layout ---
const CSS = `
:root{--bg:#f4f1e7;--bg-soft:#ece7d8;--bg-card:#fffdf6;--green:#1f5e30;--green-mid:#2f7d44;--gold:#a9863c;--ink:#272b22;--muted:#6e7365;--line:rgba(31,94,48,.16);--line-gold:rgba(169,134,60,.30);--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-weight:300;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--line);background:var(--bg-card)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:18px 20px}
.logo{font-family:var(--serif);font-size:1.5rem;color:var(--green);letter-spacing:.02em}
.logo span{color:var(--gold)}
.navlink{font-size:.95rem;color:var(--ink)}
h1,h2{font-family:var(--serif);color:var(--green);font-weight:600;line-height:1.2}
h1{font-size:2.1rem;margin:.6em 0 .2em}
h2{font-size:1.5rem;margin:1.4em 0 .3em}
.crumbs{font-size:.85rem;color:var(--muted);margin:22px 0 0}
.meta{font-size:.9rem;color:var(--muted);margin:.2em 0 1.4em;border-bottom:1px solid var(--line-gold);padding-bottom:1em}
.hero-img{width:100%;max-height:380px;object-fit:cover;border-radius:14px;margin:1em 0}
article p{margin:0 0 1.1em}
.cta{margin:2.4em 0;padding:1.6em;background:var(--bg-card);border:1px solid var(--line-gold);border-radius:14px;text-align:center}
.btn{display:inline-block;background:var(--green);color:#fff;padding:13px 26px;border-radius:999px;font-weight:400;letter-spacing:.02em}
.btn:hover{background:var(--green-mid);text-decoration:none}
.lead{font-size:1.05rem;color:var(--muted);margin:.3em 0 2em}
.card{display:block;background:var(--bg-card);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:0 0 20px;transition:box-shadow .2s}
.card:hover{box-shadow:0 8px 28px rgba(31,94,48,.10);text-decoration:none}
.card img{width:100%;height:180px;object-fit:cover}
.card .body{padding:16px 20px}
.card h2{margin:.1em 0 .3em;font-size:1.3rem}
.card p{margin:0;color:var(--muted);font-size:.95rem}
.card .date{font-size:.8rem;color:var(--gold);margin-top:.5em}
footer.site{border-top:1px solid var(--line);margin-top:48px;padding:26px 0;color:var(--muted);font-size:.85rem}
.empty{padding:60px 0;text-align:center;color:var(--muted)}
`;

function layout({ title, description, canonical, ogImage, jsonld, body, noindex }) {
  return `<!doctype html><html lang="pl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${jsonld && jsonld["@type"] === "BlogPosting" ? "article" : "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:locale" content="pl_PL">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head><body>
<header class="site"><div class="wrap">
<a class="logo" href="/">Zelika <span>PMU</span></a>
<a class="navlink" href="/">← Strona główna</a>
</div></header>
<main class="wrap">${body}</main>
<footer class="site"><div class="wrap">© Zelika Brows &amp; More — Anna Zelinska, PMU · Wieluń · <a href="/">zelika.pl</a></div></footer>
</body></html>`;
}

function ctaBlock() {
  return `<div class="cta">
<p style="margin:.2em 0 1em;font-family:var(--serif);font-size:1.3rem;color:var(--green)">Masz pytanie o swój zabieg?</p>
<p style="margin:.2em 0 1.2em;color:var(--muted)">Umów niezobowiązującą konsultację — dobierzemy metodę idealną dla Ciebie.</p>
<a class="btn" href="${BOOKSY}?utm_source=blog&utm_medium=cta" rel="nofollow">Umów wizytę</a>
</div>`;
}

function htmlResponse(html, status = 200, sMaxAge = 300) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${sMaxAge}`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
        "img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; " +
        "form-action 'self' https://booksy.com; upgrade-insecure-requests",
    },
  });
}

// --- strony ---
async function renderIndex() {
  const posts = await fetchPosts();
  const canonical = SITE + "/porady";
  const cards =
    posts && posts.length
      ? posts
          .map(
            (p) => `<a class="card" href="/porady/${esc(p.slug)}">
${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : ""}
<div class="body"><h2>${esc(p.title)}</h2><p>${esc(excerpt(p))}</p>
<div class="date">${esc(plDate(p.published_at))}</div></div></a>`
          )
          .join("\n")
      : `<div class="empty">Wkrótce pojawią się tu pierwsze porady 💚</div>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SECTION_TITLE,
    url: canonical,
    description: SECTION_DESC,
    publisher: { "@type": "Organization", name: "Zelika Brows & More", url: SITE },
  };

  const body = `<p class="crumbs"><a href="/">Strona główna</a> › ${esc(SECTION_TITLE)}</p>
<h1>${esc(SECTION_TITLE)}</h1>
<p class="lead">${esc(SECTION_DESC)}</p>
${cards}
${ctaBlock()}`;

  return htmlResponse(
    layout({
      title: `${SECTION_TITLE} | Zelika PMU — Wieluń`,
      description: SECTION_DESC,
      canonical,
      ogImage: SITE + "/og-image.jpg",
      jsonld,
      body,
    })
  );
}

async function renderPost(slug) {
  const post = await fetchPost(slug);
  const canonical = SITE + "/porady/" + slug;
  if (!post || post.status !== "published") {
    const body = `<h1>Nie znaleziono</h1><p class="lead">Taka porada nie istnieje lub została przeniesiona.</p>
<p><a href="/porady">← Wróć do porad</a></p>`;
    return htmlResponse(
      layout({
        title: "Nie znaleziono | Zelika PMU",
        description: "Strona nie istnieje.",
        canonical,
        ogImage: SITE + "/og-image.jpg",
        noindex: true,
        body,
      }),
      404
    );
  }

  const ogImage = absImg(post.image);
  const desc = excerpt(post, 160);
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: desc,
    image: ogImage,
    datePublished: post.published_at || undefined,
    dateModified: post.published_at || undefined,
    author: { "@type": "Person", name: post.author || "Anna Zelinska" },
    publisher: { "@type": "Organization", name: "Zelika Brows & More", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "pl-PL",
  };

  const body = `<p class="crumbs"><a href="/">Strona główna</a> › <a href="/porady">${esc(SECTION_TITLE)}</a> › ${esc(post.title)}</p>
<article>
<h1>${esc(post.title)}</h1>
<div class="meta">${esc(post.author || "Anna Zelinska")}${
    post.published_at ? " · " + esc(plDate(post.published_at)) : ""
  }</div>
${post.image ? `<img class="hero-img" src="${esc(post.image)}" alt="${esc(post.title)}">` : ""}
${renderBody(post.body)}
</article>
${ctaBlock()}
<p><a href="/porady">← Wszystkie porady</a></p>`;

  return htmlResponse(
    layout({
      title: `${post.title} | Zelika PMU — Wieluń`,
      description: desc,
      canonical,
      ogImage,
      jsonld,
      body,
    })
  );
}

async function renderSitemap() {
  const posts = (await fetchPosts()) || [];
  const urls = [
    { loc: SITE + "/", pri: "1.0", freq: "monthly" },
    { loc: SITE + "/porady", pri: "0.8", freq: "weekly" },
    ...posts.map((p) => ({
      loc: SITE + "/porady/" + p.slug,
      pri: "0.7",
      freq: "monthly",
      lastmod: (p.published_at || "").slice(0, 10) || undefined,
    })),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/porady") return renderIndex();
    if (path.startsWith("/porady/")) return renderPost(decodeURIComponent(path.slice("/porady/".length)));
    if (path === "/sitemap.xml") return renderSitemap();

    // wszystko inne → statyka
    return env.ASSETS.fetch(request);
  },
};
