import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Euro,
  FileText,
  LifeBuoy,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { money, fecha } from "@/lib/format";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard", "resumen"],
  queryFn: async () => {
    const [invoices, payments, tickets] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, numero, estado, total, pagado, fecha_emision, fecha_vencimiento, clients(razon_social)")
        .is("deleted_at", null)
        .order("fecha_emision", { ascending: false }),
      supabase.from("payments").select("importe, estado, conciliado").is("deleted_at", null),
      supabase
        .from("tickets")
        .select("id, referencia, asunto, estado, prioridad, fecha_apertura")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (invoices.error) throw invoices.error;
    if (payments.error) throw payments.error;
    if (tickets.error) throw tickets.error;
    return {
      invoices: invoices.data ?? [],
      payments: payments.data ?? [],
      tickets: tickets.data ?? [],
    };
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | ServiceHub" },
      {
        name: "description",
        content:
          "Panel de control de ServiceHub: facturación, cobros, contabilidad y soporte en un vistazo.",
      },
      { property: "og:title", content: "Dashboard | ServiceHub" },
      {
        property: "og:description",
        content: "Indicadores de facturación, cobros y soporte de tu plataforma SaaS.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQuery);

  const facturado = data.invoices.reduce((acc, i) => acc + Number(i.total), 0);
  const cobrado = data.payments
    .filter((p) => p.estado === "cobrado")
    .reduce((acc, p) => acc + Number(p.importe), 0);
  const pendiente = data.invoices.reduce(
    (acc, i) => acc + Math.max(0, Number(i.total) - Number(i.pagado)),
    0,
  );
  const vencidas = data.invoices.filter((i) => i.estado === "vencida").length;
  const ticketsAbiertos = data.tickets.filter(
    (t) => t.estado === "abierto" || t.estado === "en_progreso",
  ).length;
  const sinConciliar = data.payments.filter((p) => !p.conciliado).length;

  return (
    <>
      <PageHeader
        modulo="Visión general"
        titulo="Dashboard"
        descripcion="Estado consolidado de la operación: facturación emitida, cobros, riesgo de impago y soporte."
        actions={
          <Button asChild size="sm">
            <Link to="/facturacion">
              Ir a facturación <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Facturado"
          valor={money(facturado)}
          detalle={`${data.invoices.length} facturas`}
          icon={FileText}
        />
        <KpiCard
          titulo="Cobrado"
          valor={money(cobrado)}
          detalle={`${sinConciliar} cobros sin conciliar`}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          titulo="Pendiente de cobro"
          valor={money(pendiente)}
          detalle="Saldo vivo de clientes"
          icon={Euro}
          tone="warning"
        />
        <KpiCard
          titulo="Alertas"
          valor={`${vencidas + ticketsAbiertos}`}
          detalle={`${vencidas} facturas vencidas · ${ticketsAbiertos} tickets abiertos`}
          icon={AlertTriangle}
          tone="destructive"
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas facturas</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/facturacion">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.invoices.slice(0, 6).map((i) => (
              <Link
                key={i.id}
                to="/facturacion"
                search={{ factura: i.id }}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.numero}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {(i.clients as { razon_social: string } | null)?.razon_social ?? "—"} ·{" "}
                    {fecha(i.fecha_emision)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular text-sm font-medium">{money(Number(i.total))}</span>
                  <StatusBadge value={i.estado} />
                </div>
              </Link>
            ))}
            {data.invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin facturas todavía.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Soporte reciente</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/soporte">Ver tickets</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.tickets.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/soporte"
                search={{ ticket: t.id }}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.asunto}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.referencia} · {fecha(t.fecha_apertura)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge value={t.prioridad} />
                  <StatusBadge value={t.estado} />
                </div>
              </Link>
            ))}
            {data.tickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <LifeBuoy className="mx-auto mb-2 h-5 w-5" /> Sin tickets registrados.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
