const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(){
 const make=()=>({attrs:{},textContent:'',events:{},properties:{},classList:{values:new Set(),add(k){this.values.add(k)},remove(k){this.values.delete(k)},contains(k){return this.values.has(k)}},style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},addEventListener(k,fn){this.events[k]=fn},getBoundingClientRect(){return{left:0,top:0,width:200,height:300}}});
 const nodes={atelierFeaturedImage:make(),atelierFeatured:make(),atelierMagnify:make(),atelierZoomHint:make()};
 const events={};let reset;
 const context={document:{getElementById:k=>nodes[k],documentElement:make(),addEventListener:(k,fn)=>events[k]=fn},matchMedia:()=>({matches:true}),MutationObserver:class{constructor(fn){reset=fn}observe(){}},Element:class{}};
 vm.runInNewContext(fs.readFileSync('public/international-atelier.js','utf8'),context);
 return {nodes,events,reset:()=>reset()};
}
test('photo magnifier toggles with a clear accessible state and label',()=>{
 const {nodes:n}=setup();n.atelierMagnify.events.click();
 assert.equal(n.atelierMagnify.attrs['aria-pressed'],'true');
 assert.ok(n.atelierFeatured.classList.contains('is-magnified'));
 assert.equal(n.atelierMagnify.textContent,'Ver foto completa');
 n.atelierMagnify.events.click();assert.equal(n.atelierMagnify.attrs['aria-pressed'],'false');
});
test('Escape and changing the product reset the magnifier',()=>{
 const {nodes:n,events,reset}=setup();n.atelierMagnify.events.click();events.keydown({key:'Escape'});
 assert.equal(n.atelierMagnify.attrs['aria-pressed'],'false');
 n.atelierMagnify.events.click();reset();assert.equal(n.atelierMagnify.attrs['aria-pressed'],'false');
});
test('pointer position stays inside the photo and is cleared on leave',()=>{
 const {nodes:n}=setup();n.atelierMagnify.events.click();n.atelierFeatured.events.pointermove({clientX:500,clientY:-100});
 assert.equal(n.atelierFeatured.style['--photo-x'],'100%');assert.equal(n.atelierFeatured.style['--photo-y'],'0%');
 n.atelierFeatured.events.pointerleave();assert.equal(n.atelierFeatured.style['--photo-x'],undefined);
});
