const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');
function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Открыть меню'); }
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню'); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click',closeMenu));
document.addEventListener('keydown', event => { if(event.key === 'Escape') closeMenu(); });
const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if(entry.isIntersecting){nav.querySelectorAll('a').forEach(link => { const active = link.hash === '#' + entry.target.id; link.classList.toggle('active',active); if(active)link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });} }); },{rootMargin:'-15% 0px -55% 0px',threshold:0});
document.querySelectorAll('main section').forEach(section => observer.observe(section));

const welcome = document.querySelector('#welcome');
const nameForm = document.querySelector('#name-form');
const nameInput = document.querySelector('#visitor-name');
const machine = document.querySelector('.machine');
const lever = document.querySelector('.machine-lever');
const result = document.querySelector('.invitation-result');
const stage = document.querySelector('.slot-stage');
const status = document.querySelector('#slot-status');
const mobileInvitation = document.querySelector('.mobile-invitation');
const nextLink = document.querySelector('.invitation-next');
const tracks = [...document.querySelectorAll('.reel-track')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let accepted = false;
let spinning = false;
let guest = { name: '', salutation: 'Дорогая' };
try { const saved = JSON.parse(sessionStorage.getItem('birthday-guest')); if(saved && typeof saved.name === 'string'){nameInput.value = saved.name.slice(0,32); if(saved.salutation === 'Дорогой')nameForm.elements.salutation.value = 'Дорогой';} } catch {}
function populateReels(){
  tracks.forEach((track,index) => {
    track.replaceChildren();
    const symbols = ['', ...Array.from({length:23 + index * 3}, (_,n) => ['7','♠','♡','♣','✦','♦'][(n + index) % 6]), '7'];
    symbols.forEach(symbol => { const cell = document.createElement('span'); cell.className = 'reel-symbol'; cell.textContent = symbol; track.append(cell); });
    track.style.transition = 'none'; track.style.transform = 'translateY(0)';
  });
}
function burst(){
  if(reducedMotion.matches)return;
  const container = document.querySelector('.win-sparks'); container.replaceChildren();
  for(let i=0;i<22;i++) { const spark=document.createElement('span'); spark.className='spark'; spark.textContent=i%3 ? '✦' : '♡'; const angle = Math.PI * 2 * i / 22; spark.style.setProperty('--x',`${Math.cos(angle) * 300}px`); spark.style.setProperty('--y',`${Math.sin(angle) * 180}px`); container.append(spark); }
  setTimeout(() => container.replaceChildren(),1600);
}
function spin(){
  if(!accepted || spinning)return;
  spinning=true; lever.disabled=true;
  result.hidden=true; mobileInvitation.hidden=true; nextLink.hidden=true;
  machine.classList.remove('is-winner'); stage.hidden=false;
  status.textContent='Автомат крутится.';
  populateReels();
  // Two frames ensure each reel starts with an empty window before its transition.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    tracks.forEach((track,index) => {
      track.style.transition = reducedMotion.matches ? 'none' : `transform ${1400 + index * 350}ms cubic-bezier(.15,.65,.2,1)`;
      track.style.transform=`translateY(-${(track.children.length-1)*100}%)`;
    });
    setTimeout(() => {
      status.textContent='Три семёрки! Твоё персональное приглашение открыто.'; burst(); machine.classList.add('is-winner');
      setTimeout(() => { stage.hidden=true; result.hidden=false; mobileInvitation.hidden=false; nextLink.hidden=false; spinning=false; lever.disabled=false; lever.setAttribute('aria-label','Крутить автомат ещё раз'); },reducedMotion.matches ? 150 : 650);
    },reducedMotion.matches ? 100 : 2250);
  }));
}
nameForm.addEventListener('submit',event => {
  event.preventDefault(); const name=nameInput.value.trim().replace(/\s+/g,' ');
  if(!name){nameInput.setCustomValidity('Напиши своё имя'); nameInput.reportValidity();return;}
  nameInput.setCustomValidity(''); guest={name, salutation:nameForm.elements.salutation.value === 'Дорогой' ? 'Дорогой' : 'Дорогая'};
  document.querySelectorAll('.personal-greeting').forEach(el => { el.textContent=`${guest.salutation} ${guest.name}!`; });
  try{sessionStorage.setItem('birthday-guest',JSON.stringify(guest));}catch{}
  accepted=true; welcome.close();
});
nameInput.addEventListener('input',() => nameInput.setCustomValidity(''));
welcome.addEventListener('cancel',event => { if(!accepted)event.preventDefault(); });
document.querySelector('.change-name').addEventListener('click',() => welcome.showModal());
lever.addEventListener('click',spin);
populateReels(); welcome.showModal();

// Subtle pointer drift and a sparkle on touch, independent of the casino.
document.querySelectorAll('main section').forEach(section => {
  let framePending = false;
  section.addEventListener('pointermove',event => {
    if(reducedMotion.matches || event.pointerType !== 'mouse' || framePending)return;
    framePending=true;
    requestAnimationFrame(() => {
      const rect=section.getBoundingClientRect();
      section.style.setProperty('--drift-x',`${((event.clientX-rect.left)/rect.width-.5)*12}px`);
      section.style.setProperty('--drift-y',`${((event.clientY-rect.top)/rect.height-.5)*10}px`);
      framePending=false;
    });
  });
  section.addEventListener('pointerleave',() => {section.style.setProperty('--drift-x','0px');section.style.setProperty('--drift-y','0px');});
  section.addEventListener('pointerdown',event => {
    if(reducedMotion.matches || event.target.closest('a,button,input'))return;
    const rect=section.getBoundingClientRect(); const glint=document.createElement('span');
    glint.className='touch-glint';glint.setAttribute('aria-hidden','true');
    glint.style.left=`${event.clientX-rect.left}px`;glint.style.top=`${event.clientY-rect.top}px`;
    section.append(glint);setTimeout(() => glint.remove(),950);
  });
});
