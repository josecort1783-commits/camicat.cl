# Camicat · De la cotización al pedido pagado

| Paso | José o Juany | Cliente |
| --- | --- | --- |
| 1. Cotizar | En **Panel → Pedidos**, verifica piezas, cantidades y precios. Acuerda despacho o retiro y guarda el total final en pesos como **Cotización preparada**. | Revisa la propuesta y confirma que acepta las piezas, el total y la entrega. |
| 2. Confirmar | Cambia el pedido a **Pedido confirmado**. El total debe ser productos más el despacho acordado. | Conserva su enlace privado de seguimiento. La compra sigue sin requerir cuenta. |
| 3. Habilitar pago | Abre el pedido, pulsa **Consultar pago**, elige retiro o despacho, ingresa el costo de entrega y el lugar, plazo o instrucciones. Marca la confirmación de piezas apartadas y pulsa **Habilitar pago al cliente**. Avisa al cliente que ya puede abrir el mismo enlace. | Ve el subtotal, el costo de entrega y el total. Elige **Pagar con Webpay** y paga en Transbank. |
| 4. Verificar | Consulta Webpay en la ficha del pedido. Con **Pago confirmado**, puedes pasar a **En preparación**. | Vuelve al resultado y puede comprobar el pago en el seguimiento. |
| 5. Entregar | Para retiro, indica lugar y horario. Para despacho, indica transportista y número de seguimiento. Pasa a **Entregado** al completar la entrega. | Revisa los datos y el estado en su enlace. |

El cobro se habilita cuando el cliente acepta el total y Camicat confirma y aparta las piezas. Usa **$0** para retiro o despacho gratis. Confirma con el taller el lugar de retiro, horarios, cobertura y costo de despacho antes de usar esas condiciones. El importe aprobado incluye la entrega una sola vez. Para pruebas se usan 10 unidades simuladas por producto, los precios referenciales de catálogo en el repositorio y $3.500 como ejemplo de despacho. La disponibilidad es una confirmación manual del taller. Guardar la cotización y pagar por Webpay no descuentan automáticamente unidades.

Si Webpay indica **Pago rechazado** o **Pago cancelado**, se puede intentar otra vez desde el mismo pedido. Si aparece **Pago en verificación**, revisa con **Consultar pago**. Si persiste, contrasta la orden en el Portal de Transbank antes de entregar, anular o cobrar por otro medio. Un intento ambiguo queda bloqueado para evitar un segundo cobro. Las devoluciones se gestionan en Transbank. El flujo no envía automáticamente un correo nuevo al habilitar el cobro.

## Pruebas y activación

1. Ejecuta `cd admin-src && npm ci && npm test && npm run build`. La prueba carga las migraciones de pedidos y pagos en una base temporal, con 10 unidades por producto y los precios de `src/seed.json`. El proveedor simulado prueba rechazo, diferencia de importe, autorización y concurrencia. Las credenciales públicas precargadas para integración corresponden a Webpay Plus normal.
2. Para la validación completa con tarjeta de prueba, utiliza un despliegue accesible desde el navegador y un proyecto o base de pruebas independiente. Replica el esquema de Catálogo y Pedidos, carga datos ficticios y crea una cuenta de equipo de prueba. En ese despliegue apúntale el cliente de administración en `admin-src/src/config.js` y el seguimiento en `public/orders-common.js`. Apunta también `public/cloud-catalog.js` al catálogo de prueba si usas el carrito. Compila el admin. En la copia de la función Edge `camicat-orders`, ajusta el origen al dominio de pruebas y permite la cuenta de equipo ficticia. Aplica la migración Webpay y confirma que la ruta `/api/webpay-return` permite el retorno del navegador desde Transbank. Prueba una aprobación, un rechazo, una cancelación y un doble clic. Verifica tanto el panel como el enlace del cliente. Al copiar esquema, evita copiar cuentas, pedidos, correos o llaves reales.
3. Antes de publicar, carga las fotos oficiales, confirma stock y precios con el taller y acuerda entrega y costos. En Supabase de Camicat, aplica `20261120171200_camicat_webpay.sql` y actualiza `camicat-orders` para que el panel muestre los mensajes de bloqueo. Despliega el código en Vercel con Webpay desactivado y comprueba la tienda, el acceso administrativo y un enlace de seguimiento.
4. Confirma que Transbank habilitó **Webpay Plus normal para producción**. Ingresa el código de comercio y la llave API de producción en las variables del servidor desde Vercel. Cuando ya esté todo verificado, cambia `CAMICAT_WEBPAY_ENABLED` a `true` y vuelve a desplegar. Conserva los datos de la primera venta para conciliar el monto, la orden y la autorización en Transbank. Si es necesario pausar nuevos cobros con intentos pendientes, deja de habilitar cotizaciones y reconcilia esos intentos antes de apagar el acceso de retorno a Webpay.

| Variable de servidor | Integración | Producción |
| --- | --- | --- |
| `CAMICAT_WEBPAY_ENABLED` | `true` para pruebas | `false` hasta la activación |
| `CAMICAT_WEBPAY_MODE` | `integration` | `production` |
| `CAMICAT_WEBPAY_ORIGIN` | Origen HTTPS del despliegue de pruebas | `https://www.camicat.cl` |
| `CAMICAT_WEBPAY_SUPABASE_URL` | Proyecto Supabase de pruebas | Proyecto Supabase de Camicat |
| `CAMICAT_WEBPAY_SUPABASE_SERVICE_ROLE_KEY` | Llave de servidor de pruebas | Llave de servidor de Camicat |
| `CAMICAT_WEBPAY_COMMERCE_CODE` | Se usa el código público de integración | Código de comercio asignado por Transbank |
| `CAMICAT_WEBPAY_API_KEY` | Se usa la llave pública de integración | Llave de producción entregada por Transbank |

Guarda las llaves sensibles en Vercel y limita su alcance al ambiente correspondiente. La ruta de retorno se deriva del origen. Los datos de tarjetas se ingresan en Webpay.

[Guía de Webpay Plus](https://transbankdevelopers.com/documentacion/webpay-plus) · [Referencia oficial de la API](https://transbankdevelopers.com/referencia/webpay) · [Tarjetas y credenciales de prueba](https://transbankdevelopers.com/documentacion/como_empezar)
