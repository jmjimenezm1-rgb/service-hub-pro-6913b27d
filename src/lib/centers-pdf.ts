import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { logAudit } from "@/lib/audit";
import { money, fecha } from "@/lib/format";
import type { CenterReportRow } from "@/lib/centers-report";

/**
 * PDF de centros de coste: resumen con el total del debe de cada centro y,
 * a continuación, el detalle de los asientos imputados a cada uno.
 */
export async function exportCentersPdf(centers: CenterReportRow[], ejercicio: string): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ServiceHub", marginX, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Plataforma SaaS Pay Per Use", marginX, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CENTROS DE COSTE", 400, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado: ${fecha(new Date())}`, 400, 76);
  doc.text(ejercicio === "todos" ? "Todos los ejercicios" : `Ejercicio ${ejercicio}`, 400, 90);

  autoTable(doc, {
    startY: 110,
    head: [["Código", "Centro de coste", "Asientos", "Total debe"]],
    body: centers.map((c) => [
      c.codigo,
      c.nombre,
      String(c.asientos.length),
      money(c.totalDebe),
    ]),
    foot: [[
      "",
      "Total",
      String(centers.reduce((a, c) => a + c.asientos.length, 0)),
      money(centers.reduce((a, c) => a + c.totalDebe, 0)),
    ]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [23, 42, 69], textColor: 255 },
    footStyles: { fontStyle: "bold", fillColor: [240, 243, 248] },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;

  for (const center of centers) {
    if (center.asientos.length === 0) continue;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${center.codigo} · ${center.nombre}`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total debe: ${money(center.totalDebe)}`, 548, y, { align: "right" });

    autoTable(doc, {
      startY: y + 10,
      head: [["Asiento", "Fecha", "Concepto", "Debe", "Haber"]],
      body: center.asientos.map((a) => [
        a.numero,
        fecha(a.fecha),
        a.concepto,
        money(a.debe),
        money(a.haber),
      ]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [23, 42, 69], textColor: 255 },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  }

  doc.save(`centros-de-coste-${Date.now()}.pdf`);

  await logAudit({
    modulo: "financiero",
    entidad: "cost_centers",
    accion: "export",
    valorNuevo: { formato: "pdf", centros: centers.length, ejercicio },
  });
}
