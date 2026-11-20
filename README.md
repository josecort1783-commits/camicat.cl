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

El correo de la solicitud y los correos de acceso son flujos separados. Recuperación e invitaciones del panel usan **Supabase Auth → Emails → SMTP**. Probar el remitente real en ambos flujos antes de prometer entrega por correo. Si falla la confirmación de solicitud, el registro queda disponible y se muestra el enlace privado para copiarlo. Los cambios de estado aparecen en el enlace; esta versión no envía correos de estado automáticamente. No publicar claves en el repositorio.

Consulta la [guía de Webpay y operación de pedidos](docs/webpay-camicat.md) para confirmar el total, acordar la entrega y habilitar el cobro cuando el taller esté listo.
