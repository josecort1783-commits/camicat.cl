# CamiCat: posicionamiento del trabajo artesanal

Actualizado el 25 de noviembre de 2026. Este documento describe lo implementado y lo que todavía necesita datos reales. Las expresiones son objetivos de contenido; no representan volúmenes de búsqueda, posiciones o ventas comprobadas.

## Qué queremos que una persona encuentre

CamiCat hace joyas de alambre y resina en Requínoa, Región de O’Higgins. Gabriel crea las piezas y Juany atiende y orienta. El contenido explica el alambrismo como trabajo artesanal y muestra fotografías de sus creaciones. La búsqueda local se apoya en el origen real del taller y sus puntos de venta; no se crean sucursales ficticias ni páginas repetidas por comuna.

| Intención | Expresiones relacionadas | Página principal |
| --- | --- | --- |
| Conocer o comprar | joyas de alambre, joyas de alambrismo, joyas hechas a mano, joyería artesanal | `/` |
| Entender la técnica y encontrar un taller local | alambrismo en Requínoa, joyas artesanales Requínoa, artesanía en alambre, joyas artesanales O’Higgins | `/joyas-de-alambre-requinoa.html` |
| Elegir aros | aros de alambre, aros de alambrismo, aros de flores hechos a mano, aros artesanales, aros para regalar | `/aros-de-alambre.html` |
| Consultar un encargo | joyas personalizadas, aros personalizados, joyas por encargo, collar personalizado, pulsera personalizada, anillo por encargo | `/joyas-personalizadas.html` |

«Joyas Rancagua» y «regalos artesanales» tienen una intención más amplia: las guías explican cómo consultar el envío, retiro o feria sin afirmar que el taller esté en Rancagua. «Bisutería artesanal» puede evaluarse cuando Search Console muestre si los clientes usan esa expresión. No se insertan listas de sinónimos en el sitio ni etiquetas meta keywords.

## Cambios publicados en el código

- Tres guías con contenido estático, títulos, descripciones, canonical propio, imágenes reales, texto alternativo y enlaces de navegación.
- Datos estructurados de sitio, organización, página y migas de pan. No se incluyen reseñas, calificaciones, ofertas ni composición de materiales sin comprobar.
- Portada, catálogo y pie enlazan las guías con texto descriptivo. Las guías enlazan entre sí y llevan al catálogo o al formulario real.
- Los enlaces `/?categoria=Aros#coleccion` abren la categoría Aros. Solo se aceptan categorías conocidas; el canonical de la portada sigue apuntando a `/` para no multiplicar páginas por filtros.
- Sitemap con cuatro URLs públicas. El panel de administración y el historial de pedidos conservan `noindex`.
- Una sola hoja de estilos para la portada, generada con el contenido de las fuentes en el orden original. `dialogs.css` se incluye en la posición de su importación original. Esto reduce las solicitudes CSS de 43 (42 enlaces y una importación) a una; no prueba por sí solo una mejora en Core Web Vitals o posiciones.
- Las dos imágenes estáticas que no indicaban dimensiones ahora reservan su tamaño.

## Mantener los estilos sin perder cambios

Editar los CSS originales, añadir cualquier archivo nuevo a `scripts/storefront-styles.json` en el lugar que corresponda y ejecutar:

```sh
node scripts/build-storefront-styles.mjs
```

Incluir el resultado `public/storefront-bundle.css` en el commit. Vercel ejecuta también este generador mediante `buildCommand`. No editar el archivo generado directamente. Las páginas de administración, pedidos y las guías conservan sus propias hojas de estilos.

## Publicación y medición pendientes fuera del código

1. En Search Console, comprobar la propiedad `camicat.cl`, enviar `https://www.camicat.cl/sitemap.xml` e inspeccionar las cuatro URLs. Solicitar indexación si corresponde. Un HTTP 200 no demuestra indexación y una búsqueda `site:` tampoco sustituye el informe de Google.
2. Cuando haya datos, revisar por separado consultas de marca, alambrismo/aros y consultas locales. Comparar periodos equivalentes de 28 días: impresiones, clics, CTR y páginas de destino. No esperar una posición idéntica para cada usuario o comuna.
3. Confirmar si existe un Perfil de Empresa de Google y administrarlo con los propietarios. Verificar atención presencial, dirección publicable y horarios antes de publicar esos datos. No crear fichas duplicadas.
4. Enlazar la tienda desde la biografía oficial de Instagram y, cuando exista una participación real, desde las páginas del organizador de la feria o de la agrupación artesanal. Solicitar enlaces a terceros requiere autorización independiente; no se compran ni simulan referencias.
5. Usar fotos reales del taller y de Gabriel creando las piezas cuando los dueños las entreguen y autoricen su publicación. Un breve relato propio sobre cómo realizan una flor será más útil que repetir palabras clave.

## Información de productos que falta confirmar

El catálogo aún contiene referencias de demostración. Antes de convertir las fichas en páginas indexables con marcado Product/Offer, obtener para cada producto: nombre final, categoría, descripción propia, material y acabado exactos, medidas, peso si corresponde, fotos, precio vigente, stock real, condiciones de entrega y política de cambios. «Dorado» o «plateado» no significan oro o plata; no afirmar que una pieza es hipoalergénica sin respaldo.

Las opciones de piedras del personalizador son ilustrativas. No deben usarse como promesa de inventario o composición.

## Fuentes y criterio

Se revisaron las guías oficiales de Google sobre contenido útil y políticas de spam, y referencias de tiendas artesanales chilenas como Gise Artejoya y La Merced. Se tomó como referencia la claridad al describir técnica, origen y categorías, sin copiar textos ni atribuir materiales ajenos a CamiCat.

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=es
- https://developers.google.com/search/docs/essentials/spam-policies?hl=es
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es
- https://giseartejoya.cl/
- https://www.lamercedjoyas.com/
