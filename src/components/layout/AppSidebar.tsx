import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { Lock } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MODULES, type ModuleDefinition } from "@/lib/modules";
import { cn } from "@/lib/utils";

const GROUPS: ModuleDefinition["grupo"][] = ["Finanzas", "Servicio", "Operaciones", "Sistema"];

function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Icon className={className} />;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            SH
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold text-sidebar-foreground">
                ServiceHub
              </span>
              <span className="block truncate text-[11px] text-sidebar-foreground/60">
                Pay Per Use SaaS
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link to="/dashboard">
                    <Icons.LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUPS.map((grupo) => {
          const items = MODULES.filter((m) => m.grupo === grupo);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={grupo}>
              <SidebarGroupLabel>{grupo}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((m) => {
                    const active = m.path ? pathname.startsWith(m.path) : false;
                    if (!m.path) {
                      return (
                        <SidebarMenuItem key={m.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                className="cursor-default opacity-50"
                                aria-disabled
                              >
                                <ModuleIcon name={m.icon} className="h-4 w-4" />
                                <span className="flex-1 truncate">{m.nombre}</span>
                                <Lock className="h-3 w-3" />
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              Módulo {m.numero} · pendiente de integrar desde service-hub-pro
                            </TooltipContent>
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    }
                    return (
                      <SidebarMenuItem key={m.id}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link
                            to={m.path as "/facturacion"}
                            className={cn("flex items-center gap-2")}
                          >
                            <ModuleIcon name={m.icon} className="h-4 w-4" />
                            <span className="truncate">{m.nombre}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
