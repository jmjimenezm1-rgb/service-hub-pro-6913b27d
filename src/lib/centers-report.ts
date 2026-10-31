export interface CenterReportEntry {
  numero: string;
  fecha: string;
  concepto: string;
  debe: number;
  haber: number;
}

export interface CenterReportRow {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  totalDebe: number;
  asientos: CenterReportEntry[];
}

interface ReportSource {
  cost_center_id: string | null;
  ejercicio: number;
  numero: string;
  fecha: string;
  concepto: string;
  journal_lines: { debe: number; haber: number }[];
}

export function entriesForExercise<T extends { ejercicio: number }>(entries: T[], exercise: string): T[] {
  return exercise === "todos" ? entries : entries.filter((entry) => String(entry.ejercicio) === exercise);
}

export function buildCenterReport(
  centers: { id: string; codigo: string; nombre: string; descripcion: string | null }[],
  entries: ReportSource[],
  exercise: string,
): CenterReportRow[] {
  const filtered = entriesForExercise(entries, exercise);
  return centers.map((center) => {
    const asientos = filtered.filter((entry) => entry.cost_center_id === center.id).map((entry) => ({
      numero: entry.numero,
      fecha: entry.fecha,
      concepto: entry.concepto,
      debe: entry.journal_lines.reduce((sum, line) => sum + Number(line.debe), 0),
      haber: entry.journal_lines.reduce((sum, line) => sum + Number(line.haber), 0),
    }));
    return { codigo: center.codigo, nombre: center.nombre, descripcion: center.descripcion, totalDebe: asientos.reduce((sum, entry) => sum + entry.debe, 0), asientos };
  });
}

export function centerCsvRows(centers: CenterReportRow[]) {
  return centers.flatMap((center) => [
    { tipo: "Centro", codigo: center.codigo, nombre: center.nombre, descripcion: center.descripcion ?? "", totalDebe: center.totalDebe, cantidad: center.asientos.length, numero: "", fecha: "", concepto: "", debe: "" as number | string, haber: "" as number | string },
    ...center.asientos.map((entry) => ({ tipo: "Asiento", codigo: center.codigo, nombre: center.nombre, descripcion: "", totalDebe: "" as number | string, cantidad: "" as number | string, ...entry })),
  ]);
}