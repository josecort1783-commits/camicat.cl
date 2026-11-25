# CamiCat: evidencia de revisión y pruebas

Fecha: 25 de noviembre de 2026. Código de la tienda revisado: `da477cac0c096eef5388de5b43c6ef43712e4693`, rama `main`. Despliegue de producción verificado en estado READY: `dpl_2W4W3Ev92uDMke7E98ohZcXC1xw8`.

- Tienda: https://www.camicat.cl/
- Administrador: https://www.camicat.cl/admin
- Dirección de marca, referencias y plan de medición: [marca-conversion-camicat.md](marca-conversion-camicat.md)
- Salida de las pruebas automatizadas: [qa-camicat-tests.txt](qa-camicat-tests.txt)

## Resultado automatizado

**46 pruebas distintas aprobadas**: 30 en el proyecto del administrador y 16 en la raíz de la tienda. Una revisión posterior volvió a ejecutar las 8 comprobaciones de contenido/enlaces y compra tras mover los controles de apariencia; otras 4 comprobaron el CSS final reproducible. Esas repeticiones no se suman como pruebas distintas.

| Área | Qué se comprobó | Método |
| --- | --- | --- |
| Fichas | Datos pendientes explícitos, contacto de una pieza, materiales escapados como texto, medidas y entrega cuando existen. | DOM con los archivos reales y datos sintéticos únicamente en memoria. |
| Selección y entrega | Agregar al carrito, total referencial, datos incompletos, retiro y envío, resumen y mensaje sin afirmar pago. | DOM automatizado y recorrido manual en la tienda pública. |
| Personalización | Orientación, idea, resumen, mensaje de WhatsApp y volver a editar sin perder la selección. | DOM automatizado y recorrido manual público. |
| Editor | Materiales/medidas/cuidados/opciones/entrega, guardar borrador, revisión y restauración; vaciar un campo lo deja pendiente. | Pruebas del editor con autenticación y publicación simuladas. |
| Acceso | El panel sigue bloqueado sin sesión y pertenencia; borradores, cierre de sesión, recuperación, errores y caducidad conservan las protecciones. | Pruebas automatizadas y comprobación del acceso público cerrado. |
| Base de datos | Campos públicos permitidos, límites de longitud, exclusión de productos ocultos y notas privadas, stock exacto privado. | PGlite y consulta de función real en Supabase, sin insertar datos de prueba. |
| Contenido local | Cuatro URLs públicas canónicas, enlaces e imágenes locales, un h1 por página, metadata y sitemap; panel/pedidos conservan noindex. | Pruebas estáticas y DOM. |
| Efectos existentes | Movimiento reducido, pausas de animación, zoom fotográfico, carga diferida y escena única de los modelos de referencia. | Pruebas unitarias existentes; no equivalen a reproducir piezas reales en 3D. |

## Revisión visual en navegador

Las mediciones de tablet y ancho móvil se hicieron mediante el zoom del navegador de escritorio. Sirven para verificar el ancho CSS y la distribución, **no son una emulación de iPhone ni una prueba de pantalla táctil**. DevTools estaba restringido en el navegador disponible; no se cambió esa restricción ni se ejecutó un navegador alternativo para sortearla.

| Ancho CSS observado | Ancho del documento | Resultado |
| --- | --- | --- |
| 1363 px | 1348 px | Portada de dos columnas, foto real ampliada, acción principal y enlace al taller. Sin desbordamiento horizontal observado. |
| 779 px | 770 px | Título de 80,55 px con interlínea de 40,28 px: dos líneas. Las tres opciones de fotos caben juntas. |
| 340 px | 337 px | Título de 72,08 px con interlínea de 36,04 px: dos líneas. Tres controles de foto de 79 px y catálogo de dos columnas de 132,5 px. Sin desbordamiento horizontal observado. |

Se revisaron la portada, la ficha de Flor Dorada, el carrito, el resumen de selección, el personalizador, el acceso del panel y la fotografía del taller. La foto del taller terminó de cargar correctamente (360 px de ancho natural); el primer salto a esa sección podía capturarse antes de terminar su carga diferida.

### Ajustes surgidos de mirar el resultado

- La primera composición dejaba la joya pequeña dentro de la imagen. Se cambió a un encuadre de detalle usando la misma foto; se conserva la opción de ver la fotografía completa.
- El título se partía en tres líneas en tablet. Se corrigieron tamaño y columnas de ese ancho.
- Los controles de apariencia se trasladaron a un desplegable al pie para despejar el inicio. Sus modos se conservan.
- La tercera opción de foto saltaba de fila en ancho móvil; ahora las tres comparten una fila y admiten texto de dos líneas.

## Comprobación en Supabase

Migración aplicada: `20261125043005_camicat_public_product_facts.sql`. La consulta posterior confirmó revisión 1 del catálogo, ocho productos y coincidencia de la proyección pública con su función. RLS sigue activado en catálogo privado y público. La llamada sintética mostró materiales y medidas de prueba, `stock: null` y excluyó la nota privada. No se guardó esa pieza de prueba ni se actualizó inventario o precios.

## Límites y pendientes concretos

1. **Pago real:** Webpay no está activo. Se probó preparar una solicitud/cotización; no se realizó una venta ni un cobro.
2. **Administración real:** la interfaz pública mostró el acceso protegido. No había una sesión del equipo en este navegador; la edición y publicación con credenciales reales queda por comprobar por José o Juany. Las pruebas simuladas y la función de base de datos pasaron por separado.
3. **Datos de las piezas:** faltan materiales, medidas, cuidados, precios definitivos e inventario confirmado por el taller. El sistema no los ha inventado.
4. **Correo:** no se envió una solicitud real ni se verificó la llegada de un correo. Las pruebas automatizadas verifican el comportamiento cuando falla el correo; no demuestran entregabilidad del proveedor.
5. **Celular real y WebGL:** pendiente prueba en Safari de iPhone y dispositivo Android, con teclado táctil y conexión móvil. Los modelos 3D son ilustrativos.
6. **Posicionamiento:** las guías y el sitemap están preparados, pero esta revisión no mide nuevas posiciones, tráfico o ventas. Falta revisar Search Console e indexación de las URLs nuevas.
7. **Operación local:** completar la dirección/horario del punto de Machalí y las condiciones de retiro/despacho antes de orientar visitas con esa ficha.

El recorrido manual no envió mensajes a WhatsApp, no registró solicitudes en producción y no generó correos. La pieza agregada al carrito para la revisión se retiró al terminar. No se agregaron testimonios, productos ni resultados comerciales ficticios.
