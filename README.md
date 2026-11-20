# Camicat · Tienda

Tienda pública: https://camicat.cl

Los archivos del sitio viven en `public/`. El proyecto de Vercel `camicat_tienda_vercel` usa `main` para producción. Revisa el despliegue en Vercel después de cada cambio en esa rama.

## Pedidos y cotizaciones

- La tienda registra solicitudes de catálogo y joyas a medida. El total de catálogo se reconstruye con los precios vigentes de la base y es referencial. Registrar una solicitud no cobra ni reserva unidades.
- El cliente recibe un número y un enlace privado. No necesita cuenta: puede guardar el enlace en su dispositivo o abrirlo desde el correo. Evitar compartir ese enlace.
- En **Panel → Pedidos**, el taller registra el total final, plazo o instrucciones acordadas, y actualiza retiro, despacho o entrega. Para despachos se requiere el transportista en el mensaje y un número de seguimiento.
- **Auditoría** es exclusiva de José. Registra publicaciones del catálogo y cambios de estado de pedidos desde la activación de esta versión. Los borradores locales, sesiones y cambios realizados en servicios externos no aparecen en esa bandeja.
- El segundo factor se configura en el panel, dentro de la cuenta, con una app autenticadora. La web pide el código al entrar si la cuenta ya lo tiene inscrito. La obligación en las políticas de base de datos se activa aparte después de verificar el acceso de titulares.

### Operación y correo

La migración `20261116045401_customer_requests_and_audit.sql` y la función `camicat-orders` deben desplegarse antes de enlazar esta versión de la tienda. El origen de producción es `https://www.camicat.cl`. Las tablas de pedidos, eventos y auditoría quedan cerradas para los roles del navegador. El seguimiento acepta solo el enlace aleatorio; se guarda un hash en la base. El panel debe presentar una sesión válida y pertenecer al equipo autorizado.

Para confirmar solicitudes por correo, configurar en **Supabase Edge Functions → Secrets**:

- `CAMICAT_RESEND_API_KEY`: clave de un proveedor Resend autorizado para la cuenta Camicat.
- `CAMICAT_ORDER_FROM`: remitente del dominio verificado, en formato `Camicat <pedidos@dominio-verificado>`.

El correo de la solicitud y los correos de acceso son flujos separados. Recuperación e invitaciones del panel usan **Supabase Auth → Emails → SMTP**. Probar el remitente real en ambos flujos antes de prometer entrega por correo. Si falla la confirmación de solicitud, el registro queda disponible y se muestra el enlace privado para copiarlo. Los cambios de estado aparecen en el enlace y generan avisos al cliente. Cada solicitud nueva genera también un aviso a José y Juany con contacto, selección, entrega y siguiente paso. No publicar claves en el repositorio.

Los precios de envío, promesas de entrega, cobro en línea, reserva de stock y plazos de retención de datos requieren validación con el taller antes de activarse.

### Avisos de pedidos

Aplicar `20261120232737_camicat_order_notifications.sql` y desplegar los dos archivos de `supabase/functions/camicat-orders/`. La cola es privada y se crea en la misma transacción que el evento del pedido. La confirmación inicial conserva el enlace privado para los reintentos y actualizaciones posteriores. Los avisos nuevos se intentan enviar al registrar la solicitud o actualizar su estado. El panel muestra solicitudes por responder, configuración y estado de cada correo, y revisa pendientes cada minuto mientras está abierto y visible. También permite reintentar pendientes de un pedido. No hay un servicio programado de reintentos con el panel cerrado.

El estado “Aceptado por el servicio de correo” indica aceptación por Resend, no prueba de llegada a la bandeja. Un fallo de correo no elimina el pedido. Los reintentos conservan exactamente el mensaje y la clave de idempotencia. Después de 23 horas, un intento incierto requiere revisar Resend antes de reenviarlo, para respetar su ventana de deduplicación. No se reenvían solicitudes históricas al instalar la versión.

En producción se verificó el 20/11/2026 que faltan las credenciales de correo de pedidos. El panel lo indicará hasta configurar ambos secretos. Verificar el dominio y remitente en Resend, guardar los secretos en Supabase y comprobar una solicitud real autorizada, tanto al cliente como a los dos dueños. Los correos de recuperación de acceso que ya funcionan pertenecen a Supabase Auth y no configuran automáticamente Resend.

La futura integración Webpay tiene un evento separado `pago_confirmado`. La cola solo genera avisos de venta pagada si existe un intento pagado en modo producción. Los pagos de integración y las cotizaciones no cumplen esa condición. Cuando se integre el callback de Webpay, invocar también el despacho de la cola después de verificar el pago para enviar el aviso inmediatamente; el panel ya recoge esos avisos pendientes. La pasarela todavía no está activada.

Los destinatarios autorizados y el permiso de auditoría se guardan en `camicat_order_staff_policy`, una tabla privada para el servidor. La migración `20261120233702_camicat_private_order_staff_policy.sql` crea la estructura. En una instalación nueva debe configurarse allí el equipo por un operador autorizado; no se incluyen sus direcciones en los archivos del repositorio. El panel requiere simultáneamente correo confirmado, pertenencia al equipo y una dirección autorizada en esa política.
