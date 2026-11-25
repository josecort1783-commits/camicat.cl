-- Publish only customer-facing, bounded product facts. Exact stock quantities stay private.
-- Existing authentication, catalogue validation, audit triggers and RLS are unchanged.
create or replace function camicat_private.public_products(items jsonb)
returns jsonb language sql immutable set search_path = '' as $function$
 select coalesce(jsonb_agg(
   jsonb_build_object(
     'id',item->'id','name',item->'name','price',item->'price',
     'category',item->'category','description',item->'description',
     'image',item->'image','visible',true,'stock',null,
     'available',(item->>'available')::boolean and coalesce((item->>'stock')::numeric>0,true)
   )
   || case when jsonb_typeof(item->'tag')='string' then jsonb_build_object('tag',item->'tag') else '{}'::jsonb end
   || case when jsonb_typeof(item->'featured')='boolean' then jsonb_build_object('featured',item->'featured') else '{}'::jsonb end
   || case when item->>'productType'='Anillos' and item->>'category'='Otros' then jsonb_build_object('productType','Anillos') else '{}'::jsonb end
   || coalesce((select jsonb_object_agg(f.key,f.value) from jsonb_each(item) f
     where f.key in ('material','dimensions','variants','care','delivery')
     and jsonb_typeof(f.value)='string'
     and length(trim(f.value #>> '{}'))>0
     and length(f.value #>> '{}')<=case f.key when 'dimensions' then 120 when 'care' then 300 else 180 end
   ),'{}'::jsonb)
   order by ord),'[]'::jsonb)
 from jsonb_array_elements(items) with ordinality as t(item,ord)
 where item->'visible'='true'::jsonb;
$function$;
