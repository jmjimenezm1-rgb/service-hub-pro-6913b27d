import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface OptionRow {
  id: string;
  nombre: string;
}

export const clientsQuery = queryOptions({
  queryKey: ["common", "clients"],
  queryFn: async (): Promise<OptionRow[]> => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, razon_social")
      .is("deleted_at", null)
      .order("razon_social");
    if (error) throw error;
    return (data ?? []).map((c) => ({ id: c.id, nombre: c.razon_social }));
  },
});

export const applicationsQuery = queryOptions({
  queryKey: ["common", "applications"],
  queryFn: async (): Promise<OptionRow[]> => {
    const { data, error } = await supabase
      .from("applications")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw error;
    return (data ?? []).map((a) => ({ id: a.id, nombre: a.nombre }));
  },
});

export const staffQuery = queryOptions({
  queryKey: ["common", "staff"],
  queryFn: async (): Promise<OptionRow[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre, apellidos, email")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      nombre: [p.nombre, p.apellidos].filter(Boolean).join(" ") || (p.email ?? "Sin nombre"),
    }));
  },
});

export function toOptions(rows: OptionRow[]) {
  return rows.map((r) => ({ value: r.id, label: r.nombre }));
}
