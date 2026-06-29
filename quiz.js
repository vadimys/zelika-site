const BOOKSY = "https://booksy.com/pl-pl/dl/show-business/334211";
  const LEAD_URL = "https://hooks.zelika.pl/webhook/lead";

  const QUESTIONS = [
    {
      q: "Jak opisałabyś swoje brwi dzisiaj?",
      answers: [
        { t:"Mają prześwity — brakuje włosków", s:{wlosowa:2,pudrowa:2,mieszana:2} },
        { t:"Niesforne — rosną w różnych kierunkach", s:{laminacja:3} },
        { t:"Cienkie i jasne po latach regulacji", s:{pudrowa:2,mieszana:2,regulacja:1} },
        { t:"Są okej — chcę tylko nadać im kształt", s:{regulacja:2,laminacja:1} }
      ]
    },
    {
      q: "O jakim efekcie marzysz?",
      answers: [
        { t:"Naturalny — jakby to były moje własne włoski", s:{wlosowa:3} },
        { t:"Makijażowy — wyraziste i gładko wypełnione", s:{pudrowa:3} },
        { t:"Złoty środek — naturalnie, ale z charakterem", s:{mieszana:3} },
        { t:"Gęstsze i ułożone, ale bez makijażu permanentnego", s:{laminacja:3,regulacja:1} }
      ]
    },
    {
      q: "Czy malujesz brwi na co dzień?",
      answers: [
        { t:"Tak — nie wychodzę bez wymalowanych brwi", s:{pudrowa:2,mieszana:1} },
        { t:"Czasem, gdy mam wyjście", s:{wlosowa:1,mieszana:2} },
        { t:"Rzadko albo wcale", s:{wlosowa:2,laminacja:1,regulacja:1} },
        { t:"Chcę przestać tracić na to czas każdego ranka", s:{wlosowa:2,pudrowa:2,mieszana:2} }
      ]
    },
    {
      q: "Jaka jest Twoja skóra w okolicy brwi?",
      answers: [
        { t:"Raczej tłusta", s:{pudrowa:3} },
        { t:"Normalna lub sucha", s:{wlosowa:2,mieszana:1} },
        { t:"Mieszana", s:{mieszana:2} },
        { t:"Trudno powiedzieć / nie wiem", s:{mieszana:1,regulacja:1} }
      ]
    },
    {
      q: "Na jaki krok jesteś gotowa?",
      answers: [
        { t:"Chcę efektu na długie miesiące", s:{wlosowa:2,pudrowa:2,mieszana:2} },
        { t:"Wolę zacząć od czegoś nietrwałego", s:{laminacja:3,regulacja:2} },
        { t:"Najpierw chcę konsultację — mam pewne obawy", s:{regulacja:2} }
      ]
    }
  ];

  const RESULTS = {
    wlosowa: {
      service:"Makijaż permanentny brwi",
      title:"Metoda włosowa",
      price:"od 600 zł",
      desc:"Twój typ to naturalność. Metoda włosowa odtwarza pojedyncze włoski tak realistycznie, że nikt nie pozna, że to makijaż permanentny. Idealna, gdy masz prześwity, ale chcesz wyglądać po prostu jak lepsza, wyspana wersja siebie — każdego dnia, bez malowania."
    },
    pudrowa: {
      service:"Makijaż permanentny brwi",
      title:"Metoda pudrowa (ombré)",
      price:"od 600 zł",
      desc:"Marzysz o efekcie makijażu, który się nie ściera. Metoda pudrowa daje miękki, równomiernie wypełniony look — jak po delikatnej pomadce do brwi. Świetnie sprawdza się również przy cerze tłustej. Obudzisz się z gotowymi brwiami i zapomnisz o porannym rysowaniu."
    },
    mieszana: {
      service:"Makijaż permanentny brwi",
      title:"Metoda mieszana",
      price:"od 600 zł",
      desc:"Chcesz złoty środek — naturalnie u nasady, wyraziście ku końcowi. Metoda mieszana łączy realistyczne włoski z delikatnym cieniowaniem. To najbardziej uniwersalny wybór, który pięknie podkreśla brwi i pasuje niemal każdej twarzy."
    },
    laminacja: {
      service:"Stylizacja brwi",
      title:"Laminacja brwi",
      price:"od 140 zł",
      desc:"Twoje brwi potrzebują ujarzmienia, ale nie jesteś (jeszcze) gotowa na makijaż permanentny. Laminacja układa włoski w jednym kierunku, dodaje gęstości i optycznie podkręca brwi — efekt utrzymuje się do około 6 tygodni. Idealny, niezobowiązujący pierwszy krok. W cenie regulacja i farbka."
    },
    regulacja: {
      service:"Stylizacja brwi",
      title:"Regulacja i farbka brwi",
      price:"od 90 zł",
      desc:"Lubisz mieć kontrolę i wolisz zacząć od małego kroku. Profesjonalna regulacja nada brwiom idealny kształt dopasowany do rysów Twojej twarzy, a farbka podkreśli ich kolor. Świetny start, by oswoić się i zobaczyć potencjał swoich brwi przed decyzją o makijażu permanentnym."
    }
  };

  const PRIORITY = ['mieszana','wlosowa','pudrowa','laminacja','regulacja'];

  let step = 0;            // 0 = intro, 1..N = questions, N+1 = result
  let answers = [];        // chosen answer index per question
  const card = document.getElementById('card');

  function computeResult(){
    const s = {wlosowa:0,pudrowa:0,mieszana:0,laminacja:0,regulacja:0};
    answers.forEach((ai,qi)=>{
      const sc = QUESTIONS[qi].answers[ai].s;
      for(const k in sc){ s[k]+=sc[k]; }
    });
    let best = PRIORITY[0], bestVal = -1;
    PRIORITY.forEach(k=>{ if(s[k] > bestVal){ bestVal = s[k]; best = k; } });
    return best;
  }

  function esc(str){ return str.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function introHTML(){
    return `
      <span class="eyebrow">Quiz</span>
      <h1>Jaki zabieg brwi <em>jest dla Ciebie?</em></h1>
      <p class="lead">Każda twarz jest inna — i każde brwi też. Odpowiedz na kilka pytań, a podpowiem Ci, który zabieg najlepiej odpowie na Twoje potrzeby i oczekiwania.</p>
      <div class="btn-row">
        <button class="btn" data-action="start">Rozpocznij quiz</button>
      </div>
      <p class="intro-note">5 pytań &middot; <b>około 1 minuty</b> &middot; bez zobowiązań</p>
    `;
  }

  function questionHTML(qi){
    const Q = QUESTIONS[qi];
    const pct = Math.round((qi+1)/QUESTIONS.length*100);
    const backBtn = qi>0
      ? `<button class="progress-back" data-action="back">← Wróć</button>`
      : `<span></span>`;
    const opts = Q.answers.map((a,ai)=>{
      const sel = answers[qi]===ai ? ' sel' : '';
      return `<button class="answer${sel}" data-action="answer" data-ai="${ai}">${esc(a.t)}</button>`;
    }).join('');
    return `
      <div class="progress-head">
        <span class="progress-label">Pytanie ${qi+1} z ${QUESTIONS.length}</span>
        ${backBtn}
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <h2 class="q-title">${esc(Q.q)}</h2>
      <div class="answers">${opts}</div>
    `;
  }

  function resultHTML(){
    const key = computeResult();
    const R = RESULTS[key];
    const wantsConsult = answers[4]===2;
    const consultBlock = wantsConsult ? `
      <div class="consult">
        <p><b>Masz obawy? To zupełnie naturalne.</b> Umów się najpierw na niezobowiązującą konsultację — spokojnie porozmawiamy, odpowiem na wszystkie pytania i wspólnie dobierzemy najlepsze rozwiązanie dla Ciebie.</p>
      </div>` : '';
    return `
      <span class="eyebrow">Twój wynik</span>
      <div class="res-service">${esc(R.service)}</div>
      <h1>${esc(R.title)}</h1>
      <div class="res-price">${esc(R.price)}</div>
      <p class="res-desc">${esc(R.desc)}</p>
      ${consultBlock}
      <div class="btn-row">
        <a class="btn" href="${BOOKSY}" target="_blank" rel="noopener noreferrer">Zarezerwuj w Booksy</a>
      </div>
      <div class="consult lead-cta">
        <p><b>Wolisz, żebyśmy odezwali się z rekomendacją?</b> Zostaw kontakt — Anna napisze do Ciebie 💕</p>
        <input id="lead-contact" type="text" placeholder="Instagram lub telefon" maxlength="120" autocomplete="off" style="width:100%;padding:12px 14px;margin:10px 0;border:1px solid #cdbfae;border-radius:10px;font:inherit;background:#fff">
        <button class="btn-ghost" data-action="lead">Wyślij kontakt</button>
        <p id="lead-note" style="margin-top:10px;font-size:.95em"></p>
      </div>
      <div class="res-links">
        <a href="index.html#services">Zobacz pełny cennik</a>
        <button data-action="restart">↺ Powtórz quiz</button>
      </div>
    `;
  }

  function buildHTML(){
    if(step===0) return introHTML();
    if(step>=1 && step<=QUESTIONS.length) return questionHTML(step-1);
    return resultHTML();
  }

  function show(scroll){
    card.classList.add('fade');
    setTimeout(()=>{
      card.innerHTML = buildHTML();
      card.classList.remove('fade');
      if(scroll){ document.querySelector('.quiz').scrollIntoView({behavior:'smooth',block:'start'}); }
    },180);
  }

  card.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const act = el.dataset.action;
    if(act==='start'){ step=1; show(true); }
    else if(act==='answer'){
      answers[step-1] = parseInt(el.dataset.ai,10);
      // brief visual confirm before advancing
      el.classList.add('sel');
      step++;
      setTimeout(()=>show(true), 160);
    }
    else if(act==='back'){ if(step>1){ step--; show(true); } }
    else if(act==='lead'){
      const inp = document.getElementById('lead-contact');
      const note = document.getElementById('lead-note');
      const contact = ((inp && inp.value) || '').trim();
      if(!contact){ if(note) note.textContent = 'Wpisz Instagram lub telefon 🙂'; return; }
      el.disabled = true;
      const R = RESULTS[computeResult()];
      fetch(LEAD_URL, {
        method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({ source:'quiz', recommendation:R.title, contact:contact, url:location.href })
      }).then(function(){
        if(note) note.textContent = 'Dziękujemy! Odezwiemy się wkrótce 💕';
        if(inp) inp.style.display = 'none'; el.style.display = 'none';
      }).catch(function(){
        if(note) note.textContent = 'Spróbuj ponownie za chwilę.'; el.disabled = false;
      });
    }
    else if(act==='restart'){ answers=[]; step=0; show(true); }
  });

  // initial paint (no fade)
  card.innerHTML = buildHTML();
