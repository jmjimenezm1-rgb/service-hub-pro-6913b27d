import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Banknote, CheckCheck, Clock, Link2, Plus, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog, type Field } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  PAGO_METHODS,
  PAGO_STATES,
  estadoPagoLabel,
  purchasesQuery,
  suppliersQuery,
  supplierPaymentsQuery,
  syncPurchasePayments,
  type SupplierPaymentRow,
} from "@/modules/compras/api";
import { diasVencido, tramoAging } from "@/modules/facturacion/logic";
import { useCrud, type Payload } from "@/lib/crud";
import { nextCode } from "@/lib/numbering";
import { money, fecha, label } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos a proveedores | ServiceHub" },
      {
        name: "description",
        content:
          "Pagos a proveedores: vencimientos, métodos de pago, conciliación y previsión de tesorería.",
      },
      { property: "og:title", content: "Pagos a proveedores | ServiceHub" },
      {
        property: "og:description",
        content: "Planifica y controla los pagos a proveedores y su conciliación bancaria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PagosPage,
});

function PagosPage() {
  const qc = useQueryClient();
  const { data: pagos = [], isLoading } = useQuery(supplierPaymentsQuery);
  const { data: suppliers = [] } = useQuery(suppliersQuery);
  const { data: purchases = [] } = useQuery(purchasesQuery);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPaymentRow | null>(null);
  const [vencDesde, setVencDesde] = useState("");
  const [vencHasta, setVencHasta] = useState("");
  const [aprobando, setAprobando] = useState(false);

  const vencimientoPorCompra = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of purchases) map.set(p.id, p.fecha_vencimiento);
    return map;
  }, [purchases]);

  const pagosFiltrados = useMemo(
    () =>
      pagos.filter((p) => {
        const f = p.purchase_invoice_id
          ? vencimientoPorCompra.get(p.purchase_invoice_id)
          : null;
        if (vencDesde && (!f || f < vencDesde)) return false;
        if (vencHasta && (!f || f > vencHasta)) return false;
        return true;
      }),
    [pagos, vencimientoPorCompra, vencDesde, vencHasta],
  );

  const aprobarFiltradas = async () => {
    const ids = new Set(
      pagosFiltrados
        .map((p) => p.purchase_invoice_id)
        .filter((id): id is string => Boolean(id)),
    );
    const candidatas = purchases.filter(
      (p) => ids.has(p.id) && !["aprobada", "contabilizada", "pagada", "anulada"].includes(p.estado),
    );
    if (candidatas.length === 0) {
      toast.info("No hay facturas filtradas pendientes de aprobación.");
      return;
    }
    setAprobando(true);
    try {
      const { error } = await supabase
        .from("purchase_invoices")
        .update({ estado: "aprobada" })
        .in(
          "id",
          candidatas.map((p) => p.id),
        );
      if (error) throw error;
      toast.success(`${candidatas.length} facturas aprobadas para pago.`);
      void qc.invalidateQueries({ queryKey: ["compras"] });
    } catch (e) {
      toast.error(`Error al aprobar: ${(e as Error).message}`);
    } finally {
      setAprobando(false);
    }
  };

  const crud = useCrud("supplier_payments", {
    modulo: "pagos",
    entidad: "Pago",
    invalidate: [["pagos"], ["compras"], ["dashboard"]],
  });

  const sync = async (purchaseId: string | null | undefined) => {
    if (!purchaseId) return;
    try {
      await syncPurchasePayments(purchaseId);
      void qc.invalidateQueries({ queryKey: ["compras"] });
      void qc.invalidateQueries({ queryKey: ["pagos"] });
    } catch (e) {
      toast.error(`No se pudo actualizar la factura de compra: ${(e as Error).message}`);
    }
  };

  const nextRef = async () => {
    const fromPattern = await nextCode("pago");
    if (fromPattern) return fromPattern;
    const year = new Date().getFullYear();
    const n = pagos.filter((p) => p.referencia.includes(String(year))).length + 1;
    return `PAG-${year}-${String(n).padStart(4, "0")}`;
  };

  const abiertas = purchases.filter(
    (p) => p.estado !== "anulada" && Number(p.pagado) < Number(p.total),
  );

  const fields: Field[] = useMemo(
    () => [
      {
        name: "referencia",
        label: "Referencia",
        placeholder: "Se genera automáticamente",
        help: "Si lo dejas vacío se genera con el patrón definido en Parametrización.",
      },
      {
        name: "supplier_id",
        label: "Proveedor",
        type: "select",
        options: suppliers.map((s) => ({ value: s.id, label: s.razon_social })),
      },
      {
        name: "purchase_invoice_id",
        label: "Factura de compra",
        type: "select",
        help: "El saldo pendiente de la compra se recalcula con los pagos registrados.",
        options: abiertas.map((p) => ({
          value: p.id,
          label: `${p.numero} · pendiente ${money(Number(p.total) - Number(p.pagado))}`,
        })),
      },
      { name: "importe", label: "Importe (€)", type: "number", step: "0.01", required: true },
      {
        name: "metodo",
        label: "Método de pago",
        type: "select",
        required: true,
        options: PAGO_METHODS.map((m) => ({ value: m, label: label(m) })),
      },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: PAGO_STATES,
      },
      { name: "fecha_prevista", label: "Fecha prevista", type: "date" },
      { name: "fecha_pago", label: "Fecha de pago", type: "date" },
      { name: "fecha_devolucion", label: "Fecha de devolución", type: "date" },
      { name: "conciliado", label: "Conciliado", type: "switch" },
      { name: "fecha_conciliacion", label: "Fecha de conciliación", type: "date" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [suppliers, abiertas],
  );

  const submit = async (values: Payload) => {
    if (editing) {
      await crud.update.mutateAsync({ id: editing.id, values });
      await sync(editing.purchase_invoice_id);
      if (
        values["purchase_invoice_id"] &&
        values["purchase_invoice_id"] !== editing.purchase_invoice_id
      )
        await sync(String(values["purchase_invoice_id"]));
    } else {
      const referencia = values["referencia"] ? String(values["referencia"]) : await nextRef();
      await crud.create.mutateAsync({ ...values, referencia });
      await sync(values["purchase_invoice_id"] ? String(values["purchase_invoice_id"]) : null);
    }
    setOpen(false);
    setEditing(null);
  };

  const marcarPagado = async (row: SupplierPaymentRow) => {
    await crud.update.mutateAsync({
      id: row.id,
      values: { estado: "cobrado", fecha_pago: new Date().toISOString().slice(0, 10) },
    });
    await sync(row.purchase_invoice_id);
  };

  const marcarRechazado = async (row: SupplierPaymentRow) => {
    await crud.update.mutateAsync({
      id: row.id,
      values: { estado: "impagado", fecha_devolucion: new Date().toISOString().slice(0, 10) },
    });
    await sync(row.purchase_invoice_id);
  };

  const conciliar = (row: SupplierPaymentRow) =>
    crud.update.mutate({
      id: row.id,
      values: {
        conciliado: !row.conciliado,
        fecha_conciliacion: row.conciliado ? null : new Date().toISOString().slice(0, 10),
      },
    });

  const eliminar = async (row: SupplierPaymentRow) => {
    await crud.remove.mutateAsync(row.id);
    await sync(row.purchase_invoice_id);
  };

  const pagado = pagos
    .filter((p) => p.estado === "cobrado")
    .reduce((a, p) => a + Number(p.importe), 0);
  const pendientes = pagos.filter((p) => p.estado === "pendiente");
  const vencidos = pendientes.filter((p) => diasVencido(p.fecha_prevista) > 0);
  const sinConciliar = pagos.filter((p) => p.estado === "cobrado" && !p.conciliado);

  const previsiones = useMemo(() => {
    const tramos = ["Al corriente", "1-30 días", "31-60 días", "61-90 días", "+90 días"];
    return tramos.map((tramo) => {
      const rows = pendientes.filter((p) => tramoAging(diasVencido(p.fecha_prevista)) === tramo);
      return {
        id: tramo,
        tramo,
        pagos: rows.length,
        importe: rows.reduce((a, p) => a + Number(p.importe), 0),
      };
    });
  }, [pendientes]);

  const columns: Column<SupplierPaymentRow>[] = [
    {
      key: "referencia",
      header: "Referencia",
      value: (r) => r.referencia,
      render: (r) => <span className="font-medium">{r.referencia}</span>,
    },
    {
      key: "proveedor",
      header: "Proveedor",
      value: (r) => r.suppliers?.razon_social ?? "",
      render: (r) => r.suppliers?.razon_social ?? "—",
    },
    {
      key: "compra",
      header: "Factura de compra",
      value: (r) => r.purchase_invoices?.numero ?? "",
      render: (r) => r.purchase_invoices?.numero ?? "—",
    },
    { key: "metodo", header: "Método", value: (r) => r.metodo, render: (r) => label(r.metodo) },
    {
      key: "fecha",
      header: "Fecha",
      value: (r) => r.fecha_pago ?? r.fecha_prevista ?? "",
      render: (r) => fecha(r.fecha_pago ?? r.fecha_prevista),
    },
    {
      key: "aging",
      header: "Vencimiento",
      value: (r) => (r.estado === "cobrado" ? 0 : diasVencido(r.fecha_prevista)),
      render: (r) => {
        if (r.estado === "cobrado") return <span className="text-muted-foreground">—</span>;
        const dias = diasVencido(r.fecha_prevista);
        return dias > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm text-destructive">
            <Clock className="h-4 w-4" /> {dias} d · {tramoAging(dias)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Al corriente</span>
        );
      },
    },
    {
      key: "importe",
      header: "Importe",
      className: "text-right",
      value: (r) => Number(r.importe),
      render: (r) => <span className="tabular font-medium">{money(Number(r.importe))}</span>,
    },
    {
      key: "conciliado",
      header: "Conciliación",
      value: (r) => (r.conciliado ? "conciliado" : "pendiente"),
      render: (r) =>
        r.conciliado ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <BadgeCheck className="h-4 w-4" /> {fecha(r.fecha_conciliacion)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin conciliar</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} label={estadoPagoLabel(r.estado)} />,
    },
    {
      key: "acciones",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <RowActions
          onEdit={() => {
            setEditing(r);
            setOpen(true);
          }}
          onDelete={() => void eliminar(r)}
          deleteLabel="¿Eliminar este pago?"
          extra={[
            {
              label: "Marcar como pagado",
              icon: <Banknote className="h-4 w-4" />,
              onSelect: () => void marcarPagado(r),
              disabled: r.estado === "cobrado",
            },
            {
              label: "Marcar como rechazado",
              icon: <TriangleAlert className="h-4 w-4" />,
              onSelect: () => void marcarRechazado(r),
              disabled: r.estado === "impagado",
            },
            {
              label: r.conciliado ? "Deshacer conciliación" : "Conciliar",
              icon: <Link2 className="h-4 w-4" />,
              onSelect: () => conciliar(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        modulo="Módulo 16"
        titulo="Pagos a proveedores"
        descripcion="Planificación de pagos, vencimientos y conciliación bancaria de la salida de caja."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo pago
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Pagado" valor={money(pagado)} icon={Banknote} tone="success" />
        <KpiCard
          titulo="Pendiente de pago"
          valor={money(pendientes.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${pendientes.length} pagos · ${vencidos.length} vencidos`}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          titulo="Vencidos"
          valor={money(vencidos.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${vencidos.length} pagos fuera de plazo`}
          icon={TriangleAlert}
          tone="destructive"
        />
        <KpiCard
          titulo="Sin conciliar"
          valor={money(sinConciliar.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${sinConciliar.length} pagos por conciliar`}
          icon={Link2}
          tone="info"
        />
      </div>

      <Tabs defaultValue="pagos">
        <TabsList>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="conciliacion">Conciliación</TabsTrigger>
          <TabsTrigger value="prevision">Previsión de tesorería</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos" className="mt-4">
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
            <div className="space-y-1">
              <Label htmlFor="pagos-venc-desde" className="text-xs">
                Vencimiento factura desde
              </Label>
              <Input
                id="pagos-venc-desde"
                type="date"
                value={vencDesde}
                onChange={(e) => setVencDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pagos-venc-hasta" className="text-xs">
                Vencimiento factura hasta
              </Label>
              <Input
                id="pagos-venc-hasta"
                type="date"
                value={vencHasta}
                onChange={(e) => setVencHasta(e.target.value)}
                className="w-40"
              />
            </div>
            {(vencDesde || vencHasta) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVencDesde("");
                  setVencHasta("");
                }}
              >
                Limpiar
              </Button>
            )}
            <div className="ml-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void aprobarFiltradas()}
                disabled={aprobando || pagosFiltrados.length === 0}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                {aprobando ? "Aprobando…" : "Aprobar facturas filtradas"}
              </Button>
            </div>
          </div>
          <DataTable
            data={pagosFiltrados}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Buscar por referencia, proveedor o factura…"
            onExport={() => exportCsv("pagos-proveedores", pagosFiltrados, columns)}
          />
        </TabsContent>

        <TabsContent value="conciliacion" className="mt-4">
          <DataTable
            data={sinConciliar}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Buscar pago sin conciliar…"
            onExport={() => exportCsv("pagos-conciliacion", sinConciliar, columns)}
          />
        </TabsContent>

        <TabsContent value="prevision" className="mt-4">
          <DataTable
            data={previsiones}
            columns={[
              { key: "tramo", header: "Tramo", value: (r) => r.tramo, render: (r) => r.tramo },
              {
                key: "pagos",
                header: "Pagos",
                className: "text-right",
                value: (r) => r.pagos,
                render: (r) => <span className="tabular">{r.pagos}</span>,
              },
              {
                key: "importe",
                header: "Importe pendiente",
                className: "text-right",
                value: (r) => r.importe,
                render: (r) => <span className="tabular font-medium">{money(r.importe)}</span>,
              },
            ]}
            searchPlaceholder="Buscar tramo…"
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? `Editar pago ${editing.referencia}` : "Registrar pago"}
        description="Vincula el pago a una factura de compra para mantener el saldo del proveedor al día."
        fields={fields}
        initial={(editing as unknown as Payload | null) ?? { estado: "pendiente", metodo: "transferencia" }}
        submitting={crud.saving}
        onSubmit={submit}
      />
    </>
  );
}
