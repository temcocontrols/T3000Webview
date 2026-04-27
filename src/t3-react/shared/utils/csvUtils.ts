/**
 * CSV utility functions for export and import operations.
 */

/** Column definition for CSV export/import */
export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | undefined | null;
  /** For import: set the parsed value back on the item. If omitted, column is read-only. */
  setter?: (item: T, value: string) => void;
}

/** Escape a CSV field value (RFC 4180) */
function escapeCsvField(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Generate CSV content string from data and column definitions */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map(c => escapeCsvField(c.header)).join(',');
  const dataRows = data.map(item =>
    columns.map(c => escapeCsvField(c.accessor(item))).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

/** Trigger a CSV file download in the browser */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export data to a CSV file download */
export function exportToCsv<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  if (data.length === 0) return;
  const csv = generateCsv(data, columns);
  downloadCsv(csv, filename);
}

/** Parse a CSV string into rows of string arrays */
function parseCsvString(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        fields.push(current);
        current = '';
        if (fields.some(f => f.trim() !== '')) {
          rows.push(fields);
        }
        fields = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  // Last row
  fields.push(current);
  if (fields.some(f => f.trim() !== '')) {
    rows.push(fields);
  }
  return rows;
}

/** Read and parse a CSV File */
export async function parseCsvFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const text = await file.text();
  const allRows = parseCsvString(text);
  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = allRows[0].map(h => h.trim());
  const rows = allRows.slice(1);
  return { headers, rows };
}

/** Map parsed CSV rows back to typed objects using column definitions */
export function mapCsvToObjects<T>(
  headers: string[],
  rows: string[][],
  columns: CsvColumn<T>[],
  createEmpty: () => T
): T[] {
  // Build header → column index mapping
  const headerToCol = new Map<string, CsvColumn<T>>();
  for (const col of columns) {
    headerToCol.set(col.header.toLowerCase(), col);
  }

  return rows.map(row => {
    const item = createEmpty();
    headers.forEach((header, idx) => {
      const col = headerToCol.get(header.toLowerCase());
      if (col?.setter && idx < row.length) {
        col.setter(item, row[idx].trim());
      }
    });
    return item;
  });
}
