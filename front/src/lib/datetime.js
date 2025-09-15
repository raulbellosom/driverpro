/**
 * Utilidades para manejar fechas del servidor sin descompensación horaria
 * Funciona específicamente con el formato de fechas de Odoo
 */

/**
 * Parsea una fecha del servidor asumiendo que está en UTC
 * @param {string} serverDateString - Fecha del servidor en formato "YYYY-MM-DD HH:mm:ss" o ISO
 * @returns {Date|null} - Fecha como objeto Date o null si es inválida
 */
export function parseServerDate(serverDateString) {
  if (!serverDateString) return null;

  // Si viene como "YYYY-MM-DD HH:mm:ss" (formato típico de Odoo sin timezone)
  // Lo tratamos como UTC agregando 'Z'
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(serverDateString)) {
    return new Date(serverDateString.replace(" ", "T") + "Z");
  }

  // Si ya trae Z u offset, el Date lo interpreta correctamente
  return new Date(serverDateString);
}

/**
 * Formatea una fecha/hora para mostrar al usuario
 * @param {string|Date} value - Fecha a formatear
 * @param {Object} options - Opciones de formato
 * @param {string} options.locale - Locale a usar (default: 'es-MX')
 * @param {string} options.timeZone - Zona horaria a usar (default: 'America/Mexico_City')
 * @param {boolean} options.includeTime - Si incluir la hora (default: true)
 * @param {boolean} options.includeDate - Si incluir la fecha (default: true)
 * @param {boolean} options.includeSeconds - Si incluir segundos (default: false)
 * @returns {string} - Fecha formateada
 */
export function formatDateTime(value, options = {}) {
  const {
    locale = "es-MX",
    timeZone = "America/Mexico_City",
    includeTime = true,
    includeDate = true,
    includeSeconds = false,
  } = options;

  const date = typeof value === "string" ? parseServerDate(value) : value;
  if (!date || isNaN(date.getTime())) return "";

  const formatOptions = { timeZone };

  if (includeDate) {
    formatOptions.year = "numeric";
    formatOptions.month = "2-digit";
    formatOptions.day = "2-digit";
  }

  if (includeTime) {
    formatOptions.hour = "2-digit";
    formatOptions.minute = "2-digit";
    if (includeSeconds) {
      formatOptions.second = "2-digit";
    }
  }

  return date.toLocaleString(locale, formatOptions);
}

/**
 * Formatea solo la fecha (sin hora)
 * @param {string|Date} value - Fecha a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string} - Fecha formateada
 */
export function formatDate(value, options = {}) {
  return formatDateTime(value, { ...options, includeTime: false });
}

/**
 * Formatea solo la hora (sin fecha)
 * @param {string|Date} value - Fecha a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string} - Hora formateada
 */
export function formatTime(value, options = {}) {
  return formatDateTime(value, { ...options, includeDate: false });
}

/**
 * Calcula minutos restantes desde ahora hasta una fecha límite
 * @param {string} utcLimitString - Fecha límite en formato UTC
 * @returns {number|null} - Minutos restantes (puede ser negativo) o null si fecha inválida
 */
export function minutesLeft(utcLimitString) {
  const limit = parseServerDate(utcLimitString);
  if (!limit) return null;

  const now = new Date();
  return Math.floor((limit - now) / 60000);
}

/**
 * Calcula tiempo transcurrido desde una fecha
 * @param {string} utcStartString - Fecha de inicio en formato UTC
 * @returns {number|null} - Minutos transcurridos o null si fecha inválida
 */
export function minutesElapsed(utcStartString) {
  const start = parseServerDate(utcStartString);
  if (!start) return null;

  const now = new Date();
  return Math.floor((now - start) / 60000);
}

/**
 * Convierte minutos a formato legible (ej: "2h 30m", "45m", "1d 3h")
 * @param {number} minutes - Minutos a convertir
 * @param {Object} options - Opciones de formato
 * @param {boolean} options.includeSeconds - Si incluir segundos para valores < 1 minuto
 * @param {boolean} options.compact - Usar formato compacto (h, m, d) vs completo (horas, minutos, días)
 * @returns {string} - Tiempo formateado
 */
export function formatTimeRemaining(minutes, options = {}) {
  const { includeSeconds = false, compact = true } = options;

  if (minutes < 0) {
    return compact ? "Vencido" : "Tiempo vencido";
  }

  if (minutes < 1 && includeSeconds) {
    const seconds = Math.max(0, Math.floor(minutes * 60));
    return compact
      ? `${seconds}s`
      : `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.floor(minutes % 60);

  const parts = [];

  if (days > 0) {
    parts.push(compact ? `${days}d` : `${days} día${days !== 1 ? "s" : ""}`);
  }

  if (hours > 0) {
    parts.push(
      compact ? `${hours}h` : `${hours} hora${hours !== 1 ? "s" : ""}`
    );
  }

  if (mins > 0 || parts.length === 0) {
    parts.push(compact ? `${mins}m` : `${mins} minuto${mins !== 1 ? "s" : ""}`);
  }

  return parts.join(compact ? " " : " y ");
}

/**
 * Verifica si una fecha está en el futuro
 * @param {string|Date} value - Fecha a verificar
 * @returns {boolean} - true si está en el futuro
 */
export function isFuture(value) {
  const date = typeof value === "string" ? parseServerDate(value) : value;
  if (!date) return false;

  return date > new Date();
}

/**
 * Verifica si una fecha está en el pasado
 * @param {string|Date} value - Fecha a verificar
 * @returns {boolean} - true si está en el pasado
 */
export function isPast(value) {
  const date = typeof value === "string" ? parseServerDate(value) : value;
  if (!date) return false;

  return date < new Date();
}

/**
 * Verifica si dos fechas son del mismo día
 * @param {string|Date} date1 - Primera fecha
 * @param {string|Date} date2 - Segunda fecha
 * @param {string} timeZone - Zona horaria para la comparación
 * @returns {boolean} - true si son del mismo día
 */
export function isSameDay(date1, date2, timeZone = "America/Mexico_City") {
  const d1 = typeof date1 === "string" ? parseServerDate(date1) : date1;
  const d2 = typeof date2 === "string" ? parseServerDate(date2) : date2;

  if (!d1 || !d2) return false;

  const options = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  return (
    d1.toLocaleDateString("en-CA", options) ===
    d2.toLocaleDateString("en-CA", options)
  );
}

/**
 * Verifica si una fecha es hoy
 * @param {string|Date} value - Fecha a verificar
 * @param {string} timeZone - Zona horaria para la comparación
 * @returns {boolean} - true si es hoy
 */
export function isToday(value, timeZone = "America/Mexico_City") {
  return isSameDay(value, new Date(), timeZone);
}

/**
 * Obtiene la fecha/hora actual en formato ISO que Odoo puede entender
 * @returns {string} - Fecha actual en formato ISO
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Convierte una fecha local del usuario a UTC para enviar al servidor
 * @param {Date} localDate - Fecha en tiempo local del usuario
 * @returns {string} - Fecha en formato ISO UTC
 */
export function toServerFormat(localDate) {
  return localDate.toISOString();
}

/**
 * Obtiene información de zona horaria del usuario
 * @returns {Object} - Información de zona horaria
 */
export function getTimezoneInfo() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.abs(offsetMinutes / 60);
  const offsetSign = offsetMinutes <= 0 ? "+" : "-";

  return {
    timeZone,
    offsetMinutes,
    offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, "0")}`,
    isDST: isDaylightSaving(now),
  };
}

/**
 * Verifica si una fecha está en horario de verano
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} - true si está en horario de verano
 */
function isDaylightSaving(date) {
  const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(january, july) !== date.getTimezoneOffset();
}
