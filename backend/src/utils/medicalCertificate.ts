export class CertificateValidationError extends Error {
  statusCode = 400;
}

export const cid10Catalog: Record<string, string> = {
  A09: 'Diarreia e gastroenterite de origem infecciosa presumível',
  B34: 'Doenças por vírus de localização não especificada',
  'B34.9': 'Infecção viral não especificada',
  J00: 'Nasofaringite aguda (resfriado comum)',
  J02: 'Faringite aguda',
  'J02.9': 'Faringite aguda não especificada',
  J03: 'Amigdalite aguda',
  'J03.9': 'Amigdalite aguda não especificada',
  J06: 'Infecções agudas das vias aéreas superiores de localizações múltiplas e não especificadas',
  'J06.9': 'Infecção aguda das vias aéreas superiores não especificada',
  J11: 'Influenza (gripe) devida a vírus não identificado',
  M54: 'Dorsalgia',
  'M54.5': 'Dor lombar baixa',
  R51: 'Cefaleia',
  'Z54.0': 'Convalescença após cirurgia',
  'Z76.3': 'Pessoa em boa saúde acompanhando pessoa doente',
};

export function dateOnly(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new CertificateValidationError(`${label}: data inválida.`);
  }
  return value;
}

export function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new CertificateValidationError(`${label}: informe um inteiro entre ${min} e ${max}.`);
  }
  return value;
}

export function text(value: unknown, label: string, max = 200, required = false): string {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new CertificateValidationError(`${label}: texto inválido ou obrigatório.`);
  }
  return value.trim();
}

export function addCalendarDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  if (!Number.isFinite(result.getTime()) || result.getUTCFullYear() > 9999) {
    throw new CertificateValidationError('Período de afastamento fora do intervalo permitido.');
  }
  return result.toISOString().slice(0, 10);
}

export function certificatePeriod(startDate: string, days: number) {
  return { endDate: addCalendarDays(startDate, days - 1), returnDate: addCalendarDays(startDate, days) };
}

export function normalizeCids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10) {
    throw new CertificateValidationError('Informe no máximo 10 códigos CID-10.');
  }
  return Array.from(new Set(value.map(code => {
    const normalized = text(code, 'CID', 6, true).toUpperCase();
    if (!/^[A-Z]\d{2}(?:\.[0-9A-Z]{1,2})?$/.test(normalized)) {
      throw new CertificateValidationError(`CID-10 inválido: ${normalized}. Use o formato J06.9.`);
    }
    return normalized;
  })));
}
