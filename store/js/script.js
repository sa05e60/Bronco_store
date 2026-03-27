let YT_SFX_PLAYER = null;
  let YT_SFX_READY  = false;
  let SFX_PENDING   = false;

  const YT_SFX_SOURCE = "https://youtu.be/z5_xeFV1pvw?si=0wXwncVQOkcRozeS";
  const YT_SFX_START  = 0.0;
  const YT_SFX_END    = 5.0;

  let YT_TROPHY_PLAYER = null;
  let YT_TROPHY_READY  = false;
  let TROPHY_PENDING   = false;
  const YT_TROPHY_SOURCE = "https://youtu.be/KYVJFyWMSxk?si=-GckGzta0z06hBQc";
  const YT_TROPHY_START  = 0.0;
  const YT_TROPHY_END    = 4.0;

  function __extractYouTubeId(input){
    if(!input) return "";
    if(/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    try{
      const u = new URL(input);
      if(u.hostname.includes("youtube.com")){
        const v = u.searchParams.get("v");
        if(v) return v;
        const parts = u.pathname.split("/");
        const idx = parts.findIndex(p=>p==="shorts"||p==="embed");
        if(idx!==-1 && parts[idx+1]) return parts[idx+1];
      }else if(u.hostname.includes("youtu.be")){
        const id = u.pathname.replace("/","");
        if(id) return id;
      }
    }catch{}
    return "";
  }

  window.onYouTubeIframeAPIReady = function(){
    const videoId = __extractYouTubeId(YT_SFX_SOURCE);
    if(!videoId) return;
    YT_SFX_PLAYER = new YT.Player('yt-sfx', {
      width: 0, height: 0, videoId,
      playerVars: { autoplay:0, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0, playsinline:1 },
      events: {
        onReady: () => {
          YT_SFX_READY = true;
          try{
            const iframe = YT_SFX_PLAYER.getIframe?.();
            if(iframe) iframe.setAttribute('allow','autoplay');
            YT_SFX_PLAYER.setVolume?.(100);
          }catch{}
          if(SFX_PENDING){
            SFX_PENDING = false;
            playAddToCartSfxYT();
          }
        },
        onStateChange: (e) => {
          if(e.data === YT.PlayerState.PLAYING && YT_SFX_END > 0){
            const tick = () => {
              try{
                const t = YT_SFX_PLAYER.getCurrentTime();
                if(t >= YT_SFX_END) YT_SFX_PLAYER.pauseVideo();
                else requestAnimationFrame(tick);
              }catch{}
            };
            requestAnimationFrame(tick);
          }
        }
      }
    });

    const trophyVideoId = __extractYouTubeId(YT_TROPHY_SOURCE);
    if(trophyVideoId) {
      YT_TROPHY_PLAYER = new YT.Player('yt-trophy-sfx', {
        width: 0, height: 0, videoId: trophyVideoId,
        playerVars: { autoplay:0, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0, playsinline:1 },
        events: {
          onReady: () => {
            YT_TROPHY_READY = true;
            try{
              const iframe = YT_TROPHY_PLAYER.getIframe?.();
              if(iframe) iframe.setAttribute('allow','autoplay');
              YT_TROPHY_PLAYER.setVolume?.(100);
            }catch{}
            if(TROPHY_PENDING){
              TROPHY_PENDING = false;
              playTrophySfxYT();
            }
          },
          onStateChange: (e) => {
            if(e.data === YT.PlayerState.PLAYING && YT_TROPHY_END > 0){
              const tick = () => {
                try{
                  const t = YT_TROPHY_PLAYER.getCurrentTime();
                  if(t >= YT_TROPHY_END) YT_TROPHY_PLAYER.pauseVideo();
                  else requestAnimationFrame(tick);
                }catch{}
              };
              requestAnimationFrame(tick);
            }
          }
        }
      });
    }
  };

  function playFallbackBeep(){
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      o.stop(now + 0.16);
    }catch{}
  }

  function playAddToCartSfxYT(){
    try{
      if(YT_SFX_PLAYER && YT_SFX_READY){
        const iframe = YT_SFX_PLAYER.getIframe?.();
        if(iframe) iframe.setAttribute('allow','autoplay');
        YT_SFX_PLAYER.unMute?.();
        YT_SFX_PLAYER.setVolume?.(100);
        YT_SFX_PLAYER.seekTo(YT_SFX_START, true);
        YT_SFX_PLAYER.playVideo();
      }else{
        SFX_PENDING = true;
        playFallbackBeep();
      }
    }catch{
      playFallbackBeep();
    }
  }

  function playTrophySfxYT(){
    try{
      if(YT_TROPHY_PLAYER && YT_TROPHY_READY){
        const iframe = YT_TROPHY_PLAYER.getIframe?.();
        if(iframe) iframe.setAttribute('allow','autoplay');
        YT_TROPHY_PLAYER.unMute?.();
        YT_TROPHY_PLAYER.setVolume?.(100);
        YT_TROPHY_PLAYER.seekTo(YT_TROPHY_START, true);
        YT_TROPHY_PLAYER.playVideo();
      }else{
        TROPHY_PENDING = true;
      }
    }catch{}
  }

  let AUDIO_PRIMED = false;
  function primeAudioOnce(){
    if (AUDIO_PRIMED) return;
    AUDIO_PRIMED = true;
    try{
      if(YT_SFX_PLAYER && YT_SFX_READY){
        YT_SFX_PLAYER.mute?.();
        YT_SFX_PLAYER.seekTo(YT_SFX_START, true);
        YT_SFX_PLAYER.playVideo();
      }
      if(YT_TROPHY_PLAYER && YT_TROPHY_READY){
        YT_TROPHY_PLAYER.mute?.();
        YT_TROPHY_PLAYER.seekTo(YT_TROPHY_START, true);
        YT_TROPHY_PLAYER.playVideo();
      }
    }catch{}
  }
  document.addEventListener('pointerdown', primeAudioOnce, { once:true, passive:true });

/* ===== Utils ===== */
    function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' })[m]); }
    function safeUrl(u){
      try{
        if(!u) return '';
        if(typeof u==='string' && (u.startsWith('https://')||u.startsWith('data:')||u.startsWith('blob:'))) return u;
        const x=new URL(u,location.origin);
        return ['https:','data:','blob:'].includes(x.protocol)?u:'';
      }catch{ if(typeof u==='string' && u.startsWith('data:')) return u; return ''; }
    }
    const currencyFmt = new Intl.NumberFormat(undefined, { style:'currency', currency:'USD' });
    function fmt(v){ return currencyFmt.format(v); }
    function getParam(name, fallback=''){ const p = new URLSearchParams(location.search); return p.get(name) ?? fallback; }
    function setParams(obj){ const p = new URLSearchParams(location.search); for(const k in obj){ const v=obj[k]; if(v===''||v==null||v==='all'||v==='featured') p.delete(k); else p.set(k,v);} history.replaceState(null,'',location.pathname+(p.toString()?`?${p.toString()}`:'')+location.hash); }

    /* ===== Trap Focus (عام) ===== */
    function trapFocus(m){
      try{
        const s='button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
        const f=[...m.querySelectorAll(s)];
        if(!f.length) return;
        let first=f[0],last=f[f.length-1];
        first.focus();
        function onKey(e){
          if(e.key!=='Tab')return;
          if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
          else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
        }
        m.addEventListener('keydown',onKey);
      }catch{}
    }
    window.trapFocus = trapFocus;

    function showToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'custom-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
      }, 3000);
    }
    window.showToast = showToast;

    /* ===== شعار الصورة + النص (دمج كامل) ===== */
    const CONFIG_HONOR_IMG_URL = "https://i.pinimg.com/736x/c5/bc/12/c5bc12ccbc649653651628634113c7bb.jpg";
    const FALLBACK_BADGE_DATAURL =
      "data:image/svg+xml;utf8," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>\
          <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\
            <stop offset='0' stop-color='%23C29B77'/>\
            <stop offset='1' stop-color='%235C3A21'/>\
          </linearGradient></defs>\
          <rect width='100%' height='100%' rx='16' ry='16' fill='url(%23g)'/>\
          <text x='50%' y='54%' text-anchor='middle' font-size='14' font-family='Rye, Poppins, sans-serif' fill='%23fff'>Rise of Honor</text>\
        </svg>"
      );

    function showHonorImageBanner(text="Rise of Honor", imgUrl=CONFIG_HONOR_IMG_URL){
      try{
        const wrap = document.createElement('div');
        wrap.className = 'honor-img-banner';
        wrap.dir = 'auto';

        const img = document.createElement('img');
        img.src = imgUrl || CONFIG_HONOR_IMG_URL;
        img.alt = "badge";
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => { img.onerror = null; img.src = FALLBACK_BADGE_DATAURL; };

        const txt = document.createElement('div');
        txt.className = 'hib-text';
        txt.textContent = text || "Rise of Honor";

        wrap.appendChild(img);
        wrap.appendChild(txt);
        document.body.appendChild(wrap);

        setTimeout(() => wrap.classList.add('out'), 1500);
        wrap.addEventListener('animationend', () => wrap.remove(), { once:true });
      }catch(e){ console.warn('showHonorImageBanner error:', e); }
    }
    window.showHonorImageBanner = showHonorImageBanner;

    /* ===== Firebase (بدّل المفاتيح إن لزم) ===== */
    const firebaseConfig = { apiKey:"YOUR_API_KEY_HERE", authDomain:"YOUR_AUTH_DOMAIN.firebaseapp.com", projectId:"YOUR_PROJECT_ID", storageBucket:"YOUR_PROJECT_ID", messagingSenderId:"SENDER_ID", appId:"APP_ID" };
    window.addEventListener('load', () => { 
      try{ if (window.firebase) firebase.initializeApp(firebaseConfig); }catch(e){} 
      initApp(); 

      // Parallax Effect
      window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        document.querySelectorAll('.hero').forEach(hero => {
          const limit = hero.offsetTop + hero.offsetHeight;
          if (scrolled > hero.offsetTop && scrolled <= limit) {
            const yPos = (scrolled - hero.offsetTop) * 0.4;
            hero.style.setProperty('--parallax-y', `${yPos}px`);
          }
        });
      });
    });

    function initApp(){
      const auth = (window.firebase && firebase.auth) ? firebase.auth() : null;
      const db   = (window.firebase && firebase.firestore) ? firebase.firestore() : null;

      const IMG_PLACEHOLDER_BOOTS =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23C29B77'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Rye, Poppins, sans-serif' font-size='42' fill='%235C3A21'>BRONCO BOOTS</text></svg>";
      const IMG_PLACEHOLDER_SHIRT =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23E7DFD7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Rye, Poppins, sans-serif' font-size='42' fill='%235C3A21'>PLAID SHIRT</text></svg>";
      const IMG_PLACEHOLDER_JEANS =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23D8C8B8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Rye, Poppins, sans-serif' font-size='42' fill='%235C3A21'>DENIM JEANS</text></svg>";

      /* ===== المنتجات ===== */
      let products = [
        { id:'p1', title:'Classic Cowboy Hat', priceCents:4999, img:'https://i.pinimg.com/736x/bc/41/20/bc412078e1d6cc715ae26087c4821da4.jpg', category:'hats',
          details:{ description:'Timeless felt cowboy hat with a structured crown and a curved brim — built for sun, dust, and long rides.',
            specs:{Material:'100% Wool Felt', Color:'Sand', Sizes:'S / M / L / XL', SKU:'HAT-CL-100', Collection:'Frontier Essentials'},
            sizes:['S','M','L','XL'], url:'#' } },
        { id:'p2', title:'Leather Western Boots', priceCents:12995, img:'https://i.pinimg.com/1200x/0c/21/d9/0c21d9ae4f9239890d77b2f44c0772a5.jpg', category:'boots',
          details:{ description:'Premium full-grain leather western boots with a stacked heel and reinforced shank for all-day comfort. Hand-finished pull straps.',
            specs:{Material:'Full-grain Leather', Color:'Dark Tan', Sizes:'EU 40–46', SKU:'BOOT-LTH-210', Collection:'Ranch Series'},
            sizes:['EU 40','EU 41','EU 42','EU 43','EU 44','EU 45','EU 46'], url:'#' } },
        { id:'p3', title:'Plaid Cowboy Shirt', priceCents:3950, img:'https://i.pinimg.com/1200x/af/6a/fa/af6afae702f491c67755522b9f26b179.jpg', category:'shirts',
          details:{ description:'Soft-touch plaid shirt with western yoke detail and pearl snaps. Breathable and ready for layering.',
            specs:{Material:'Cotton Blend', Color:'Red/Black Plaid', Sizes:'S–XXL', SKU:'SH-PL-302', Collection:'Campfire Checks'},
            sizes:['S','M','L','XL','XXL'], url:'#' } },
        { id:'p4', title:'Denim Ranch Jeans', priceCents:5900, img:'https://i.pinimg.com/1200x/d0/cf/b5/d0cfb560b9203fcc85f829a2d2f37042.jpg', category:'jeans',
          details:{ description:'Durable straight-fit denim built for ranch work and weekend rides. Minimal stretch, maximum toughness.',
            specs:{Material:'98% Cotton, 2% Elastane', Color:'Indigo', Sizes:'28–40', SKU:'JN-RN-501', Collection:'Trail Denim'},
            sizes:['28','30','32','34','36','38','40'], url:'#' } },
        { id:'p5', title:'Cowhide Belt', priceCents:2475, img:'https://i.pinimg.com/1200x/3c/25/41/3c2541b22f887e8d258ec760c18fbb44.jpg', category:'belts',
          details:{ description:'Sturdy cowhide belt with antique brass buckle. Ages beautifully with a rich patina.',
            specs:{Material:'Genuine Cowhide', Color:'Chestnut', Sizes:'30–42', SKU:'BLT-CH-014', Collection:'Outpost Leather'},
            sizes:['30','32','34','36','38','40','42'], url:'#' } },
        { id:'p6', title:'Rodeo Jacket', priceCents:14900, img:'https://i.pinimg.com/1200x/7b/d2/3f/7bd23fc9251d7ccc2c6e0bc6c3f61bd1.jpg', category:'jackets',
          details:{ description:'Weather-resistant jacket with quilted lining and reinforced seams. Built for brisk mornings in the arena.',
            specs:{Material:'Waxed Canvas', Color:'Olive', Sizes:'S–XL', SKU:'JK-RD-707', Collection:'Arena Line'},
            sizes:['S','M','L','XL'], url:'#' } },
        { id:'boots_natural_44', title:'Natural Leather Western Boots (EU 44)', priceCents:5700, img:'https://i.pinimg.com/736x/ad/da/a6/addaa6b1b431445405266af839f03d2a.jpg', category:'boots',
          details:{ description:'Natural leather boots with cushioned insole — everyday comfort with western character.',
            specs:{Material:'Top-grain Leather', Color:'Natural', Sizes:'EU 44', SKU:'BOOT-NAT-044', Collection:'Everyday Western'},
            sizes:['EU 44'], url:'https://www.pinterest.com/pin/1196337387660444/' } },
        { id:'boots_tan_brown_square_toe', title:'Tan Brown Square Toe Boots', priceCents:18999, img:'https://i.pinimg.com/736x/f6/1b/5b/f61b5b8e0a5245cb98ca83da0f3ebf06.jpg', category:'boots',
          meta:{ bnpl:true, installments:'4 interest-free installments', monthlyFrom:'from $17.15/mo' },
          details:{ description:'Square-toe profile with oil-resistant outsole and double-stitched welt. Ready for the long haul.',
            specs:{Material:'Full-grain Leather', Color:'Tan Brown', Sizes:'EU 41–46', SKU:'BOOT-SQ-332', Collection:'Workhorse'},
            sizes:['EU 41','EU 42','EU 43','EU 44','EU 45','EU 46'], url:'#' } },

        /* ===== ACCESSORIES ===== */
        { id:'acc_bolo_turquoise', title:'Turquoise Bolo Tie', priceCents:3599, img:'https://i.pinimg.com/1200x/43/19/21/431921ba67bf1cfea3145d42249caf28.jpg', category:'accessories',
          details:{ description:'Classic bolo tie with a turquoise-style stone and braided leather cord.',
            specs:{Material:'Zinc Alloy & Faux Turquoise', Color:'Silver / Turquoise', Sizes:'One Size', SKU:'ACC-BOLO-001', Collection:'Frontier Accents'},
            sizes:['One Size'], url:'#' } },
        { id:'acc_bandana_pack', title:'Western Bandana (3-Pack)', priceCents:1899, img:'https://i.pinimg.com/1200x/c3/fe/69/c3fe698a11e16a8c6410c57b9653cca9.jpg', category:'accessories',
          details:{ description:'Soft cotton bandanas in western prints — neck, face or pocket style.',
            specs:{Material:'100% Cotton', Color:'Red/Blue/Black', Sizes:'55×55cm', SKU:'ACC-BND-3PK', Collection:'Campfire Prints'},
            sizes:['One Size'], url:'#' } },
        { id:'acc_wallet_handstitched', title:'Hand-Stitched Leather Wallet', priceCents:4299, img:'https://i.pinimg.com/736x/ef/93/76/ef9376f9d6f7d2cc98b46088dbeb51d0.jpg', category:'accessories',
          details:{ description:'Slim bifold wallet, hand-stitched edges and RFID-safe lining.',
            specs:{Material:'Full-grain Leather', Color:'Chestnut', Slots:'6 Card + Cash', SKU:'ACC-WLT-205', Collection:'Outpost Leather'},
            sizes:['One Size'], url:'#' } },
        { id:'acc_keychain_spurs', title:'Silver Spurs Keychain', priceCents:1199, img:'https://i.pinimg.com/1200x/ce/1b/91/ce1b9185a5b4660ca557a70d9a8b5297.jpg', category:'accessories',
          details:{ description:'Mini spur charm with sturdy split-ring — keep your keys ranch-ready.',
            specs:{Material:'Stainless Steel', Finish:'Polished', SKU:'ACC-KEY-012', Collection:'Arena Line'},
            sizes:['One Size'], url:'#' } },
        { id:'acc_boot_socks_2pk', title:'Cowboy Boot Socks (2-Pack)', priceCents:1499, img:'https://i.pinimg.com/1200x/c1/45/54/c14554130ef8d718877660c5e18c4ba7.jpg', category:'accessories',
          details:{ description:'Cushioned, breathable socks with reinforced heel & toe for long rides.',
            specs:{Material:'Cotton/Poly/Spandex', Height:'Mid-calf', Pack:'2 Pairs', SKU:'ACC-SOX-2PK', Collection:'Ranch Series'},
            sizes:['M','L','XL'], url:'#' } },
        { id:'acc_lariat_necklace', title:'Leather Lariat Necklace', priceCents:2399, img:'https://i.pinimg.com/1200x/91/50/02/9150028a5144a3433107a52c5b121265.jpg', category:'accessories',
          details:{ description:'Braided leather lariat with adjustable slider — subtle western flair.',
            specs:{Material:'Genuine Leather', Length:'90 cm adjustable', Color:'Dark Tan', SKU:'ACC-LAR-077', Collection:'Everyday Western'},
            sizes:['One Size'], url:'#' } }
      ];

      const API_BASE_URL = (window.BRONCO_API_URL || '') + '/api';
      async function loadData() {
         try {
            let r = await fetch(API_BASE_URL + '?action=get_products');
            let d = await r.json();
            if(d.success && d.products && d.products.length > 0) {
               products = d.products;
               renderFilters();
               renderProducts();
            }
         } catch(e) { console.warn('Fetch products err:', e); }

         try {
            let r2 = await fetch(API_BASE_URL + '?action=get_coupons');
            let d2 = await r2.json();
            if(d2.success && d2.coupons && d2.coupons.length > 0) {
               d2.coupons.forEach(c => {
                 COUPONS[c.code] = { type: c.type, value: parseInt(c.value), label: c.label, minSubtotalCents: parseInt(c.minSubtotalCents) };
               });
               if(typeof renderCouponList === 'function') renderCouponList();
            }
         } catch(e) { console.warn('Fetch coupons err:', e); }
      }
      loadData();

      const CATEGORIES = [
        { key:'all', label:'All' }, { key:'jeans', label:'Jeans' }, { key:'jackets', label:'Jackets' },
        { key:'boots', label:'Boots' }, { key:'hats', label:'Hats' }, { key:'shirts', label:'Shirts' },
        { key:'belts', label:'Belts' }, { key:'accessories', label:'Accessories' }
      ];

      // URL state
      let currentFilter = (()=>{ const cat=(getParam('cat','all')||'all').toLowerCase(); return CATEGORIES.some(c=>c.key===cat)?cat:'all'; })();
      let searchQuery = (getParam('q','')||'').trim();
      let sortKey = (getParam('sort','featured')||'featured');

      const filtersEl = document.getElementById('cat-filters');
      const grid = document.getElementById('products-grid');
      const searchInput = document.getElementById('search-input');
      const sortSelect = document.getElementById('sort-select');

      searchInput.value = searchQuery;
      sortSelect.value = ['featured','relevance','price_asc','price_desc','name_asc'].includes(sortKey)?sortKey:'featured';

      /* ====== تحسين البحث + ربط فوري ====== */

      const AR_TERM_MAP = {
        "قبعة":"hat","كاب":"hat","برنيطة":"hat","طاقية":"hat",
        "حذاء":"boot","بوت":"boots","جزمة":"boots","نعال":"boots","كنادر":"boots",
        "قميص":"shirt","قميص مربعات":"plaid","قميص كاوبوي":"shirt","تيشيرت":"shirt","بلوزة":"shirt",
        "جينز":"jeans","بنطلون":"jeans","سروال":"jeans","بانتس":"jeans",
        "حزام":"belt","قايش":"belt",
        "جاكيت":"jacket","سترة":"jacket","قمصلة":"jacket",
        "اكسسوارات":"accessories","إكسسوارات":"accessories","كماليات":"accessories",
        "ميدالية":"keychain","ميدالية مفاتيح":"keychain","مفتاح":"keychain",
        "ربطة عنق":"bolo","بولوتاي":"bolo",
        "منديل":"bandana","باندانا":"bandana",
        "جوارب":"socks","شراب":"socks",
        "قلادة":"necklace","لاريت":"lariat",
        "جلد طبيعي":"natural","طبيعي":"natural","جلد":"leather",
        "مربعة":"square toe","بني فاتح":"tan brown","بني":"brown","اسود":"black",
        "حذاء طبيعي":"natural boots",
        "بنطال":"jeans", "بناطيل":"jeans", "بنطلونات":"jeans",
        "شماغ":"bandana", "غترة":"bandana", "وشاح":"bandana",
        "كوبوي":"western", "رعاة البقر":"western",
        "جلد":"leather", "أصلي":"genuine", "اصلي":"genuine"
      };

      function normalizeText(s){
        return (s||"")
          .toString()
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/[\u0640]/g,"")
          .trim();
      }
      function expandArabicQuery(q){
        const tokens = normalizeText(q).split(/\s+/).filter(Boolean);
        const extra = [];
        tokens.forEach(t=>{
          const mapped = AR_TERM_MAP[t];
          if(mapped) extra.push(mapped);
        });
        return [...tokens, ...extra];
      }

      const SEARCH_CACHE = new Map();
      function buildSearchBlob(p){
        if(SEARCH_CACHE.has(p.id)) return SEARCH_CACHE.get(p.id);
        const parts = [
          p.title, p.category,
          p.details?.description,
          ...(p.details?.sizes||[]),
          ...(p.details?.url?[p.details.url]:[]),
          ...(p.details?.specs ? Object.entries(p.details.specs).map(([k,v])=>`${k}: ${v}`) : [])
        ].filter(Boolean);
        const blob = normalizeText(parts.join(" | "));
        SEARCH_CACHE.set(p.id, blob);
        return blob;
      }

      function scoreProduct(p, qTokens){
        if(!qTokens.length) return 0;
        let score = 0;
        const title = normalizeText(p.title);
        const cat   = normalizeText(p.category);
        const blob  = buildSearchBlob(p);

        qTokens.forEach(tok=>{
          if(!tok) return;
          if(title.startsWith(tok)) score += 50;
          if(new RegExp(`\\b${tok}\\b`).test(title)) score += 40;
          if(new RegExp(`\\b${tok}\\b`).test(cat)) score += 30;
          if(blob.includes(tok)) score += 15;
        });

        if(p.id === 'boots_tan_brown_square_toe') score += 5;
        return score;
      }

      searchInput.addEventListener('input', (e)=>{
        searchQuery = e.target.value;
        setParams({cat:currentFilter, q:searchQuery, sort:sortKey});
        renderProducts();
      });
      sortSelect.addEventListener('change', (e)=>{
        sortKey = e.target.value || 'featured';
        setParams({cat:currentFilter, q:searchQuery, sort:sortKey});
        renderProducts();
      });

      function filterSearchSort(list){
        let result = list.filter(p=>currentFilter==='all'||p.category===currentFilter);

        const q = (searchQuery||"").trim();
        const qTokens = expandArabicQuery(q);

        if(qTokens.length){
          result = result
            .map(p => ({ p, _score: scoreProduct(p, qTokens) }))
            .filter(x => x._score > 0);
        }else{
          result = result.map(p => ({ p, _score: 0 }));
        }

        if(sortKey==='price_asc')      result.sort((a,b)=>a.p.priceCents-b.p.priceCents);
        else if(sortKey==='price_desc')result.sort((a,b)=>b.p.priceCents-a.p.priceCents);
        else if(sortKey==='name_asc')  result.sort((a,b)=>a.p.title.localeCompare(b.p.title));
        else if(sortKey==='relevance' && qTokens.length){
          result.sort((a,b)=> b._score - a._score || a.p.title.localeCompare(b.p.title));
        }

        return result.map(x => x.p);
      }

      function renderFilters(){
        const counts = products.reduce((acc,p)=>{ acc[p.category]=(acc[p.category]||0)+1; return acc; }, {}); const total = products.length;
        filtersEl.innerHTML=''; CATEGORIES.forEach(cat=>{
          const count = cat.key==='all'?total:(counts[cat.key]||0);
          const btn = document.createElement('button'); btn.className='filter-btn'; btn.type='button'; btn.setAttribute('role','tab');
          btn.setAttribute('aria-pressed', String(currentFilter===cat.key)); btn.dataset.cat=cat.key;
          btn.innerHTML = `${cat.label} <span class="filter-count">(${count})</span>`;
          btn.addEventListener('click',()=>{ currentFilter=cat.key; setParams({cat:currentFilter,q:searchQuery,sort:sortKey}); [...filtersEl.querySelectorAll('.filter-btn')].forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.cat===currentFilter))); renderProducts(); });
          filtersEl.appendChild(btn);
        });
      }

      function makeSrcSet(u){
        if(!u || typeof u!=='string' || !u.startsWith('https')) return '';
        const sep = u.includes('?') ? '&' : '?';
        return `${u}${sep}w=400 400w, ${u}${sep}w=800 800w, ${u}${sep}w=1200 1200w`;
      }

      function markLowres(imgEl){
        if(!imgEl) return;
        if(imgEl.naturalWidth && imgEl.naturalWidth < 400){
          const card = imgEl.closest('.card');
          if(card) card.classList.add('lowres');
        }
      }

      let currentDetailsSize = null;

      const detailsModal = document.getElementById('details-modal');
      const detailsImg   = document.getElementById('details-img');
      const detailsBadge = document.getElementById('details-badge');
      const detailsTitle = document.getElementById('details-title');
      const detailsCat   = document.getElementById('details-category');
      const detailsPrice = document.getElementById('details-price');
      const detailsDesc  = document.getElementById('details-desc');
      const detailsSpecs = document.getElementById('details-specs');
      const detailsSizes = document.getElementById('details-sizes');
      const btnDetailsAdd= document.getElementById('details-add');
      const btnDetailsBuy= document.getElementById('details-buy');
      const detailsLink  = document.getElementById('details-link');
      document.getElementById('details-close').addEventListener('click', closeDetails);

      function openDetails(id){
        const p = products.find(x=>x.id===id);
        if(!p) return;

        currentDetailsSize = null;

        const imgUrl = safeUrl(p.img)||'';
        detailsImg.src = imgUrl;
        detailsImg.alt = p.title;
        const onSale = p.id === 'boots_tan_brown_square_toe';
        detailsBadge.style.display = onSale ? 'inline-block' : 'none';

        detailsTitle.textContent = p.title;
        detailsCat.textContent   = (p.category||'').toUpperCase();
        detailsPrice.textContent = fmt((p.priceCents||0)/100);
        detailsDesc.textContent  = p.details?.description || '';

        detailsSpecs.innerHTML = '';
        const specs = p.details?.specs || {};
        Object.keys(specs).forEach(k=>{
          const box = document.createElement('div');
          box.innerHTML = `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(specs[k])}`;
          detailsSpecs.appendChild(box);
        });

        detailsSizes.innerHTML = '';
        const sizesArr = p.details?.sizes || [];
        sizesArr.forEach(sz=>{
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'size-chip';
          chip.textContent = sz;

          chip.addEventListener('click', ()=>{
            currentDetailsSize = sz;
            [...detailsSizes.querySelectorAll('.size-chip')].forEach(c=>{
              c.classList.toggle('active', c === chip);
            });
          });

          detailsSizes.appendChild(chip);
        });

        btnDetailsAdd.onclick = ()=>{
          if (p.details?.sizes?.length && !currentDetailsSize){
            showToast('Please choose a size first.');
            return;
          }
          addToCart(p.id, 1, currentDetailsSize);
        };

        btnDetailsBuy.onclick = ()=>{
          if (p.details?.sizes?.length && !currentDetailsSize){
            showToast('Please choose a size first.');
            return;
          }
          buyNow(p.id, currentDetailsSize);
        };

        detailsLink.href = p.details?.url || '#';

        detailsModal.classList.add('open');
        detailsModal.setAttribute('aria-hidden','false');
        trapFocus(detailsModal);
      }
      function closeDetails(){
        detailsModal.classList.remove('open');
        detailsModal.setAttribute('aria-hidden','true');
      }

      function showTrophyToast(_anchorEl, text = "Rise of Honor", customImg = null) {
        try{
          const existing = document.querySelector('.trophy-toast');
          if(existing) existing.remove();
          
          const isLowHonor = (text === 'Low Honor');
          const audioPath = isLowHonor ? 'assets/RDR2 Low honor sound effect(MP3_160K).mp3' : 'assets/RDR2 High Honor sound effect(MP3_160K).mp3';
          const sfx = new Audio(audioPath);
          sfx.volume = 1.0;
          
          if (!isLowHonor) {
            // تخطي البداية والبدء من المقطع المميز (بالثواني) لتروفي الهونر العالي فقط
            sfx.currentTime = 0.8; 
          }
          sfx.play().catch(e => console.log('Audio play error:', e));

          const imgSrc = customImg || "https://i.pinimg.com/736x/09/aa/b2/09aab2cda10ceccd6a5835a8204c9995.jpg";
          const toast = document.createElement('div');
          toast.className = 'trophy-toast';
          if (isLowHonor) {
            toast.style.background = 'rgba(80, 10, 10, 0.95)';
            toast.style.border = '1px solid #c44';
          }
          toast.innerHTML = `
            <img class="tt-img" src="${imgSrc}" alt="Honor" />
            <div>
              <div class="tt-title" style="${isLowHonor ? 'color:#fbb;' : ''}">${text}</div>
            </div>
          `;
          document.body.appendChild(toast);
          
          // إخفاء الإشعار وإيقاف الصوت في نفس اللحظة (بعد 2.5 ثانية) ليتزامنا معاً
          setTimeout(() => { 
            if (toast && toast.parentNode) toast.remove(); 
            try { sfx.pause(); } catch(e){}
          }, 2500);
        }catch{}
      }
      window.showTrophyToast = showTrophyToast;

      function renderProducts(){
        const grid = document.getElementById('products-grid');
        grid.innerHTML='';
        const list = filterSearchSort(products);
        if(list.length===0){ grid.innerHTML=`<div class="muted">No products match your filters.</div>`; return; }

        list.forEach(p=>{
          const card = document.createElement('div');
          card.className='card';
          card.setAttribute('data-id', p.id);
          const imgUrl = safeUrl(p.img) || '';
          card.setAttribute('data-cat', p.category||'');

  let saleBadge = '';
          if (p.id === 'boots_tan_brown_square_toe'){
            saleBadge = `<div style="position:absolute;top:10px;left:10px;background:#A16B43;color:#fff;font-weight:800;padding:4px 8px;border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.25);font-size:12px;">SALE</div>`;
          }

          const bnplHtml = (p.meta && p.meta.bnpl)
            ? `<div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                 ${escapeHtml(p.meta.installments)}<br>
                 <span>${escapeHtml(p.meta.monthlyFrom)} with </span>
                 <button type="button" class="icon-btn" style="padding:4px 8px;border-color:#e7dfd7;color:#6b5a4a">Check your purchasing power</button>
                 <a href="#" class="muted" style="margin-left:6px;text-decoration:underline">See plans</a>
               </div>` : '';

          const srcset = makeSrcSet(imgUrl);
          const sizes  = "(max-width: 600px) 100vw, 220px";

          const hasStock = p.stock > 0 || typeof p.stock === 'undefined';
          const stockClass = hasStock ? 'in-stock' : '';
          const stockText  = hasStock ? `In Stock ${p.stock ? '('+p.stock+')' : ''}` : 'Out of Stock';
          const sizesText  = (p.details && p.details.sizes && p.details.sizes.length > 0) 
            ? p.details.sizes.join(', ') 
            : '';

          card.innerHTML = `
            ${saleBadge}
            <img src="${imgUrl}" ${srcset?`srcset="${srcset}"`:''} sizes="${sizes}"
                 alt="${escapeHtml(p.title)}" width="800" height="600" loading="lazy" decoding="async"
                 onload="markLowres(this)"
                 onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800';"
            />
            <div class="badge-row">
              <span class="stock-badge ${stockClass}">${stockText}</span>
              ${sizesText ? `<span class="sizes-badge">Sizes: ${escapeHtml(sizesText)}</span>` : ''}
            </div>
            <h3>${escapeHtml(p.title)}</h3>
            <div class="muted">${(p.category||'').toUpperCase()} · BRONCO Collection</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <div class="price">${fmt((p.priceCents||0)/100)}</div>
              <div class="actions">
                <button class="icon-btn" onclick="openDetails('${p.id}')" aria-label="View details" title="View details">Details</button>
                  ${hasStock 
                     ? `<button class="icon-btn" onclick="addToCart('${p.id}');" aria-label="Add to cart" title="Add to Cart">Add to Cart</button>`
                     : `<button class="icon-btn" disabled style="background:#666; cursor:not-allowed; opacity:0.6" aria-label="Out of stock" title="Out of Stock">Sold Out</button>`
                  }
                <button class="btn" onclick="buyNow('${p.id}')" aria-label="Buy now" title="Buy now">Buy now</button>
              </div>
            </div>
            ${bnplHtml}
          `;
          grid.appendChild(card);
        });
      }

      let cart = {};
      const CART_KEY='bronco_cart_v1';

      /* ===== DYNAMIC HONOR SYSTEM ===== */
      const HONOR_QTY_MAX = 10;
      let honorPoints = 0;
      let currentHonorCoupon = null;
      let lastTotalQty = 0;

      function showHonorWidgetBriefly() {
        const hw = document.getElementById('honor-widget');
        if(hw) {
          hw.style.opacity = '1';
          hw.style.transform = 'translateY(0)';
          clearTimeout(hw.hideTimeout);
          hw.hideTimeout = setTimeout(() => {
            hw.style.opacity = '0';
            hw.style.transform = 'translateY(20px)';
          }, 3500);
        }
      }

      function updateHonorUI(){
        const items = Object.values(cart);
        const totalQty = items.reduce((s,i)=> s + (i.qty || 0), 0);
        
        const isMaxed  = (totalQty >= HONOR_QTY_MAX);
        honorPoints = Math.min(100, Math.round((totalQty / HONOR_QTY_MAX) * 100));

        const fill = document.getElementById('honor-fill');
        const hint = document.getElementById('honor-hint');
        const ch_hint = document.getElementById('checkout-honor-hint');
        const perc = document.getElementById('honor-percent');
        const honorImg = document.getElementById('honor-img');
        const ARTHUR_IMG = 'https://i.pinimg.com/1200x/04/f4/0c/04f40cbb6048f7cffd0e7ac841a9db64.jpg';
        const MICAH_IMG = 'https://i.pinimg.com/736x/56/ad/e1/56ade15ffeabc2ee68bb70780c517940.jpg';
        const LOW_HONOR_TOAST_IMG = 'https://i.pinimg.com/736x/ab/56/a6/ab56a696dc5d13208855b7362ff1c394.jpg';

        if (honorImg) {
          if (totalQty > lastTotalQty) {
            honorImg.src = ARTHUR_IMG;
          } else if (totalQty < lastTotalQty && !window.isCheckoutClearing) {
            honorImg.src = MICAH_IMG;
            if (typeof window.showTrophyToast === 'function') {
               window.showTrophyToast(null, 'Low Honor', LOW_HONOR_TOAST_IMG);
            }
            showHonorWidgetBriefly();
          }
        }
        lastTotalQty = totalQty;

        if (fill) fill.style.width = honorPoints + '%';
        if (perc) perc.textContent = honorPoints + '%';

        if (isMaxed) {
          if (!currentHonorCoupon) {
            currentHonorCoupon = 'HONOR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            COUPONS[currentHonorCoupon] = { type: 'percent', value: 20, label: '20% off (Honor Maxed!)' };
            showTrophyToast(null, 'Honor Max Reached!');
            renderCouponList();
          }
          if(hint) hint.innerHTML = `🎯 <strong>Honor Maxed!</strong> A secret 20% OFF coupon is waiting in your Offers! 🎟️`;
          if(ch_hint) ch_hint.innerHTML = `🎯 <strong>Honor Maxed!</strong> A secret 20% OFF coupon is waiting in your Offers! 🎟️`;
          if(fill) fill.style.background = '#ffd700';
        } else {
          let lostCoupon = false;
          // Check if COUPONS has appliedCoupon
          if (typeof appliedCoupon !== 'undefined' && appliedCoupon) {
            appliedCoupon = null;
            lostCoupon = true;
          }
          if (currentHonorCoupon) {
            delete COUPONS[currentHonorCoupon];
            currentHonorCoupon = null;
            showHonorWidgetBriefly();
          }
          if (typeof renderCouponList === 'function') renderCouponList();
          if (lostCoupon) {
            if (typeof renderOrderSummary === 'function') renderOrderSummary();
            showToast(`⚠️ Notice: Coupon disabled because you have fewer than ${HONOR_QTY_MAX} items!`);
          }
          const remaining = (HONOR_QTY_MAX - totalQty);
          if(hint) hint.innerHTML = `🌟 Add <strong>${remaining}</strong> more items to unlock a secret 20% OFF coupon!`;
          if(ch_hint) ch_hint.innerHTML = `🌟 Add <strong>${remaining}</strong> more items to unlock a secret 20% OFF coupon!`;
          if(fill) fill.style.background = 'linear-gradient(90deg, #b8834d, #e4b363)';
        }
      }

      function loadLocalCart(){ const raw=localStorage.getItem(CART_KEY); cart = raw?JSON.parse(raw):{}; updateCartUI(); updateHonorUI(); }
      function saveLocalCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartUI(); updateHonorUI(); }

      function addToCart(id, qty = 1, size = null){
        try{
          const p = products.find(x => x.id === id);
          if(!p){
            showToast('Product not found.');
            return;
          }

          const key = size ? `${id}__${size}` : id;

          if(cart[key]) {
            cart[key].qty += qty;
          } else {
            cart[key] = {
              id: p.id,
              title: p.title,
              priceCents: p.priceCents || 0,
              img: p.img,
              qty,
              size: size || null
            };
          }

          const totalQty = Object.values(cart).reduce((s,i)=> s + (i.qty || 0), 0);
          const prevTotal = totalQty - qty;

          saveLocalCart();

          // Prevent overlapping toasts when Honor MAX is reached
          if (!(prevTotal < HONOR_QTY_MAX && totalQty >= HONOR_QTY_MAX)) {
            try{ window.showTrophyToast(null, 'Rise of Honor'); }catch{}
          }

          // إظهار رايز اوف هونر تدريجي عند الإضافة للسلة بناءً على طلبك ثم إخفاؤه
          showHonorWidgetBriefly();

        }catch(err){
          console.error('addToCart error:', err);
          try{ window.showTrophyToast(null, 'Rise of Honor'); }catch{}
        }
      }

      function changeQty(id,d){ if(!cart[id]) return; cart[id].qty+=d; if(cart[id].qty<=0) delete cart[id]; saveLocalCart(); }
      function removeItem(id){ delete cart[id]; saveLocalCart(); }
      function clearCart(){ cart={}; saveLocalCart(); }
      function renderCartItems(){
        const c=document.getElementById('cart-items'); c.innerHTML='';
        const keys=Object.keys(cart);
        if(!keys.length){ c.innerHTML=`<div class="muted">Your cart is empty.</div>`; return; }
        keys.forEach(k=>{
          const it=cart[k];
          const imgUrl=safeUrl(it.img)||'';
          const el=document.createElement('div'); el.className='cart-item';
          el.innerHTML=`<img src="${imgUrl||'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=300'}" alt="${escapeHtml(it.title)}" width="64" height="64" loading="lazy" decoding="async" />
            <div style="flex:1">
              <div style="font-weight:800">${escapeHtml(it.title)}</div>
              <div class="muted">
                ${fmt((it.priceCents||0)/100)}
                ${it.size ? ` · Size: ${escapeHtml(it.size)}` : ''}
              </div>
              <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
                <button style="padding:6px;border-radius:8px;border:1px solid #ddd" onclick="changeQty('${k}',-1)">-</button>
                <div style="min-width:28px;text-align:center">${it.qty}</div>
                <button style="padding:6px;border-radius:8px;border:1px solid #ddd" onclick="changeQty('${k}',1)">+</button>
                <button style="margin-left:8px;color:#b33;background:transparent;border:none;cursor:pointer" onclick="removeItem('${k}')">Remove</button>
              </div>
            </div>`;
          c.appendChild(el);
        });
      }
      function updateCartUI(){
        const count=Object.values(cart).reduce((s,i)=>s+i.qty,0);
        const totalCents=Object.values(cart).reduce((s,i)=>s+(i.priceCents||0)*i.qty,0);
        document.getElementById('cart-count').textContent=count;
        document.getElementById('cart-total').textContent=fmt(totalCents/100);
        renderCartItems();
      }

      // ===== Coupons =====
      const COUPONS = {};
      let appliedCoupon = null;

      const TAX_RATE = 0.05, SHIPPING_FLAT = 700, FREE_SHIPPING_THRESHOLD = 10000;

      function computeTotals(){
        const items = Object.values(cart);
        const subtotal = items.reduce((s,i)=> s + (i.priceCents||0)*i.qty, 0);

        // خصم الكوبون
        let discount = 0;
        if (appliedCoupon){
          const c = appliedCoupon;
          if (c.type === 'percent'){
            if (!c.minSubtotalCents || subtotal >= c.minSubtotalCents){
              discount = Math.round(subtotal * (c.value/100));
            }
          }
        }

        let honorDiscount = 0;
        const taxableBase = Math.max(0, subtotal - discount - honorDiscount);
        const tax = Math.round(taxableBase * TAX_RATE);

        let shipping = subtotal>=FREE_SHIPPING_THRESHOLD || subtotal===0 ? 0 : SHIPPING_FLAT;
        if (appliedCoupon && appliedCoupon.type === 'shipping' && shipping > 0){
          shipping = 0;
        }

        const total = taxableBase + tax + shipping;
        return {subtotal, discount, honorDiscount, tax, shipping, total};
      }

      function renderOrderSummary(){
        const itemsWrap=document.getElementById('order-items');
        itemsWrap.innerHTML='';

        const items=Object.values(cart);
        if(!items.length){
          itemsWrap.innerHTML=`<div class="muted">Your cart is empty.</div>`;
        }else{
          items.forEach(it=>{
            const row=document.createElement('div');
            row.className='order-item';
            const imgUrl=safeUrl(it.img)||'';
            row.innerHTML=`
              <img src="${imgUrl||'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=200'}"
                   alt="${escapeHtml(it.title)}"
                   width="56" height="56"
                   style="border-radius:8px;object-fit:cover" />
              <div style="flex:1">
                <div style="font-weight:800">${escapeHtml(it.title)}</div>
                <div class="muted">
                  Qty: ${it.qty}
                  ${it.size ? ` · Size: ${escapeHtml(it.size)}` : ''}
                </div>
              </div>
              <div style="font-weight:800">${fmt((it.priceCents||0)/100)}</div>
            `;
            itemsWrap.appendChild(row);
          });
        }

        const {subtotal, discount, honorDiscount, tax, shipping, total} = computeTotals();
        document.getElementById('t-sub').textContent  = fmt(subtotal/100);
        document.getElementById('t-tax').textContent  = fmt(tax/100);
        document.getElementById('t-ship').textContent = fmt(shipping/100);
        document.getElementById('t-total').textContent= fmt(total/100);

        const discRow = document.getElementById('discount-row');
        const discEl  = document.getElementById('t-discount');
        if (discRow && discEl){
          if (discount > 0){
            discRow.style.display = 'flex';
            discEl.textContent = `- ${fmt(discount/100)}`;
          }else{
            discRow.style.display = 'none';
            discEl.textContent = `- ${fmt(0)}`;
          }
        }

        const honorRow = document.getElementById('honor-row');
        if (honorRow) honorRow.style.display = 'none';

        // تأكيد تحديث النص
        updateHonorUI();
      }

      function openCheckout(){
        if(cartDrawer.classList.contains('open')){
          cartDrawer.classList.remove('open');
          cartOpenBtn.setAttribute('aria-expanded','false');
          cartDrawer.setAttribute('aria-hidden','true');
        }
        renderOrderSummary();
        checkoutModal.classList.add('open');
        checkoutModal.setAttribute('aria-hidden','false');
      }
      function closeCheckout(){ checkoutModal.classList.remove('open'); checkoutModal.setAttribute('aria-hidden','true') }

      function validateCheckout(){
        const name=document.getElementById('co-name').value.trim();
        const phone=document.getElementById('co-phone').value.trim();
        const address=document.getElementById('co-address').value.trim();
        const city=document.getElementById('co-city').value.trim();
        const pay=document.querySelector('input[name="pay"]:checked')?.value||'cod';
        if(!Object.keys(cart).length) return {ok:false,msg:'Cart is empty.'};
        if(!name||!phone||!address||!city) return {ok:false,msg:'Please fill name, phone, address and city.'};
        if(pay==='card'){
          const card=document.getElementById('co-card').value.replace(/\s+/g,'');
          const exp=document.getElementById('co-exp').value.trim();
          const cvc=document.getElementById('co-cvc').value.trim();
          if(card.length<12||!/^\d+$/.test(card)) return {ok:false,msg:'Invalid card number (mock).'};
          if(!/^\d{2}\/\d{2}$/.test(exp)) return {ok:false,msg:'Invalid expiry (MM/YY).'};
          if(!/^\d{3,4}$/.test(cvc)) return {ok:false,msg:'Invalid CVC.'};
        }
        return {ok:true,pay};
      }

      function randomOrderId(){ const t=Date.now().toString(36); const r=Math.random().toString(36).slice(2,8).toUpperCase(); return `ORD-${t}-${r}`; }

      async function placeOrder(){
        const resultEl=document.getElementById('order-result'); resultEl.textContent='';
        const val=validateCheckout();
        if(!val.ok){
          resultEl.innerHTML = `<div style="color:red; text-align:center; padding:10px;">${val.msg}</div>`;
          document.getElementById('place-order').disabled = false;
          document.getElementById('place-order').style.pointerEvents = 'auto';
          return;
        }
        const {subtotal,discount,honorDiscount,tax,shipping,total}=computeTotals();
        let userTok = ''; try{ let uu = JSON.parse(localStorage.getItem('bronco_user')||'{}'); userTok = uu.auth_token||''; }catch(e){}
        const order={
          auth_token: userTok,
          id: randomOrderId(),
          createdAt: new Date().toISOString(),
          items:Object.values(cart),
          totals:{subtotal,discount,honorDiscount,tax,shipping,total},
          coupon: appliedCoupon ? appliedCoupon.code : null,
          customer:{
            uid: (() => { try { return JSON.parse(localStorage.getItem('bronco_user')||'{}').uid || 0; } catch(e){ return 0; } })(),
            name:document.getElementById('co-name').value.trim(),
            phone:document.getElementById('co-phone').value.trim(),
            email:document.getElementById('co-email').value.trim(),
            address:document.getElementById('co-address').value.trim(),
            city:document.getElementById('co-city').value.trim(),
            zip:document.getElementById('co-zip').value.trim(),
          },
          payment:{ method:document.querySelector('input[name="pay"]:checked')?.value||'cod', status:'pending' },
          status:'placed',
          honorOnOrder: honorPoints
        };
        try{ 
          let req = await fetch(API_BASE_URL + '?action=order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) }); 
          let res = await req.json();
          let bountyEarned = res.addedBounty || 0;

          window.isCheckoutClearing = true;
          clearCart(); 
          window.isCheckoutClearing = false;
          renderOrderSummary();

          let earnedHtml = bountyEarned > 0 
            ? `<div style="background:rgba(196,164,132,0.1); border:1px dashed #C4A484; padding:15px; border-radius:8px; display:inline-block; margin-bottom:25px;">
                 <p style="font-size:15px; margin:0 0 5px 0;">Your Bounty Increased By:</p>
                 <h3 style="font-family:'Rye'; color:#fff; font-size:28px; margin:0;">+$${bountyEarned.toLocaleString()}</h3>
               </div>`
            : '';

          resultEl.innerHTML = `
            <div style="text-align:center; padding: 40px 10px; animation: fadeIn 0.5s ease;">
              <img src="https://i.pinimg.com/736x/a8/bd/96/a8bd96d4c0a4e6f0c6097b1c1b8bd6fc.jpg" alt="Thank You" style="width:130px; height:130px; object-fit:cover; border-radius:50%; margin-bottom:15px; border:3px solid #C4A484; box-shadow:0 0 15px rgba(196,164,132,0.4);">
              <h2 style="font-family:'Rye'; color:#C4A484; font-size:32px; margin-bottom:10px;">MUCH OBLIGED!</h2>
              <p style="font-size:18px; margin-bottom:5px;">Thank you for your order, Partner!</p>
              <p style="font-size:14px; opacity:0.8; margin-bottom:20px;">Order ID: <strong><span style="font-family:monospace; color:#C4A484">${escapeHtml(order.id)}</span></strong></p>
              ${earnedHtml}
              <br>
              <button class="btn w-full" onclick="document.getElementById('close-checkout').click()" style="padding:15px; font-size:16px;">CONTINUE RIDING</button>
            </div>
          `;
          
          // Confetti or visual flair could be added here
        } catch(e) { 
          console.warn('Order save failed:', e); 
          resultEl.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Error placing order. Please try again.</div>`;
        }
      }

      function buyNow(id, size = null){
        addToCart(id,1,size);
        openCheckout();
      }

      const authBtn=document.getElementById('auth-btn'), authModal=document.getElementById('auth-modal');
      function openAuth(){ authModal.classList.add('open'); authModal.setAttribute('aria-hidden','false'); trapFocus(authModal); }
      function closeAuth(){ authModal.classList.remove('open'); authModal.setAttribute('aria-hidden','true'); }
      authBtn.onclick=()=>{ openAuth(); }; document.getElementById('close-auth').onclick=closeAuth;

      // ======= WANTED PROFILE =======
      const profileModal = document.getElementById('profile-modal');
      const profileName  = document.getElementById('profile-name');
      const profileBounty = document.getElementById('profile-bounty');
      const profileContact = document.getElementById('profile-contact');
      const profileOrders  = document.getElementById('profile-orders');
      const userInfoNav = document.getElementById('user-info');
      userInfoNav.style.cursor = 'pointer';

      async function openProfile() {
        let fullName = userInfoNav.dataset.fullname || 'User';
        profileName.innerText = fullName.toUpperCase();
        profileContact.innerHTML = '';
        profileOrders.innerHTML = '<div class="muted" style="text-align:center">Loading…</div>';

        // حساب الـ Bounty من الاسم كقيمة افتراضية
        let bountyVal = 0;
        for(let i = 0; i < fullName.length; i++) bountyVal += fullName.charCodeAt(i) * 250;
        bountyVal = (bountyVal % 50000) + 1000;

        if(userInfoNav.dataset.uid) {
          const uid = userInfoNav.dataset.uid;
          try {
            // جلب بيانات المستخدم
            let tok = JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token || '';
            let r = await fetch('api/api.php?action=get_user&uid=' + uid + '&auth_token=' + tok);
            let d = await r.json();
            if(d.success) {
              // الاسم
              if(d.user.name) {
                fullName = d.user.name;
                profileName.innerText = fullName.toUpperCase();
                userInfoNav.dataset.fullname = fullName;
              }
              // الباوتي
              if(d.user.bounty && d.user.bounty > 0) bountyVal = d.user.bounty;
              // الصورة
              if(d.user.profilePic) {
                picContainer.innerHTML = `<img src="${d.user.profilePic}" style="width:100%;height:100%;object-fit:cover;filter:sepia(0.8) contrast(1.2);">`;
              }
              // الإيميل والهاتف
              let contactHTML = '';
              if(d.user.email) contactHTML += `<span>📧 ${escapeHtml(d.user.email)}</span>`;
              if(d.user.phone) {
                contactHTML += `<span style="display:flex;align-items:center;justify-content:center;gap:4px;">📱 <span id="display-phone">${escapeHtml(d.user.phone)}</span> <button id="edit-phone-btn" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0;">✏️</button></span>`;
              }
              profileContact.innerHTML = contactHTML;
              // prefill edit name and phone
              const editIn = document.getElementById('edit-name-input');
              if(editIn) editIn.value = d.user.name || fullName;
              const editPhoneIn = document.getElementById('edit-phone-input');
              if(editPhoneIn) editPhoneIn.value = d.user.phone || '';

              // شريط الشرف الدائري
              const hText = document.getElementById('profile-honor-text');
              const hFill = document.getElementById('profile-honor-fill');
              if(hText && hFill) {
                const hp = d.user.honorPoints ? parseInt(d.user.honorPoints) : 0;
                hText.innerText = hp + '%';
                hFill.style.width = hp + '%';
              }
              
              // تحميل العنوان من الداتا بيس
              if(d.user.address) {
                const lookoutTA = document.getElementById('lookout-address');
                if(lookoutTA) lookoutTA.value = d.user.address;
              }
            }
          } catch(e) {}

          // جلب سجل الطلبات
          try {
            let tok2 = JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token || '';
            let ro = await fetch('api/api.php?action=get_user_orders&uid=' + uid + '&auth_token=' + tok2);
            let od = await ro.json();
            if(od.success && od.orders.length > 0) {
              profileOrders.innerHTML = od.orders.map(o => {
                const total = o.totals?.total ? '$' + (o.totals.total / 100).toFixed(2) : '';
                const date  = o.createdAt ? o.createdAt.split(' ')[0] : '';
                const statusColor = o.status === 'delivered' ? '#2a7a3b' : o.status === 'cancelled' ? '#9e2a2b' : '#b8834d';
                return `<div style="background:rgba(255,255,255,0.6); border-radius:6px; padding:6px 8px; border:1px solid #e7dfd7; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; color:#3e2615;">${escapeHtml(o.id)}</div>
                    <div class="muted">${date}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700;">${total}</div>
                    <div style="color:${statusColor}; font-weight:600; text-transform:capitalize;">${escapeHtml(o.status)}</div>
                  </div>
                </div>`;
              }).join('');
            } else {
              profileOrders.innerHTML = '<div class="muted" style="text-align:center; padding:8px;">No orders yet.</div>';
            }
          } catch(e) {
            profileOrders.innerHTML = '<div class="muted" style="text-align:center; padding:8px;">Could not load orders.</div>';
          }
        }

        profileBounty.innerText = '$' + bountyVal.toLocaleString();
        profileModal.classList.add('open');
        profileModal.setAttribute('aria-hidden', 'false');
      }

      function closeProfile() {
        profileModal.classList.remove('open');
        profileModal.setAttribute('aria-hidden', 'true');
        // إخفاء الحقول
        const wrap = document.getElementById('edit-name-wrap');
        if(wrap) wrap.style.display = 'none';
        const pwrap = document.getElementById('edit-phone-wrap');
        if(pwrap) pwrap.style.display = 'none';
      }

      userInfoNav.addEventListener('click', openProfile);
      if(document.getElementById('close-profile'))
        document.getElementById('close-profile').onclick = closeProfile;
      profileModal.addEventListener('click', e => { if(e.target === profileModal) closeProfile(); });

      // ===== تعديل الاسم inline =====
      const editNameBtn    = document.getElementById('edit-name-btn');
      const editNameWrap   = document.getElementById('edit-name-wrap');
      const editNameInput  = document.getElementById('edit-name-input');
      const saveNameBtn    = document.getElementById('save-name-btn');
      const cancelNameBtn  = document.getElementById('cancel-name-btn');

      if(editNameBtn) editNameBtn.onclick = () => {
        editNameWrap.style.display = 'flex';
        editNameInput.value = userInfoNav.dataset.fullname || '';
        editNameInput.focus();
      };
      if(cancelNameBtn) cancelNameBtn.onclick = () => { editNameWrap.style.display = 'none'; };
      if(saveNameBtn) saveNameBtn.onclick = async () => {
        const newName = editNameInput.value.trim();
        if(!newName) return showToast('⚠️ Name cannot be empty.');
        const uid = userInfoNav.dataset.uid;
        if(!uid) return;
        try {
          await fetch('api/api.php?action=update_name', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({uid, name: newName, auth_token: JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token })
          });
          profileName.innerText = newName.toUpperCase();
          userInfoNav.dataset.fullname = newName;
          // تحديث localStorage
          let u = JSON.parse(localStorage.getItem('bronco_user') || '{}');
          u.displayName = newName;
          localStorage.setItem('bronco_user', JSON.stringify(u));
          editNameWrap.style.display = 'none';
          showToast('✅ Name updated!');
        } catch(e) { showToast('⚠️ Could not update name.'); }
      };

      // ===== Phone Edit Logic =====
      profileContact.addEventListener('click', (e) => {
        if(e.target.id === 'edit-phone-btn' || e.target.closest('#edit-phone-btn')) {
          document.getElementById('edit-phone-wrap').style.display = 'flex';
          document.getElementById('edit-phone-input').focus();
        }
      });
      document.getElementById('cancel-phone-btn').onclick = () => { document.getElementById('edit-phone-wrap').style.display = 'none'; };
      document.getElementById('save-phone-btn').onclick = async () => {
        const newPhone = document.getElementById('edit-phone-input').value.trim();
        if(!newPhone) return showToast('⚠️ Phone cannot be empty.');
        const uid = userInfoNav.dataset.uid;
        if(!uid) return;
        try {
          await fetch('api/api.php?action=update_phone', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({uid, phone: newPhone, auth_token: JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token })
          });
          const dispPhone = document.getElementById('display-phone');
          if(dispPhone) dispPhone.innerText = newPhone;
          document.getElementById('edit-phone-wrap').style.display = 'none';
          showToast('✅ Phone updated!');
        } catch(e) { showToast('⚠️ Could not update phone.'); }
      };

      // ===== Lookout Modal =====
      const lookoutModal   = document.getElementById('lookout-modal');
      const lookoutBtn     = document.getElementById('lookout-btn');
      const closeLookout   = document.getElementById('close-lookout');
      const saveLookoutBtn = document.getElementById('save-lookout');
      const lookoutMsg     = document.getElementById('lookout-msg');

      function openLookout()  { if(lookoutModal){ lookoutModal.classList.add('open'); lookoutModal.setAttribute('aria-hidden','false'); } }
      function closeLookoutFn(){ if(lookoutModal){ lookoutModal.classList.remove('open'); lookoutModal.setAttribute('aria-hidden','true'); } }

      if(lookoutBtn)   lookoutBtn.onclick   = openLookout;
      if(closeLookout) closeLookout.onclick  = closeLookoutFn;
      if(lookoutModal) lookoutModal.addEventListener('click', e => { if(e.target === lookoutModal) closeLookoutFn(); });

      if(saveLookoutBtn) saveLookoutBtn.onclick = async () => {
        const address = document.getElementById('lookout-address')?.value.trim();
        const uid = userInfoNav.dataset.uid;
        if(!address) { lookoutMsg.textContent = '⚠️ Please enter an address.'; return; }
        // حفظ محلي
        if(uid) localStorage.setItem('bronco_address_' + uid, address);
        // حفظ في قاعدة البيانات
        try {
          if(uid) await fetch('api/api.php?action=update_address', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({uid, address, auth_token: JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token })
          });
          lookoutMsg.innerHTML = '✅ Address saved! It will auto-fill at checkout.';
          // تعبئة حقل العنوان في الـ checkout تلقائياً
          const coAddr = document.getElementById('co-address');
          if(coAddr) coAddr.value = address;
          setTimeout(() => { lookoutMsg.textContent = ''; closeLookoutFn(); }, 1800);
        } catch(e) { lookoutMsg.textContent = '⚠️ Could not save to server, saved locally.'; }
      };

      // ===== Password Modal =====
      const passModal = document.getElementById('password-modal');
      const btnChangePass = document.getElementById('change-pass-btn');
      const closePassBtn = document.getElementById('close-pass-btn');
      const savePassBtn = document.getElementById('save-pass-btn');

      if(btnChangePass) btnChangePass.onclick = () => {
        if(passModal) {
          passModal.classList.add('open');
          passModal.setAttribute('aria-hidden','false');
          document.getElementById('pass-old').value='';
          document.getElementById('pass-new').value='';
          document.getElementById('pass-confirm').value='';
        }
      };
      const closePassFn = () => { if(passModal){ passModal.classList.remove('open'); passModal.setAttribute('aria-hidden','true'); } };
      if(closePassBtn) closePassBtn.onclick = closePassFn;
      if(passModal) passModal.addEventListener('click', e => { if(e.target === passModal) closePassFn(); });

      if(savePassBtn) savePassBtn.onclick = async () => {
        const oldPass = document.getElementById('pass-old').value;
        const newPass = document.getElementById('pass-new').value;
        const confPass = document.getElementById('pass-confirm').value;
        
        if(!oldPass || !newPass) return showToast('⚠️ Enter current and new passwords.');
        if(newPass.length < 6) return showToast('⚠️ New password must be at least 6 characters.');
        if(newPass !== confPass) return showToast('⚠️ Passwords do not match.');
        
        const uid = userInfoNav.dataset.uid;
        if(!uid) return;
        savePassBtn.disabled = true;
        savePassBtn.textContent = 'Updating...';
        
        try {
          let r = await fetch('api/api.php?action=update_password', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({uid, old_password:oldPass, new_password:newPass, auth_token: JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token })
          });
          let d = await r.json();
          if(d.success) {
            showToast('✅ Password changed successfully!');
            closePassFn();
          } else {
            showToast('⚠️ ' + (d.message || 'Update failed.'));
          }
        } catch(e) { showToast('⚠️ Error connecting to server.'); }
        
        savePassBtn.disabled = false;
        savePassBtn.textContent = 'Update Password';
      };

      // ===== تسجيل الخروج =====
      const profileLogoutBtn = document.getElementById('profile-logout');
      if (profileLogoutBtn) {
          profileLogoutBtn.onclick = () => {
              closeProfile();
              localStorage.removeItem('bronco_user');
              userInfoNav.style.display = 'none';
              userInfoNav.dataset.fullname = '';
              userInfoNav.dataset.uid = '';
              authBtn.style.display = 'flex';
              const adminLink = document.getElementById('admin-link');
              if (adminLink) adminLink.style.display = 'none';
          };
      }

      // منطق تغيير الصورة وتأثير اللون السبيا في المُلصق وتغيير الأفاتار في الشريط
      const picUpload = document.getElementById('pic-upload');
      const picContainer = document.getElementById('profile-pic-container');
      if(picUpload) {
          picUpload.addEventListener('change', function(e) {
              if (this.files && this.files[0]) {
                  const reader = new FileReader();
                  reader.onload = function(evt) {
                      const imgData = evt.target.result;
                      // تغيير صورة لوحة المطلوبين مع الفلتر البني الكلاسيكي
                      picContainer.innerHTML = `<img src="${imgData}" style="width:100%;height:100%;object-fit:cover;filter:sepia(0.8) contrast(1.2);">`;
                      
                      // تغيير أيقونة الحرف في الشريط العلوي لتصبح الصورة الشخصية الدائرية
                      userInfoNav.innerHTML = `<img src="${imgData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                      
                      if(userInfoNav.dataset.uid) {
                         fetch('api/api.php?action=update_pic', { method: 'POST', body: JSON.stringify({uid: userInfoNav.dataset.uid, profilePic: imgData, auth_token: JSON.parse(localStorage.getItem('bronco_user')||'{}').auth_token }) });
                         let u = JSON.parse(localStorage.getItem('bronco_user')||'{}');
                         u.photoURL = imgData; localStorage.setItem('bronco_user', JSON.stringify(u));
                      }
                  };
                  reader.readAsDataURL(this.files[0]);
              }
          });
      }




      // تبديل واجهات بطاقة تسجيل الدخول وإنشاء حساب
      const showRegBtn = document.getElementById('show-register'), showLoginBtn = document.getElementById('show-login');
      const showForgotBtn = document.getElementById('show-forgot'), backToLoginBtn = document.getElementById('back-to-login');
      const loginForm = document.getElementById('login-form'), regForm = document.getElementById('register-form'), forgotForm = document.getElementById('forgot-form');
      const authTitle = document.getElementById('auth-title');
      
      const resetAuthForms = () => { loginForm.style.display = 'none'; regForm.style.display = 'none'; forgotForm.style.display = 'none'; };

      if(showRegBtn) showRegBtn.onclick = () => { resetAuthForms(); regForm.style.display = 'block'; authTitle.innerText = 'Create Account'; };
      if(showLoginBtn) showLoginBtn.onclick = () => { resetAuthForms(); loginForm.style.display = 'block'; authTitle.innerText = 'Login'; };
      if(showForgotBtn) showForgotBtn.onclick = (e) => { e.preventDefault(); resetAuthForms(); forgotForm.style.display = 'block'; authTitle.innerText = 'Reset Password'; };
      if(backToLoginBtn) backToLoginBtn.onclick = () => { resetAuthForms(); loginForm.style.display = 'block'; authTitle.innerText = 'Login'; };

      // محاكاة تسجيل الدخول وتسجيل الخروج في الواجهة
      const doLogin = document.getElementById('do-login'), doRegister = document.getElementById('do-register');
      
      function updateAuthUI(user, isNewRegister = false) {
          let fullName = user.displayName || user.email.split('@')[0];
          authBtn.style.display = 'none';
          userInfoNav.dataset.fullname = fullName;
          userInfoNav.dataset.uid = user.uid;
          
          if(user.photoURL) {
            userInfoNav.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          } else {
            userInfoNav.innerText = fullName.charAt(0).toUpperCase();
          }
          userInfoNav.style.display = 'flex';
          closeAuth();
          
          const adminLink = document.getElementById('admin-link');
          if (adminLink) {
              adminLink.style.display = (user.isAdmin == 1) ? 'inline-block' : 'none';
          }

          setTimeout(() => {
             if (isNewRegister) {
                 COUPONS['WELCOME20'] = { type: 'percent', value: 20, label: '20% Off (Welcome Offer)' };
                 showHonorImageBanner('Welcome to BRONCO! Use code WELCOME20 for 20% off!', 'https://i.pinimg.com/736x/87/da/ac/87daac68427f8ebdc528cdecc76b8df8.jpg');
                 if (typeof renderCouponList === 'function') renderCouponList();
             } else {
                 showHonorImageBanner(`Welcome back, ${fullName}! Check out our new Western arrivals.`, 'https://i.pinimg.com/736x/a2/38/ac/a238acfed69dfbc17882208d2ae4eaf9.jpg');
             }
          }, 800);
      }

      function showAuthError(msg) {
          showToast('⚠️ ' + msg);
      }

      if (localStorage.getItem('bronco_user')) {
        try {
          let user = JSON.parse(localStorage.getItem('bronco_user'));
          updateAuthUI(user);
          fetch('api/api.php?action=get_user&uid=' + user.uid + '&auth_token=' + (user.auth_token||''))
            .then(r => r.json()).then(d => {
              if (d.success) {
                if (d.user.honorPoints) honorPoints = d.user.honorPoints;
                if (d.user.profilePic) userInfoNav.innerHTML = `<img src="${d.user.profilePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
              }
            });
        } catch(e) {}
      }
      
      const doForgot = document.getElementById('do-forgot');
      if(doForgot) {
          doForgot.onclick = async () => {
              const email = document.getElementById('forgot-email').value.trim();
              if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Please enter a valid email address.');
              
              doForgot.disabled = true;
              doForgot.textContent = 'Sending...';
              try {
                  await fetch('api/api.php?action=request_password_reset', {
                      method: 'POST', headers: {'Content-Type':'application/json'},
                      body: JSON.stringify({email})
                  });
                  showToast('✅ If an account matches, a reset link was sent to your email.');
                  document.getElementById('back-to-login').click();
              } catch(e) { showAuthError('Could not send request.'); }
              doForgot.disabled = false;
              doForgot.textContent = 'Send Link';
          };
      }

      if(doLogin) {
          doLogin.onclick = async () => {
             const email = document.getElementById('login-email').value.trim();
             const pass = document.getElementById('login-pass').value;
             // Validation
             if(!email) return showAuthError('Please enter your email address.');
             if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Please enter a valid email address.');
             if(!pass) return showAuthError('Please enter your password.');
             if(pass.length < 6) return showAuthError('Password must be at least 6 characters.');

             doLogin.disabled = true;
             doLogin.textContent = 'Logging in...';
             try {
                let r = await fetch('api/api.php?action=login', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({email, password:pass})
                });
                let data = await r.json();
                if(data.success) {
                    let u = { uid: data.user.id, email: data.user.email, displayName: data.user.name, photoURL: data.user.profilePic, auth_token: data.user.auth_token, isAdmin: data.user.isAdmin };
                    honorPoints = data.user.honorPoints || 0;
                    localStorage.setItem('bronco_user', JSON.stringify(u));
                    updateAuthUI(u);
                } else {
                    showAuthError(data.message || 'Login failed. Check your email and password.');
                }
             } catch(e) {
                showAuthError('Could not connect to server. Make sure XAMPP is running.');
             } finally {
                doLogin.disabled = false;
                doLogin.textContent = 'Login';
             }
          };
      }
      if(doRegister) {
          doRegister.onclick = async () => {
             const name = document.getElementById('reg-name').value.trim();
             const email = document.getElementById('reg-email').value.trim();
             const countryCode = document.getElementById('reg-country')?.value || '+964';
             const phoneRaw = document.getElementById('reg-phone')?.value.trim() || '';
             const phone = phoneRaw ? (countryCode + phoneRaw.replace(/^0/, '')) : '';
             const pass = document.getElementById('reg-pass').value;
             // Validation
             if(!name) return showAuthError('Please enter your name.');
             if(!email) return showAuthError('Please enter your email address.');
             if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Please enter a valid email address.');
             if(!phoneRaw) return showAuthError('Please enter your phone number.');
             if(!/^\d{6,15}$/.test(phoneRaw.replace(/[\s\-]/g,''))) return showAuthError('Please enter a valid phone number (digits only).');
             if(!pass) return showAuthError('Please enter a password.');
             if(pass.length < 6) return showAuthError('Password must be at least 6 characters.');

             doRegister.disabled = true;
             doRegister.textContent = 'Creating...';
             try {
                let r = await fetch('api/api.php?action=register', {
                    method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({name, email, phone, password:pass})
                });
                let data = await r.json();
                if(data.success) {
                    let u = { uid: data.user.id, email: data.user.email, displayName: data.user.name, photoURL: data.user.profilePic, auth_token: data.user.auth_token };
                    honorPoints = 0;
                    localStorage.setItem('bronco_user', JSON.stringify(u));
                    updateAuthUI(u, true);
                } else {
                    showAuthError(data.message || 'Registration failed. This email may already be in use.');
                }
             } catch(e) {
                showAuthError('Could not connect to server. Make sure XAMPP is running.');
             } finally {
                doRegister.disabled = false;
                doRegister.textContent = 'Create';
             }
          };
      }

      const cartOpenBtn=document.getElementById('cart-open'), cartDrawer=document.getElementById('cart-drawer');
      document.getElementById('close-cart').onclick=()=>cartDrawer.classList.remove('open');

      /* ربط زر Clear بالدالة */
      document.getElementById('clear-cart').addEventListener('click', clearCart);

      cartOpenBtn.onclick=()=>{
        const open=!cartDrawer.classList.contains('open');
        cartDrawer.classList.toggle('open');
        cartOpenBtn.setAttribute('aria-expanded', String(open));
        cartDrawer.setAttribute('aria-hidden', String(!open));
      };

      const couponsOpenBtn=document.getElementById('coupons-open');
      const couponsDrawer=document.getElementById('coupons-drawer');
      if(couponsOpenBtn && couponsDrawer){
        document.getElementById('close-coupons').onclick=()=>couponsDrawer.classList.remove('open');
        couponsOpenBtn.onclick=()=>{
          const open=!couponsDrawer.classList.contains('open');
          couponsDrawer.classList.toggle('open');
          couponsOpenBtn.setAttribute('aria-expanded', String(open));
          couponsDrawer.setAttribute('aria-hidden', String(!open));
        };
      }

      const checkoutModal=document.getElementById('checkout-modal');
      const checkoutBtn=document.getElementById('checkout-btn');
      const checkoutClose=document.getElementById('checkout-close');
      checkoutBtn.addEventListener('click', openCheckout);
      checkoutClose.addEventListener('click', closeCheckout);
      document.addEventListener('keydown',(e)=>{
        if(e.key==='Escape'){
          if(checkoutModal.classList.contains('open')) closeCheckout();
          if(cartDrawer.classList.contains('open')){ cartDrawer.classList.remove('open'); cartOpenBtn.setAttribute('aria-expanded','false'); cartDrawer.setAttribute('aria-hidden','true'); }
          if(couponsDrawer && couponsDrawer.classList.contains('open')){ couponsDrawer.classList.remove('open'); couponsOpenBtn.setAttribute('aria-expanded','false'); couponsDrawer.setAttribute('aria-hidden','true'); }
          if(authModal.classList.contains('open')) closeAuth();
          if(detailsModal.classList.contains('open')) closeDetails();
        }
      });

      const payRadios=document.querySelectorAll('input[name="pay"]');
      const cardFields=document.getElementById('card-fields');
      payRadios.forEach(r=>{ r.addEventListener('change', ()=>{ cardFields.style.display=(r.value==='card'&&r.checked)?'block':'none'; }); });

      // Ensure Place Order button event is always attached after DOM is loaded
      function attachPlaceOrderListener() {
        const btn = document.getElementById('place-order');
        if (btn) {
          btn.addEventListener('click', placeOrder);
        } else {
          // Try again after DOM update (e.g., modal open)
          setTimeout(attachPlaceOrderListener, 300);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachPlaceOrderListener);
      } else {
        attachPlaceOrderListener();
      }

      // ===== Coupon input handlers =====
      const couponInput   = document.getElementById('coupon-input');
      const couponApply   = document.getElementById('apply-coupon');
      const couponMessage = document.getElementById('coupon-message');
      const couponListEl  = document.getElementById('drawer-coupons-list');

      function applyCouponFromInput(){
        if (!couponInput) return;
        const raw = (couponInput.value || '').trim().toUpperCase();
        if (!raw){
          appliedCoupon = null;
          if (couponMessage) couponMessage.textContent = '';
          renderOrderSummary();
          return;
        }

        const def = COUPONS[raw];
        if (!def){
          appliedCoupon = null;
          if (couponMessage) couponMessage.textContent = 'Invalid coupon code.';
          renderOrderSummary();
          return;
        }

        appliedCoupon = {...def, code: raw};
        if (couponMessage){
          couponMessage.textContent = `Coupon applied: ${raw} — ${def.label}`;
        }
        renderOrderSummary();
      }

      // عرض الكوبونات في المكان المخصص
      function renderCouponList(){
        if (!couponListEl) return;
        couponListEl.innerHTML = '';

        const items = Object.values(cart);
        const totalQty = items.reduce((s,i) => s + (i.qty || 0), 0);
        
        if (totalQty < HONOR_QTY_MAX) {
          couponListEl.innerHTML = `
            <div style="text-align:center; padding: 40px 10px; color: #666; background:rgba(255,255,255,0.4); border-radius:10px;">
              <div style="font-size:42px; margin-bottom:12px;">🔒</div>
              <strong style="font-size:16px; color:#5c3a21; font-family:'Rye',sans-serif; letter-spacing:0.5px;">Coupons Locked!</strong>
              <p style="font-size:13px; margin-top:8px; line-height:1.4;">Add <strong>${HONOR_QTY_MAX - totalQty}</strong> more items to your cart to unlock all exclusive offers.</p>
            </div>
          `;
          return;
        }

        Object.entries(COUPONS).forEach(([code, def])=>{
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'coupon-pill';
          pill.setAttribute('data-code', code);
          pill.innerHTML = `
            <span class="coupon-pill-code">${code}</span>
            <span class="coupon-pill-label">${def.label}</span>
          `;
          pill.addEventListener('click', ()=>{
            if (couponInput){
              couponInput.value = code;
            }
            applyCouponFromInput();
            
            // إغلاق النافذة الجانبية فور اختيار الكوبون (إذا أحببت)
            if(window.innerWidth < 800) {
              if(couponsDrawer) couponsDrawer.classList.remove('open');
            }
            showToast(`✅ Coupon (${code}) saved successfully! Discount will be applied at checkout.`);
          });
          couponListEl.appendChild(pill);
        });
      }

      if (couponApply){
        couponApply.addEventListener('click', applyCouponFromInput);
      }
      if (couponInput){
        couponInput.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter'){
            e.preventDefault();
            applyCouponFromInput();
          }
        });
      }

      renderFilters();
      renderProducts();
      loadLocalCart();
      renderCouponList();

      // Premium Parallax Effect
      window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const hero = document.querySelector('.hero');
        if (hero) {
          // Adjust background position based on scroll
          const yPos = 78 + (scrolled * 0.05); // Subtle shift
          hero.style.setProperty('--parallax-y', `${yPos}%`);
          
          // Fade out hero content slightly as user scrolls down
          const heroInner = hero.querySelector('.hero-inner');
          const heroBadge = hero.querySelector('.hero-badge');
          if (heroInner) heroInner.style.opacity = Math.max(0, 1 - scrolled / 500);
          if (heroBadge) heroBadge.style.opacity = Math.max(0, 1 - scrolled / 400);
        }
      }, { passive: true });

      window.addToCart = addToCart; window.clearCart = clearCart; window.removeItem = removeItem; window.changeQty = changeQty;
      window.markLowres = markLowres; window.buyNow = buyNow; window.playAddToCartSfxYT = playAddToCartSfxYT;
      window.openDetails = openDetails; window.closeDetails = closeDetails; window.trapFocus = trapFocus;
      window.showTrophyToast = showTrophyToast; window.showHonorImageBanner = showHonorImageBanner;
    }

    if (new URLSearchParams(location.search).get('debug') === '1') {
      window.addEventListener('DOMContentLoaded', () => {
        showHonorImageBanner('Rise of Honor');
      });
    }

