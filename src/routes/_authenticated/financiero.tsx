import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Scale, Trash2, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useCrud, type Payload } from "@/lib/crud";
import { money, fecha, label } from "@/lib/format";

interface EntryRow {
  id: string;
  source_table: string | null;
  source_id: string | null;
  reversal_of: string | null;
  numero: string;
  concepto: string;
  fecha: string;
  ejercicio: number;
  estado: string;
  cost_center_id: string | null;
  invoice_id: string | null;
  journal_lines: { debe: number; haber: number }[];
  cost_centers: { nombre: string } | null;
}

interface LineRow {
  id: string;
  descripcion: string | null;
  debe: number;
  haber: number;
  account_id: string;
  ledger_accounts: { codigo: string; nombre: string } | null;
}

interface PostingRow {
  id: string;
  entry_id: string;
  descripcion: string | null;
  debe: number;
  haber: number;
  ledger_accounts: { codigo: string; nombre: string; naturaleza: string } | null;
  journal_entries: { ejercicio: number; deleted_at: string | null };
}

interface BalanceRow {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: string;
  debe: number;
  haber: number;
}

const ESTADOS = ["activo", "borrador", "inactivo", "archivado"];
const NATURALEZAS = ["activo", "pasivo", "patrimonio", "ingreso", "gasto"];


export const Route = createFileRoute("/_authenticated/financiero")({
  head: () => ({
    meta: [
      { title: "Financiero | ServiceHub" },
      {
        name: "description",
        content: "Contabilidad: plan de cuentas, asientos contables y centros de coste.",
      },
      { property: "og:title", content: "Financiero | ServiceHub" },
      {
        property: "og:description",
        content: "Consulta asientos, cuentas contables y centros de coste de la empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancieroPage,
});

function FinancieroPage() {
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<EntryRow | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<BalanceRow | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Payload | null>(null);
  const [centerOpen, setCenterOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Payload | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["financiero", "entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          "id, numero, concepto, fecha, ejercicio, estado, cost_center_id, invoice_id, source_table, source_id, reversal_of, journal_lines(debe, haber), cost_centers(nombre)",
        )
        .is("deleted_at", null)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntryRow[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financiero", "accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_accounts")
        .select("*")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: centers = [] } = useQuery({
    queryKey: ["financiero", "centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Apuntes con su cuenta y ejercicio, para el balance de sumas y saldos. */
  const { data: postings = [] } = useQuery({
    queryKey: ["financiero", "postings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_lines")
        .select(
          "id, entry_id, descripcion, debe, haber, ledger_accounts(codigo, nombre, naturaleza), journal_entries!inner(ejercicio, deleted_at)",
        )
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as PostingRow[];
    },
  });

  const ejercicios = useMemo(
    () =>
      Array.from(new Set(postings.map((p) => p.journal_entries.ejercicio)))
        .sort((a, b) => b - a)
        .map(String),
    [postings],
  );
  const [ejercicio, setEjercicio] = useState<string>("todos");

  const balance = useMemo(() => {
    const map = new Map<string, BalanceRow>();
    for (const p of postings) {
      if (p.journal_entries.deleted_at) continue;
      if (ejercicio !== "todos" && String(p.journal_entries.ejercicio) !== ejercicio) continue;
      const acc = p.ledger_accounts;
      if (!acc) continue;
      const row =
        map.get(acc.codigo) ??
        ({
          id: acc.codigo,
          codigo: acc.codigo,
          nombre: acc.nombre,
          naturaleza: acc.naturaleza,
          debe: 0,
          haber: 0,
        } as BalanceRow);
      row.debe += Number(p.debe);
      row.haber += Number(p.haber);
      map.set(acc.codigo, row);
    }
    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [postings, ejercicio]);

  const accountEntries = useMemo(() => {
    const grouped = new Map<string, { id: string; entry: EntryRow | undefined; debe: number; haber: number }>();
    for (const posting of postings) {
      if (!selectedBalance || posting.ledger_accounts?.codigo !== selectedBalance.codigo) continue;
      if (posting.journal_entries.deleted_at) continue;
      if (ejercicio !== "todos" && String(posting.journal_entries.ejercicio) !== ejercicio) continue;
      const row = grouped.get(posting.entry_id) ?? {
        id: posting.entry_id,
        entry: entries.find((entry) => entry.id === posting.entry_id),
        debe: 0,
        haber: 0,
      };
      row.debe += Number(posting.debe);
      row.haber += Number(posting.haber);
      grouped.set(row.id, row);
    }
    return Array.from(grouped.values()).sort((a, b) =>
      (b.entry?.fecha ?? "").localeCompare(a.entry?.fecha ?? "") ||
      (a.entry?.numero ?? "").localeCompare(b.entry?.numero ?? ""),
    );
  }, [postings, entries, selectedBalance, ejercicio]);
  const accountDebe = accountEntries.reduce((sum, row) => sum + row.debe, 0);
  const accountHaber = accountEntries.reduce((sum, row) => sum + row.haber, 0);

  const ingresos = balance
    .filter((b) => b.naturaleza === "ingreso")
    .reduce((a, b) => a + b.haber - b.debe, 0);
  const gastos = balance
    .filter((b) => b.naturaleza === "gasto")
    .reduce((a, b) => a + b.debe - b.haber, 0);
  const resultado = ingresos - gastos;


  const entryCrud = useCrud("journal_entries", {
    modulo: "financiero",
    entidad: "Asiento",
    invalidate: [["financiero"]],
  });
  const accountCrud = useCrud("ledger_accounts", {
    modulo: "financiero",
    entidad: "Cuenta",
    invalidate: [["financiero"]],
  });
  const centerCrud = useCrud("cost_centers", {
    modulo: "financiero",
    entidad: "Centro de coste",
    invalidate: [["financiero"]],
  });

  const debe = entries.reduce(
    (a, e) => a + e.journal_lines.reduce((s, l) => s + Number(l.debe), 0),
    0,
  );
  const haber = entries.reduce(
    (a, e) => a + e.journal_lines.reduce((s, l) => s + Number(l.haber), 0),
    0,
  );

  const centerOptions = useMemo(
    () => centers.map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` })),
    [centers],
  );

  const columns: Column<EntryRow>[] = [
    {
      key: "numero",
      header: "Asiento",
      value: (r) => r.numero,
      render: (r) => <span className="font-medium">{r.numero}</span>,
    },
    { key: "fecha", header: "Fecha", value: (r) => r.fecha, render: (r) => fecha(r.fecha) },
    { key: "concepto", header: "Concepto", value: (r) => r.concepto, render: (r) => r.concepto },
    { key: "origen", header: "Origen", value: (r) => r.source_table ?? "manual", render: (r) => r.source_table ? `${({ invoices: "Facturación", payments: "Cobros", purchase_invoices: "Compras y gastos", supplier_payments: "Pagos" } as Record<string, string>)[r.source_table] ?? r.source_table}${r.reversal_of ? " · Reverso" : ""}` : "Manual" },
    {
      key: "centro",
      header: "Centro de coste",
      value: (r) => r.cost_centers?.nombre ?? "",
      render: (r) => r.cost_centers?.nombre ?? "—",
    },
    {
      key: "debe",
      header: "Debe",
      className: "text-right",
      value: (r) => r.journal_lines.reduce((s, l) => s + Number(l.debe), 0),
      render: (r) => (
        <span className="tabular">
          {money(r.journal_lines.reduce((s, l) => s + Number(l.debe), 0))}
        </span>
      ),
    },
    {
      key: "haber",
      header: "Haber",
      className: "text-right",
      value: (r) => r.journal_lines.reduce((s, l) => s + Number(l.haber), 0),
      render: (r) => (
        <span className="tabular">
          {money(r.journal_lines.reduce((s, l) => s + Number(l.haber), 0))}
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
      render: (r) => r.source_table ? null : (
        <RowActions
          onEdit={() => {
            setEditingEntry(r as unknown as Payload);
            setEntryOpen(true);
          }}
          onDelete={() => entryCrud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar el asiento ${r.numero}?`}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        modulo="Módulo 10"
        titulo="Gestión financiera"
        descripcion="Plan contable, asientos por partida doble y centros de coste."
        actions={
          <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/parametrizacion">Parametrización contable</Link></Button>
          <Button
            onClick={() => {
              setEditingEntry(null);
              setEntryOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo asiento
          </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Total debe" valor={money(debe)} icon={BookOpen} />
        <KpiCard titulo="Total haber" valor={money(haber)} icon={Wallet} tone="info" />
        <KpiCard
          titulo="Descuadre"
          valor={money(debe - haber)}
          detalle={debe === haber ? "Contabilidad cuadrada" : "Revisar asientos"}
          icon={Scale}
          tone={debe === haber ? "success" : "destructive"}
        />
        <KpiCard
          titulo="Resultado del periodo"
          valor={money(resultado)}
          detalle={`Ingresos ${money(ingresos)} · Gastos ${money(gastos)}`}
          icon={Scale}
          tone={resultado >= 0 ? "success" : "destructive"}
        />
      </div>

      <Tabs defaultValue="asientos">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-9 sm:w-auto">
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="asientos">
            Asientos
          </TabsTrigger>
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="balance">
            Sumas y saldos
          </TabsTrigger>
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="cuentas">
            Plan de cuentas
          </TabsTrigger>
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="centros">
            Centros de coste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance" className="mt-4">
          <DataTable
            data={balance}
            onRowClick={setSelectedBalance}
            toolbar={
              <Select value={ejercicio} onValueChange={setEjercicio}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ejercicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los ejercicios</SelectItem>
                  {ejercicios.map((e) => (
                    <SelectItem key={e} value={e}>
                      Ejercicio {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            columns={[
              { key: "codigo", header: "Cuenta", value: (r) => r.codigo, render: (r) => <Button variant="link" className="h-auto p-0" aria-label={`Ver asientos de la cuenta ${r.codigo}`} onClick={(event) => { event.stopPropagation(); setSelectedBalance(r); }}>{r.codigo}</Button> },
              { key: "nombre", header: "Denominación", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "naturaleza",
                header: "Naturaleza",
                value: (r) => r.naturaleza,
                render: (r) => label(r.naturaleza),
              },
              {
                key: "debe",
                header: "Debe",
                className: "text-right",
                value: (r) => r.debe,
                render: (r) => <span className="tabular">{money(r.debe)}</span>,
              },
              {
                key: "haber",
                header: "Haber",
                className: "text-right",
                value: (r) => r.haber,
                render: (r) => <span className="tabular">{money(r.haber)}</span>,
              },
              {
                key: "saldo",
                header: "Saldo",
                className: "text-right",
                value: (r) => r.debe - r.haber,
                render: (r) => (
                  <span className="tabular font-medium">{money(r.debe - r.haber)}</span>
                ),
              },
            ]}
            searchPlaceholder="Buscar cuenta…"
            onExport={() =>
              exportCsv("balance-sumas-y-saldos", balance, [
                { key: "codigo", header: "Cuenta", value: (r) => r.codigo, render: (r) => r.codigo },
                { key: "nombre", header: "Denominación", value: (r) => r.nombre, render: (r) => r.nombre },
                { key: "debe", header: "Debe", value: (r) => r.debe, render: (r) => money(r.debe) },
                { key: "haber", header: "Haber", value: (r) => r.haber, render: (r) => money(r.haber) },
                {
                  key: "saldo",
                  header: "Saldo",
                  value: (r) => r.debe - r.haber,
                  render: (r) => money(r.debe - r.haber),
                },
              ])
            }
          />
        </TabsContent>


        <TabsContent value="asientos" className="mt-4">
          <DataTable
            data={entries}
            columns={columns}
            loading={isLoading}
            onRowClick={setSelected}
            searchPlaceholder="Buscar asiento…"
            onExport={() => exportCsv("asientos", entries, columns)}
          />
        </TabsContent>

        <TabsContent value="cuentas" className="mt-4">
          <DataTable
            data={accounts}
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingAccount(null);
                  setAccountOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nueva cuenta
              </Button>
            }
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              { key: "nombre", header: "Cuenta", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "naturaleza",
                header: "Naturaleza",
                value: (r) => r.naturaleza,
                render: (r) => label(r.naturaleza),
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
                      setEditingAccount(r as unknown as Payload);
                      setAccountOpen(true);
                    }}
                    onDelete={() => accountCrud.remove.mutate(r.id)}
                  />
                ),
              },
            ]}
            searchPlaceholder="Buscar cuenta…"
          />
        </TabsContent>

        <TabsContent value="centros" className="mt-4">
          <DataTable
            data={centers}
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingCenter(null);
                  setCenterOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo centro
              </Button>
            }
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              { key: "nombre", header: "Nombre", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "descripcion",
                header: "Descripción",
                value: (r) => r.descripcion ?? "",
                render: (r) => r.descripcion ?? "—",
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
                      setEditingCenter(r as unknown as Payload);
                      setCenterOpen(true);
                    }}
                    onDelete={() => centerCrud.remove.mutate(r.id)}
                  />
                ),
              },
            ]}
            searchPlaceholder="Buscar centro…"
          />
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedBalance) && !selected} onOpenChange={(open) => !open && setSelectedBalance(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="mb-5 pr-6">
            <SheetTitle className="break-words">{selectedBalance?.codigo} · {selectedBalance?.nombre}</SheetTitle>
            <SheetDescription>Detalle de asientos · {ejercicio === "todos" ? "Todos los ejercicios" : `Ejercicio ${ejercicio}`}</SheetDescription>
          </SheetHeader>
          <div className="mb-5 grid grid-cols-3 gap-2 border-y border-border py-4 text-sm">
            <div><p className="text-muted-foreground">Debe</p><p className="tabular break-words font-semibold">{money(accountDebe)}</p></div>
            <div><p className="text-muted-foreground">Haber</p><p className="tabular break-words font-semibold">{money(accountHaber)}</p></div>
            <div><p className="text-muted-foreground">Saldo</p><p className="tabular break-words font-semibold">{money(accountDebe - accountHaber)}</p></div>
          </div>
          <DataTable
            data={accountEntries}
            loading={isLoading}
            onRowClick={(row) => { if (row.entry) setSelected(row.entry); }}
            searchPlaceholder="Buscar asiento de la cuenta…"
            emptyMessage="No hay asientos para esta cuenta en el ejercicio seleccionado."
            columns={[
              { key: "numero", header: "Asiento", value: (r) => r.entry?.numero ?? "", render: (r) => <Button variant="link" className="h-auto p-0" disabled={!r.entry} onClick={(event) => { event.stopPropagation(); if (r.entry) setSelected(r.entry); }}>{r.entry?.numero ?? "—"}</Button> },
              { key: "fecha", header: "Fecha", value: (r) => r.entry?.fecha ?? "", render: (r) => fecha(r.entry?.fecha) },
              { key: "concepto", header: "Concepto", value: (r) => r.entry?.concepto ?? "", render: (r) => r.entry?.concepto ?? "—" },
              { key: "reverso", header: "Tipo", value: (r) => r.entry?.reversal_of ? "Reverso" : "Asiento", render: (r) => r.entry?.reversal_of ? "Reverso" : "Asiento" },
              { key: "debe", header: "Debe", className: "text-right", value: (r) => r.debe, render: (r) => <span className="tabular">{money(r.debe)}</span> },
              { key: "haber", header: "Haber", className: "text-right", value: (r) => r.haber, render: (r) => <span className="tabular">{money(r.haber)}</span> },
            ]}
          />
        </SheetContent>
      </Sheet>

      <EntrySheet entry={selected} onClose={() => setSelected(null)} accounts={accounts} />

      <FormDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) setEditingEntry(null);
        }}
        title={editingEntry ? "Editar asiento" : "Nuevo asiento contable"}
        description="Registra la cabecera del asiento y añade sus apuntes desde el detalle."
        fields={[
          { name: "numero", label: "Número", required: true, placeholder: "AS-2026-0001" },
          { name: "fecha", label: "Fecha", type: "date", required: true },
          { name: "concepto", label: "Concepto", required: true, full: true },
          {
            name: "ejercicio",
            label: "Ejercicio",
            type: "number",
            required: true,
            placeholder: String(new Date().getFullYear()),
          },
          { name: "cost_center_id", label: "Centro de coste", type: "select", options: centerOptions },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS.map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editingEntry}
        submitting={entryCrud.saving}
        onSubmit={async (values) => {
          if (editingEntry)
            await entryCrud.update.mutateAsync({ id: String(editingEntry["id"]), values });
          else await entryCrud.create.mutateAsync(values);
          setEntryOpen(false);
          setEditingEntry(null);
        }}
      />

      <FormDialog
        open={accountOpen}
        onOpenChange={(o) => {
          setAccountOpen(o);
          if (!o) setEditingAccount(null);
        }}
        title={editingAccount ? "Editar cuenta" : "Nueva cuenta contable"}
        fields={[
          { name: "codigo", label: "Código", required: true, placeholder: "705" },
          { name: "nombre", label: "Nombre", required: true },
          {
            name: "naturaleza",
            label: "Naturaleza",
            type: "select",
            required: true,
            options: NATURALEZAS.map((n) => ({ value: n, label: label(n) })),
          },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS.map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editingAccount}
        submitting={accountCrud.saving}
        onSubmit={async (values) => {
          if (editingAccount)
            await accountCrud.update.mutateAsync({ id: String(editingAccount["id"]), values });
          else await accountCrud.create.mutateAsync(values);
          setAccountOpen(false);
          setEditingAccount(null);
        }}
      />

      <FormDialog
        open={centerOpen}
        onOpenChange={(o) => {
          setCenterOpen(o);
          if (!o) setEditingCenter(null);
        }}
        title={editingCenter ? "Editar centro de coste" : "Nuevo centro de coste"}
        fields={[
          { name: "codigo", label: "Código", required: true },
          { name: "nombre", label: "Nombre", required: true },
          { name: "descripcion", label: "Descripción", type: "textarea" },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS.map((s) => ({ value: s, label: label(s) })),
          },
        ]}
        initial={editingCenter}
        submitting={centerCrud.saving}
        onSubmit={async (values) => {
          if (editingCenter)
            await centerCrud.update.mutateAsync({ id: String(editingCenter["id"]), values });
          else await centerCrud.create.mutateAsync(values);
          setCenterOpen(false);
          setEditingCenter(null);
        }}
      />
    </>
  );
}

function EntrySheet({
  entry,
  onClose,
  accounts,
}: {
  entry: EntryRow | null;
  onClose: () => void;
  accounts: { id: string; codigo: string; nombre: string }[];
}) {
  const qc = useQueryClient();
  const [lineOpen, setLineOpen] = useState(false);

  const { data: lines = [] } = useQuery({
    queryKey: ["financiero", "entry-lines", entry?.id],
    enabled: Boolean(entry),
    queryFn: async () => {
      if (!entry) return [];
      const { data, error } = await supabase
        .from("journal_lines")
        .select("id, descripcion, debe, haber, account_id, ledger_accounts(codigo, nombre)")
        .eq("entry_id", entry.id)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as LineRow[];
    },
  });

  const lineCrud = useCrud("journal_lines", {
    modulo: "financiero",
    entidad: "Apunte",
    invalidate: [["financiero"]],
  });

  const debe = lines.reduce((a, l) => a + Number(l.debe), 0);
  const haber = lines.reduce((a, l) => a + Number(l.haber), 0);

  return (
    <Sheet open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {entry ? (
          <>
            <SheetHeader>
              <SheetTitle>{entry.numero}</SheetTitle>
              <SheetDescription>
                {entry.concepto} · {fecha(entry.fecha)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Apuntes</h3>
                {!entry.source_table ? <Button size="sm" variant="outline" onClick={() => setLineOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Añadir apunte
                </Button> : null}
              </div>

              {lines.map((l) => (
                <div key={l.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      {l.ledger_accounts
                        ? `${l.ledger_accounts.codigo} · ${l.ledger_accounts.nombre}`
                        : "Cuenta"}
                    </span>
                    {!entry.source_table ? <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 text-destructive"
                      aria-label="Eliminar apunte"
                      onClick={async () => {
                        await lineCrud.remove.mutateAsync(l.id);
                        void qc.invalidateQueries({ queryKey: ["financiero"] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.descripcion ?? "Sin descripción"} · Debe {money(Number(l.debe))} · Haber{" "}
                    {money(Number(l.haber))}
                  </p>
                </div>
              ))}
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin apuntes registrados.</p>
              ) : null}

              <div className="space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debe</span>
                  <span className="tabular">{money(debe)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Haber</span>
                  <span className="tabular">{money(haber)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Descuadre</span>
                  <span className={debe === haber ? "tabular text-success" : "tabular text-destructive"}>
                    {money(debe - haber)}
                  </span>
                </div>
              </div>
            </div>

            <FormDialog
              open={lineOpen}
              onOpenChange={setLineOpen}
              title="Nuevo apunte"
              fields={[
                {
                  name: "account_id",
                  label: "Cuenta",
                  type: "select",
                  required: true,
                  full: true,
                  options: accounts.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` })),
                },
                { name: "descripcion", label: "Descripción", full: true },
                { name: "debe", label: "Debe (€)", type: "number", step: "0.01" },
                { name: "haber", label: "Haber (€)", type: "number", step: "0.01" },
              ]}
              submitting={lineCrud.saving}
              onSubmit={async (values) => {
                await lineCrud.create.mutateAsync({
                  ...values,
                  entry_id: entry.id,
                  debe: Number(values["debe"] ?? 0),
                  haber: Number(values["haber"] ?? 0),
                });
                void qc.invalidateQueries({ queryKey: ["financiero"] });
                setLineOpen(false);
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
