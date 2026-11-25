const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('la proyección pública publica solo datos acotados y conserva la privacidad del stock',async()=>{
 const db=new PGlite();try{
  await db.exec('create schema camicat_private;');await db.exec(readFileSync('supabase/migrations/20261125043005_camicat_public_product_facts.sql','utf8'));
  const base={id:'qa-piece',name:'Pieza de prueba',price:1000,category:'Otros',description:'Prueba',image:'assets/joya-7.webp',visible:true,available:true,stock:7};
  const result=await db.query('select camicat_private.public_products($1::jsonb) as items',[JSON.stringify([
   {...base,material:'Material verificado en prueba',dimensions:'3 cm',care:'Cuidado de prueba',variants:'Tono de prueba',delivery:'Retiro por coordinar',productType:'Anillos',privateNote:'No publicar'},
   {...base,id:'qa-hidden',visible:false},
   {...base,id:'qa-zero',stock:0,material:100,care:'x'.repeat(301),dimensions:'x'.repeat(121)},
   {...base,id:'qa-unknown',stock:null,material:''}
  ])]);
  const items=result.rows[0].items;assert.equal(items.length,3);assert.equal(items[0].material,'Material verificado en prueba');assert.equal(items[0].productType,'Anillos');assert.equal(items[0].stock,null);assert.equal(items[0].privateNote,undefined);
  assert.equal(items[1].available,false);assert.equal(items[1].material,undefined);assert.equal(items[1].care,undefined);assert.equal(items[1].dimensions,undefined);
  assert.equal(items[2].available,true);assert.equal(items[2].material,undefined);
 }finally{await db.close()}
});
