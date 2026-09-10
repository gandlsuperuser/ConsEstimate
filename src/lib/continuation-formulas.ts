import { OwnerBillingItem } from '@/types';

/* ------------------------------------------------------------------ */
/*  Column letter <-> Field Name Mapping                              */
/* ------------------------------------------------------------------ */
export const COLUMN_FIELD_MAP: Record<string, keyof OwnerBillingItem> = {
  a: 'item_number',
  b: 'description',
  c: 'scheduled_value',
  d: 'work_completed_previous',
  e: 'work_completed_this_period',
  f: 'stored_materials',
  g: 'total_completed',
  h: 'balance_to_finish',
  i: 'retainage',
};

export const FIELD_COLUMN_MAP: Partial<Record<keyof OwnerBillingItem, string>> = {
  scheduled_value: 'C',
  work_completed_previous: 'D',
  work_completed_this_period: 'E',
  stored_materials: 'F',
  total_completed: 'G',
  balance_to_finish: 'H',
  retainage: 'I',
};

export interface FormulaSuggestion {
  label: string;
  formula: string;
  description: string;
  previewValue?: number;
}

/**
 * Extract the value of a specific cell reference like "C19" or "E24" or row index
 */
export function getCellValue(
  colLetter: string,
  rowNumber: number,
  rows: OwnerBillingItem[]
): number {
  const field = COLUMN_FIELD_MAP[colLetter.toLowerCase()];
  if (!field) return 0;

  const targetRow = rows.find((r) => r.item_number === rowNumber);
  if (!targetRow) return 0;

  const val = targetRow[field];
  return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
}

/**
 * Automatically determine the upward range of rows to sum above `rowIndex`.
 * Defaults to rows from 1 to `rowIndex` (1-indexed: 1 to rowNumber - 1).
 * If a previous formula exists in this column above `rowIndex`, start after that formula row.
 */
export function getDefaultUpwardSumRange(
  field: keyof OwnerBillingItem,
  rowIndex: number,
  rows: OwnerBillingItem[]
): { startRow: number; endRow: number } {
  const currentItemNumber = rows[rowIndex]?.item_number ?? (rowIndex + 1);
  if (currentItemNumber <= 1) {
    return { startRow: 1, endRow: 1 };
  }

  const endRow = currentItemNumber - 1;
  const formulaKey = `${String(field)}_formula` as keyof OwnerBillingItem;

  let startRow = 1;
  for (let i = rowIndex - 1; i >= 0; i--) {
    const r = rows[i];
    if (r && r[formulaKey]) {
      startRow = r.item_number + 1;
      break;
    }
  }

  if (startRow > endRow) {
    startRow = 1;
  }

  return { startRow, endRow };
}

/**
 * Calculate the sum of a specific column over a range of 1-indexed row numbers.
 */
export function sumColumnRange(
  colField: keyof OwnerBillingItem,
  startRow: number,
  endRow: number,
  rows: OwnerBillingItem[]
): number {
  const min = Math.min(startRow, endRow);
  const max = Math.max(startRow, endRow);

  let sum = 0;
  for (const r of rows) {
    if (r.item_number >= min && r.item_number <= max) {
      const val = Number(r[colField]) || 0;
      sum += val;
    }
  }
  return Math.round(sum * 100) / 100;
}

/**
 * Parse and evaluate a formula string in the context of the spreadsheet.
 * Supports:
 * - /sum or =sum or /sum() or =SUM()
 * - /sum(1..18) or /sum(1:18) or /sum(1-18) or /sum(1,18)
 * - /sum(C1:C18) or =SUM(C1..C18) or /sum(E1:E18)
 * - =C19-C24 or =C19 - E24 or /diff(19, 24) or /sub(19, 24)
 * - =C19 * 0.1 or =C22 + C23
 */
export function parseAndEvaluateFormula(
  inputFormula: string,
  field: keyof OwnerBillingItem,
  rowIndex: number,
  rows: OwnerBillingItem[]
): { value: number; normalizedFormula: string } | null {
  if (!inputFormula || typeof inputFormula !== 'string') return null;

  const raw = inputFormula.trim();
  if (!raw) return null;

  const defaultColLetter = FIELD_COLUMN_MAP[field] || 'C';

  // 1. Bare /sum or =sum or /sum() or =SUM()
  const bareSumMatch = raw.match(/^(?:\/|=)?\s*sum\s*(?:\(\s*\))?$/i);
  if (bareSumMatch) {
    const { startRow, endRow } = getDefaultUpwardSumRange(field, rowIndex, rows);
    const sum = sumColumnRange(field, startRow, endRow, rows);
    const normalizedFormula = `/sum(${startRow}..${endRow})`;
    return { value: sum, normalizedFormula };
  }

  // 2. /sum(1..18) or /sum(1:18) or /sum(1-18) or /sum(1, 18) or =SUM(1..18)
  const numericRangeMatch = raw.match(
    /^(?:\/|=)?\s*sum\s*\(\s*(\d+)\s*(?:\.\.|:|-|,|\s+to\s+)\s*(\d+)\s*\)$/i
  );
  if (numericRangeMatch) {
    const startRow = parseInt(numericRangeMatch[1], 10);
    const endRow = parseInt(numericRangeMatch[2], 10);
    const sum = sumColumnRange(field, startRow, endRow, rows);
    const normalizedFormula = `/sum(${startRow}..${endRow})`;
    return { value: sum, normalizedFormula };
  }

  // 3. /sum(C1:C18) or =SUM(C1..C18) or /sum(E1..E18)
  const cellRangeMatch = raw.match(
    /^(?:\/|=)?\s*sum\s*\(\s*([A-Za-z])(\d+)\s*(?:\.\.|:|-|,|\s+to\s+)\s*(?:[A-Za-z])?(\d+)\s*\)$/i
  );
  if (cellRangeMatch) {
    const colLetter = cellRangeMatch[1].toUpperCase();
    const targetField = COLUMN_FIELD_MAP[colLetter.toLowerCase()] || field;
    const startRow = parseInt(cellRangeMatch[2], 10);
    const endRow = parseInt(cellRangeMatch[3], 10);
    const sum = sumColumnRange(targetField, startRow, endRow, rows);
    const normalizedFormula = `=SUM(${colLetter}${startRow}:${colLetter}${endRow})`;
    return { value: sum, normalizedFormula };
  }

  // 4. Difference / Subtraction helpers: /diff(19, 24) or /sub(19, 24) or /diff(C19, C24)
  const diffMatch = raw.match(
    /^(?:\/|=)?\s*(?:diff|sub|minus)\s*\(\s*([A-Za-z])?(\d+)\s*,\s*([A-Za-z])?(\d+)\s*\)$/i
  );
  if (diffMatch) {
    const colA = diffMatch[1] ? diffMatch[1].toUpperCase() : defaultColLetter;
    const rowA = parseInt(diffMatch[2], 10);
    const colB = diffMatch[3] ? diffMatch[3].toUpperCase() : defaultColLetter;
    const rowB = parseInt(diffMatch[4], 10);

    const valA = getCellValue(colA, rowA, rows);
    const valB = getCellValue(colB, rowB, rows);
    const diff = Math.round((valA - valB) * 100) / 100;
    const normalizedFormula = `=${colA}${rowA}-${colB}${rowB}`;
    return { value: diff, normalizedFormula };
  }

  // 5. Excel-style expressions: =C19-C24 or =C19+C20 or =C19*0.1
  if (raw.startsWith('=') || raw.startsWith('/')) {
    const expr = raw.replace(/^[/=]\s*/, '');

    // Replace cell references like C19, E24 with actual numbers
    const cellRefRegex = /([A-Za-z])(\d+)/g;
    let hasCellRef = false;
    const replacedExpr = expr.replace(cellRefRegex, (_, col, rowNum) => {
      hasCellRef = true;
      const num = getCellValue(col, parseInt(rowNum, 10), rows);
      return String(num);
    });

    if (hasCellRef || /^[\d\s.+\-*/()]+$/.test(replacedExpr)) {
      try {
        // Safe evaluation of arithmetic only
        if (/^[0-9+\-*/().\s]+$/.test(replacedExpr)) {
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${replacedExpr})`)();
          if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            const rounded = Math.round(result * 100) / 100;
            return { value: rounded, normalizedFormula: `=${expr.toUpperCase()}` };
          }
        }
      } catch (e) {
        // invalid expression
      }
    }
  }

  return null;
}

/**
 * Re-evaluate all formula cells in the rows list.
 * Performs multiple passes to resolve interdependent formulas (e.g. Row 25 depends on Row 19).
 */
export function recalculateAllFormulas(rows: OwnerBillingItem[]): OwnerBillingItem[] {
  let updatedRows = [...rows];

  const formulaKeys: Array<{
    field: keyof OwnerBillingItem;
    formulaField: keyof OwnerBillingItem;
  }> = [
    { field: 'scheduled_value', formulaField: 'scheduled_value_formula' },
    { field: 'work_completed_previous', formulaField: 'work_completed_previous_formula' },
    { field: 'work_completed_this_period', formulaField: 'work_completed_this_period_formula' },
    { field: 'stored_materials', formulaField: 'stored_materials_formula' },
  ];

  // 2 passes for dependency resolution
  for (let pass = 0; pass < 2; pass++) {
    let changed = false;

    updatedRows = updatedRows.map((row, idx) => {
      let rowCopy = { ...row };

      for (const { field, formulaField } of formulaKeys) {
        const formula = rowCopy[formulaField] as string | undefined;
        if (formula) {
          const evaluated = parseAndEvaluateFormula(formula, field, idx, updatedRows);
          if (evaluated && evaluated.value !== rowCopy[field]) {
            (rowCopy as any)[field] = evaluated.value;
            changed = true;
          }
        }
      }

      // Auto-recalculate line derived totals
      const total_completed =
        (Number(rowCopy.work_completed_previous) || 0) +
        (Number(rowCopy.work_completed_this_period) || 0) +
        (Number(rowCopy.stored_materials) || 0);
      const scheduled = Number(rowCopy.scheduled_value) || 0;
      const pct_complete = scheduled > 0 ? Math.round((total_completed / scheduled) * 100) : 0;
      const balance_to_finish = scheduled - total_completed;

      rowCopy = {
        ...rowCopy,
        total_completed,
        pct_complete,
        balance_to_finish,
      };

      return rowCopy;
    });

    if (!changed) break;
  }

  return updatedRows;
}

/**
 * Generate suggestions when the user is typing in a cell
 */
export function getFormulaSuggestions(
  query: string,
  field: keyof OwnerBillingItem,
  rowIndex: number,
  rows: OwnerBillingItem[]
): FormulaSuggestion[] {
  const colLetter = FIELD_COLUMN_MAP[field] || 'C';
  const { startRow, endRow } = getDefaultUpwardSumRange(field, rowIndex, rows);
  const upwardSum = sumColumnRange(field, startRow, endRow, rows);

  const suggestions: FormulaSuggestion[] = [];

  // /sum default
  suggestions.push({
    label: '/sum',
    formula: `/sum(${startRow}..${endRow})`,
    previewValue: upwardSum,
    description: `Sum ${colLetter}${startRow} to ${colLetter}${endRow} (Rows ${startRow}–${endRow})`,
  });

  // =SUM format
  suggestions.push({
    label: `=SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
    formula: `=SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
    previewValue: upwardSum,
    description: `Excel standard sum of column ${colLetter}`,
  });

  // If there are earlier rows, provide difference suggestion
  if (rowIndex >= 2) {
    const prevRow1 = rowIndex; // 1-indexed: rowIndex
    const prevRow2 = Math.max(1, rowIndex - 1);
    suggestions.push({
      label: `=${colLetter}${prevRow2}-${colLetter}${prevRow1}`,
      formula: `=${colLetter}${prevRow2}-${colLetter}${prevRow1}`,
      description: `Subtract Row ${prevRow1} from Row ${prevRow2}`,
    });
  }

  if (!query || query === '/' || query === '=') {
    return suggestions;
  }

  const q = query.toLowerCase().replace(/^[/=]/, '');
  return suggestions.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.formula.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
  );
}
