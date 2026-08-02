import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Percent, Receipt, TicketPercent } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuery as useRQ } from "@tanstack/react-query";
import { invoicesQuery, seriesQuery, couponsQuery, invoiceLinesQuery, type InvoiceRow } from "@/modules/facturacion/api";
import { money, fecha, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación | ServiceHub" },
      {
        name: "description",
        content:
          "Motor de facturación: series, facturas ordinarias y rectificativas, IVA, descuentos y cupones.",
      },
      { property: "og:title", content: "Facturación | ServiceHub" },
      {
        property: "og:description",
        content: "Gestiona series, facturas, impuestos y cupones de descuento.",
      },
    ],
  }),
  component: FacturacionPage,
});

function FacturacionPage() {
  const { data: invoices = [], isLoading } = useQuery(invoicesQuery);
  const { data: series = [] } = useQuery(seriesQuery);
  const { data: coupons = [] } = useQuery(couponsQuery);
  const [selected, setSelected] = useState<InvoiceRow | null>(null);

  const total = invoices.reduce((a, i) => a + Number(i.total), 0);
  const iva = invoices.reduce((a, i) => a + Number(i.iva), 0);
  const pendiente = invoices.reduce((a, i) => a + Math.max(0, Number(i.total) - Number(i.pagado)), 0);

  const columns: Column<InvoiceRow>[] = [
    {
      key: "numero",
      header: "Número",
      value: (r) => r.numero,
      render: (r) => <span className="font-medium">{r.numero}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.clients?.razon_social ?? "",
      render: (r) => r.clients?.razon_social ?? "—",
    },
    {
      key: "tipo",
      header: "Tipo",
      value: (r) => r.tipo,
      render: (r) => <StatusBadge value={r.tipo} />,
    },
    {
      key: "emision",
      header: "Emisión",
      value: (r) => r.fecha_emision,
      render: (r) => fecha(r.fecha_emision),
    },
    {
      key: "vencimiento",
      header: "Vencimiento",
      value: (r) => r.fecha_vencimiento ?? "",
      render: (r) => fecha(r.fecha_vencimiento),
    },
    {
      key: "base",
      header: "Base",
      value: (r) => Number(r.base_imponible),
      className: "text-right",
      render: (r) => <span className="tabular">{money(Number(r.base_imponible))}</span>,
    },
    {
      key: "total",
      header: "Total",
      value: (r) => Number(r.total),
      className: "text-right",
      render: (r) => <span className="tabular font-medium">{money(Number(r.total))}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
  ];

  return (
    <>
      <PageHeader
        modulo="Módulo 8"
        titulo="Motor de facturación"
        descripcion="Series de numeración, facturas ordinarias y rectificativas, impuestos, descuentos y cupones."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Total facturado" valor={money(total)} icon={Receipt} />
        <KpiCard titulo="IVA repercutido" valor={money(iva)} icon={Percent} tone="info" />
        <KpiCard titulo="Pendiente de cobro" valor={money(pendiente)} icon={FileText} tone="warning" />
        <KpiCard
          titulo="Cupones activos"
          valor={String(coupons.filter((c) => c.estado === "activo").length)}
          icon={TicketPercent}
          tone="success"
        />
      </div>

      <Tabs defaultValue="facturas">
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="cupones">Cupones</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="mt-4">
          <DataTable
            data={invoices}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Buscar por número o cliente…"
            onRowClick={setSelected}
            onExport={() => exportCsv("facturas", invoices, columns)}
          />
        </TabsContent>

        <TabsContent value="series" className="mt-4">
          <DataTable
            data={series}
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              { key: "nombre", header: "Nombre", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "prefijo",
                header: "Prefijo",
                value: (r) => r.prefijo,
                render: (r) => r.prefijo,
              },
              {
                key: "ejercicio",
                header: "Ejercicio",
                value: (r) => r.ejercicio,
                render: (r) => <span className="tabular">{r.ejercicio}</span>,
              },
              {
                key: "siguiente",
                header: "Siguiente nº",
                value: (r) => r.siguiente_numero,
                render: (r) => <span className="tabular">{r.siguiente_numero}</span>,
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
            ]}
            searchPlaceholder="Buscar serie…"
          />
        </TabsContent>

        <TabsContent value="cupones" className="mt-4">
          <DataTable
            data={coupons}
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              {
                key: "descripcion",
                header: "Descripción",
                value: (r) => r.descripcion ?? "",
                render: (r) => r.descripcion ?? "—",
              },
              {
                key: "tipo",
                header: "Tipo",
                value: (r) => r.tipo,
                render: (r) => (r.tipo === "porcentaje" ? "Porcentaje" : "Importe fijo"),
              },
              {
                key: "valor",
                header: "Valor",
                value: (r) => Number(r.valor),
                className: "text-right",
                render: (r) => (
                  <span className="tabular">
                    {r.tipo === "porcentaje" ? pct(Number(r.valor)) : money(Number(r.valor))}
                  </span>
                ),
              },
              {
                key: "usos",
                header: "Usos",
                value: (r) => r.usos,
                render: (r) => (
                  <span className="tabular">
                    {r.usos}
                    {r.max_usos ? ` / ${r.max_usos}` : ""}
                  </span>
                ),
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
            ]}
            searchPlaceholder="Buscar cupón…"
          />
        </TabsContent>
      </Tabs>

      <InvoiceSheet invoice={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function InvoiceSheet({ invoice, onClose }: { invoice: InvoiceRow | null; onClose: () => void }) {
  const { data: lines = [] } = useRQ({
    ...invoiceLinesQuery(invoice?.id ?? ""),
    enabled: Boolean(invoice),
  });

  return (
    <Sheet open={Boolean(invoice)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {invoice ? (
          <>
            <SheetHeader>
              <SheetTitle>{invoice.numero}</SheetTitle>
              <SheetDescription>
                {invoice.clients?.razon_social ?? "Cliente no asignado"} ·{" "}
                {fecha(invoice.fecha_emision)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={invoice.estado} />
                <StatusBadge value={invoice.tipo} />
                <StatusBadge value={invoice.periodicidad} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Líneas</h3>
                {lines.map((l) => (
                  <div key={l.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{l.concepto}</span>
                      <span className="tabular shrink-0">{money(Number(l.total))}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Number(l.cantidad)} × {money(Number(l.precio_unitario))} · IVA{" "}
                      {pct(Number(l.iva_porcentaje))}
                    </p>
                  </div>
                ))}
                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin líneas registradas.</p>
                ) : null}
              </div>

              <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
                <Row label="Base imponible" value={money(Number(invoice.base_imponible))} />
                <Row label="Descuento" value={`- ${money(Number(invoice.descuento))}`} />
                <Row label="IVA" value={money(Number(invoice.iva))} />
                <Row label="Total" value={money(Number(invoice.total))} strong />
                <Row label="Cobrado" value={money(Number(invoice.pagado))} />
                <Row
                  label="Pendiente"
                  value={money(Math.max(0, Number(invoice.total) - Number(invoice.pagado)))}
                  strong
                />
              </dl>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "tabular font-semibold" : "tabular"}>{value}</dd>
    </div>
  );
}
