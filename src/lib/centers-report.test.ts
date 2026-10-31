import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCenterReport, centerCsvRows } from "./centers-report";

const centers = [{ id: "technology", codigo: "TEC", nombre: "Tecnología", descripcion: null }, { id: "empty", codigo: "ADM", nombre: "Administración", descripcion: null }];
const entries = [
  { cost_center_id: "technology", ejercicio: 2026, numero: "AS-1", fecha: "2026-10-01", concepto: "Compra", journal_lines: [{ debe: 1300, haber: 0 }, { debe: 273, haber: 0 }, { debe: 0, haber: 1573 }] },
  { cost_center_id: "technology", ejercicio: 2025, numero: "AS-2", fecha: "2025-10-01", concepto: "Compra anterior", journal_lines: [{ debe: 1210, haber: 0 }, { debe: 0, haber: 1210 }] },
];

test("centros muestran el total del debe, no el saldo", () => {
  const report = buildCenterReport(centers, entries, "todos");
  assert.equal(report[0]?.totalDebe, 2783);
  assert.equal(report[1]?.totalDebe, 0);
});

test("el ejercicio limita tanto totales como asientos exportados", () => {
  const report = buildCenterReport(centers, entries, "2026");
  assert.equal(report[0]?.totalDebe, 1573);
  assert.deepEqual(report[0]?.asientos.map((entry) => entry.numero), ["AS-1"]);
});

test("CSV contiene el resumen del centro y cada asiento con debe y haber", () => {
  const rows = centerCsvRows(buildCenterReport(centers, entries, "todos"));
  assert.equal(rows.length, 4);
  assert.equal(rows[0]?.totalDebe, 2783);
  assert.equal(rows[1]?.numero, "AS-1");
  assert.equal(rows[1]?.debe, 1573);
  assert.equal(rows[1]?.haber, 1573);
  assert.equal(rows[3]?.cantidad, 0);
});