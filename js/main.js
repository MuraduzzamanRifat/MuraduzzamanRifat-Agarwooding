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

// ── CUSTOM CURSOR ─────────────────────────────
const cur = document.getElementById('cur');
const dot = document.getElementById('cur-dot');
if(cur && dot){
  let cx=-100,cy=-100,dx=-100,dy=-100;

  document.addEventListener('mousemove',e=>{
    cx=e.clientX; cy=e.clientY;
    dot.style.left=cx+'px'; dot.style.top=cy+'px';
  });

  (function tick(){
    dx+=(cx-dx)*.11; dy+=(cy-dy)*.11;
    cur.style.left=dx+'px'; cur.style.top=dy+'px';
    requestAnimationFrame(tick);
  })();

  const hovers = document.querySelectorAll(
    'a,button,input,textarea,select,.pcard,.gi,.nav-dot,label,[role="button"]'
  );
  hovers.forEach(el=>{
    el.addEventListener('mouseenter',()=> cur.classList.add('h'));
    el.addEventListener('mouseleave',()=> cur.classList.remove('h'));
  });
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

// ── PRODUCT CARD 3D TILT ──────────────────────
document.querySelectorAll('[data-tilt]').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r  = card.getBoundingClientRect();
    const rx = ((e.clientY-r.top  -r.height/2)/(r.height/2))*-10;
    const ry = ((e.clientX-r.left -r.width/2) /(r.width/2))  *10;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
  });
  card.addEventListener('mouseleave',()=>{
    card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
  });
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

// ── CONTACT FORM SUBMIT ───────────────────────
const form = document.getElementById('contact-form');
if(form){
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const btn  = form.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>Sending…</span>';
    btn.disabled  = true;
    setTimeout(()=>{
      btn.innerHTML = '<span>Message Sent ✓</span>';
      form.reset();
      setTimeout(()=>{ btn.innerHTML=orig; btn.disabled=false; }, 3500);
    }, 1200);
  });
}

})();
