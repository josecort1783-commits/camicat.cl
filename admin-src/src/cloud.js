import {recoveryFetch} from './recovery.js';
import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
import {validCatalog,uniqueId} from './model.js';
export const client=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{fetch:recoveryFetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:document.body.hasAttribute('data-staff-panel')}});
export async function checkAccess(){const {data,error}=await client.auth.getUser();if(error||!data.user)return null;const membership=await client.from('camicat_admin_members').select('user_id, panel_label').eq('user_id',data.user.id).maybeSingle();if(membership.error)throw new Error('No pudimos comprobar tu acceso. Intenta de nuevo.');if(!membership.data)throw new Error('Tu cuenta aún no está autorizada para Camicat. Pide a Tote que habilite tu correo.');return {...data.user,panelLabel:membership.data.panel_label};}
export async function loadCatalog(){const {data,error}=await client.from('camicat_catalog').select('revision,products,updated_at').eq('id','main').single();if(error||!validCatalog(data?.products))throw new Error('No pudimos traer el catálogo. Tus cambios actuales se conservaron.');return data;}
export async function publishCatalog(items,revision){if(!validCatalog(items))throw new Error('Revisa los datos de tus productos antes de actualizar.');const user=await checkAccess();if(!user)throw new Error('Tu sesión terminó. Entra de nuevo para actualizar.');const uploaded=[];
 for(const item of items){let image=item.image;if(image.startsWith('data:')){const blob=await (await fetch(image)).blob();const path=`${item.id}/${uniqueId()}.webp`;const {error}=await client.storage.from('camicat-products').upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw new Error('No se pudo subir una fotografía. No se actualizó el catálogo; tus cambios siguen aquí.');image=client.storage.from('camicat-products').getPublicUrl(path).data.publicUrl;}uploaded.push({...item,image});}
 const {data,error}=await client.from('camicat_catalog').update({products:uploaded}).eq('id','main').eq('revision',revision).select('products,revision,updated_at').maybeSingle();
 if(error)throw new Error('No se pudo confirmar la actualización. Conservamos tus cambios. Comprueba la conexión y vuelve a traer el catálogo antes de reintentar.');
 if(!data)throw new Error('El catálogo cambió en otro dispositivo. Trae la versión actual desde “Conexión de la tienda” antes de volver a editar.');
 return data;
}
