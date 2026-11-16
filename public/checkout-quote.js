'use strict';
// Browser preview. The payment service must recalculate everything on its server.
let welcomeApplied=read('-welcome-coupon',false)===true;
let checkoutStage='details';
function deliveryMode(){return $('input[name="deliveryMode"]:checked').value}
function checkoutPricing(){const subtotal=total();const discount=welcomeApplied?Math.floor((subtotal*5+50)/100):0;return {subtotal,discount,productsTotal:subtotal-discount,shipping:deliveryMode()==='retiro'?0:null};}
function checkoutLineMarkup(){return cartEntries().map(p=>`<div class="checkout-line"><img src="${p.image}" alt="${escapeHtml(p.name)}"><div><b>${escapeHtml(p.name)}</b><small>${p.qty} × ${money(p.price)}</small></div><strong>${money(p.qty*p.price)}</strong></div>`).join('');}
function renderCheckoutTotals(){
 const p=checkoutPricing();$('#cartDiscountRow').hidden=!welcomeApplied;$('#cartDiscount').textContent='−'+money(p.discount);$('#cartTotal').textContent=money(p.productsTotal);
 $('#cartBenefit').classList.toggle('applied',welcomeApplied);$('#cartApplyWelcome').textContent=welcomeApplied?'Descuento de bienvenida aplicado':'Aplicar BIENVENIDA5';
 $('#cartApplyWelcome').disabled=welcomeApplied;
 $('#cartApplyWelcome').hidden=welcomeApplied;$('#cartRemoveWelcome').hidden=!welcomeApplied;
 $('#cartBenefitText').textContent=welcomeApplied?`Tu bienvenida: ahorras ${money(p.discount)}.`:'Un detalle de bienvenida para ti.';
 $('#cartDeliveryTotal').textContent=p.shipping===null?'Por confirmar':'Retiro coordinado';
 $('#cartDeliveryNote').textContent=p.shipping===null?'Despacho a todo Chile. Camicat confirma el costo según tu comuna antes de pagar; no está incluido en el total de productos.':'Retiro en Requínoa. Coordina el punto y el horario con Camicat.';
 $$('.cart-delivery-buttons button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cartDelivery===deliveryMode())));
 $('#cartIsGift').checked=$('#isGift').checked;
 $('.cart-price-note').textContent=p.shipping===null?'Precios referenciales · despacho no incluido.':'Precios referenciales · retiro por coordinar.';
 $('#orderSubtotal').textContent=money(p.subtotal);$('#orderDiscountRow').hidden=!welcomeApplied;$('#orderDiscount').textContent='−'+money(p.discount);$('#orderTotal').textContent=money(p.productsTotal);
 $('#orderShipping').textContent=p.shipping===null?'Por confirmar':'Retiro coordinado';$('#orderTotalLabel').textContent=p.shipping===null?'Productos con descuento':'Total de productos';if(!welcomeApplied&&p.shipping===null)$('#orderTotalLabel').textContent='Total de productos';
 $('#shippingNotice').textContent=p.shipping===null?'El despacho no está incluido. Se debe confirmar su costo y cobertura antes del pago.':'El punto y horario de retiro se coordinan directamente con Camicat.';
 $('#couponRemove').hidden=!welcomeApplied;$('#checkoutLines').innerHTML=checkoutLineMarkup();
 if(welcomeApplied){$('#couponCode').value='BIENVENIDA5';$('#couponStatus').textContent='5% aplicado sobre los productos.';$('#couponStatus').classList.remove('invalid');}
 if(checkoutStage==='review')renderCheckoutReview();
}
function applyWelcome(){welcomeApplied=true;write('-welcome-coupon',true);renderCheckoutTotals();if($('#cartDialog').open){$('#cartLiveStatus').textContent='Tu 5% de bienvenida ya está aplicado.';$('#cartRemoveWelcome').focus({preventScroll:true});}else toast('Tu 5% de bienvenida ya está aplicado.');}
$('#cartApplyWelcome').onclick=applyWelcome;
$('#welcomeOpen').onclick=()=>openDialog('#welcomeDialog');
$('#welcomeApply').onclick=()=>{applyWelcome();$('#welcomeDialog').close();$('#coleccion').scrollIntoView({behavior:'smooth'});};
$('#couponApply').onclick=()=>{const code=$('#couponCode').value.trim().toUpperCase();if(code==='BIENVENIDA5'){applyWelcome();return}welcomeApplied=false;write('-welcome-coupon',false);renderCheckoutTotals();$('#couponStatus').textContent='Ese código no está disponible. Prueba BIENVENIDA5.';$('#couponStatus').classList.add('invalid');};
$('#couponCode').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#couponApply').click();}};
$('#couponRemove').onclick=()=>{welcomeApplied=false;write('-welcome-coupon',false);$('#couponCode').value='';$('#couponStatus').textContent='Descuento eliminado.';$('#couponStatus').classList.remove('invalid');renderCheckoutTotals();};
function syncDelivery(){$('#draftStatus').textContent='';const shipping=deliveryMode()==='envio';$('#addressFields').hidden=!shipping;for(const id of ['customerCommune','customerRegion']){$('#'+id).required=shipping;$('#'+id).setCustomValidity('');}renderCheckoutTotals();}
$$('input[name="deliveryMode"]').forEach(input=>input.onchange=syncDelivery);
$$('[data-cart-delivery]').forEach(button=>button.onclick=()=>{$(`input[name="deliveryMode"][value="${button.dataset.cartDelivery}"]`).checked=true;syncDelivery();});
$('#cartIsGift').onchange=()=>{$('#isGift').checked=$('#cartIsGift').checked;$('#draftStatus').textContent='';};
$('#isGift').addEventListener('change',()=>{$('#cartIsGift').checked=$('#isGift').checked;});
$('#cartRemoveWelcome').onclick=()=>{$('#couponRemove').click();$('#cartLiveStatus').textContent='Descuento de bienvenida eliminado.';$('#cartApplyWelcome').focus({preventScroll:true});};
$('#checkoutBackCart').onclick=()=>$('#checkoutEditCart').click();
$('#checkoutEditCart').onclick=()=>{$('#orderDialog').close();renderCart();openDialog('#cartDialog');};

function validateCheckout(){
 const validations={customer:[$('#customer').value.trim().length>=2,'Escribe tu nombre y apellido.']};
 if(deliveryMode()==='envio')Object.assign(validations,{customerCommune:[$('#customerCommune').value.trim().length>=2,'Escribe tu comuna.'],customerRegion:[!!$('#customerRegion').value,'Selecciona tu región.']});
 for(const [id,[valid,message]] of Object.entries(validations))$('#'+id).setCustomValidity(valid?'':message);
 const valid=$('#orderForm').reportValidity();$('#checkoutError').hidden=valid;$('#checkoutError').textContent=valid?'':'Revisa los datos indicados para continuar.';return valid;
}
$$('#orderForm input,#orderForm select,#orderForm textarea').forEach(input=>input.addEventListener('input',()=>{input.setCustomValidity('');$('#checkoutError').hidden=true;$('#draftStatus').textContent='';}));
function checkoutPayload(){return {schema_version:1,currency:'CLP',items:cartEntries().map(p=>({id:p.id,quantity:p.qty})),promotion_code:welcomeApplied?'BIENVENIDA5':null,customer:{name:$('#customer').value.trim()},delivery:{mode:deliveryMode(),address:deliveryMode()==='envio'?{commune:$('#customerCommune').value.trim(),region:$('#customerRegion').value}:null},gift:$('#isGift').checked,note:$('#orderNote').value.trim()};}
function setCheckoutStage(stage){checkoutStage=stage;const reviewing=stage==='review';$('#checkoutDetails').hidden=reviewing;$('#checkoutReview').hidden=!reviewing;$('#reviewOrder').hidden=reviewing;$('#detailsStep').toggleAttribute('aria-current',!reviewing);$('#reviewStep').toggleAttribute('aria-current',reviewing);(reviewing?$('#reviewStep'):$('#detailsStep')).setAttribute('aria-current','step');$('#reviewStep').classList.toggle('active',reviewing);if(reviewing)renderCheckoutReview();$('#orderDialog').scrollTop=0;}
function renderCheckoutReview(){const payload=checkoutPayload(),price=checkoutPricing();let address=payload.delivery.mode==='envio'?`${escapeHtml(payload.delivery.address.commune)}, ${escapeHtml(payload.delivery.address.region)}`:'Retiro con Camicat · punto y horario por coordinar';$('#reviewCustomer').innerHTML=`<p><b>${escapeHtml(payload.customer.name)}</b></p><p><b>${payload.delivery.mode==='envio'?'Envío a domicilio':'Retiro coordinado'}</b><br>${address}</p>${payload.gift?'<p>Es para regalo</p>':''}${payload.note?`<p>Nota: ${escapeHtml(payload.note)}</p>`:''}`;$('#reviewLines').innerHTML=checkoutLineMarkup();$('#reviewTotals').innerHTML=`<div><span>Subtotal</span><b>${money(price.subtotal)}</b></div>${welcomeApplied?`<div class="discount-row"><span>BIENVENIDA5 · 5%</span><b>−${money(price.discount)}</b></div>`:''}<div><span>Entrega</span><b>${price.shipping===null?'Por confirmar':'Retiro coordinado'}</b></div><div class="grand-total"><span>${price.shipping===null?'Productos, sin despacho':'Total de productos'}</span><b>${money(price.productsTotal)}</b></div>${price.shipping===null?'<p class="muted">Falta confirmar el costo de despacho antes de pagar.</p>':''}`;const blocked=!cartEntries().length||cartHasConflicts();$('#reviewStockNotice').hidden=!blocked;$('#contactOrder').hidden=blocked;if(blocked)$('#contactOrder').removeAttribute('href');else $('#contactOrder').href='https://wa.me/56979647238?text='+encodeURIComponent(checkoutMessage());}
function checkoutMessage(){const p=checkoutPayload(),price=checkoutPricing();return `Hola Camicat, soy ${p.customer.name}. Quisiera consultar por mi selección:\n\n${cartEntries().map(item=>`• ${item.qty} × ${item.name}: ${money(item.qty*item.price)} (referencial)`).join('\n')}\n\nSubtotal: ${money(price.subtotal)}\n${welcomeApplied?`BIENVENIDA5 (5%): −${money(price.discount)}\n`:''}Total referencial de productos: ${money(price.productsTotal)}\n${p.delivery.mode==='envio'?`Envío: ${p.delivery.address.commune}, ${p.delivery.address.region}. Costo por confirmar.`:'Retiro: punto y horario por coordinar.'}${p.gift?'\nEs para regalo.':''}${p.note?'\nNota: '+p.note:''}\n¿Me confirman precios y disponibilidad? Aún no he pagado. Gracias.`;}
$('#checkout').onclick=()=>{if(!cartEntries().length||cartHasConflicts())return;$('#cartDialog').close();setCheckoutStage('details');$('#checkoutError').hidden=true;renderCheckoutTotals();openDialog('#orderDialog');};
$('#orderForm').onsubmit=e=>{e.preventDefault();if(!cartEntries().length||cartHasConflicts()){toast('Revisa tu carrito antes de continuar.');return}if(validateCheckout())setCheckoutStage('review');};
$('#editCheckout').onclick=()=>setCheckoutStage('details');
$('#saveDraft').onclick=()=>{if(!validateCheckout())return;const draft={mode:deliveryMode(),status:'draft'};if(write('-checkout-draft',draft))$('#draftStatus').textContent='Guardamos la modalidad de entrega en este dispositivo. Los datos personales no se guardan.';};
// Drafts are explicitly saved by the visitor, never submitted as confirmed orders.
const restoredDraft=read('-checkout-draft',null);
if(restoredDraft){const mode=restoredDraft.mode??restoredDraft.delivery?.mode;if(mode==='envio')$('input[name="deliveryMode"][value="envio"]').checked=true;if(restoredDraft.customer||restoredDraft.delivery||restoredDraft.note)write('-checkout-draft',{mode:mode==='envio'?'envio':'retiro',status:'draft'});}
syncDelivery();
