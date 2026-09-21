import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Eye, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { diffValues, logAudit, type AuditEntry } from "@/lib/audit";
import { fechaHora, label } from "@/lib/format";

const RANGOS = [
  { value: "1", label: "Últimas 24 horas" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "0", label: "Todo el histórico" },
] as const;

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría | ServiceHub" },
      {
        name: "description",
        content:
          "Traza inalterable de todas las operaciones: quién, qué, cuándo, desde dónde y qué cambió.",
      },
      { property: "og:title", content: "Auditoría | ServiceHub" },
      {
        property: "og:description",
        content: "Registro completo e inmutable de la actividad de la plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditoriaPage,
});

function valueText(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AuditoriaPage() {
  const [modulo, setModulo] = useState("todos");
  const [accion, setAccion] = useState("todas");
  const [usuario, setUsuario] = useState("todos");
  const [rango, setRango] = useState("7");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["auditoria", "log", rango],
    queryFn: async (): Promise<AuditEntry[]> => {
      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (rango !== "0") {
        const desde = new Date(Date.now() - Number(rango) * 86400000).toISOString();
        q = q.gte("created_at", desde);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditEntry[];
    },
  });

  const modulos = useMemo(
    () => Array.from(new Set(entries.map((e) => e.modulo))).sort(),
    [entries],
  );
  const acciones = useMemo(
    () => Array.from(new Set(entries.map((e) => e.accion))).sort(),
    [entries],
  );
  const usuarios = useMemo(
    () => Array.from(new Set(entries.map((e) => e.user_email ?? "sistema"))).sort(),
    [entries],
  );

  const rows = useMemo(
    () =>
      entries.filter(
        (e) =>
          (modulo === "todos" || e.modulo === modulo) &&
          (accion === "todas" || e.accion === accion) &&
          (usuario === "todos" || (e.user_email ?? "sistema") === usuario),
      ),
    [entries, modulo, accion, usuario],
  );

  const columns: Column<AuditEntry>[] = [
    {
      key: "created_at",
      header: "Cuándo",
      value: (r) => r.created_at,
      render: (r) => <span className="whitespace-nowrap text-sm">{fechaHora(r.created_at)}</span>,
    },
    {
      key: "user_email",
      header: "Quién",
      value: (r) => r.user_email ?? "sistema",
      render: (r) => (
        <span className="text-sm font-medium">{r.user_email ?? "Sistema"}</span>
      ),
    },
    {
      key: "accion",
      header: "Qué hizo",
      value: (r) => r.accion,
      render: (r) => <StatusBadge value={r.accion} />,
    },
    {
      key: "modulo",
      header: "Módulo",
      value: (r) => r.modulo,
      render: (r) => label(r.modulo),
    },
    {
      key: "entidad",
      header: "Elemento",
      value: (r) => r.entidad,
      render: (r) => (
        <span className="text-sm">
          {label(r.entidad)}
          {r.entidad_id ? (
            <span className="ml-1 text-xs text-muted-foreground">
              ·&nbsp;{r.entidad_id.slice(0, 8)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "cambios",
      header: "Qué cambió",
      value: (r) => diffValues(r.valor_anterior, r.valor_nuevo).length,
      render: (r) => {
        const n = diffValues(r.valor_anterior, r.valor_nuevo).length;
        return <span className="tabular text-sm">{n === 0 ? "—" : `${n} campo${n === 1 ? "" : "s"}`}</span>;
      },
    },
    {
      key: "ip",
      header: "Desde dónde",
      value: (r) => r.ip ?? "",
      render: (r) => (
        <span className="tabular text-xs text-muted-foreground">{r.ip ?? "—"}</span>
      ),
    },
    {
      key: "detalle",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <Button variant="ghost" size="icon" onClick={() => setSelected(r)} aria-label="Ver detalle">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const hoy = entries.filter(
    (e) => Date.now() - new Date(e.created_at).getTime() < 86400000,
  ).length;

  const cambios = selected ? diffValues(selected.valor_anterior, selected.valor_nuevo) : [];

  return (
    <>
      <PageHeader
        modulo="Módulo 13"
        titulo="Auditoría"
        descripcion="Traza de solo lectura: quién hizo qué, cuándo, desde dónde, qué había antes y qué quedó después. Este registro nunca se modifica ni se borra."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Eventos en el periodo" valor={String(entries.length)} icon={ShieldCheck} />
        <KpiCard titulo="Últimas 24 h" valor={String(hoy)} icon={Activity} tone="info" />
        <KpiCard titulo="Usuarios distintos" valor={String(usuarios.length)} icon={Users} />
        <KpiCard titulo="Módulos con actividad" valor={String(modulos.length)} icon={Activity} />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        loading={isLoading}
        pageSize={15}
        searchPlaceholder="Buscar en la traza…"
        emptyMessage="No hay eventos registrados en este periodo."
        onRowClick={(r) => setSelected(r)}
        onExport={() => {
          exportCsv("auditoria", rows, columns);
          void logAudit({ modulo: "auditoria", entidad: "audit_log", accion: "export" });
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={rango} onValueChange={setRango}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGOS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modulo} onValueChange={setModulo}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los módulos</SelectItem>
                {modulos.map((m) => (
                  <SelectItem key={m} value={m}>
                    {label(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accion} onValueChange={setAccion}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las acciones</SelectItem>
                {acciones.map((a) => (
                  <SelectItem key={a} value={a}>
                    {label(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={usuario} onValueChange={setUsuario}>
              <SelectTrigger className="h-9 w-[190px]">
                <SelectValue placeholder="Usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los usuarios</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <StatusBadge value={selected.accion} />
                  {label(selected.entidad)}
                </SheetTitle>
                <SheetDescription>
                  {fechaHora(selected.created_at)} · {selected.user_email ?? "Sistema"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-8">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Quién</dt>
                    <dd className="font-medium">{selected.user_email ?? "Sistema"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Cuándo</dt>
                    <dd className="tabular">{fechaHora(selected.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Desde dónde</dt>
                    <dd className="tabular">{selected.ip ?? "No disponible"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Módulo</dt>
                    <dd>{label(selected.modulo)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Elemento afectado</dt>
                    <dd className="break-all">
                      {label(selected.entidad)}
                      {selected.entidad_id ? ` · ${selected.entidad_id}` : ""}
                    </dd>
                  </div>
                </dl>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Qué cambió</h3>
                  {cambios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin cambios de campos registrados en esta operación.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Campo</th>
                            <th className="px-3 py-2 text-left font-medium">Antes</th>
                            <th className="px-3 py-2 text-left font-medium">Después</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cambios.map((c) => (
                            <tr key={c.campo} className="border-t border-border align-top">
                              <td className="px-3 py-2 font-medium">{label(c.campo)}</td>
                              <td className="px-3 py-2 break-all text-muted-foreground line-through">
                                {valueText(c.antes)}
                              </td>
                              <td className="px-3 py-2 break-all">{valueText(c.despues)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
                      Qué había antes
                    </h3>
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px]">
                      {JSON.stringify(selected.valor_anterior ?? null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
                      Qué quedó después
                    </h3>
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px]">
                      {JSON.stringify(selected.valor_nuevo ?? null, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
