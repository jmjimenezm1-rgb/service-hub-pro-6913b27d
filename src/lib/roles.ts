export const APP_ROLES = [
  "administrador_general",
  "administrador_comercial",
  "administrador_financiero",
  "administrador_tecnico",
  "soporte",
  "cliente_admin",
  "usuario_cliente",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador_general: "Administrador General",
  administrador_comercial: "Administrador Comercial",
  administrador_financiero: "Administrador Financiero",
  administrador_tecnico: "Administrador Técnico",
  soporte: "Soporte",
  cliente_admin: "Cliente Administrador",
  usuario_cliente: "Usuario Cliente",
};

export const STAFF_ROLES: AppRole[] = [
  "administrador_general",
  "administrador_comercial",
  "administrador_financiero",
  "administrador_tecnico",
  "soporte",
];

export function isStaff(roles: AppRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

export function canAccess(roles: AppRole[], allowed: AppRole[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
