# Revisión de marca y compra de CamiCat

25 de noviembre de 2026. Alcance: tienda y administrador existentes; se mantiene JavaScript/CSS, GitHub, Vercel y Supabase. No se inventan productos ni se cambian precios o inventario para la revisión.

## Las tres prioridades

1. **Reconocer el taller.** Composición de dos columnas, con foto real protagonista, verde salvia/crema y tipografía Georgia/Arial. Se retira de la portada el fondo generado y se reducen dibujos y controles secundarios. El selector de ambientes conserva los modos existentes. La nueva presentación del taller usa la fotografía existente de su mesa; identifica a Gabriel como creador y a Juany como quien orienta al cliente. No son retratos nuevos de ellos.
2. **Elegir con información.** La ficha presenta materiales, medidas, opciones del diseño, disponibilidad, cuidados y entrega. Lo no confirmado se consulta al taller. La consulta por WhatsApp incluye nombre y referencia de la pieza. La selección y el total siguen siendo referenciales: no se presentan como pago, reserva o venta completada.
3. **Completar y publicar sin complicaciones.** El editor agrega campos opcionales con ejemplos de qué escribir, ayuda sobre lo pendiente y revisión antes de actualizar. Guardar prepara un borrador; Actualizar publica. La proyección pública de Supabase permite exclusivamente estos datos descriptivos acotados y conserva privadas las cantidades exactas de stock.

## Referencias revisadas y qué se adapta

| Referencia | Observación | Adaptación a CamiCat |
| --- | --- | --- |
| [La Merced](https://www.lamercedjoyas.com/) | Categorías reconocibles y separación entre catálogo y encargos. | Mantener el catálogo directo y separar la consulta por un diseño propio. No copiar su catálogo de novias o sus materiales. |
| [N&M Orfebrería, Rancagua](https://www.nym-orfebreria.cl/quienes-somos/) | Presenta los nombres y el origen de su taller familiar. | Dar presencia real a Juany y Gabriel y conservar Requínoa como origen. No atribuir a CamiCat años de trayectoria o composición de metales de otro taller. |
| [Alex Monroe: proceso](https://alexmonroe.com/pages/handmade-in-england) | Explica el trabajo con imágenes y etapas del oficio. | Mostrar la mesa real y el detalle del alambre, con un enlace al proceso original de CamiCat. No copiar sus técnicas de fundición ni sus certificaciones. |
| [Loveness Lee](https://www.lovenesslee.com/) | Separa colecciones, materiales y servicios por encargo. | Claridad entre pieza, información y consulta; mantener las fotografías propias y el lenguaje sencillo. |

La oportunidad es que la fotografía del alambre, sus flores y su construcción manual identifiquen la marca. El alcance local no exige fingir una tienda en Rancagua: se conserva el taller en Requínoa, se publican solo puntos de venta confirmados y se explica el envío a la región.

## Recorridos que conserva y mejora esta versión

- **Catálogo:** ver pieza → revisar datos → agregar a selección → indicar nombre y modalidad de entrega → revisar total referencial → consultar por WhatsApp. El archivo activo es `checkout-quote.js`. No se exigen dirección completa ni correo para preparar una cotización.
- **Encargo:** elegir pieza u orientación → tono → piedra/color de referencia o Sin piedra → idea → revisar resumen → abrir WhatsApp y enviar personalmente. El color no promete inventario de piedras. Volver a editar conserva las elecciones.
- **Seguimiento:** registrar una solicitud es una opción independiente. El servidor asigna un número y enlace privado; fallar el correo no convierte un registro en compra ni elimina su seguimiento.
- **Administración:** acceso restringido → editar → guardar borrador → revisar → Actualizar tienda. Los campos no conocidos pueden quedar vacíos. Un error al publicar conserva el borrador.

## Cómo mediremos consultas y ventas

| Métrica | Fuente y definición | Estado |
| --- | --- | --- |
| Búsquedas que muestran CamiCat | Search Console: consultas, páginas, impresiones, clics y CTR en periodos equivalentes de 28 días. Separar marca, técnica y local. | Requiere consultar la cuenta de Search Console; no hay datos nuevos medidos en esta revisión. |
| Consultas registradas | Solicitudes del servidor, por fecha y tipo: catálogo o personalizada. Contar cada número una vez. | Registro y panel existentes. No incluye todas las conversaciones de WhatsApp. |
| Conversaciones por WhatsApp | Conversaciones nuevas recibidas por el taller y referencias de pieza contenidas en el mensaje. | El clic en un enlace no prueba envío ni consulta recibida. Los dueños deben registrar las conversaciones, o se debe integrar una medición acordada después. |
| Pedidos acordados | Solicitudes que pasan a Confirmado, conservando el número de solicitud. | Estado del panel; no equivale a pago recibido. |
| Ventas cobradas e ingreso | Pago de producción confirmado por el proveedor o cobro manual conciliado, por número de pedido. | Webpay todavía requiere completar activación e integración. No sumar cotizaciones como ventas. |
| Entregas | Pedidos con estado Entregado y fecha del evento. | Historial de estados existente. |
| Conversión de consulta a pedido | Pedidos acordados / consultas registradas de la misma cohorte; excluir pruebas y canceladas según criterio definido. | Revisar semanalmente. No mezclar personas, clics y pedidos en el denominador. |

No se agregó un rastreador de terceros ni se envían textos de consultas, correos o teléfonos a una herramienta de analítica. Antes de medir visitas y clics automáticamente, escoger herramienta, revisar privacidad y definir la base de comparación.

## Datos que deben completar Juany y Gabriel

- Por pieza: composición exacta del alambre y gancho, medidas, opciones reales, cuidados, precio definitivo y unidades contadas.
- Confirmar plazos, despacho, puntos de retiro y condiciones de cambios. El punto publicado en Machalí no incluye todavía una dirección suficientemente precisa para orientar una visita.
- Nuevas fotos: frente y detalle de cada producto; foto de uso o con escala cuando sea posible. Retratos y video real del proceso si desean publicarlos.
- No afirmar oro/plata, hipoalergénico, piedras naturales, piezas únicas o garantías sin respaldo.
- Los modelos 3D siguen siendo referencias ilustrativas, con carga diferida. No se crearon reproducciones falsas de las piezas ni se añadió giro automático.

## Pruebas y límites

La evidencia final de pruebas y revisión visual se agrega a `docs/qa-camicat-marca.md` al cerrar la publicación. Las pruebas automatizadas de acceso usan sesiones y servicios simulados; eso permite probar permisos, borradores y errores sin cambiar datos reales ni enviar correos a los dueños. La comprobación SQL usa una llamada de función con datos sintéticos no persistidos. No se completa ningún pago ni se envía un mensaje de prueba a WhatsApp.
