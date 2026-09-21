import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LifeBuoy, Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { applicationsQuery, clientsQuery, toOptions } from "@/modules/common/api";
import { useCrud, type Payload } from "@/lib/crud";
import { fecha, fechaHora, label } from "@/lib/format";

interface TicketRow {
  id: string;
  referencia: string;
  asunto: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  categoria: string | null;
  client_id: string | null;
  application_id: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  clients: { razon_social: string } | null;
}

interface CommentRow {
  id: string;
  mensaje: string;
  interno: boolean;
  autor_nombre: string | null;
  created_at: string;
}

const ESTADOS = ["abierto", "en_progreso", "pendiente", "resuelto", "cerrado"];
const PRIORIDADES = ["baja", "media", "alta", "critica"];

export const Route = createFileRoute("/_authenticated/soporte")({
  head: () => ({
    meta: [
      { title: "Soporte | ServiceHub" },
      {
        name: "description",
        content: "Mesa de soporte: tickets por prioridad, estado y cliente con seguimiento.",
      },
      { property: "og:title", content: "Soporte | ServiceHub" },
      {
        property: "og:description",
        content: "Gestiona incidencias y peticiones de tus clientes SaaS.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { ticket?: string } =>
    search["ticket"] ? { ticket: String(search["ticket"]) } : {},
  component: SoportePage,
});

function SoportePage() {
  const { ticket: ticketParam } = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<TicketRow | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["soporte", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, referencia, asunto, descripcion, estado, prioridad, categoria, client_id, application_id, fecha_apertura, fecha_cierre, clients(razon_social)",
        )
        .is("deleted_at", null)
        .order("fecha_apertura", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketRow[];
    },
  });

  const { data: clients = [] } = useQuery(clientsQuery);
  const { data: applications = [] } = useQuery(applicationsQuery);

  const crud = useCrud("tickets", {
    modulo: "soporte",
    entidad: "Ticket",
    invalidate: [["soporte"], ["dashboard"]],
  });

  const columns: Column<TicketRow>[] = [
    {
      key: "referencia",
      header: "Ref.",
      value: (r) => r.referencia,
      render: (r) => <span className="font-medium">{r.referencia}</span>,
    },
    { key: "asunto", header: "Asunto", value: (r) => r.asunto, render: (r) => r.asunto },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.clients?.razon_social ?? "",
      render: (r) => r.clients?.razon_social ?? "—",
    },
    {
      key: "categoria",
      header: "Categoría",
      value: (r) => r.categoria ?? "",
      render: (r) => r.categoria ?? "—",
    },
    {
      key: "prioridad",
      header: "Prioridad",
      value: (r) => r.prioridad,
      render: (r) => <StatusBadge value={r.prioridad} />,
    },
    {
      key: "apertura",
      header: "Apertura",
      value: (r) => r.fecha_apertura,
      render: (r) => fecha(r.fecha_apertura),
    },
    {
      key: "cierre",
      header: "Cierre",
      value: (r) => r.fecha_cierre ?? "",
      render: (r) => fecha(r.fecha_cierre),
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
          deleteLabel={`¿Eliminar el ticket ${r.referencia}?`}
          extra={[
            {
              label: "Marcar en progreso",
              onSelect: () => crud.update.mutate({ id: r.id, values: { estado: "en_progreso" } }),
              disabled: r.estado === "en_progreso",
            },
            {
              label: "Resolver y cerrar",
              icon: <CheckCircle2 className="h-4 w-4" />,
              onSelect: () =>
                crud.update.mutate({
                  id: r.id,
                  values: { estado: "cerrado", fecha_cierre: new Date().toISOString() },
                }),
              disabled: r.estado === "cerrado",
            },
          ]}
        />
      ),
    },
  ];

  const abiertos = tickets.filter((t) => t.estado === "abierto" || t.estado === "en_progreso");
  const criticos = tickets.filter((t) => t.prioridad === "critica");

  return (
    <>
      <PageHeader
        modulo="Módulo 12"
        titulo="Soporte y atención al cliente"
        descripcion="Tickets por cliente y aplicación, con prioridad, categoría y trazabilidad."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo ticket
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Tickets totales" valor={String(tickets.length)} icon={LifeBuoy} />
        <KpiCard titulo="Abiertos" valor={String(abiertos.length)} icon={LifeBuoy} tone="warning" />
        <KpiCard
          titulo="Críticos"
          valor={String(criticos.length)}
          icon={LifeBuoy}
          tone="destructive"
        />
      </div>

      <DataTable
        data={tickets}
        columns={columns}
        loading={isLoading}
        onRowClick={setSelected}
        searchPlaceholder="Buscar ticket…"
        onExport={() => exportCsv("tickets", tickets, columns)}
      />

      <TicketSheet ticket={selected} onClose={() => setSelected(null)} />

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? "Editar ticket" : "Nuevo ticket"}
        fields={[
          { name: "referencia", label: "Referencia", required: true, placeholder: "TCK-2026-0001" },
          { name: "asunto", label: "Asunto", required: true },
          { name: "client_id", label: "Cliente", type: "select", options: toOptions(clients) },
          {
            name: "application_id",
            label: "Aplicación",
            type: "select",
            options: toOptions(applications),
          },
          {
            name: "prioridad",
            label: "Prioridad",
            type: "select",
            required: true,
            options: PRIORIDADES.map((p) => ({ value: p, label: label(p) })),
          },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS.map((s) => ({ value: s, label: label(s) })),
          },
          { name: "categoria", label: "Categoría", placeholder: "Incidencia, consulta…" },
          { name: "descripcion", label: "Descripción", type: "textarea" },
        ]}
        initial={editing ?? { estado: "abierto", prioridad: "media" }}
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

function TicketSheet({ ticket, onClose }: { ticket: TicketRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [commentOpen, setCommentOpen] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["soporte", "comments", ticket?.id],
    enabled: Boolean(ticket),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("id, mensaje, interno, autor_nombre, created_at")
        .eq("ticket_id", ticket!.id)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const commentCrud = useCrud("ticket_comments", {
    modulo: "soporte",
    entidad: "Comentario",
    invalidate: [["soporte"]],
  });

  return (
    <Sheet open={Boolean(ticket)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {ticket ? (
          <>
            <SheetHeader>
              <SheetTitle>{ticket.referencia}</SheetTitle>
              <SheetDescription>
                {ticket.asunto} · {ticket.clients?.razon_social ?? "Sin cliente"}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={ticket.estado} />
                <StatusBadge value={ticket.prioridad} />
              </div>

              {ticket.descripcion ? (
                <p className="text-sm text-muted-foreground">{ticket.descripcion}</p>
              ) : null}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <h3 className="text-sm font-medium">Seguimiento</h3>
                <Button size="sm" variant="outline" onClick={() => setCommentOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Comentar
                </Button>
              </div>

              {comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-3 text-sm">
                  <p>{c.mensaje}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.autor_nombre ?? "Equipo"} · {fechaHora(c.created_at)}
                    {c.interno ? " · Nota interna" : ""}
                  </p>
                </div>
              ))}
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin comentarios todavía.</p>
              ) : null}
            </div>

            <FormDialog
              open={commentOpen}
              onOpenChange={setCommentOpen}
              title="Nuevo comentario"
              fields={[
                { name: "mensaje", label: "Mensaje", type: "textarea", required: true },
                { name: "autor_nombre", label: "Autor", placeholder: "Soporte ServiceHub" },
                { name: "interno", label: "Nota interna", type: "switch" },
              ]}
              submitting={commentCrud.saving}
              onSubmit={async (values) => {
                await commentCrud.create.mutateAsync({ ...values, ticket_id: ticket.id });
                void qc.invalidateQueries({ queryKey: ["soporte"] });
                setCommentOpen(false);
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
