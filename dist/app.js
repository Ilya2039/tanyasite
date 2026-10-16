// Always open on the first slide: ignore a leftover #section in the link and the browser's restored scroll.
if('scrollRestoration' in history) history.scrollRestoration = 'manual';
if(location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
// Drop any service worker and caches left on this domain by the other app it briefly pointed to.
if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(list => list.forEach(r => r.unregister())).catch(() => {});
if('caches' in window) caches.keys().then(keys => keys.forEach(key => caches.delete(key))).catch(() => {});
window.addEventListener('load', () => { if(window.scrollY < 50 || document.querySelector('#welcome[open]')) window.scrollTo(0, 0); }, {once:true});
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Portrait phones get the tall artwork (assets/m/*), so effects placed in % need their own coordinates.
const portrait = window.matchMedia('(max-width: 600px)');
const isMobile = window.matchMedia('(max-width: 600px), (pointer: coarse) and (max-width: 900px)');
const rand = (min, max) => min + Math.random() * (max - min);
const pick = list => list[Math.floor(Math.random() * list.length)];

// ---------- Navigation ----------
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');
function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Открыть меню'); }
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню'); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click',closeMenu));
document.addEventListener('keydown', event => { if(event.key === 'Escape') closeMenu(); });
const navObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if(entry.isIntersecting){nav.querySelectorAll('a').forEach(link => { const active = link.hash === '#' + entry.target.id; link.classList.toggle('active',active); if(active)link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });} }); },{rootMargin:'-15% 0px -55% 0px',threshold:0});
document.querySelectorAll('main section').forEach(section => navObserver.observe(section));

// ---------- Canvas effects: confetti, cursor trail, tap bursts ----------
const fx = (() => {
  const canvas = document.querySelector('.fx-canvas');
  const ctx = canvas.getContext('2d');
  const particles = [];
  const palette = ['#ff8dbc','#ff3d8b','#ffd59a','#ffffff','#b9a2ff','#ffc2da'];
  let width = 0, height = 0, running = false, last = 0;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile.matches ? 1.5 : 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize',resize);
  function drawStar(r){ ctx.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4; const rr=i%2?r*.28:r; ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } ctx.closePath(); ctx.fill(); }
  function drawHeart(r){ ctx.beginPath(); ctx.moveTo(0,r*.35); ctx.bezierCurveTo(r,-r*.4,r*.45,-r*1.1,0,-r*.45); ctx.bezierCurveTo(-r*.45,-r*1.1,-r,-r*.4,0,r*.35); ctx.fill(); }
  function frame(now){
    const dt = Math.min((now - last) / 16.67, 3); last = now;
    ctx.clearRect(0,0,width,height);
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.life -= dt / p.maxLife;
      if(p.life <= 0 || p.y > height + 60){ particles.splice(i,1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.wobble += .1 * dt;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2.2);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.shape === 'rect'){ ctx.scale(1, Math.abs(Math.cos(p.wobble))); ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); }
      else if(p.shape === 'coin'){ ctx.scale(Math.abs(Math.cos(p.wobble)),1); ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff5'; ctx.beginPath(); ctx.arc(-p.size*.12,-p.size*.12,p.size*.22,0,Math.PI*2); ctx.fill(); }
      else if(p.shape === 'heart') drawHeart(p.size/2);
      else { ctx.globalCompositeOperation = 'lighter'; drawStar(p.size/2); }
      ctx.restore();
    }
    if(particles.length){ requestAnimationFrame(frame); } else { running = false; ctx.clearRect(0,0,width,height); }
  }
  function add(p){
    if(reducedMotion.matches || particles.length > 600) return;
    particles.push(Object.assign({rot:rand(0,6.28),vr:rand(-.15,.15),wobble:rand(0,6),drag:.985,gravity:.18,life:1,maxLife:120,shape:'rect',color:pick(palette),size:10},p));
    if(!running){ running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  return {
    confetti(x, y, count = 120, spread = 1){
      for(let i=0;i<count;i++){ const a = rand(-Math.PI, 0) ; const v = rand(6, 16) * spread;
        add({x, y, vx:Math.cos(a)*v*rand(.4,1.2), vy:Math.sin(a)*v - rand(2,6), size:rand(7,13), maxLife:rand(110,190), shape:pick(['rect','rect','rect','heart','star'])}); }
    },
    rain(count = 80){
      for(let i=0;i<count;i++) add({x:rand(0,width), y:rand(-height*.6,-20), vx:rand(-1,1), vy:rand(2,5), gravity:.12, size:rand(8,14), maxLife:rand(200,280), shape:pick(['rect','rect','heart','coin'])});
    },
    coins(x, y, count = 40){
      for(let i=0;i<count;i++){ const a = rand(-Math.PI*.85, -Math.PI*.15); const v = rand(8, 15);
        add({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, size:rand(14,22), color:pick(['#ffd36b','#ffc14d','#ffe7a3']), shape:'coin', gravity:.32, maxLife:160}); }
    },
    burst(x, y, count = 16){
      for(let i=0;i<count;i++){ const a = Math.PI*2*i/count + rand(-.2,.2); const v = rand(2.5,6);
        add({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, gravity:.05, drag:.94, size:rand(8,15), maxLife:rand(40,70), shape:pick(['star','star','heart'])}); }
    },
    trail(x, y){
      add({x:x+rand(-4,4), y:y+rand(-4,4), vx:rand(-.6,.6), vy:rand(-.4,.6), gravity:.02, drag:.96, size:rand(5,11), maxLife:rand(30,50), shape:'star', color:pick(['#ffd6ea','#ffffff','#ffd59a','#ff9fcb'])});
    }
  };
})();

let lastTrail = 0, lastTrailPos = [0,0];
window.addEventListener('pointermove', event => {
  if(event.pointerType !== 'mouse') return;
  const now = performance.now();
  const dist = Math.hypot(event.clientX - lastTrailPos[0], event.clientY - lastTrailPos[1]);
  if(now - lastTrail > 28 && dist > 6){ fx.trail(event.clientX, event.clientY); lastTrail = now; lastTrailPos = [event.clientX, event.clientY]; }
}, {passive:true});
document.querySelector('main').addEventListener('pointerdown', event => {
  if(event.target.closest('a,button,input,label')) return;
  fx.burst(event.clientX, event.clientY, event.pointerType === 'mouse' ? 14 : 12);
});

// ---------- Generated scene decorations ----------
function makeSpan(className, vars, text){
  const el = document.createElement('span'); el.className = className;
  Object.entries(vars).forEach(([key,value]) => el.style.setProperty('--' + key, value));
  if(text) el.textContent = text; return el;
}
const sparkleColors = {home:['#ffe1fa','#c9d4ff'], invitation:['#ead6ff','#ffc3df'], date:['#fa78b2','#ffd1e6'], program:['#ffffff','#ffc2d9'], 'dress-code':['#fff6d6','#ffffff'], wishlist:['#ffffff','#ffe2ec']};
// Keep floating bits out of the wishlist claw's column (about 20–58% across).
const clawFreeX = (min, max) => { const [a, b] = portrait.matches ? [20, 74] : [20, 58]; let x; do x = rand(min, max); while(x > a && x < b); return x; };
document.querySelectorAll('.sparkles').forEach(layer => {
  const symbols = layer.dataset.symbols.split(' ');
  const id = layer.closest('section').id;
  const count = isMobile.matches ? 5 : 16;
  for(let i=0;i<count;i++){
    layer.append(makeSpan('sparkle',{x:(id === 'wishlist' ? clawFreeX(3,95) : rand(3,95))+'%', y:rand(8,90)+'%', size:rand(14,40)+'px', dur:rand(5,10)+'s', delay:-rand(0,10)+'s', c:pick(sparkleColors[id] || ['#ffc3df'])}, pick(symbols)));
  }
});
// Twinkling stars only in the sky above the pink table.
const twinkles = document.querySelector('.twinkles');
for(let i=0;i<(isMobile.matches ? 18 : 60);i++){
  const x = rand(1,99); const maxY = portrait.matches ? 58 : 54 + x * .2;
  twinkles.append(makeSpan('tw',{x:x+'%', y:rand(2,maxY)+'%', s:rand(1.5,3.5)+'px', dur:rand(1.8,4.5)+'s', delay:-rand(0,4)+'s'}));
}
const bubbles = document.querySelector('.bubbles');
for(let i=0;i<10;i++) bubbles.append(makeSpan('bubble',{x:(portrait.matches ? rand(44,56) : rand(45,53))+'%', s:rand(.3,.7)+'%', dur:rand(2.5,4.5)+'s', delay:-rand(0,4)+'s', dx:rand(-12,12)+'px', rise:rand(40,90)+'px'}));
// Marquee bulbs around the machine, ordered as a loop for the chase.
const bulbs = document.querySelector('.bulbs');
function placeBulbs(){
  const [bulbY, left, right] = portrait.matches
    ? [[38.87,41.53,44.22,46.89,49.57,52.27,54.9], 13.8, 85.9]
    : [[38.1,44.1,50.1,56,61.9,67.9], 20.15, 79.4];
  bulbs.replaceChildren();
  [...bulbY.slice().reverse().map(y => [left,y]), ...bulbY.map(y => [right,y])].forEach(([x,y],i) => bulbs.append(makeSpan('bulb',{x:x+'%', y:y+'%', i})));
}
placeBulbs(); portrait.addEventListener('change', placeBulbs);
// Hearts floating up from the pile.
const rising = document.querySelector('.rising');
for(let i=0;i<(isMobile.matches ? 5 : 16);i++) rising.append(makeSpan('rise',{x:clawFreeX(2,95)+'%', size:rand(18,46)+'px', dur:rand(7,13)+'s', delay:-rand(0,13)+'s', dx:rand(-40,40)+'px', c:pick(['#ff2e63','#ff5c8a','#ffffff','#ff8fb1','#e8124f'])}, '♥'));

// ---------- Scroll reveal, parallax, pointer depth ----------
const scenes = [...document.querySelectorAll('.scene')];
const progress = document.querySelector('.progress');
const sceneState = new Map(scenes.map(scene => [scene,{mx:0,my:0,tx:0,ty:0,inner:scene.querySelector('.stage-inner')}]));
const viewObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  entry.target.classList.toggle('in-view', entry.isIntersecting);
  if(entry.isIntersecting && entry.target.id !== 'home') entry.target.classList.add('revealed');
}),{threshold:.18});
scenes.forEach(scene => viewObserver.observe(scene));
const upObserver = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('shown'); upObserver.unobserve(entry.target); } }),{threshold:.2});
document.querySelectorAll('.reveal-up').forEach(el => upObserver.observe(el));

scenes.forEach(scene => {
  const state = sceneState.get(scene);
  scene.addEventListener('pointermove', event => {
    if(event.pointerType !== 'mouse') return;
    const rect = scene.getBoundingClientRect();
    state.tx = (event.clientX - rect.left) / rect.width - .5;
    state.ty = (event.clientY - rect.top) / rect.height - .5;
    if(scene.id === 'home'){ scene.style.setProperty('--lx', (event.clientX - rect.left) + 'px'); scene.style.setProperty('--ly', (event.clientY - rect.top) + 'px'); }
  });
  scene.addEventListener('pointerleave', () => { state.tx = 0; state.ty = 0; });
});

function tick(){
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
  // Parallax is a desktop nicety; phones skip the per-frame layout work.
  if(!reducedMotion.matches && !isMobile.matches){
    sceneState.forEach((state, scene) => {
      if(!scene.classList.contains('in-view')) return;
      const rect = scene.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - vh / 2) / vh;
      state.mx += (state.tx - state.mx) * .06; state.my += (state.ty - state.my) * .06;
      const height = state.inner.offsetHeight;
      const y = Math.max(-1, Math.min(1, offset)) * height * -.012 + state.my * -6;
      state.inner.style.translate = `${(state.mx * -10).toFixed(2)}px ${y.toFixed(2)}px`;
      scene.style.setProperty('--mx', state.mx.toFixed(3));
      scene.style.setProperty('--my', state.my.toFixed(3));
    });
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Paparazzi flashes over the outfit photos while the dress code is on screen.
const dress = document.querySelector('#dress-code');
const flashes = document.querySelector('.flashes');
const photoAreas = () => portrait.matches ? [[3,48,47,66],[50,95,47,64]] : [[3,38,56,92],[42,71,51,92]];
(function flashLoop(){
  if(dress.classList.contains('in-view') && !reducedMotion.matches && document.visibilityState === 'visible'){
    const [x0,x1,y0,y1] = pick(photoAreas());
    const flash = makeSpan('flash',{x:rand(x0,x1)+'%', y:rand(y0,y1)+'%', s:rand(6,11)+'%'});
    flashes.append(flash); setTimeout(() => flash.remove(), 750);
  }
  setTimeout(flashLoop, rand(350, 1300));
})();

// ---------- Countdown ----------
const partyStart = new Date('2026-11-15T18:45:00+03:00');
const countdown = document.querySelector('.countdown');
const cdNums = Object.fromEntries([...document.querySelectorAll('.cd-num')].map(el => [el.dataset.unit, el]));
function updateCountdown(){
  const diff = partyStart - Date.now();
  if(diff <= 0){ countdown.querySelector('.countdown-title').textContent = 'Праздник уже начался ♡'; countdown.querySelector('.countdown-grid').hidden = true; return; }
  const values = {days:Math.floor(diff/864e5), hours:Math.floor(diff/36e5)%24, minutes:Math.floor(diff/6e4)%60, seconds:Math.floor(diff/1e3)%60};
  Object.entries(values).forEach(([unit,value]) => {
    const text = String(value).padStart(2,'0'); const el = cdNums[unit];
    if(el.textContent !== text){ el.textContent = text; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  });
  setTimeout(updateCountdown, 1000 - Date.now() % 1000);
}
updateCountdown();

// ---------- Welcome, curtain and the lucky machine ----------
const welcome = document.querySelector('#welcome');
const nameForm = document.querySelector('#name-form');
const nameInput = document.querySelector('#visitor-name');
const curtain = document.querySelector('.curtain');
const hero = document.querySelector('#home');
const machine = document.querySelector('.machine');
const lever = document.querySelector('.machine-lever');
const result = document.querySelector('.invitation-result');
const stage = document.querySelector('.slot-stage');
const status = document.querySelector('#slot-status');
const mobileInvitation = document.querySelector('.mobile-invitation');
const nextLink = document.querySelector('.invitation-next');
const scrollText = document.querySelector('.scroll-text');
const tracks = [...document.querySelectorAll('.reel-track')];
let accepted = false;
let spinning = false;
let guest = { name: '', salutation: 'Дорогая' };
try { const saved = JSON.parse(sessionStorage.getItem('birthday-guest')); if(saved && typeof saved.name === 'string') nameInput.value = saved.name.slice(0,32); } catch {}
// Ilya and Misha get «Дорогой», everyone else «Дорогая».
const MALE = /^(илья|илюша|илюшка|илюха|илюх|ilya|ilia|ilja|миша|мишаня|мишка|михаил|misha|mikhail|michael)$/;
const salutationFor = name => MALE.test(name.toLowerCase().replace(/ё/g, 'е').split(/[\s,.!-]+/)[0]) ? 'Дорогой' : 'Дорогая';

function populateReels(){
  tracks.forEach((track,index) => {
    track.replaceChildren();
    const symbols = ['', ...Array.from({length:23 + index * 3}, (_,n) => ['7','♠','♡','♣','✦','♦'][(n + index) % 6]), '7'];
    symbols.forEach(symbol => { const cell = document.createElement('span'); cell.className = 'reel-symbol'; cell.textContent = symbol; track.append(cell); });
    track.style.transition = 'none'; track.style.transform = 'translateY(0)';
  });
}
function centerOf(el){ const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }
function celebrate(){
  if(reducedMotion.matches) return;
  const [x,y] = centerOf(document.querySelector('.machine-screen'));
  machine.classList.remove('jackpot'); void machine.offsetWidth; machine.classList.add('jackpot');
  fx.confetti(x, y, isMobile.matches ? 90 : 160, isMobile.matches ? .7 : 1);
  fx.coins(x, y, isMobile.matches ? 18 : 36);
  setTimeout(() => fx.rain(isMobile.matches ? 40 : 90), 350);
}
function spin(){
  if(!accepted || spinning) return;
  spinning = true; lever.disabled = true;
  result.hidden = true; mobileInvitation.hidden = true; nextLink.hidden = true;
  machine.classList.remove('is-winner'); machine.classList.add('is-spinning','has-spun'); stage.hidden = false;
  status.textContent = 'Автомат крутится.';
  populateReels();
  // Two frames ensure each reel starts with an empty window before its transition.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    tracks.forEach((track,index) => {
      track.style.transition = reducedMotion.matches ? 'none' : `transform ${1500 + index * 450}ms cubic-bezier(.15,.65,.2,1)`;
      track.style.transform = `translateY(-${(track.children.length-1)*100}%)`;
    });
    setTimeout(() => {
      machine.classList.remove('is-spinning');
      status.textContent = 'Три семёрки! Твоё персональное приглашение открыто.'; machine.classList.add('is-winner'); celebrate();
      setTimeout(() => { stage.hidden = true; result.hidden = false; mobileInvitation.hidden = false; nextLink.hidden = false; spinning = false; lever.disabled = false; lever.setAttribute('aria-label','Крутить автомат ещё раз'); }, reducedMotion.matches ? 150 : 1100);
    }, reducedMotion.matches ? 100 : 2500);
  }));
}
function openCurtain(){
  document.body.classList.remove('is-locked');
  if(curtain.classList.contains('gone')) return;
  if(reducedMotion.matches){ curtain.classList.add('gone'); hero.classList.add('revealed'); return; }
  curtain.classList.add('open');
  setTimeout(() => hero.classList.add('revealed'), 250);
  setTimeout(() => fx.confetti(window.innerWidth / 2, window.innerHeight * .55, isMobile.matches ? 80 : 150, isMobile.matches ? .75 : 1.1), 650);
  setTimeout(() => curtain.classList.add('gone'), 2000);
}
nameForm.addEventListener('submit', event => {
  event.preventDefault(); const name = nameInput.value.trim().replace(/\s+/g,' ');
  if(!name){ nameInput.setCustomValidity('Напиши своё имя'); nameInput.reportValidity(); return; }
  nameInput.setCustomValidity(''); guest = {name, salutation:salutationFor(name)};
  document.querySelectorAll('.personal-greeting').forEach(el => { const name = document.createElement('b'); name.textContent = `${guest.name}!`; el.replaceChildren(`${guest.salutation} `, name); });
  scrollText.textContent = `${guest.name}, твоё приглашение`;
  try { sessionStorage.setItem('birthday-guest', JSON.stringify(guest)); } catch {}
  const firstTime = !accepted;
  accepted = true; welcome.close();
  if(firstTime) openCurtain(); else fx.burst(window.innerWidth / 2, window.innerHeight / 2, 24);
});
nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
welcome.addEventListener('cancel', event => { if(!accepted) event.preventDefault(); });

// ---------- The lever: drag the knob down like a real one-armed bandit ----------
const leverArm = document.querySelector('.lever-arm');
const leverKnob = document.querySelector('.lever-knob');
// Geometry in the SVG's own units: 160×90 on the wide art, 100×216.5 on the tall phone art.
const leverSvg = document.querySelector('.lever-svg');
let GEO;
function leverGeometry(){
  const tall = portrait.matches;
  const vb = tall ? {w:100, h:216.53} : {w:160, h:90};
  const at = (x, y) => ({x:x * vb.w / 100, y:y * vb.h / 100});
  const root = tall ? at(91.4, 44.1) : at(84.4, 48.6), rest = tall ? at(91.2, 34.1) : at(85.1, 30.2);
  GEO = {vb, root, rest, arm:Math.hypot(rest.x - root.x, rest.y - root.y), radius:tall ? 4.2 : 3.52, width:tall ? 2.5 : 1.5, travel:tall ? .2 : .36};
  leverSvg.setAttribute('viewBox', `0 0 ${vb.w} ${vb.h}`);
}
leverGeometry();
const MAX_ANGLE = 150 * Math.PI / 180;
let leverPos = 0, leverVel = 0, leverAnim = 0, drag = null;
// The knob travels straight down (the arm tips toward the viewer), then springs back up.
function renderLever(p){
  const theta = p * MAX_ANGLE;
  const near = Math.max(0, Math.sin(theta));
  const {root, rest, arm, vb} = GEO;
  const knob = {x:root.x + (rest.x - root.x) * Math.cos(theta), y:root.y - Math.cos(theta) * arm};
  const radius = GEO.radius * (1 + .32 * near);
  const w = GEO.width * (1 + .25 * near) / 2;
  leverArm.setAttribute('points', `${root.x - w},${root.y} ${root.x + w},${root.y} ${knob.x + w},${knob.y} ${knob.x - w},${knob.y}`);
  leverKnob.setAttribute('cx', knob.x); leverKnob.setAttribute('cy', knob.y); leverKnob.setAttribute('r', radius);
  lever.style.left = (knob.x / vb.w * 100) + '%'; lever.style.top = (knob.y / vb.h * 100) + '%';
  lever.style.width = (radius * 2 / vb.w * 100) + '%';
}
function stopLeverAnim(){ cancelAnimationFrame(leverAnim); leverAnim = 0; }
function setLever(p){ leverPos = p; renderLever(p); }
function tweenLever(to, duration){
  stopLeverAnim();
  return new Promise(resolve => {
    const from = leverPos, start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      setLever(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if(t < 1) leverAnim = requestAnimationFrame(step); else { leverAnim = 0; resolve(); }
    };
    leverAnim = requestAnimationFrame(step);
  });
}
// A damped spring back to rest, overshooting slightly like a real lever.
function springBack(){
  stopLeverAnim();
  if(reducedMotion.matches){ setLever(0); return; }
  leverVel = 0;
  const step = () => {
    leverVel = (leverVel + (0 - leverPos) * .14) * .8;
    setLever(Math.max(-.08, leverPos + leverVel));
    if(Math.abs(leverPos) > .002 || Math.abs(leverVel) > .002) leverAnim = requestAnimationFrame(step);
    else { setLever(0); leverAnim = 0; }
  };
  leverAnim = requestAnimationFrame(step);
}
function buzz(ms){ try { navigator.vibrate && navigator.vibrate(ms); } catch {} }
async function pullThrough(){
  machine.classList.add('is-pulling');
  await tweenLever(1, reducedMotion.matches ? 0 : 110);
  buzz(40); spin();
  machine.classList.remove('is-pulling');
  setTimeout(springBack, 120);
}
lever.addEventListener('pointerdown', event => {
  if(!accepted || spinning) return;
  event.preventDefault();
  lever.setPointerCapture(event.pointerId);
  stopLeverAnim();
  const travel = machine.getBoundingClientRect().height * GEO.travel;
  drag = {id:event.pointerId, y:event.clientY, from:leverPos, travel, moved:0, notch:0};
  machine.classList.add('is-pulling');
});
lever.addEventListener('pointermove', event => {
  if(!drag || event.pointerId !== drag.id) return;
  const dy = event.clientY - drag.y;
  drag.moved = Math.max(drag.moved, Math.abs(dy));
  setLever(Math.max(0, Math.min(1, drag.from + dy / drag.travel)));
  const notch = Math.floor(leverPos * 4);
  if(notch > drag.notch) buzz(6);
  drag.notch = notch;
});
function releaseLever(event){
  if(!drag || event.pointerId !== drag.id) return;
  const moved = drag.moved; drag = null;
  machine.classList.remove('is-pulling');
  if(leverPos >= .78){ pullThrough(); return; }
  if(moved < 4){ hintPull(); return; }
  springBack();
}
lever.addEventListener('pointerup', releaseLever);
lever.addEventListener('pointercancel', releaseLever);
// A plain click only teases the lever; keyboard users get the full pull.
lever.addEventListener('click', event => { if(event.detail === 0 && accepted && !spinning) pullThrough(); });
const leverHint = document.querySelector('.lever-hint');
async function hintPull(){
  machine.classList.remove('has-spun');
  leverHint.textContent = 'Тяни вниз ↓';
  await tweenLever(.22, 180); springBack();
}
// While nobody has pulled it yet, the lever twitches now and then to invite a pull.
setInterval(() => {
  if(reducedMotion.matches || drag || spinning || leverAnim || machine.classList.contains('has-spun') || !machine.closest('.scene').classList.contains('in-view')) return;
  tweenLever(.14, 260).then(springBack);
}, 3200);
renderLever(0);
portrait.addEventListener('change', () => { leverGeometry(); renderLever(leverPos); });
populateReels(); welcome.showModal();

// ---------- Wishlist claw: the empty claw dives into the hearts, pulls a prize out, guests can book it ----------
{
  const rig = document.querySelector('.claw-rig');
  const arms = [rig.querySelector('.claw-arm.left'), rig.querySelector('.claw-arm.right')];
  const slot = rig.querySelector('.claw-prize');
  const scene = rig.closest('.scene');
  const card = scene.querySelector('.prize-card');
  const title = card.querySelector('.prize-title');
  const bookButton = card.querySelector('.prize-book');
  const nextButton = card.querySelector('.prize-next');
  const status = scene.querySelector('.prize-status');
  const splitButton = card.querySelector('.prize-split');
  const splitCount = card.querySelector('.prize-split-count');
  const splitDialog = document.querySelector('#split-dialog');
  const splitForm = splitDialog.querySelector('form');
  const splitError = splitDialog.querySelector('.book-error');
  const dialog = document.querySelector('#book-dialog');
  const dialogError = dialog.querySelector('.book-error');
  const mine = scene.querySelector('.my-bookings');
  // How far the rig drops so the claws bury into the hearts (in % of the scene's height).
  const depth = () => portrait.matches ? '0 22.5%' : '0 45%';
  const HOLD = 7000;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const ready = () => scene.classList.contains('in-view') && document.visibilityState === 'visible';
  const move = (el, frames, duration, easing = 'ease-in-out') => el.animate(frames, {duration, easing, fill:'forwards'}).finished;

  let items = [], reserved = new Set(), index = -1, current = null;
  let item = slot.querySelector('img');

  // Bookings made in this browser, so the guest can see and cancel them.
  const loadMine = () => { try { return JSON.parse(localStorage.getItem('wishlist-bookings')) || []; } catch { return []; } };
  const saveMine = list => { try { localStorage.setItem('wishlist-bookings', JSON.stringify(list)); } catch {} };
  function renderMine(){
    const list = loadMine().filter(b => items.some(i => i.id === b.id));
    const ul = mine.querySelector('ul'); ul.replaceChildren();
    list.forEach(b => {
      const data = items.find(i => i.id === b.id);
      const li = document.createElement('li');
      const icon = Object.assign(document.createElement('img'), {src:data.img, alt:'', loading:'lazy'});
      const info = document.createElement('div');
      const link = Object.assign(document.createElement('a'), {className:'booked-title', href:data.url, target:'_blank', rel:'noopener', textContent:data.title});
      info.append(link);
      if(data.price) info.append(Object.assign(document.createElement('span'), {className:'booked-price', textContent:data.price}));
      const cancel = Object.assign(document.createElement('button'), {type:'button', textContent:'Отменить бронь'});
      cancel.addEventListener('click', async () => {
        if(!confirm(`Отменить бронь «${data.title}»? Подарок снова станет доступен другим.`)) return;
        try {
          const res = await fetch('/api/cancel', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:b.id, token:b.token})});
          if(!res.ok && res.status !== 403) throw new Error();
          saveMine(loadMine().filter(x => x.id !== b.id)); reserved.delete(b.id); renderMine();
        } catch { alert('Не получилось отменить бронь. Попробуй ещё раз чуть позже.'); }
      });
      info.append(cancel); li.append(icon, info); ul.append(li);
    });
    mine.hidden = !list.length;
  }

  async function refresh(){
    try {
      const res = await fetch('/api/reservations', {cache:'no-store'});
      if(res.ok) reserved = new Set((await res.json()).reserved);
    } catch {}
  }
  const available = () => items.filter(i => !reserved.has(i.id));
  function pickNext(){
    for(let step = 1; step <= items.length; step++){
      const candidate = items[(index + step) % items.length];
      if(!reserved.has(candidate.id)){ index = items.indexOf(candidate); return candidate; }
    }
    return null;
  }

  // Swing both claws about their knuckles: positive opens, 0 is the grip on a prize.
  let spread = 0;
  const grip = (to, duration) => {
    const from = spread; spread = to;
    return Promise.all(arms.map((arm, i) => {
      const dir = i ? -1 : 1;
      return move(arm, [{rotate:`${from * dir}deg`},{rotate:`${to * dir}deg`}], duration, 'cubic-bezier(.3,.7,.3,1)');
    }));
  };

  // While a prize hangs in the claw: show its card and wait for "next", a booking, or the timeout.
  let decide = null;
  const hovering = () => card.matches(':hover') || card.contains(document.activeElement) || dialog.open || splitDialog.open;
  function waitForGuest(){
    return new Promise(resolve => {
      decide = resolve;
      let left = HOLD;
      const tick = setInterval(() => {
        if(!hovering() && ready()) left -= 250;
        if(left <= 0){ clearInterval(tick); decide = null; resolve('next'); }
      }, 250);
      const done = result => { clearInterval(tick); decide = null; resolve(result); };
      decide = done;
    });
  }
  function showCard(prize){
    title.textContent = prize.title; title.href = prize.url;
    card.hidden = false; status.textContent = '';
    splitButton.hidden = !prize.split; splitCount.textContent = '';
    if(prize.split) loadSplits(prize).then(people => { if(current === prize) splitCount.textContent = people.length || ''; });
  }

  // Splitting the price of a pricey gift: guests leave a contact and find each other.
  const loadMySplits = () => { try { return JSON.parse(localStorage.getItem('wishlist-splits')) || []; } catch { return []; } };
  const saveMySplits = list => { try { localStorage.setItem('wishlist-splits', JSON.stringify(list)); } catch {} };
  async function loadSplits(prize){
    try {
      const res = await fetch(`/api/splits?id=${encodeURIComponent(prize.id)}`, {cache:'no-store'});
      return res.ok ? (await res.json()).people : [];
    } catch { return []; }
  }
  function contactLink(contact){
    const handle = contact.match(/^(?:@|https?:\/\/t\.me\/|t\.me\/)([\w\d_]{3,})$/i);
    if(handle) return `https://t.me/${handle[1]}`;
    const digits = contact.replace(/[^\d+]/g, '');
    if(/^\+?\d{10,13}$/.test(digits)) return `tel:${digits}`;
    return null;
  }
  let splitPrize = null;
  async function renderSplits(){
    const prize = splitPrize;
    const people = await loadSplits(prize);
    if(prize !== splitPrize) return;
    const mineHere = loadMySplits().filter(m => m.id === prize.id);
    const box = splitDialog.querySelector('.split-people');
    const ul = box.querySelector('ul'); ul.replaceChildren();
    people.forEach(person => {
      const li = document.createElement('li');
      const href = contactLink(person.contact);
      const contact = href ? Object.assign(document.createElement('a'), {href, target:'_blank', rel:'noopener', textContent:person.contact}) : Object.assign(document.createElement('span'), {textContent:person.contact});
      li.append(Object.assign(document.createElement('b'), {textContent:person.name}), contact);
      const own = mineHere.find(m => m.name === person.name && m.contact === person.contact);
      if(own){
        const remove = Object.assign(document.createElement('button'), {type:'button', textContent:'убрать'});
        remove.addEventListener('click', async () => {
          try {
            await fetch('/api/split/cancel', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:prize.id, token:own.token})});
            saveMySplits(loadMySplits().filter(m => m.token !== own.token)); renderSplits();
          } catch {}
        });
        li.append(remove);
      }
      ul.append(li);
    });
    box.hidden = !people.length;
    if(current === prize) splitCount.textContent = people.length || '';
  }
  splitButton.addEventListener('click', () => {
    if(!current) return;
    splitPrize = current;
    splitDialog.querySelector('.split-name').textContent = current.title;
    splitForm.elements.name.value = splitForm.elements.name.value || guest.name;
    splitError.hidden = true;
    splitDialog.showModal(); renderSplits();
  });
  splitDialog.querySelector('.book-cancel').addEventListener('click', () => splitDialog.close());
  splitForm.addEventListener('submit', async event => {
    event.preventDefault();
    const name = splitForm.elements.name.value.trim(), contact = splitForm.elements.contact.value.trim();
    if(!name || !contact || !splitPrize) return;
    try {
      const res = await fetch('/api/split', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:splitPrize.id, name, contact})});
      if(!res.ok) throw new Error();
      const {token} = await res.json();
      saveMySplits([...loadMySplits(), {id:splitPrize.id, token, name:name.replace(/\s+/g, ' '), contact:contact.replace(/\s+/g, ' ')}]);
      splitForm.elements.contact.value = '';
      splitError.hidden = true;
      await renderSplits();
    } catch {
      splitError.textContent = 'Не получилось сохранить контакт. Попробуй ещё раз чуть позже.';
      splitError.hidden = false;
    }
  });
  nextButton.addEventListener('click', () => decide && decide('next'));
  bookButton.addEventListener('click', () => {
    if(!current) return;
    dialog.querySelector('.book-name').textContent = current.title;
    dialog.querySelector('.book-guest').textContent = guest.name || 'гость';
    dialogError.hidden = true;
    dialog.showModal();
  });
  dialog.addEventListener('close', async () => {
    if(dialog.returnValue !== 'confirm' || !current) return;
    const prize = current;
    try {
      const res = await fetch('/api/reserve', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:prize.id, name:guest.name})});
      if(res.status === 409){ reserved.add(prize.id); status.textContent = 'Упс, этот подарок только что забронировали ♡'; decide && decide('gone'); return; }
      if(!res.ok) throw new Error();
      const {token} = await res.json();
      saveMine([...loadMine().filter(b => b.id !== prize.id), {id:prize.id, token}]);
      reserved.add(prize.id); renderMine();
      status.textContent = `«${prize.title}» — забронировано за тобой ♡`;
      decide && decide('booked');
    } catch {
      dialogError.textContent = 'Не получилось забронировать. Проверь интернет и попробуй ещё раз.';
      dialogError.hidden = false; dialog.showModal();
    }
  });

  (async () => {
    try { items = await (await fetch('wishlist.json', {cache:'no-cache'})).json(); } catch { return; }
    await refresh(); renderMine();
    setInterval(refresh, 20000);
    while(true){
      while(!ready()) await pause(400);
      if(current){
        showCard(current);
        const sway = reducedMotion.matches ? null : item.animate([{rotate:'0deg'},{rotate:'3deg'},{rotate:'-2.5deg'},{rotate:'1.5deg'},{rotate:'0deg'}], {duration:2400, iterations:Infinity, easing:'ease-in-out'});
        const result = await waitForGuest();
        sway?.cancel(); card.hidden = true;
        // Poof: the prize is taken.
        const r = item.getBoundingClientRect();
        if(r.width && !reducedMotion.matches) fx.burst(r.left + r.width / 2, r.top + r.height / 2, result === 'booked' ? 40 : 14);
        await move(item, [{scale:1, opacity:1, filter:'blur(0)'},{scale:1.18, opacity:0, filter:'blur(6px)'}], reducedMotion.matches ? 1 : 480, 'ease-in');
        current = null;
        if(result !== 'next') await pause(1800);
        status.textContent = '';
      }
      await refresh();
      const prize = pickNext();
      if(!prize){
        status.textContent = 'Все подарки уже разобрали ♡ Спасибо!';
        await pause(15000);
        continue;
      }
      const next = new Image(); next.alt = ''; next.src = prize.img;
      await next.decode().catch(() => {});
      if(reducedMotion.matches){ item.replaceWith(next); item = next; current = prize; continue; }
      await pause(250);
      // Open the empty claw and send it down into the hearts.
      await grip(16, 420);
      const DEPTH = depth();
      await move(rig, [{translate:'0 0'},{translate:DEPTH}], portrait.matches ? 1400 : 1500);
      item.replaceWith(next); item = next;
      await grip(0, 380);
      await grip(-2, 120); await grip(0, 160);
      // Pull it out and lift it up, with a little wobble.
      move(item, [{rotate:'0deg'},{rotate:'-3deg', offset:.3},{rotate:'2deg', offset:.7},{rotate:'0deg'}], 1700);
      await move(rig, [{translate:DEPTH},{translate:'0 0'}], portrait.matches ? 1600 : 1700, 'cubic-bezier(.45,0,.25,1)');
      current = prize;
    }
  })();
}

// ---------- Phone hero: a video of the scorpion crawling into the glass plays over the art ----------
{
  const video = document.querySelector('.hero-video');
  const hero = video.closest('.scene');
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const ready = () => portrait.matches && !reducedMotion.matches && hero.classList.contains('in-view') && document.visibilityState === 'visible' && !welcome.open;
  // The video only loads on phones; it ends on the scorpion sitting in the glass and holds that frame.
  (async () => {
    while(!portrait.matches) await pause(1000);
    video.src = video.dataset.src;
    // With reduced motion the scorpion just sits in the glass: show the last frame.
    if(reducedMotion.matches){ video.preload = 'auto'; video.addEventListener('loadedmetadata', () => { video.currentTime = video.duration - .05; }, {once:true}); return; }
    for(;;){
      if(!ready()){ await pause(500); continue; }
      video.currentTime = 0;
      try { await video.play(); } catch { await pause(2000); continue; }
      await new Promise(resolve => video.addEventListener('ended', resolve, {once:true}));
      await pause(12000);
    }
  })();
}

// ---------- Phone Save the date: now and then the card spins fast, then slows down so it can be read ----------
{
  const spin = document.querySelector('.card-spin');
  const [front, back] = spin.querySelectorAll('.card-face');
  const scene = spin.closest('.scene');
  const TURNS = 3, DURATION = 3200, TILT = -23.62;
  const ease = t => 1 - Math.pow(1 - t, 4);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const ready = () => portrait.matches && !reducedMotion.matches && scene.classList.contains('in-view') && document.visibilityState === 'visible';
  // Turns about the card's own long axis; the plain back shows while it faces away.
  function show(angle){
    spin.style.transform = angle ? `perspective(1600px) rotate(${TILT}deg) rotateY(${angle}deg) rotate(${-TILT}deg)` : '';
    const facing = Math.cos(angle * Math.PI / 180) >= 0;
    front.style.visibility = facing ? '' : 'hidden';
    back.style.visibility = facing ? 'hidden' : 'visible';
  }
  const turn = () => new Promise(resolve => {
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / DURATION);
      show(t < 1 ? ease(t) * TURNS * 360 : 0);
      if(t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  (async () => {
    await pause(1500);
    for(;;){
      if(!ready()){ await pause(500); continue; }
      await turn();
      await pause(7000);
    }
  })();
}

// ---------- Finale: the kittens video plays only while it is on screen ----------
{
  const video = document.querySelector('.finale video');
  const sound = document.querySelector('.finale-sound');
  new IntersectionObserver(([entry]) => {
    if(entry.isIntersecting && !reducedMotion.matches) video.play().catch(() => {}); else video.pause();
  }, {threshold:.25}).observe(video);
  sound.addEventListener('click', () => {
    video.muted = !video.muted;
    sound.setAttribute('aria-pressed', String(!video.muted));
    sound.lastChild.textContent = video.muted ? ' Со звуком' : ' Без звука';
    if(!video.muted) video.play().catch(() => {});
  });
}
