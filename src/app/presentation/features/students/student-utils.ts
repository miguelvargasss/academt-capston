export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return (digits.length === 11 && digits.startsWith('51') ? digits.slice(2) : digits).slice(0, 9);
}
export function formatPhone(value: string | null): string {
  return (
    (value ?? '')
      .replace(/\D/g, '')
      .match(/.{1,3}/g)
      ?.join(' ') ?? ''
  );
}
export function credentialsWhatsAppUrl(
  name: string,
  email: string,
  password: string,
  phone: string,
  loginUrl: string,
): string {
  if (!/^\d{9}$/.test(phone)) return '';
  const message = `Hola ${name}, te damos la bienvenida a Kelly Academy.\n\nCorreo: ${email}\nContraseña inicial: ${password}\nIngresar: ${loginUrl}\n\nUsa estos datos para tu primer acceso.`;
  return `https://wa.me/51${phone}?text=${encodeURIComponent(message)}`;
}
