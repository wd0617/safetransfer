/**
 * Utilidades de sanitización para prevenir XSS y ataques de inyección
 */

/**
 * Escapa caracteres HTML peligrosos para prevenir XSS
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitiza una cadena de texto eliminando scripts y caracteres peligrosos
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Eliminar etiquetas de script completas
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Eliminar etiquetas HTML
    .replace(/<[^>]*>/g, '')
    // Eliminar event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Eliminar javascript: urls
    .replace(/javascript:/gi, '')
    // Eliminar data: urls potencialmente peligrosos
    .replace(/data:\s*[^,]*base64/gi, '')
    // Eliminar caracteres de control
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica si una cadena contiene patrones de inyección peligrosos
 */
export function containsDangerousPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const dangerousPatterns = [
    // XSS patterns
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
    /<\s*img[^>]+onerror/i,
    /<\s*svg[^>]+onload/i,
    /<\s*iframe/i,
    /<\s*embed/i,
    /<\s*object/i,
    // SQL injection patterns (extra protection)
    /'\s*or\s*'1'\s*=\s*'1/i,
    /;\s*drop\s+table/i,
    /;\s*delete\s+from/i,
    /union\s+select/i,
    /--\s*$/,
    /\/\*.*\*\//,
  ];

  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitiza un objeto completo de forma recursiva
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === 'string') {
        (sanitized as any)[key] = sanitizeInput(value);
      } else if (Array.isArray(value)) {
        (sanitized as any)[key] = value.map((item: unknown) =>
          typeof item === 'string' ? sanitizeInput(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = sanitizeObject(value);
      }
    }
  }

  return sanitized;
}

/**
 * Limpia una cadena para uso seguro en consultas (adicional a prepared statements)
 */
export function sanitizeForQuery(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Escapar comillas simples
    .replace(/'/g, "''")
    // Eliminar comentarios SQL
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Eliminar punto y coma (prevenir múltiples statements)
    .replace(/;/g, '')
    .trim();
}

/**
 * Valida y sanitiza un número de documento
 */
export function sanitizeDocumentNumber(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Solo permitir caracteres alfanuméricos y guiones
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .substring(0, 30);
}

/**
 * Valida y sanitiza un código fiscal italiano
 */
export function sanitizeFiscalCode(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Solo permitir caracteres del código fiscal
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 16);
}

/**
 * Valida y sanitiza un número de teléfono
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Solo permitir dígitos, +, -, espacios y paréntesis
  return input
    .replace(/[^0-9+\-\s()]/g, '')
    .substring(0, 25);
}

/**
 * Valida y sanitiza un email
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .toLowerCase()
    .replace(/[^a-z0-9@._\-+]/g, '')
    .substring(0, 100);
}

/**
 * Valida y sanitiza un nombre (personas, negocios)
 */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Permitir letras (incluyendo acentos), espacios, guiones y apóstrofes
  return input
    .replace(/[^a-zA-ZÀ-ÿ\s\-'\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 150);
}

/**
 * Valida y sanitiza un monto monetario
 */
export function sanitizeAmount(input: string | number): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.min(999, Number(input.toFixed(2))));
  }

  if (!input || typeof input !== 'string') return 0;

  // Extraer solo dígitos y punto decimal
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) return 0;

  // Limitar a rango válido (0-999 según normativa italiana)
  return Math.max(0, Math.min(999, Number(parsed.toFixed(2))));
}
