export function isAllowedLocationRow(row: { typeName: string; level: number }) {
  // City records: GAR typically uses level=5, typeName="г".
  // Federal cities are subjects (level=1) but are still "г" in GAR exports.
  if (row.typeName === 'г' && (row.level === 5 || row.level === 1)) return true;

  // Additional location levels we support in the directory:
  // 2/3/4/6 correspond to administrative/municipal units and settlements/localities.
  if (row.level === 2 || row.level === 3 || row.level === 4 || row.level === 6)
    return true;

  return false;
}
