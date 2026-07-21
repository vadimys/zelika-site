// ===== Studio Zelika — edge-SSR rubryki «Porady i inspiracje» =====
// Worker renderuje /porady (index) i /porady/<slug> jako gotowy HTML z danych
// bota (/api/posts) — pełne SEO (meta, OG, Article/Blog JSON-LD), natychmiastowa
// publikacja, jedno źródło prawdy w bocie. Reszta ścieżek → statyka (env.ASSETS).
// Nagłówek i integracja Booksy — spójne ze stroną główną (ten sam widget-overlay).

const POSTS_API = "https://hooks.zelika.pl/api/posts";
const SITE = "https://zelika.pl";
const BOOKSY = "https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun";
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
<style>${CSS}${SHELL_CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head><body>
${headerHtml("pl", { current: "porady", pl: "/porady" })}
<main class="wrap">${body}</main>
${footerHtml("pl")}
<script src="/nav.js" defer></script>
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
        "connect-src 'self' https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
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

  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: SECTION_TITLE, item: SITE + "/porady" },
    ],
  };
  const body = `<script type="application/ld+json">${JSON.stringify(crumbLd)}</script>
<p class="crumbs"><a href="/">Strona główna</a> › ${esc(SECTION_TITLE)}</p>
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

  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: SECTION_TITLE, item: SITE + "/porady" },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };
  const body = `<script type="application/ld+json">${JSON.stringify(crumbLd)}</script>
<p class="crumbs"><a href="/">Strona główna</a> › <a href="/porady">${esc(SECTION_TITLE)}</a> › ${esc(post.title)}</p>
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

// Власний robots.txt: ВІДКРИТИЙ для всіх (вкл. AI-краулери цитувань — GPTBot,
// Google-Extended, PerplexityBot, ClaudeBot тощо), бо ціль — видимість і цитування
// в AI-пошуку. Перебиває Cloudflare-керований robots, що за замовч. блокував AI-ботів.
function renderRobots() {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

// llms.txt — agent-readable опис бізнесу для AI-пошуку/асистентів (AEO/GEO).
function renderLlms() {
  const body = `# Zelika — Makijaż Permanentny, Brwi, Rzęsy (Wieluń)

> Studio makijażu permanentnego (PMU) oraz architektury i stylizacji brwi i rzęs w Wieluniu, Polska. Prowadzi Anna Zelinska, ekspertka PMU. Ocena 5,0 w Google.

## Usługi
- Makijaż permanentny brwi (metoda włosowa, pudrowa, mieszana)
- Makijaż permanentny ust
- Laminacja brwi, lifting rzęs
- Architektura brwi (brow mapping)

## Kontakt i rezerwacja
- Adres: ul. Młodzieżowa 5B, 98-300 Wieluń
- Telefon: +48 571 932 161
- Rezerwacja online (Booksy): ${BOOKSY}
- Instagram: https://www.instagram.com/annazelika
- Godziny: pon.–pt. 8:00–16:00, sob. 6:00–13:00, niedziela nieczynne

## Ważne strony
- Strona główna: ${SITE}/
- Porady i inspiracje (blog): ${SITE}/porady
- Quiz „Jaki zabieg brwi dla Ciebie?": ${SITE}/quiz
- Polityka prywatności: ${SITE}/prywatnosc
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

async function renderSitemap() {
  const posts = (await fetchPosts()) || [];
  const urls = [
    { loc: SITE + "/", pri: "1.0", freq: "monthly" },
    { loc: SITE + "/uk/", pri: "0.9", freq: "monthly" },
    { loc: SITE + "/en/", pri: "0.9", freq: "monthly" },
    { loc: SITE + "/porady", pri: "0.8", freq: "weekly" },
    { loc: SITE + "/quiz", pri: "0.6", freq: "monthly" },
    { loc: SITE + "/uk/quiz", pri: "0.5", freq: "monthly" },
    { loc: SITE + "/en/quiz", pri: "0.5", freq: "monthly" },
    { loc: SITE + "/prywatnosc", pri: "0.3", freq: "yearly" },
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
  "connect-src 'self' https://zelika-chat.vadimzelinshy.workers.dev https://hooks.zelika.pl https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net https://challenges.cloudflare.com; " +
  "upgrade-insecure-requests";

// ── i18n: PL (база) + UA + EN. Один PL-шаблон (index.html з data-i18n) →
// HTMLRewriter віддає локалізовану версію за URL (/uk/, /en/). SEO: hreflang+canonical.
const META = {
  pl: {
    title: "Zelika | PMU — Makijaż Permanentny, Brwi, Rzęsy | Wieluń",
    desc: "Zelika Brows & More — studio makijażu permanentnego, architektury i stylizacji brwi oraz rzęs w Wieluniu. Anna Zelinska — Ekspert PMU. Rezerwacja online na Booksy.",
    ogtitle: "Zelika — Makijaż Permanentny, Brwi, Rzęsy | Wieluń",
    ogdesc: "Studio makijażu permanentnego oraz stylizacji brwi i rzęs w Wieluniu. Anna Zelinska — Ekspert PMU. Rezerwacja online.",
    locale: "pl_PL",
  },
  uk: {
    title: "Zelika | PMU — Перманентний макіяж, брови, вії | Велюнь",
    desc: "Zelika Brows & More — студія перманентного макіяжу, архітектури та стилізації брів і вій у Велюні. Анна Зелінська — експертка PMU. Онлайн-запис у Booksy.",
    ogtitle: "Zelika — Перманентний макіяж, брови, вії | Велюнь",
    ogdesc: "Студія перманентного макіяжу та стилізації брів і вій у Велюні. Анна Зелінська — експертка PMU. Онлайн-запис.",
    locale: "uk_UA",
  },
  en: {
    title: "Zelika | PMU — Permanent Makeup, Brows, Lashes | Wieluń",
    desc: "Zelika Brows & More — permanent makeup, brow architecture and brow & lash styling studio in Wieluń, Poland. Anna Zelinska — PMU expert. Online booking via Booksy.",
    ogtitle: "Zelika — Permanent Makeup, Brows, Lashes | Wieluń",
    ogdesc: "Permanent makeup and brow & lash styling studio in Wieluń, Poland. Anna Zelinska — PMU expert. Online booking.",
    locale: "en_US",
  },
};
const I18N = {
  uk: {
    "nav.studio": "Студія", "nav.uslugi": "Послуги", "nav.galeria": "Галерея",
    "nav.porady": "Поради", "nav.quiz": "Квіз", "nav.kontakt": "Контакти",
    "nav.book": "Записатися",
    "hero.kicker": "Експертка PMU · Архітектура брів",
    "hero.h1": "Перманентний макіяж,<br>брови &amp; <em>вії</em>",
    "hero.lead": "Затишна студія краси у Велюні. Природний, стійкий ефект, безпечні сертифіковані пігменти та індивідуальний підхід до кожного погляду.",
    "hero.book": "Онлайн-запис", "hero.services": "Послуги й ціни",
    "val1.h": "Експертка PMU й архітектура брів",
    "val1.p": "Спеціалізація на перманентному макіяжі та моделюванні форми брів методом brow mapping.",
    "val2.h": "Природний ефект",
    "val2.p": "Делікатний, стійкий перманентний макіяж, що підкреслює ваші природні риси.",
    "val3.h": "Безпечні пігменти",
    "val3.p": "Лише сертифіковані продукти, одноразові матеріали та суворі правила гігієни.",
    "val4.h": "Професіоналізм",
    "val4.p": "Анна Зелінська — понад 5 років досвіду. Ваше обличчя в руках експертки.",
    "about.eyebrow": "Про студію",
    "about.h2": "Ваше обличчя в руках <em>експертки</em>",
    "about.p1": "Студію Zelika у Велюні веде <strong>Анна Зелінська — експертка PMU й архітектури брів</strong> із понад 5-річним досвідом. Ми спеціалізуємося на перманентному макіяжі та професійному догляді й стилізації брів і вій.",
    "about.p2": "Працюємо індивідуально: аналіз рис обличчя, brow mapping і добір ідеальної форми та відтінку. Використовуємо сертифіковані продукти, одноразові матеріали й суворі правила гігієни. Робимо ставку на природний, доглянутий ефект, що підкреслює ваші риси.",
    "about.p3": "Зручне розташування, гнучкий графік і нагадування про візит. Запишіться на консультацію — разом створимо ідеальну форму брів і виразний погляд.",
    "quiz.eyebrow": "Квіз",
    "quiz.h2": "Не знаєте, яку процедуру <em>обрати?</em>",
    "quiz.p": "Дайте відповідь на 5 коротких запитань, і я підкажу, яке рішення найкраще пасує вашим бровам — менш ніж за хвилину.",
    "quiz.btn": "Пройти квіз",
    "svc.eyebrow": "Ціни", "svc.h2": "Послуги й <em>ціни</em>",
    "svc.p": "Актуальні ціни та вільні терміни також знайдете в системі бронювання Booksy.",
    "svc.note": "Також пропонуємо brow mapping, макіяж на подію та фарбування вій — повний перелік послуг і ціни в <a href='https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun' target='_blank' rel='noopener noreferrer'>системі Booksy</a>.",
    "gal.eyebrow": "Портфоліо", "gal.h2": "Галерея <em>робіт</em>",
    "gal.p": "Роботи, сертифікати й закулісся нашої студії. Повна галерея — в Instagram.",
    "gal.btn": "&#9670; Більше в Instagram",
    "rev.eyebrow": "Відгуки", "rev.h2": "Що кажуть <em>наші клієнтки</em>",
    "faq.eyebrow": "Часті питання", "faq.h2": "Найчастіші <em>питання</em>",
    "faq.p": "Маєте інше питання? Напишіть нашій консультантці в чат або зателефонуйте.",
    "faq.q1": "Чи болить перманентний макіяж?",
    "faq.a1": "Ми застосовуємо знеболення, тож процедура комфортна — більшість клієнток відчуває лише легке поколювання. Ваші відчуття завжди обговорюємо на початку візиту.",
    "faq.q2": "Скільки тримається перманентний макіяж брів?",
    "faq.a2": "Ефект тримається зазвичай від 1 до 3 років, залежно від типу шкіри та догляду. Після першої процедури радимо докорекцію (до 6 тижнів), що закріплює колір і форму.",
    "faq.q3": "Як відбувається загоєння?",
    "faq.a3": "Повне загоєння триває близько 4–6 тижнів. У перші дні колір яскравіший і поступово пом'якшується. Ви отримаєте від нас докладні рекомендації з догляду.",
    "faq.q4": "Яку методику брів обрати — волоскову, пудрову чи змішану?",
    "faq.a4": "Це залежить від вашої шкіри й бажаного ефекту. Найкраще пройти наш короткий квіз або записатися на необов'язкову консультацію — разом підберемо ідеальне рішення.",
    "faq.q5": "Чи є протипоказання до процедури?",
    "faq.a5": "Так — зокрема вагітність, годування грудьми, деякі захворювання шкіри чи певні ліки. Кожен випадок обговорюємо індивідуально на консультації з Анною.",
    "faq.q6": "Як записатися на візит?",
    "faq.a6": "Найзручніше через онлайн-запис у Booksy або за телефоном: 571 932 161. Можна також почати з необов'язкової консультації.",
    "por.eyebrow": "Поради", "por.h2": "Поради та <em>натхнення</em>",
    "por.p": "Короткі поради й цікавинки про перманентний макіяж, брови та вії — просто від Анни.",
    "con.eyebrow": "Контакти", "con.h2": "Запрошуємо до <em>студії</em>",
    "con.p": "Маєте питання? Зателефонуйте або напишіть в Instagram. Найзручніше зарезервувати термін онлайн.",
    "con.addr": "Адреса", "con.phone": "Телефон", "con.hours": "Години роботи",
    "bk.eye": "Онлайн-запис", "bk.h3": "Записатися на <em>візит</em>",
    "bk.p": "Оберіть послугу та зручний час у системі Booksy — підтвердження й нагадування отримаєте автоматично.",
    "bk.call": "Зателефонувати: 571 932 161",
    "quiz.back": "← На головну",
  },
  en: {
    "nav.studio": "Studio", "nav.uslugi": "Services", "nav.galeria": "Gallery",
    "nav.porady": "Tips", "nav.quiz": "Quiz", "nav.kontakt": "Contact",
    "nav.book": "Book now",
    "hero.kicker": "PMU Expert · Brow Architecture",
    "hero.h1": "Permanent makeup,<br>brows &amp; <em>lashes</em>",
    "hero.lead": "A cosy beauty studio in Wieluń. A natural, long-lasting result, safe certified pigments and an individual approach to every look.",
    "hero.book": "Book online", "hero.services": "Services & prices",
    "val1.h": "PMU Expert & Brow Architecture",
    "val1.p": "Specialising in permanent makeup and brow shape design using brow mapping.",
    "val2.h": "Natural result",
    "val2.p": "Subtle, long-lasting permanent makeup that enhances your natural features.",
    "val3.h": "Safe pigments",
    "val3.p": "Only certified products, single-use materials and rigorous hygiene.",
    "val4.h": "A true professional",
    "val4.p": "Anna Zelinska — over 5 years of experience. Your face in expert hands.",
    "about.eyebrow": "About the studio",
    "about.h2": "Your face in <em>expert hands</em>",
    "about.p1": "Studio Zelika in Wieluń is run by <strong>Anna Zelinska — PMU &amp; Brow Architecture expert</strong> with over 5 years of experience. We specialise in permanent makeup and professional brow &amp; lash care and styling.",
    "about.p2": "We work individually: facial feature analysis, brow mapping and selecting the perfect shape and shade. We use certified products, single-use materials and strict hygiene. We focus on a natural, well-groomed result that enhances your features.",
    "about.p3": "Convenient location, flexible hours and appointment reminders. Book a consultation — together we'll create the perfect brow shape and an expressive look.",
    "quiz.eyebrow": "Quiz",
    "quiz.h2": "Not sure which treatment <em>to choose?</em>",
    "quiz.p": "Answer 5 short questions and I'll suggest which option best suits your brows — in under a minute.",
    "quiz.btn": "Take the quiz",
    "svc.eyebrow": "Pricing", "svc.h2": "Services &amp; <em>prices</em>",
    "svc.p": "Current prices and available slots are also in the Booksy booking system.",
    "svc.note": "We also offer brow mapping, occasion makeup and lash tinting — the full list of services and prices is in the <a href='https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun' target='_blank' rel='noopener noreferrer'>Booksy system</a>.",
    "gal.eyebrow": "Portfolio", "gal.h2": "Our <em>work</em>",
    "gal.p": "Our work, certificates and behind-the-scenes. Full gallery on Instagram.",
    "gal.btn": "&#9670; See more on Instagram",
    "rev.eyebrow": "Reviews", "rev.h2": "What <em>our clients</em> say",
    "faq.eyebrow": "FAQ", "faq.h2": "Frequently asked <em>questions</em>",
    "faq.p": "Have another question? Message our consultant in the chat or call us.",
    "faq.q1": "Does permanent makeup hurt?",
    "faq.a1": "We use anaesthetic, so the treatment is comfortable — most clients feel only slight tingling. We always discuss your comfort at the start of the visit.",
    "faq.q2": "How long does permanent brow makeup last?",
    "faq.a2": "The result usually lasts 1 to 3 years, depending on skin type and care. After the first session we recommend a touch-up (within 6 weeks) to set the colour and shape.",
    "faq.q3": "What is the healing process like?",
    "faq.a3": "Full healing takes about 4–6 weeks. In the first days the colour is more intense and gradually softens. You'll get detailed aftercare guidance from us.",
    "faq.q4": "Which brow method to choose — hair strokes, powder or combined?",
    "faq.a4": "It depends on your skin and the desired result. Best to take our short quiz or book a no-obligation consultation — together we'll pick the perfect option.",
    "faq.q5": "Are there any contraindications?",
    "faq.a5": "Yes — including pregnancy, breastfeeding, certain skin conditions or some medications. We discuss each case individually during a consultation with Anna.",
    "faq.q6": "How do I book an appointment?",
    "faq.a6": "The easiest way is online booking via Booksy or by phone: 571 932 161. You can also start with a no-obligation consultation.",
    "por.eyebrow": "Tips", "por.h2": "Tips &amp; <em>inspiration</em>",
    "por.p": "Short tips and facts about permanent makeup, brows and lashes — straight from Anna.",
    "con.eyebrow": "Contact", "con.h2": "Visit <em>our studio</em>",
    "con.p": "Have questions? Call or message us on Instagram. The easiest way to book is online.",
    "con.addr": "Address", "con.phone": "Phone", "con.hours": "Opening hours",
    "bk.eye": "Online booking", "bk.h3": "Book an <em>appointment</em>",
    "bk.p": "Choose a service and a convenient time in Booksy — you'll get confirmation and a reminder automatically.",
    "bk.call": "Call: 571 932 161",
    "quiz.back": "← Home",
  },
};
const META_QUIZ = {
  pl: {
    title: "Quiz: Jaki zabieg brwi dla Ciebie? · Zelika",
    desc: "Odpowiedz na 5 pytań i odkryj, który zabieg brwi — makijaż permanentny, laminacja czy stylizacja — najlepiej pasuje do Ciebie. Studio Zelika, Wieluń.",
    ogtitle: "Quiz: Jaki zabieg brwi dla Ciebie? · Zelika",
    ogdesc: "Odpowiedz na 5 pytań i odkryj idealny zabieg dla swoich brwi.",
  },
  uk: {
    title: "Квіз: яка процедура для брів вам підходить? · Zelika",
    desc: "Дайте відповідь на 5 запитань і дізнайтеся, яка процедура для брів — перманентний макіяж, ламінування чи стилізація — підходить саме вам. Студія Zelika, Велюнь.",
    ogtitle: "Квіз: яка процедура для брів вам підходить? · Zelika",
    ogdesc: "Дайте відповідь на 5 запитань і знайдіть ідеальну процедуру для брів.",
  },
  en: {
    title: "Quiz: Which brow treatment is right for you? · Zelika",
    desc: "Answer 5 questions and discover which brow treatment — permanent makeup, lamination or styling — suits you best. Zelika Studio, Wieluń.",
    ogtitle: "Quiz: Which brow treatment is right for you? · Zelika",
    ogdesc: "Answer 5 questions and find the ideal treatment for your brows.",
  },
};
const META_PRIV = {
  pl: {
    title: "Polityka prywatności · Zelika PMU — Wieluń",
    desc: "Polityka prywatności i informacja o plikach cookie Studia Zelika (Brows & More), Wieluń — jak przetwarzamy dane osobowe zgodnie z RODO.",
  },
  uk: {
    title: "Політика конфіденційності · Zelika PMU — Велюнь",
    desc: "Політика конфіденційності та інформація про файли cookie студії Zelika (Brows & More), Велюнь — як ми обробляємо персональні дані згідно з GDPR (RODO).",
  },
  en: {
    title: "Privacy Policy · Zelika PMU — Wieluń",
    desc: "Privacy policy and cookie information for Zelika (Brows & More) studio, Wieluń — how we process personal data under GDPR (RODO).",
  },
};
function href(lang, pl) {
  return lang === "pl" ? pl : "/" + lang + (pl === "/" ? "/" : pl);
}
function hreflangFor(pl) {
  return (
    ["pl", "uk", "en"]
      .map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${href(l, pl)}">`)
      .join("") + `<link rel="alternate" hreflang="x-default" href="${SITE}${pl}">`
  );
}
function switcher(lang, pl) {
  const item = (code, label) =>
    `<a href="${href(code, pl)}" style="padding:7px 8px;border-radius:6px;text-decoration:none;${lang === code ? "background:var(--green,#1f5e30);color:#fff" : "color:var(--muted,#6e7365)"}">${label}</a>`;
  // <span> (не <li>) — інжектимо в <header> будь-якої сторінки (навбар або topbar quizу)
  return (
    `<span class="lang-switch" style="display:inline-flex;gap:2px;align-items:center;font-size:.72rem;font-weight:600;letter-spacing:.02em;padding-left:6px">` +
    item("pl", "PL") + item("uk", "UA") + item("en", "EN") + `</span>`
  );
}

// ── УНІФІКОВАНИЙ КАРКАС: єдине джерело header/footer для ВСІХ сторінок ────────
// Воркер видаляє власні <header>/<footer> сторінки й вставляє ці канонічні
// (локалізовані) + SHELL_CSS + /nav.js. Головна = режим "home" (fixed, прозорий
// →scrolled); решта = "inner" (sticky, непрозорий). Так бари завжди однакові.
const NAV = [
  { a: "#about", k: "nav.studio", pl: "Studio" },
  { a: "#services", k: "nav.uslugi", pl: "Usługi" },
  { a: "#gallery", k: "nav.galeria", pl: "Galeria" },
  { p: "/porady", k: "nav.porady", pl: "Porady", cur: "porady" },
  { p: "/quiz", k: "nav.quiz", pl: "Quiz", quiz: true, cur: "quiz" },
  { a: "#contact", k: "nav.kontakt", pl: "Kontakt" },
];
function navLabel(lang, k, pl) {
  return (I18N[lang] && I18N[lang][k]) || pl;
}
function navHref(lang, it, home) {
  if (it.a) return home ? it.a : (lang === "pl" ? "/" : "/" + lang + "/") + it.a; // #about | /#about | /uk/#about
  if (it.p === "/porady") return "/porady"; // блог PL-only
  return lang === "pl" ? it.p : "/" + lang + it.p; // /quiz | /uk/quiz
}
function headerHtml(lang, { home = false, current = "", pl = "/" } = {}) {
  const items = NAV.map((it) => {
    const cls = current && it.cur === current ? ' class="current"' : "";
    const q = it.quiz && home ? " data-quiz-open" : "";
    return `<li><a href="${navHref(lang, it, home)}"${cls}${q}>${navLabel(lang, it.k, it.pl)}</a></li>`;
  }).join("");
  const cta = `<li class="cta-li"><a href="${BOOKSY}" class="nav-cta" data-booksy target="_blank" rel="noopener noreferrer">${navLabel(lang, "nav.book", "Umów wizytę")}</a></li>`;
  return `<header class="nav${home ? " home" : ""}"${home ? ' id="nav"' : ""}>
<a href="${home ? "#top" : href(lang, "/")}" class="brand" aria-label="Zelika — Home"><svg class="mark" viewBox="67.02 42.13 276.81 155.47"><use href="/logo.svg#zmark"/></svg><span class="tag">Brows &amp; More</span></a>
<nav><ul class="nav-links">${items}${cta}</ul></nav>
${switcher(lang, pl)}
<button class="burger" id="burger" type="button" aria-label="Menu" aria-expanded="false">&#9776;</button>
</header>`;
}
function footerHtml(lang) {
  return `<footer class="site"><div class="container"><a href="${href(lang, "/")}" class="brand" aria-label="Zelika — Home"><svg class="mark" viewBox="67.02 42.13 276.81 155.47"><use href="/logo.svg#zmark"/></svg><span class="tag">Brows &amp; More</span></a><p class="fline">Anna Zelinska &middot; Makijaż permanentny &middot; Brwi &middot; Rzęsy <span class="fdot">|</span> Wieluń <span class="fdot">&middot;</span> &copy; 2026 <span class="fdot">&middot;</span> <a href="/prywatnosc">Polityka prywatności</a> <span class="fdot">&middot;</span> <a href="#" data-cookies>Cookies</a></p></div></footer>`;
}
const SHELL_CSS = `
header.nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 40px;background:rgba(244,241,231,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line,#e6e1d3);transition:.45s ease}
header.nav.home{position:fixed;background:transparent;backdrop-filter:none;border-bottom:0;padding:16px 40px}
header.nav.home.scrolled{background:rgba(244,241,231,.9);backdrop-filter:blur(14px);padding:9px 40px;border-bottom:1px solid var(--line,#e6e1d3)}
header.nav .brand{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1;text-decoration:none}
header.nav .brand .mark{display:block;color:var(--green,#1f5e30);overflow:visible;width:120px;height:auto}
header.nav .brand .tag{font-family:var(--serif,'Cormorant Garamond',serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold,#a9863c);font-weight:600;font-size:.5rem;margin-top:1px;margin-left:3px}
header.nav .nav-links{display:flex;gap:34px;list-style:none;align-items:center;margin:0;padding:0}
header.nav .nav-links a{color:var(--ink,#2e2a22);text-decoration:none;font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;font-weight:400;position:relative;padding:4px 0;transition:.3s}
header.nav .nav-links a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--gold,#a9863c);transition:.35s}
header.nav .nav-links a:hover{color:var(--green,#1f5e30)}
header.nav .nav-links a:hover::after,header.nav .nav-links a.current::after{width:100%}
header.nav .nav-links a.current{color:var(--green,#1f5e30)}
header.nav .nav-cta{border:1px solid var(--green,#1f5e30);color:var(--green,#1f5e30)!important;padding:10px 22px!important;border-radius:2px;transition:.4s}
header.nav .nav-cta:hover{background:var(--green,#1f5e30);color:#fff!important}
header.nav .nav-cta::after{display:none!important}
header.nav .lang-switch a{padding:7px 8px;border-radius:6px;text-decoration:none}
header.nav .burger{display:none;background:none;border:none;color:var(--green,#1f5e30);font-size:1.7rem;line-height:1;cursor:pointer;padding:6px 8px}
footer.site{padding:54px 0 40px;border-top:1px solid var(--line,#e6e1d3);text-align:center;margin-top:40px;background:transparent;color:var(--muted,#6e7365);font-size:.85rem}
footer.site .container{max-width:1180px;margin:0 auto;padding:0 32px}
footer.site .brand{align-items:center;display:inline-flex;flex-direction:column;margin-bottom:14px;text-decoration:none;line-height:1}
footer.site .brand .mark{width:122px;height:auto;color:var(--green,#1f5e30);overflow:visible}
footer.site .brand .tag{font-family:var(--serif,'Cormorant Garamond',serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold,#a9863c);font-weight:600;font-size:.5rem;margin-top:3px}
footer.site .fline{color:var(--muted,#6e7365);font-size:.8rem;letter-spacing:.04em;margin-top:10px}
footer.site .fdot{color:var(--gold,#a9863c);margin:0 9px}
footer.site .fline a{color:var(--muted,#6e7365);text-decoration:none;border-bottom:1px solid var(--line-gold,#d8cba8);padding-bottom:1px;transition:.3s}
footer.site .fline a:hover{color:var(--green,#1f5e30);border-color:var(--green,#1f5e30)}
@media(max-width:920px){
header.nav .nav-links{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;background:rgba(244,241,231,.98);backdrop-filter:blur(14px);border-bottom:1px solid var(--line,#e6e1d3);box-shadow:0 20px 44px -20px rgba(31,94,48,.35);padding:4px 22px 16px;display:none}
header.nav .nav-links.open{display:flex}
header.nav .nav-links li{display:block}
header.nav .nav-links a:not(.nav-cta){display:block;padding:15px 2px;font-size:.95rem;letter-spacing:.14em;border-top:1px solid var(--line,#e6e1d3)}
header.nav .nav-links a:not(.nav-cta)::after{display:none}
header.nav .nav-links .nav-cta{display:block;text-align:center;margin-top:14px;padding:15px 20px!important}
header.nav .burger{display:block}
header.nav,header.nav.home,header.nav.home.scrolled{padding:14px 22px}
}`;
// внутрішні лінки на локалізованій сторінці → тримати мовний префікс.
// Анкери (#), зовнішні, mailto/tel і БЛОГ (/porady, PL-only) — не чіпаємо.
function localizeHref(s, lang) {
  if (lang === "pl" || !s) return null;
  // блог і політика конфіденційності — PL-only (не префіксуємо)
  if (s.startsWith("#") || /^(https?:|mailto:|tel:)/.test(s)) return null;
  if (s.startsWith("/porady") || s === "/prywatnosc") return null;
  if (s === "/") return "/" + lang + "/";
  if (s.startsWith("/#")) return "/" + lang + "/" + s.slice(1);
  if (s === "/quiz") return "/" + lang + s;
  return null;
}
const SEC_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
const PAGES = {
  home: { asset: "/", pl: "/", meta: META },
  quiz: { asset: "/quiz", pl: "/quiz", meta: META_QUIZ },
  priv: { asset: "/prywatnosc", pl: "/prywatnosc", meta: META_PRIV },
};
async function localizedPage(request, env, lang, pageKey) {
  const page = PAGES[pageKey];
  const u = new URL(request.url);
  u.pathname = page.asset;
  u.search = "";
  const res = await env.ASSETS.fetch(new Request(u.toString(), { headers: request.headers }));
  const meta = page.meta[lang] || page.meta.pl;
  const dict = I18N[lang] || {};
  const canon = SITE + href(lang, page.pl);
  const locale = (META[lang] || META.pl).locale;
  const home = pageKey === "home";
  const current = pageKey === "quiz" ? "quiz" : "";
  let rw = new HTMLRewriter()
    .on("html", { element(e) { e.setAttribute("lang", lang); } })
    .on("title", { element(e) { e.setInnerContent(meta.title); } })
    .on('meta[name="description"]', { element(e) { e.setAttribute("content", meta.desc); } })
    .on('meta[property="og:title"]', { element(e) { if (meta.ogtitle) e.setAttribute("content", meta.ogtitle); } })
    .on('meta[property="og:description"]', { element(e) { if (meta.ogdesc) e.setAttribute("content", meta.ogdesc); } })
    .on('meta[property="og:locale"]', { element(e) { e.setAttribute("content", locale); } })
    .on('link[rel="canonical"]', { element(e) { e.remove(); } }) // приберемо статичний, щоб не було дубля
    .on("head", { element(e) {
      e.append(hreflangFor(page.pl), { html: true });
      e.append(`<link rel="canonical" href="${canon}">`, { html: true });
      e.append(`<style>${SHELL_CSS}</style>`, { html: true }); // канон-каркас: авторитетний, останнім
      e.append(`<script src="/nav.js" defer></script>`, { html: true });
    } })
    // Уніфікований каркас: прибираємо власні header/footer сторінки й вставляємо канонічні.
    // ⚠️ ЛИШЕ header.nav (не чат-віджет header.zchat-head!). footer сторінки — <footer>
    // (чат-підвал це <div class="zchat-foot">, тож не зачіпаємо).
    .on("header.nav", { element(e) { e.remove(); } })
    .on("footer", { element(e) { e.remove(); } })
    .on("body", { element(e) {
      e.prepend(headerHtml(lang, { home, current, pl: page.pl }), { html: true });
      e.append(footerHtml(lang), { html: true });
    } })
    .on("img[src]", { element(e) { const s = e.getAttribute("src"); if (s && !/^(https?:|\/|data:)/.test(s)) e.setAttribute("src", "/" + s); } })
    .on("script[src]", { element(e) { const s = e.getAttribute("src"); if (s && !/^(https?:|\/)/.test(s)) e.setAttribute("src", "/" + s); } })
    .on("a[href]", { element(e) { const t = localizeHref(e.getAttribute("href"), lang); if (t) e.setAttribute("href", t); } });
  if (lang !== "pl") {
    rw = rw.on("[data-i18n]", {
      element(e) {
        const v = dict[e.getAttribute("data-i18n")];
        if (v != null) e.setInnerContent(v, { html: true });
      },
    });
  }
  const out = rw.transform(res);
  const h = new Headers(out.headers);
  h.set("Content-Security-Policy", HOMEPAGE_CSP);
  for (const k in SEC_HEADERS) h.set(k, SEC_HEADERS[k]);
  return new Response(out.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/porady") return renderIndex();
    if (path.startsWith("/porady/")) return renderPost(decodeURIComponent(path.slice("/porady/".length)));
    if (path === "/sitemap.xml") return renderSitemap();
    if (path === "/robots.txt") return renderRobots();
    if (path === "/llms.txt") return renderLlms();

    // Strona główna: czat z widgetem Turnstile, który wstrzykuje inline-skrypt
    // (z losowym tokenem → hash niestabilny, nonce niemożliwy na statyce). Dlatego
    // TYLKO dla "/" luzujemy script-src do 'unsafe-inline'. Reszta stron (_headers)
    // zostaje ścisła. Ryzyko znikome: strona statyczna, brak wstrzykiwania HTML.
    // Локалізовані сторінки (PL/UA/EN) через HTMLRewriter (data-i18n) + hreflang +
    // перемикач мов. PL теж через воркер — щоб мати hreflang і перемикач.
    if (path === "/" || path === "/index.html") return localizedPage(request, env, "pl", "home");
    if (path === "/uk" || path === "/uk/index.html") return localizedPage(request, env, "uk", "home");
    if (path === "/en" || path === "/en/index.html") return localizedPage(request, env, "en", "home");
    if (path === "/quiz") return localizedPage(request, env, "pl", "quiz");
    if (path === "/uk/quiz") return localizedPage(request, env, "uk", "quiz");
    if (path === "/en/quiz") return localizedPage(request, env, "en", "quiz");
    // /prywatnosc — юридичний документ, лишається PL, але через воркер (уніфікований каркас)
    if (path === "/prywatnosc") return localizedPage(request, env, "pl", "priv");

    // wszystko inne → statyka
    return env.ASSETS.fetch(request);
  },
};
