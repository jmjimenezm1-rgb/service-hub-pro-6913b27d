import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hash, Plus, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCrud, type Payload } from "@/lib/crud";
import { label } from "@/lib/format";
import {
  NUMBERING_ENTITIES,
  NUMBERING_RESETS,
  NUMBERING_TOKENS,
  previewPattern,
  type NumberingPattern,
} from "@/lib/numbering";

const patternsQuery = {
  queryKey: ["parametrizacion", "numbering"],
  queryFn: async (): Promise<NumberingPattern[]> => {
    const { data, error } = await supabase
      .from("numbering_patterns")
      .select("*")
      .is("deleted_at", null)
      .order("entidad");
    if (error) throw error;
    return (data ?? []) as unknown as NumberingPattern[];
  },
};

export const Route = createFileRoute("/_authenticated/parametrizacion")({
  head: () => ({
    meta: [
      { title: "Parametrización de códigos | ServiceHub" },
      {
        name: "description",
        content:
          "Define los patrones con los que ServiceHub genera automáticamente los códigos de facturas, cobros y documentos.",
      },
      { property: "og:title", content: "Parametrización de códigos | ServiceHub" },
      {
        property: "og:description",
        content: "Patrones de numeración automática para facturación y cobros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParametrizacionPage,
});

function ParametrizacionPage() {
  const { data: patterns = [], isLoading } = useQuery(patternsQuery);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payload | null>(null);

  const crud = useCrud("numbering_patterns", {
    modulo: "parametrizacion",
    entidad: "Patrón",
    invalidate: [["parametrizacion"], ["facturacion"], ["cobros"]],
  });

  const columns: Column<NumberingPattern>[] = [
    {
      key: "entidad",
      header: "Entidad",
      value: (r) => r.entidad,
      render: (r) => <span className="font-medium">{label(r.entidad)}</span>,
    },
    { key: "nombre", header: "Nombre", value: (r) => r.nombre, render: (r) => r.nombre },
    {
      key: "patron",
      header: "Patrón",
      value: (r) => r.patron,
      render: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.patron}</code>,
    },
    {
      key: "ejemplo",
      header: "Próximo código",
      value: (r) => previewPattern(r),
      render: (r) => <span className="tabular text-sm">{previewPattern(r)}</span>,
    },
    {
      key: "reinicio",
      header: "Reinicio",
      value: (r) => r.reinicio,
      render: (r) => label(r.reinicio),
    },
    {
      key: "contador",
      header: "Contador",
      className: "text-right",
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
            setEditing(r as unknown as Payload);
            setOpen(true);
          }}
          onDelete={() => crud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar el patrón «${r.nombre}»?`}
          extra={[
            {
              label: "Reiniciar contador a 1",
              icon: <Hash className="h-4 w-4" />,
              onSelect: () => crud.update.mutate({ id: r.id, values: { proximo_numero: 1 } }),
            },
            {
              label: r.estado === "activo" ? "Desactivar" : "Activar",
              onSelect: () =>
                crud.update.mutate({
                  id: r.id,
                  values: { estado: r.estado === "activo" ? "inactivo" : "activo" },
                }),
            },
          ]}
        />
      ),
    },
  ];

  const activos = patterns.filter((p) => p.estado === "activo").length;

  return (
    <>
      <PageHeader
        modulo="Módulo 14"
        titulo="Parametrización de códigos"
        descripcion="Define cómo se generan automáticamente los códigos de facturas, cobros y documentos."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo patrón
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Patrones" valor={String(patterns.length)} icon={Settings2} />
        <KpiCard titulo="Activos" valor={String(activos)} icon={Settings2} tone="success" />
        <KpiCard
          titulo="Entidades cubiertas"
          valor={`${new Set(patterns.filter((p) => p.estado === "activo").map((p) => p.entidad)).size} / ${NUMBERING_ENTITIES.length}`}
          icon={Hash}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marcadores disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{NUMBERING_TOKENS}</code>
          </p>
          <p>
            <strong>{"{YYYY}"}</strong> año · <strong>{"{YY}"}</strong> año corto ·{" "}
            <strong>{"{MM}"}</strong> mes · <strong>{"{DD}"}</strong> día ·{" "}
            <strong>{"{SERIE}"}</strong> prefijo de la serie de facturación ·{" "}
            <strong>{"{0000}"}</strong> contador (los ceros indican los dígitos).
          </p>
          <p>Ejemplo: «FAC-{"{YYYY}"}-{"{0000}"}» genera FAC-2026-0001.</p>
        </CardContent>
      </Card>

      <DataTable
        data={patterns}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Buscar patrón…"
        onExport={() => exportCsv("patrones-numeracion", patterns, columns)}
      />

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? `Editar patrón «${String(editing["nombre"])}»` : "Nuevo patrón de código"}
        description="Los códigos se generarán automáticamente al crear el registro correspondiente."
        fields={[
          {
            name: "entidad",
            label: "Entidad",
            type: "select",
            required: true,
            options: NUMBERING_ENTITIES,
          },
          { name: "nombre", label: "Nombre", required: true },
          {
            name: "patron",
            label: "Patrón",
            required: true,
            full: true,
            placeholder: "FAC-{YYYY}-{0000}",
            help: `Marcadores: ${NUMBERING_TOKENS}`,
          },
          { name: "proximo_numero", label: "Próximo número", type: "number", required: true },
          {
            name: "reinicio",
            label: "Reinicio del contador",
            type: "select",
            required: true,
            options: NUMBERING_RESETS,
          },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ["activo", "inactivo"].map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editing ?? { proximo_numero: 1, reinicio: "anual", estado: "activo" }}
        submitting={crud.saving}
        onSubmit={async (values) => {
          if (editing) await crud.update.mutateAsync({ id: String(editing["id"]), values });
          else await crud.create.mutateAsync(values);
          setOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
