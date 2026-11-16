export const featureLimit=3;
const featureDefaults=new Set(['flor-dorada','collar-color','borlas-jardin']);
export const isFeatured=p=>p?.featured??featureDefaults.has(p?.id);
export const showsInFeatures=p=>p.visible&&p.available&&p.stock!==0;
export const categories=['Aros','Collares','Pulseras','Otros'];
export function safeImage(value){return typeof value==='string'&&(/^assets\/joya-\d+\.webp$/.test(value)||/^https:\/\/wbqpcunyzvdvhaiduyem\.supabase\.co\/storage\/v1\/object\/public\/camicat-products\/[a-z0-9/-]+\.webp$/.test(value)||/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(value));}
export function validProduct(p){return p&&/^[a-z][a-z0-9-]{0,99}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim().length>=2&&p.name.length<=90&&Number.isInteger(p.price)&&p.price>=0&&p.price<=99999999&&categories.includes(p.category)&&typeof p.description==='string'&&p.description.length<=600&&safeImage(p.image)&&typeof p.available==='boolean'&&typeof p.visible==='boolean'&&(p.featured===undefined||typeof p.featured==='boolean')&&(p.stock===null||Number.isInteger(p.stock)&&p.stock>=0&&p.stock<=99999);}
export function validCatalog(items){return Array.isArray(items)&&items.length<=300&&items.every(validProduct)&&new Set(items.map(p=>p.id)).size===items.length;}
export function normalizeSeed(items){return items.map(p=>({...p,stock:null,visible:true}));}
export function sameProduct(a,b){
 if(a===b)return true;
 if(!a||!b)return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&JSON.stringify(a[k])===JSON.stringify(b[k]));
}
export function changeCount(saved,draft){const before=new Map(saved.map(p=>[p.id,p])),after=new Map(draft.map(p=>[p.id,p]));return [...new Set([...before.keys(),...after.keys()])].filter(id=>!sameProduct(before.get(id),after.get(id))).length;}
export function productState(p){return !p.visible?'Oculto':p.stock===0||!p.available?'Agotado':'Visible';}
export const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function uniqueId(){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');}
