// ===== Studio Zelika — edge-SSR rubryki «Porady i inspiracje» =====
// Worker renderuje /porady (index) i /porady/<slug> jako gotowy HTML z danych
// bota (/api/posts) — pełne SEO (meta, OG, Article/Blog JSON-LD), natychmiastowa
// publikacja, jedno źródło prawdy w bocie. Reszta ścieżek → statyka (env.ASSETS).
// Nagłówek i integracja Booksy — spójne ze stroną główną (ten sam widget-overlay).

const POSTS_API = "https://hooks.zelika.pl/api/posts";
const SITE = "https://zelika.pl";
const BOOKSY = "https://booksy.com/pl-pl/dl/show-business/334211";
const BOOKSY_WIDGET = "https://booksy.com/widget/code.js?id=334211&country=pl&lang=pl";
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

// --- style (spójne ze stroną główną: kolory, fonty, nagłówek, przycisk Booksy) ---
const CSS = `
:root{--bg:#f4f1e7;--bg-soft:#ece7d8;--bg-card:#fffdf6;--green:#1f5e30;--green-mid:#2f7d44;--gold:#a9863c;--ink:#272b22;--muted:#6e7365;--line:rgba(31,94,48,.16);--line-gold:rgba(169,134,60,.30);--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-weight:300;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 24px}
/* --- nagłówek jak na stronie głównej --- */
header.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 40px;background:rgba(244,241,231,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.brand{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1;text-decoration:none}
.brand .mark{width:118px;height:auto;display:block}
.brand .tag{font-family:var(--serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold);font-weight:600;font-size:.5rem;margin-top:1px;margin-left:3px}
.nav-links{display:flex;gap:30px;list-style:none;align-items:center;margin:0;padding:0}
.nav-links a{color:var(--ink);font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;font-weight:400;position:relative;padding:4px 0;transition:.3s}
.nav-links a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--gold);transition:.35s}
.nav-links a:hover{color:var(--green);text-decoration:none}
.nav-links a:hover::after,.nav-links a.current::after{width:100%}
.nav-links a.current{color:var(--green)}
.nav-cta{border:1px solid var(--green);color:var(--green)!important;padding:9px 20px!important;border-radius:2px;transition:.4s}
.nav-cta:hover{background:var(--green);color:#fff!important;text-decoration:none}
.nav-cta::after{display:none!important}
@media(max-width:760px){.nav-links li:not(.cta-li){display:none}.nav-links{gap:14px}header.nav{padding:10px 18px}.brand .mark{width:96px}}
/* --- treść --- */
main{padding-bottom:10px}
h1,h2{font-family:var(--serif);color:var(--green);font-weight:600;line-height:1.15}
h1{font-size:2.2rem;margin:.5em 0 .2em}
h2{font-size:1.55rem;margin:1.5em 0 .3em}
.crumbs{font-size:.85rem;color:var(--muted);margin:26px 0 0}
.crumbs a{color:var(--muted)}
.meta{font-size:.9rem;color:var(--muted);margin:.2em 0 1.4em;border-bottom:1px solid var(--line-gold);padding-bottom:1em}
.hero-img{width:100%;max-height:400px;object-fit:cover;border-radius:16px;margin:1em 0}
article p{margin:0 0 1.1em}
.lead{font-size:1.08rem;color:var(--muted);margin:.3em 0 2.2em}
.card{display:block;background:var(--bg-card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin:0 0 22px;transition:box-shadow .25s,transform .25s}
.card:hover{box-shadow:0 12px 34px rgba(31,94,48,.12);transform:translateY(-2px);text-decoration:none}
.card img{width:100%;height:200px;object-fit:cover;display:block}
.card .body{padding:18px 22px}
.card h2{margin:.1em 0 .3em;font-size:1.35rem}
.card p{margin:0;color:var(--muted);font-size:.96rem}
.card .date{font-size:.78rem;color:var(--gold);letter-spacing:.05em;margin-top:.6em}
.cta{margin:2.6em 0 1em;padding:1.8em;background:var(--bg-card);border:1px solid var(--line-gold);border-radius:16px;text-align:center}
.cta-h{margin:.1em 0 .6em;font-family:var(--serif);font-size:1.45rem;color:var(--green)}
.cta-p{margin:0 0 1.3em;color:var(--muted)}
.bk-widget{max-width:320px;margin:0 auto}
.btn{display:inline-block;background:var(--green);color:#fff;padding:14px 30px;border-radius:999px;font-weight:500;letter-spacing:.01em}
.btn:hover{background:var(--green-mid);text-decoration:none}
.empty{padding:64px 0;text-align:center;color:var(--muted)}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding:28px 0;color:var(--muted);font-size:.85rem;text-align:center}
/* --- override widgetu Booksy (jak na stronie głównej) --- */
.booksy-widget-button{background-image:none!important;background-color:var(--green)!important;width:100%!important;height:auto!important;min-height:52px!important;padding:14px 30px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;cursor:pointer;transition:background .2s,transform .2s,box-shadow .2s!important}
.booksy-widget-button::after{content:"Rezerwuj wizytę";color:#fff;font-family:var(--sans);font-weight:500;font-size:1rem;letter-spacing:.01em}
.booksy-widget-button:hover{background-color:var(--green-mid)!important;transform:translateY(-2px)!important;box-shadow:0 14px 32px rgba(31,94,48,.24)!important}
.booksy-business-link{width:auto!important;margin:10px auto 0!important;opacity:.55}
.booksy-widget-overlay{z-index:2147483646!important}
.booksy-widget-dialog{position:fixed!important;top:50%!important;left:50%!important;margin:0!important;transform:translate(-50%,-50%)!important;max-width:96vw!important;max-height:92vh!important;overflow:auto!important}
html:has(.booksy-widget-overlay),body:has(.booksy-widget-overlay){overflow:hidden!important}
`;

function header() {
  return `<header class="nav">
<a href="/" class="brand"><img class="mark" src="/logo.svg" alt="Zelika Brows & More" width="118" height="66"><span class="tag">Brows &amp; More</span></a>
<nav><ul class="nav-links">
<li><a href="/#about">Studio</a></li>
<li><a href="/#services">Usługi</a></li>
<li><a href="/#gallery">Galeria</a></li>
<li><a href="/porady" class="current">Porady</a></li>
<li><a href="/quiz">Quiz</a></li>
<li><a href="/#contact">Kontakt</a></li>
<li class="cta-li"><a href="${BOOKSY}" class="nav-cta" data-booksy target="_blank" rel="noopener noreferrer">Umów wizytę</a></li>
</ul></nav>
</header>`;
}

// Blok CTA z realnym widgetem Booksy (rysuje zielony przycisk „Rezerwuj wizytę”,
// a link „Umów wizytę" w nagłówku [data-booksy] deleguje do niego przez booksy-fix.js).
function ctaBlock() {
  return `<div class="cta">
<p class="cta-h">Masz pytanie o swój zabieg?</p>
<p class="cta-p">Umów niezobowiązującą konsultację — dobierzemy metodę idealną dla Ciebie.</p>
<div class="bk-widget" id="bk-widget"><noscript><a class="btn" href="${BOOKSY}" target="_blank" rel="noopener noreferrer">Rezerwuj na Booksy</a></noscript></div>
<script src="/booksy-fix.js" defer></script>
<script src="${BOOKSY_WIDGET}"></script>
</div>`;
}

function layout({ title, description, canonical, ogImage, jsonld, body, noindex }) {
  return `<!doctype html><html lang="pl"><head>
<meta charset="utf-8">
<script src="/consent.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18246998055"></script>
<script src="/booking-conversion.js" defer></script>
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
${header()}
<main class="wrap">${body}</main>
<footer class="site"><div class="wrap">© Zelika Brows &amp; More — Anna Zelinska, PMU · Wieluń · <a href="/">zelika.pl</a> · <a href="/prywatnosc">Polityka prywatności</a> · <a href="#" data-cookies>Cookies</a></div></footer>
</body></html>`;
}

function htmlResponse(html, status = 200, sMaxAge = 300) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${sMaxAge}`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy":
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy":
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
        "img-src 'self' data: https://booksy.com https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://booksy.com; " +
        "font-src https://fonts.gstatic.com; " +
        "script-src 'self' https://booksy.com https://www.googletagmanager.com https://www.googleadservices.com; " +
        "frame-src https://booksy.com https://td.doubleclick.net; " +
        "connect-src 'self' https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
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

// CSP tylko dla strony głównej (czat + Turnstile). Względem _headers: script-src
// ma 'unsafe-inline' zamiast hasha (Turnstile wstrzykuje inline-skrypt z losowym
// tokenem) oraz challenges.cloudflare.com w script-src/frame-src/connect-src.
const HOMEPAGE_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
  "form-action 'self' https://booksy.com; " +
  "img-src 'self' data: https://booksy.com https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://booksy.com; " +
  "font-src https://fonts.gstatic.com; " +
  "script-src 'self' 'unsafe-inline' https://booksy.com https://www.googletagmanager.com https://www.googleadservices.com https://challenges.cloudflare.com; " +
  "frame-src https://booksy.com https://td.doubleclick.net https://challenges.cloudflare.com; " +
  "connect-src 'self' https://zelika-chat.vadimzelinshy.workers.dev https://hooks.zelika.pl https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net https://challenges.cloudflare.com; " +
  "upgrade-insecure-requests";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/porady") return renderIndex();
    if (path.startsWith("/porady/")) return renderPost(decodeURIComponent(path.slice("/porady/".length)));
    if (path === "/sitemap.xml") return renderSitemap();

    // Strona główna: czat z widgetem Turnstile, który wstrzykuje inline-skrypt
    // (z losowym tokenem → hash niestabilny, nonce niemożliwy na statyce). Dlatego
    // TYLKO dla "/" luzujemy script-src do 'unsafe-inline'. Reszta stron (_headers)
    // zostaje ścisła. Ryzyko znikome: strona statyczna, brak wstrzykiwania HTML.
    if (path === "/" || path === "/index.html") {
      const res = await env.ASSETS.fetch(request);
      const h = new Headers(res.headers);
      h.set("Content-Security-Policy", HOMEPAGE_CSP);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }

    // wszystko inne → statyka
    return env.ASSETS.fetch(request);
  },
};
