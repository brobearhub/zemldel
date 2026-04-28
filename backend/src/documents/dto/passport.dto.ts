export type PassportDto = {
  series: string;
  number: string;
  issuedBy: string | null;
  issuedAt: string | null; // ISO date (YYYY-MM-DD)
  departmentCode: string | null;
  registrationAddress: string | null;
  fullName: string | null;
  birthDate: string | null; // ISO date (YYYY-MM-DD)
};

export type ValidationIssue = { path: string[]; message: string };

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asIsoDate(value: unknown): string | null {
  const s = asString(value);
  if (!s) return null;
  // keep MVP simple: require YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function parsePassportDto(body: unknown): {
  data: PassportDto | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  if (!body || typeof body !== 'object') {
    return {
      data: null,
      issues: [{ path: [], message: 'Body must be an object' }],
    };
  }

  const obj = body as Record<string, unknown>;

  const seriesRaw = asString(obj.series);
  const numberRaw = asString(obj.number);
  const series = seriesRaw ? seriesRaw.replace(/\s+/g, '') : null;
  const number = numberRaw ? numberRaw.replace(/\s+/g, '') : null;

  if (!series) issues.push({ path: ['series'], message: 'series is required' });
  if (!number) issues.push({ path: ['number'], message: 'number is required' });
  if (series && !/^\d{4}$/.test(series)) {
    issues.push({ path: ['series'], message: 'series must be 4 digits' });
  }
  if (number && !/^\d{6}$/.test(number)) {
    issues.push({ path: ['number'], message: 'number must be 6 digits' });
  }

  const issuedAt = obj.issuedAt === null ? null : asIsoDate(obj.issuedAt);
  if (obj.issuedAt !== undefined && obj.issuedAt !== null && !issuedAt) {
    issues.push({ path: ['issuedAt'], message: 'issuedAt must be YYYY-MM-DD' });
  }

  const birthDate = obj.birthDate === null ? null : asIsoDate(obj.birthDate);
  if (obj.birthDate !== undefined && obj.birthDate !== null && !birthDate) {
    issues.push({
      path: ['birthDate'],
      message: 'birthDate must be YYYY-MM-DD',
    });
  }

  const data: PassportDto = {
    series: series ?? '',
    number: number ?? '',
    issuedBy: obj.issuedBy === null ? null : asString(obj.issuedBy),
    issuedAt,
    departmentCode:
      obj.departmentCode === null ? null : asString(obj.departmentCode),
    registrationAddress:
      obj.registrationAddress === null
        ? null
        : asString(obj.registrationAddress),
    fullName: obj.fullName === null ? null : asString(obj.fullName),
    birthDate,
  };

  if (issues.length) return { data: null, issues };
  return { data, issues: [] };
}
