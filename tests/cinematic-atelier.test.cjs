const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(reduce=false){
 const classList=()=>({s:new Set(),contains(k){return this.s.has(k)},toggle(k,v){if(v)this.s.add(k);else this.s.delete(k)}});
 const hero={classList:classList(),hidden:false},button={disabled:false,attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn}};
 const root={classList:classList(),scrollHeight:2000,clientHeight:1000},meter={style:{}},events={},observers=[];
 const media={matches:reduce,addEventListener(k,fn){this.change=fn}};
 const doc={documentElement:root,hidden:false,body:{},querySelector:()=>hero,getElementById:id=>({cinemaMotion:button,cinemaReading:meter}[id]),addEventListener(k,fn){events[k]=fn}};
 const context={document:doc,matchMedia:()=>media,MutationObserver:class{observe(){}},window:{scrollY:500,addEventListener(){}},requestAnimationFrame:()=>1,IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}},Element:class{}};
 vm.runInNewContext(fs.readFileSync('public/cinematic-atelier.js','utf8'),context);
 return {hero,button,root,meter,events,media,doc,enter:()=>observers[0].fn([{isIntersecting:true}]),leave:()=>observers[0].fn([{isIntersecting:false}])};
}
test('poster starts only when visible and pauses when off screen',()=>{const t=setup();assert.ok(t.hero.classList.contains('cinema-paused'));t.enter();assert.equal(t.hero.classList.contains('cinema-paused'),false);t.leave();assert.ok(t.hero.classList.contains('cinema-paused'));});
test('user can pause and resume with correct button state',()=>{const t=setup();t.enter();t.button.listeners.click();assert.equal(t.button.attrs['aria-pressed'],'true');assert.equal(t.button.textContent,'Activar movimiento');t.button.listeners.click();assert.equal(t.button.attrs['aria-pressed'],'false');assert.equal(t.hero.classList.contains('cinema-paused'),false);});
test('system reduced motion cannot be overridden by automatic animation',()=>{const t=setup(true);t.enter();assert.ok(t.button.disabled);assert.equal(t.button.textContent,'Movimiento reducido');assert.ok(t.hero.classList.contains('cinema-paused'));});
test('background tab pauses and reading progress stays proportional',()=>{const t=setup();t.enter();t.doc.hidden=true;t.events.visibilitychange();assert.ok(t.hero.classList.contains('cinema-paused'));assert.equal(t.meter.style.transform,'scaleX(0.5)');});
