import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  BookOpen,
  FileText,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  Send,
  TicketPercent,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog, type Field } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  invoicesQuery,
  seriesQuery,
  couponsQuery,
  invoiceLinesQuery,
  nextInvoiceNumber,
  recalcInvoice,
  lineAmount,
  BILLING_PERIODS,
  CHARGE_TYPES,
  INVOICE_STATES,
  INVOICE_TYPES,
  type InvoiceRow,
} from "@/modules/facturacion/api";
import {
  createRectificativa,
  postInvoiceToLedger,
  syncInvoicePayments,
} from "@/modules/facturacion/logic";
import { applicationsQuery, clientsQuery, toOptions } from "@/modules/common/api";
import { useCrud, type Payload } from "@/lib/crud";
import { money, fecha, pct, label } from "@/lib/format";

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
  const qc = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery(invoicesQuery);
  const { data: series = [] } = useQuery(seriesQuery);
  const { data: coupons = [] } = useQuery(couponsQuery);
  const { data: clients = [] } = useQuery(clientsQuery);

  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [serieOpen, setSerieOpen] = useState(false);
  const [editingSerie, setEditingSerie] = useState<Payload | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Payload | null>(null);

  const invoiceCrud = useCrud("invoices", {
    modulo: "facturacion",
    entidad: "Factura",
    invalidate: [["facturacion"], ["dashboard"], ["cobros"]],
  });
  const serieCrud = useCrud("invoice_series", {
    modulo: "facturacion",
    entidad: "Serie",
    invalidate: [["facturacion"]],
  });
  const couponCrud = useCrud("coupons", {
    modulo: "facturacion",
    entidad: "Cupón",
    invalidate: [["facturacion"]],
  });

  const invoiceFields: Field[] = useMemo(
    () => [
      {
        name: "serie_id",
        label: "Serie",
        type: "select",
        required: !editingInvoice,
        options: series.map((s) => ({ value: s.id, label: `${s.codigo} · ${s.prefijo}` })),
        help: editingInvoice ? undefined : "El número se asigna automáticamente desde la serie.",
      },
      { name: "client_id", label: "Cliente", type: "select", required: true, options: toOptions(clients) },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        required: true,
        options: INVOICE_TYPES.map((t) => ({ value: t, label: label(t) })),
      },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: INVOICE_STATES.map((t) => ({ value: t, label: label(t) })),
      },
      {
        name: "periodicidad",
        label: "Periodicidad",
        type: "select",
        required: true,
        options: BILLING_PERIODS.map((t) => ({ value: t, label: label(t) })),
      },
      {
        name: "coupon_id",
        label: "Cupón",
        type: "select",
        options: coupons.map((c) => ({ value: c.id, label: c.codigo })),
      },
      { name: "fecha_emision", label: "Fecha de emisión", type: "date", required: true },
      { name: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date" },
      { name: "periodo_desde", label: "Periodo desde", type: "date" },
      { name: "periodo_hasta", label: "Periodo hasta", type: "date" },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
    [series, clients, coupons, editingInvoice],
  );

  const submitInvoice = async (values: Payload) => {
    if (editingInvoice) {
      await invoiceCrud.update.mutateAsync({ id: editingInvoice.id, values });
    } else {
      const numero = await nextInvoiceNumber(String(values["serie_id"]));
      await invoiceCrud.create.mutateAsync({ ...values, numero, moneda: "EUR" });
      void qc.invalidateQueries({ queryKey: ["facturacion", "series"] });
    }
    setInvoiceOpen(false);
    setEditingInvoice(null);
  };

  const recalcularSaldo = async (r: InvoiceRow) => {
    try {
      await syncInvoicePayments(r.id);
      toast.success(`Saldo de ${r.numero} actualizado con los cobros registrados`);
      void qc.invalidateQueries({ queryKey: ["facturacion"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const contabilizar = async (r: InvoiceRow) => {
    try {
      const numero = await postInvoiceToLedger(r.id);
      toast.success(`Factura contabilizada en el asiento ${numero}`);
      void qc.invalidateQueries({ queryKey: ["financiero"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rectificar = async (r: InvoiceRow) => {
    try {
      const numero = await createRectificativa(r.id);
      toast.success(`Rectificativa ${numero} creada en borrador`);
      void qc.invalidateQueries({ queryKey: ["facturacion"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const total = invoices.reduce((a, i) => a + Number(i.total), 0);
  const iva = invoices.reduce((a, i) => a + Number(i.iva), 0);
  const pendiente = invoices.reduce(
    (a, i) => a + Math.max(0, Number(i.total) - Number(i.pagado)),
    0,
  );

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
    {
      key: "acciones",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <RowActions
          onEdit={() => {
            setEditingInvoice(r);
            setInvoiceOpen(true);
          }}
          onDelete={() => invoiceCrud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar la factura ${r.numero}?`}
          extra={[
            {
              label: "Marcar como enviada",
              icon: <Send className="h-4 w-4" />,
              onSelect: () => invoiceCrud.update.mutate({ id: r.id, values: { estado: "enviada" } }),
              disabled: r.estado === "enviada" || r.estado === "pagada",
            },
            {
              label: "Marcar como pagada",
              icon: <Receipt className="h-4 w-4" />,
              onSelect: () =>
                invoiceCrud.update.mutate({
                  id: r.id,
                  values: { estado: "pagada", pagado: Number(r.total) },
                }),
              disabled: r.estado === "pagada",
            },
            {
              label: "Recalcular saldo con cobros",
              icon: <RotateCcw className="h-4 w-4" />,
              onSelect: () => void recalcularSaldo(r),
              disabled: r.estado === "anulada",
            },
            {
              label: "Contabilizar factura",
              icon: <BookOpen className="h-4 w-4" />,
              onSelect: () => void contabilizar(r),
              disabled: r.estado === "borrador" || r.estado === "anulada",
            },
            {
              label: "Emitir rectificativa",
              icon: <Ban className="h-4 w-4" />,
              onSelect: () => void rectificar(r),
              disabled: r.tipo !== "ordinaria",
            },
            {
              label: "Anular factura",
              icon: <Ban className="h-4 w-4" />,
              onSelect: () => invoiceCrud.update.mutate({ id: r.id, values: { estado: "anulada" } }),
              disabled: r.estado === "anulada",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        modulo="Módulo 8"
        titulo="Motor de facturación"
        descripcion="Series de numeración, facturas ordinarias y rectificativas, impuestos, descuentos y cupones."
        actions={
          <Button
            onClick={() => {
              setEditingInvoice(null);
              setInvoiceOpen(true);
            }}
            disabled={series.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nueva factura
          </Button>
        }
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
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingSerie(null);
                  setSerieOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nueva serie
              </Button>
            }
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              {
                key: "descripcion_serie",
                header: "Descripción",
                value: (r) => r.descripcion ?? "",
                render: (r) => r.descripcion ?? "—",
              },
              { key: "prefijo", header: "Prefijo", value: (r) => r.prefijo, render: (r) => r.prefijo },
              {
                key: "ejercicio",
                header: "Ejercicio",
                value: (r) => r.ejercicio,
                render: (r) => <span className="tabular">{r.ejercicio}</span>,
              },
              {
                key: "siguiente",
                header: "Siguiente nº",
                value: (r) => r.proximo_numero,
                render: (r) => <span className="tabular">{r.proximo_numero}</span>,
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
              {
                key: "acciones",
                header: "",
                sortable: false,
                className: "w-12 text-right",
                render: (r) => (
                  <RowActions
                    onEdit={() => {
                      setEditingSerie(r as unknown as Payload);
                      setSerieOpen(true);
                    }}
                    onDelete={() => serieCrud.remove.mutate(r.id)}
                  />
                ),
              },
            ]}
            searchPlaceholder="Buscar serie…"
          />
        </TabsContent>

        <TabsContent value="cupones" className="mt-4">
          <DataTable
            data={coupons}
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingCoupon(null);
                  setCouponOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo cupón
              </Button>
            }
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
                value: (r) => r.usos_actuales,
                render: (r) => (
                  <span className="tabular">
                    {r.usos_actuales}
                    {r.usos_maximos ? ` / ${r.usos_maximos}` : ""}
                  </span>
                ),
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
              {
                key: "acciones",
                header: "",
                sortable: false,
                className: "w-12 text-right",
                render: (r) => (
                  <RowActions
                    onEdit={() => {
                      setEditingCoupon(r as unknown as Payload);
                      setCouponOpen(true);
                    }}
                    onDelete={() => couponCrud.remove.mutate(r.id)}
                  />
                ),
              },
            ]}
            searchPlaceholder="Buscar cupón…"
          />
        </TabsContent>
      </Tabs>

      <InvoiceSheet invoice={selected} onClose={() => setSelected(null)} />

      <FormDialog
        open={invoiceOpen}
        onOpenChange={(o) => {
          setInvoiceOpen(o);
          if (!o) setEditingInvoice(null);
        }}
        title={editingInvoice ? `Editar factura ${editingInvoice.numero}` : "Nueva factura"}
        description="Tras crear la factura, añade sus líneas desde el detalle para calcular base, IVA y total."
        fields={invoiceFields}
        initial={editingInvoice as unknown as Payload | null}
        submitting={invoiceCrud.saving}
        onSubmit={submitInvoice}
      />

      <FormDialog
        open={serieOpen}
        onOpenChange={(o) => {
          setSerieOpen(o);
          if (!o) setEditingSerie(null);
        }}
        title={editingSerie ? "Editar serie" : "Nueva serie de facturación"}
        fields={[
          { name: "codigo", label: "Código", required: true, placeholder: "GEN" },
          { name: "prefijo", label: "Prefijo", required: true, placeholder: "FAC" },
          { name: "descripcion", label: "Descripción", type: "textarea" },
          {
            name: "ejercicio",
            label: "Ejercicio",
            type: "number",
            required: true,
            placeholder: String(new Date().getFullYear()),
          },
          { name: "proximo_numero", label: "Próximo número", type: "number", required: true },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ["activo", "inactivo", "archivado"].map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editingSerie}
        submitting={serieCrud.saving}
        onSubmit={async (values) => {
          if (editingSerie) await serieCrud.update.mutateAsync({ id: String(editingSerie["id"]), values });
          else await serieCrud.create.mutateAsync(values);
          setSerieOpen(false);
          setEditingSerie(null);
        }}
      />

      <FormDialog
        open={couponOpen}
        onOpenChange={(o) => {
          setCouponOpen(o);
          if (!o) setEditingCoupon(null);
        }}
        title={editingCoupon ? "Editar cupón" : "Nuevo cupón"}
        fields={[
          { name: "codigo", label: "Código", required: true, placeholder: "BLACKFRIDAY" },
          {
            name: "tipo",
            label: "Tipo",
            type: "select",
            required: true,
            options: [
              { value: "porcentaje", label: "Porcentaje" },
              { value: "importe", label: "Importe fijo" },
            ],
          },
          { name: "valor", label: "Valor", type: "number", step: "0.01", required: true },
          { name: "descripcion", label: "Descripción", type: "textarea" },
          { name: "valido_desde", label: "Válido desde", type: "date" },
          { name: "valido_hasta", label: "Válido hasta", type: "date" },
          { name: "usos_maximos", label: "Usos máximos", type: "number" },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ["activo", "inactivo", "archivado"].map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editingCoupon}
        submitting={couponCrud.saving}
        onSubmit={async (values) => {
          if (editingCoupon)
            await couponCrud.update.mutateAsync({ id: String(editingCoupon["id"]), values });
          else await couponCrud.create.mutateAsync({ ...values, usos_actuales: 0 });
          setCouponOpen(false);
          setEditingCoupon(null);
        }}
      />
    </>
  );
}

function InvoiceSheet({ invoice, onClose }: { invoice: InvoiceRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: applications = [] } = useQuery(applicationsQuery);
  const [lineOpen, setLineOpen] = useState(false);

  const { data: lines = [] } = useQuery({
    ...invoiceLinesQuery(invoice?.id ?? ""),
    enabled: Boolean(invoice),
  });

  const lineCrud = useCrud("invoice_lines", {
    modulo: "facturacion",
    entidad: "Línea",
    invalidate: [["facturacion"]],
  });

  const afterLineChange = async () => {
    if (!invoice) return;
    try {
      await recalcInvoice(invoice.id);
    } catch (e) {
      toast.error(`No se pudieron recalcular los totales: ${(e as Error).message}`);
    }
    void qc.invalidateQueries({ queryKey: ["facturacion"] });
  };

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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Líneas</h3>
                  <Button size="sm" variant="outline" onClick={() => setLineOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> Añadir línea
                  </Button>
                </div>
                {lines.map((l) => (
                  <div key={l.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate">{l.concepto}</span>
                      <span className="tabular shrink-0">{money(Number(l.importe))}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-destructive"
                        aria-label="Eliminar línea"
                        onClick={async () => {
                          await lineCrud.remove.mutateAsync(l.id);
                          await afterLineChange();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Number(l.cantidad)} × {money(Number(l.precio_unitario))} · dto{" "}
                      {pct(Number(l.descuento_pct))} · IVA {pct(Number(l.iva_pct))}
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

            <FormDialog
              open={lineOpen}
              onOpenChange={setLineOpen}
              title="Nueva línea de factura"
              fields={[
                { name: "concepto", label: "Concepto", required: true, full: true },
                {
                  name: "application_id",
                  label: "Aplicación",
                  type: "select",
                  options: toOptions(applications),
                },
                {
                  name: "tipo_cargo",
                  label: "Tipo de cargo",
                  type: "select",
                  required: true,
                  options: CHARGE_TYPES.map((t) => ({ value: t, label: label(t) })),
                },
                { name: "cantidad", label: "Cantidad", type: "number", step: "0.01", required: true },
                {
                  name: "precio_unitario",
                  label: "Precio unitario (€)",
                  type: "number",
                  step: "0.01",
                  required: true,
                },
                { name: "descuento_pct", label: "Descuento (%)", type: "number", step: "0.01" },
                { name: "iva_pct", label: "IVA (%)", type: "number", step: "0.01", required: true },
              ]}
              submitting={lineCrud.saving}
              onSubmit={async (values) => {
                const cantidad = Number(values["cantidad"] ?? 0);
                const precio = Number(values["precio_unitario"] ?? 0);
                const dto = Number(values["descuento_pct"] ?? 0);
                const ivaPct = Number(values["iva_pct"] ?? 0);
                await lineCrud.create.mutateAsync({
                  ...values,
                  descuento_pct: dto,
                  invoice_id: invoice.id,
                  orden: lines.length + 1,
                  importe: lineAmount({
                    cantidad,
                    precio_unitario: precio,
                    descuento_pct: dto,
                    iva_pct: ivaPct,
                  }),
                });
                await afterLineChange();
                setLineOpen(false);
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label: title, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{title}</dt>
      <dd className={strong ? "tabular font-semibold" : "tabular"}>{value}</dd>
    </div>
  );
}
