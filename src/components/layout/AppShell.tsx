import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Moon, Search, Sun, User2 } from "lucide-react";

import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTheme } from "@/hooks/use-theme";
import { useRoles, useSession } from "@/hooks/use-session";
import { ROLE_LABELS } from "@/lib/roles";
import { MODULES } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user } = useSession();
  const { roles } = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await logAudit({
      modulo: "auth",
      entidad: "logout",
      accion: "logout",
      valorAnterior: { email: user?.email ?? null },
    });
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const iniciales = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-5">
            <SidebarTrigger />
            <Button
              variant="outline"
              size="sm"
              className="ml-1 gap-2 text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar módulo…</span>
              <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">
                ⌘K
              </kbd>
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {iniciales}
                    </span>
                    <span className="hidden max-w-[160px] truncate text-sm sm:inline">
                      {user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="space-y-1.5">
                    <p className="truncate text-sm">{user?.email}</p>
                    <div className="flex flex-wrap gap-1">
                      {roles.length === 0 ? (
                        <Badge variant="outline">Sin rol asignado</Badge>
                      ) : (
                        roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[r]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <User2 className="mr-2 h-4 w-4" /> Mi panel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulo o sección…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Módulos disponibles">
            {MODULES.filter((m) => m.path).map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.nombre} ${m.descripcion}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: m.path as "/facturacion" });
                }}
              >
                <span className="font-medium">{m.nombre}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  {m.descripcion}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
