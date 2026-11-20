export async function recoveryRequest(email, fetcher = fetch) {
  const response = await fetcher('/api/staff-recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
    signal: AbortSignal.timeout(13000),
  });

  if (response.ok) return { error: null };
  const body = await response.json().catch(() => ({}));
  return { error: { status: response.status, code: body?.code } };
}

export function recoveryMessage(error) {
  if (error?.code === 'staff_only')
    return 'Este correo no está autorizado para recuperar el acceso al panel de Camicat.';
  if (error?.status === 429)
    return 'Se alcanzó el límite temporal de correos. Si ya pediste un enlace, revisa Spam o Promociones y espera antes de pedir otro.';
  if (error?.code === 'recovery_timeout' || error?.status === 504 || ['AbortError', 'TimeoutError'].includes(error?.name))
    return 'No pudimos confirmar el envío a tiempo. Revisa Spam o Promociones antes de volver a intentar.';
  if (error?.status >= 500)
    return 'El servicio de correo no pudo completar la solicitud. Intenta más tarde. Si ya tienes contraseña, puedes iniciar sesión.';
  return 'No pudimos solicitar el enlace. Revisa tu conexión e inténtalo de nuevo.';
}
