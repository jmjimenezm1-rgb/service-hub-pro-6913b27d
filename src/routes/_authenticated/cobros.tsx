import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Banknote,
  BookOpen,
  CircleAlert,
  Clock,
  Link2,
  Plus,
  TriangleAlert,
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
  paymentsQuery,
  openInvoicesQuery,
  PAYMENT_METHODS,
  PAYMENT_STATES,
  type PaymentRow,
} from "@/modules/cobros/api";
import {
  diasVencido,
  postPaymentToLedger,
  syncInvoicePayments,
  tramoAging,
} from "@/modules/facturacion/logic";
import { clientsQuery, toOptions } from "@/modules/common/api";
import { useCrud, type Payload } from "@/lib/crud";
import { money, fecha, label } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/cobros")({
  head: () => ({
    meta: [
      { title: "Cobros | ServiceHub" },
      {
        name: "description",
        content: "Gestión de cobros, métodos de pago, conciliación bancaria e impagos.",
      },
      { property: "og:title", content: "Cobros | ServiceHub" },
      {
        property: "og:description",
        content: "Controla cobros, conciliación y saldos pendientes de tus clientes.",
      },
    ],
  }),
  component: CobrosPage,
});

function CobrosPage() {
  const { data: payments = [], isLoading } = useQuery(paymentsQuery);
  const { data: clients = [] } = useQuery(clientsQuery);
  const { data: invoices = [] } = useQuery(openInvoicesQuery);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);

  const crud = useCrud("payments", {
    modulo: "cobros",
    entidad: "Cobro",
    invalidate: [["cobros"], ["facturacion"], ["dashboard"]],
  });

  const fields: Field[] = useMemo(
    () => [
      { name: "referencia", label: "Referencia", required: true, placeholder: "COB-2026-0001" },
      {
        name: "client_id",
        label: "Cliente",
        type: "select",
        options: toOptions(clients),
      },
      {
        name: "invoice_id",
        label: "Factura",
        type: "select",
        options: invoices.map((i) => ({
          value: i.id,
          label: `${i.numero} · pendiente ${money(Number(i.total) - Number(i.pagado))}`,
        })),
      },
      { name: "importe", label: "Importe (€)", type: "number", step: "0.01", required: true },
      {
        name: "metodo",
        label: "Método de pago",
        type: "select",
        required: true,
        options: PAYMENT_METHODS.map((m) => ({ value: m, label: label(m) })),
      },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: PAYMENT_STATES.map((s) => ({ value: s, label: label(s) })),
      },
      { name: "fecha_prevista", label: "Fecha prevista", type: "date" },
      { name: "fecha_cobro", label: "Fecha de cobro", type: "date" },
      { name: "fecha_devolucion", label: "Fecha de devolución", type: "date" },
      { name: "conciliado", label: "Conciliado", type: "switch" },
      { name: "fecha_conciliacion", label: "Fecha de conciliación", type: "date" },
      { name: "aviso_enviado", label: "Aviso enviado al cliente", type: "switch" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
    [clients, invoices],
  );

  const submit = async (values: Payload) => {
    if (editing) await crud.update.mutateAsync({ id: editing.id, values });
    else await crud.create.mutateAsync(values);
    setOpen(false);
    setEditing(null);
  };

  const marcarCobrado = (row: PaymentRow) =>
    crud.update.mutate({
      id: row.id,
      values: { estado: "cobrado", fecha_cobro: new Date().toISOString().slice(0, 10) },
    });

  const conciliar = (row: PaymentRow) =>
    crud.update.mutate({
      id: row.id,
      values: {
        conciliado: !row.conciliado,
        fecha_conciliacion: row.conciliado ? null : new Date().toISOString().slice(0, 10),
      },
    });

  const cobrado = payments
    .filter((p) => p.estado === "cobrado")
    .reduce((a, p) => a + Number(p.importe), 0);
  const pendientes = payments.filter((p) => p.estado === "pendiente");
  const impagados = payments.filter((p) => p.estado === "impagado" || p.estado === "devuelto");

  const columns: Column<PaymentRow>[] = [
    {
      key: "referencia",
      header: "Referencia",
      value: (r) => r.referencia,
      render: (r) => <span className="font-medium">{r.referencia}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.clients?.razon_social ?? "",
      render: (r) => r.clients?.razon_social ?? "—",
    },
    {
      key: "factura",
      header: "Factura",
      value: (r) => r.invoices?.numero ?? "",
      render: (r) => r.invoices?.numero ?? "—",
    },
    {
      key: "metodo",
      header: "Método",
      value: (r) => r.metodo,
      render: (r) => label(r.metodo),
    },
    {
      key: "fecha",
      header: "Fecha",
      value: (r) => r.fecha_cobro ?? r.fecha_prevista ?? "",
      render: (r) => fecha(r.fecha_cobro ?? r.fecha_prevista),
    },
    {
      key: "importe",
      header: "Importe",
      value: (r) => Number(r.importe),
      className: "text-right",
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
            setEditing(r);
            setOpen(true);
          }}
          onDelete={() => crud.remove.mutate(r.id)}
          deleteLabel="¿Eliminar este cobro?"
          extra={[
            {
              label: "Marcar como cobrado",
              icon: <Banknote className="h-4 w-4" />,
              onSelect: () => marcarCobrado(r),
              disabled: r.estado === "cobrado",
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
        modulo="Módulo 9"
        titulo="Gestión de cobros"
        descripcion="Registro de cobros por método de pago, conciliación bancaria y seguimiento de impagos."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo cobro
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Cobrado" valor={money(cobrado)} icon={Banknote} tone="success" />
        <KpiCard
          titulo="Pendiente"
          valor={money(pendientes.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${pendientes.length} cobros`}
          icon={Banknote}
          tone="warning"
        />
        <KpiCard
          titulo="Impagados / devueltos"
          valor={money(impagados.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${impagados.length} incidencias`}
          icon={CircleAlert}
          tone="destructive"
        />
      </div>

      <DataTable
        data={payments}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Buscar por referencia, cliente o factura…"
        onExport={() => exportCsv("cobros", payments, columns)}
      />

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? `Editar cobro ${editing.referencia}` : "Registrar cobro"}
        description="Vincula el cobro a una factura y a un cliente para mantener el saldo actualizado."
        fields={fields}
        initial={editing as unknown as Payload | null}
        submitting={crud.saving}
        onSubmit={submit}
      />
    </>
  );
}
