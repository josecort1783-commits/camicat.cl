const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
test('estudio carga al entrar, comparte un solo lienzo y conserva selección y acabado al ampliar',async()=>{
 const T=await import('../../public/vendor/three.module.js'),models=await import('../../public/jewel-models.mjs');
 const dom=new JSDOM(readFileSync('../public/index.html','utf8'),{url:'https://www.camicat.cl/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 let rendererCount=0,drawCount=0,visible,rafID=0;const frames=new Map();
 try{
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.IntersectionObserver=class {constructor(f){visible=f;}observe(){}};
  w.ResizeObserver=class {observe(){}};
  w.requestAnimationFrame=f=>{frames.set(++rafID,f);return rafID;};w.cancelAnimationFrame=id=>frames.delete(id);
  Object.defineProperty(d,'hidden',{value:false});
  const host=d.getElementById('threeCanvas');Object.defineProperty(host,'clientWidth',{value:400});Object.defineProperty(host,'clientHeight',{value:400});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  class TestRenderer {constructor(){rendererCount++;this.isFallback=true;this.domElement=d.createElement('canvas');}setPixelRatio(){}setClearColor(){}setSize(){}render(){drawCount++;}}
  w.testThree={...T,WebGLRenderer:TestRenderer};w.testModels=models;
  let code=readFileSync('../public/jewel-3d.js','utf8').replace("import('./vendor/three.module.js')","Promise.resolve(window.testThree)").replace("import('./vendor/RoomEnvironment.js')","Promise.resolve({RoomEnvironment:class {}})").replace("import('./jewel-models.mjs')","Promise.resolve(window.testModels)");
  w.eval(code);assert.equal(rendererCount,0);
  visible([{isIntersecting:true}]);await new Promise(r=>setTimeout(r,10));
  assert.equal(rendererCount,1);assert.equal(d.querySelectorAll('#studioCanvasMount canvas').length,1);
  const frame=[...frames.entries()][0];frames.delete(frame[0]);frame[1](1000);assert.equal(drawCount,1);
  d.querySelector('[data-three-preview="necklace"]').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(d.getElementById('studioPieceName').textContent,'Gota del bosque');assert.equal(d.querySelector('[data-three-piece="necklace"]').getAttribute('aria-pressed'),'true');
  d.querySelector('.studio-metal [data-three-metal="silver"]').click();assert.equal(d.querySelector('.three-metal [data-three-metal="silver"]').getAttribute('aria-pressed'),'true');
  d.getElementById('studioTurn').click();await new Promise(r=>setTimeout(r,10));assert.equal(d.getElementById('studioTurn').getAttribute('aria-pressed'),'true');
  visible([{isIntersecting:false}]);assert.equal(frames.size,0);
  d.getElementById('openJewel3D').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(rendererCount,1);assert.equal(d.querySelectorAll('#jewel3DDialog canvas').length,1);assert.equal(d.querySelectorAll('#studioCanvasMount canvas').length,0);
  d.getElementById('jewel3DDialog').close();assert.equal(d.querySelectorAll('#studioCanvasMount canvas').length,1);assert.equal(d.getElementById('studioTurn').getAttribute('aria-pressed'),'false');
  assert.equal(d.getElementById('studioPieceName').textContent,'Gota del bosque');assert.equal(d.querySelectorAll('canvas').length,1);
 }finally{w.close();}
});
