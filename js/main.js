/* ═══════════════════════════════════════════════
   AGARWOODING — SHARED JAVASCRIPT
═══════════════════════════════════════════════ */

(function(){
'use strict';

// ── FILM GRAIN ────────────────────────────────
const grainCv = document.getElementById('grain');
if(grainCv){
  const gx  = grainCv.getContext('2d');
  const SZ  = 256;
  grainCv.style.width  = '100%';
  grainCv.style.height = '100%';
  grainCv.width  = SZ;
  grainCv.height = SZ;

  const FRAMES = 8;
  const frames = [];
  for(let f = 0; f < FRAMES; f++){
    const oc = document.createElement('canvas');
    oc.width = SZ; oc.height = SZ;
    const ox = oc.getContext('2d');
    const id = ox.createImageData(SZ,SZ);
    const d  = id.data;
    for(let i = 0; i < d.length; i += 4){
      const v = Math.random()*255|0;
      d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
    }
    ox.putImageData(id,0,0);
    frames.push(oc);
  }
  let fi = 0;
  setInterval(()=> gx.drawImage(frames[fi++%FRAMES],0,0), 1000/12);
}


// ── NAV SCROLL BEHAVIOUR ──────────────────────
const nav = document.querySelector('.nav');
if(nav){
  const onScroll = ()=> nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
}

// ── ACTIVE NAV LINK ───────────────────────────
(()=>{
  const path = location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const href = a.getAttribute('href') || '';
    if(path.endsWith(href) || (path === '/' && href === 'index.html'))
      a.classList.add('active');
  });
})();

// ── SCROLL PROGRESS LINE ─────────────────────
const prog = document.getElementById('prog');
if(prog){
  window.addEventListener('scroll', ()=>{
    const pct = window.scrollY / (document.body.scrollHeight - innerHeight);
    prog.style.height = (pct*100)+'%';
  }, { passive:true });
}

// ── INTERSECTION OBSERVER — reveal animations ─
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
},{ threshold:.15 });

document.querySelectorAll(
  '.reveal,.reveal-left,.reveal-right,.reveal-scale'
).forEach(el=> io.observe(el));

// ── STAGGERED CHILDREN ────────────────────────
document.querySelectorAll('[data-stagger]').forEach(parent=>{
  const children = parent.children;
  Array.from(children).forEach((c,i)=>{
    c.classList.add('reveal');
    c.style.transitionDelay = (i*.12)+'s';
    io.observe(c);
  });
});

// ── PRODUCT CARD HOVER ────────────────────────
document.querySelectorAll('[data-tilt]').forEach(card=>{
});

// ── RIPPLE EFFECT ─────────────────────────────
function initRipple(parent, canvas, rgba='212,168,67'){
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let rips=[], running=false;

  function resize(){
    canvas.width  = parent.offsetWidth  || 300;
    canvas.height = parent.offsetHeight || 300;
  }
  resize();
  window.addEventListener('resize', resize);

  parent.addEventListener('mousemove',e=>{
    const rc = parent.getBoundingClientRect();
    rips.push({ x:e.clientX-rc.left, y:e.clientY-rc.top, r:0, a:.35 });
    if(!running) draw();
  });

  function draw(){
    running=true;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    rips = rips.filter(r=>r.a>.01);
    rips.forEach(r=>{
      r.r+=3.5; r.a*=.95;
      const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.r);
      g.addColorStop(0,`rgba(${rgba},${r.a})`);
      g.addColorStop(1,`rgba(${rgba},0)`);
      ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,6.2832);
      ctx.fillStyle=g; ctx.fill();
    });
    if(rips.length) requestAnimationFrame(draw);
    else running=false;
  }
}

document.querySelectorAll('[data-ripple]').forEach(el=>{
  const cv = el.querySelector('canvas.ripple-cv');
  if(cv) initRipple(el, cv);
});

// ── CONTACT FORM SUBMIT (mailto: — opens user's mail client) ──
const form = document.getElementById('contact-form');
if(form){
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    if(!form.checkValidity()){ form.reportValidity(); return; }

    let to = 'marketing@try-n.com';
    try {
      if(window.CMS){
        const co = await window.CMS.company();
        if(co.email) to = co.email;
      }
    } catch(_) {}

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const category = form.category.value;
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    const subj = `[${category}] ${subject}`;
    const body =
`Name: ${name}
Email: ${email}
Phone: ${phone || '—'}
Category: ${category}

${message}
`;

    btn.innerHTML = '<span>Opening mail…</span>';
    btn.disabled = true;
    location.href = `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    setTimeout(()=>{
      btn.innerHTML = '<span>Mail client opened ✓</span>';
      setTimeout(()=>{ btn.innerHTML = orig; btn.disabled = false; }, 3500);
    }, 800);
  });
}

// ── CMS ADMIN BADGE ──────────────────────────
if(window.CMS){
  const legal = document.querySelector('.foot-legal');
  if(legal){
    const a = document.createElement('a');
    a.href = window.CMS.ADMIN_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Admin';
    a.style.opacity = '.55';
    legal.appendChild(a);
  }
}

// ── HAMBURGER MENU ───────────────────────────
const burger = document.getElementById('nav-burger');
const mobileMenu = document.getElementById('mobile-menu');
if(burger && mobileMenu){
  burger.addEventListener('click', ()=>{
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click', ()=>{
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

})();
