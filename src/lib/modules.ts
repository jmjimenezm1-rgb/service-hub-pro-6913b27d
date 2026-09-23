/**
 * Registro central de módulos de ServiceHub.
 *
 * Cada módulo es independiente y se declara aquí. La navegación, los permisos
 * y el dashboard se construyen a partir de este registro, de forma que añadir
 * un módulo nuevo (o integrar los módulos 1-7 del repositorio service-hub-pro)
 * no requiere modificar ningún módulo existente.
 */
import type { AppRole } from "./roles";

export type ModuleOrigin = "local" | "externo";

export interface ModuleDefinition {
  /** Identificador estable del módulo (usado en auditoría y permisos). */
  id: string;
  /** Número de módulo dentro del roadmap de ServiceHub. */
  numero: number;
  nombre: string;
  descripcion: string;
  /** Nombre del icono de lucide-react. */
  icon: string;
  /** Ruta de la aplicación. `null` si aún no está implementado en este proyecto. */
  path: string | null;
  grupo: "Operaciones" | "Finanzas" | "Servicio" | "Sistema";
  /** `externo` = implementado en el proyecto de los módulos 1-7. */
  origen: ModuleOrigin;
  /** Tablas propias del módulo. */
  tablas: string[];
  /** Roles con acceso al módulo. */
  roles: AppRole[];
}

const STAFF: AppRole[] = [
  "administrador_general",
  "administrador_comercial",
  "administrador_financiero",
  "administrador_tecnico",
  "soporte",
];

export const MODULES: ModuleDefinition[] = [
  {
    id: "crm",
    numero: 1,
    nombre: "CRM / Clientes",
    descripcion: "Ciclo de vida del cliente: prospección, alta, baja e histórico.",
    icon: "Building2",
    path: null,
    grupo: "Operaciones",
    origen: "externo",
    tablas: ["clients"],
    roles: STAFF,
  },
  {
    id: "aplicaciones",
    numero: 2,
    nombre: "Aplicaciones",
    descripcion: "Catálogo de aplicaciones SaaS y modelos de precio.",
    icon: "AppWindow",
    path: null,
    grupo: "Operaciones",
    origen: "externo",
    tablas: ["applications"],
    roles: STAFF,
  },
  {
    id: "suscripciones",
    numero: 3,
    nombre: "Suscripciones",
    descripcion: "Contratación, renovaciones y modalidades por cliente.",
    icon: "Repeat",
    path: null,
    grupo: "Operaciones",
    origen: "externo",
    tablas: ["subscriptions"],
    roles: STAFF,
  },
  {
    id: "usuarios",
    numero: 4,
    nombre: "Usuarios",
    descripcion: "Usuarios de cliente, roles y accesos.",
    icon: "Users",
    path: null,
    grupo: "Operaciones",
    origen: "externo",
    tablas: ["profiles", "user_roles"],
    roles: STAFF,
  },
  {
    id: "consumo",
    numero: 5,
    nombre: "Consumo",
    descripcion: "Métricas de uso por aplicación y cliente.",
    icon: "Gauge",
    path: null,
    grupo: "Operaciones",
    origen: "externo",
    tablas: ["usage_records"],
    roles: STAFF,
  },
  {
    id: "notificaciones",
    numero: 6,
    nombre: "Notificaciones",
    descripcion: "Avisos, recordatorios y comunicaciones centralizadas.",
    icon: "Bell",
    path: null,
    grupo: "Sistema",
    origen: "externo",
    tablas: ["notifications"],
    roles: STAFF,
  },
  {
    id: "informes",
    numero: 7,
    nombre: "Informes",
    descripcion: "Informes configurables y exportaciones.",
    icon: "BarChart3",
    path: null,
    grupo: "Sistema",
    origen: "externo",
    tablas: ["reports"],
    roles: STAFF,
  },
  {
    id: "facturacion",
    numero: 8,
    nombre: "Facturación",
    descripcion: "Motor de facturación configurable: series, cupones y facturas.",
    icon: "FileText",
    path: "/facturacion",
    grupo: "Finanzas",
    origen: "local",
    tablas: ["invoice_series", "coupons", "invoices", "invoice_lines"],
    roles: ["administrador_general", "administrador_financiero", "administrador_comercial"],
  },
  {
    id: "cobros",
    numero: 9,
    nombre: "Cobros",
    descripcion: "Gestión de cobros, métodos de pago, conciliación e impagos.",
    icon: "CreditCard",
    path: "/cobros",
    grupo: "Finanzas",
    origen: "local",
    tablas: ["payments"],
    roles: ["administrador_general", "administrador_financiero"],
  },
  {
    id: "compras",
    numero: 15,
    nombre: "Compras y gastos",
    descripcion: "Proveedores, facturas de compra y gastos por categoría y centro de coste.",
    icon: "ShoppingCart",
    path: "/compras",
    grupo: "Finanzas",
    origen: "local",
    tablas: ["suppliers", "purchase_invoices"],
    roles: ["administrador_general", "administrador_financiero", "administrador_comercial"],
  },
  {
    id: "pagos",
    numero: 16,
    nombre: "Pagos",
    descripcion: "Pagos a proveedores, vencimientos, conciliación y previsión de tesorería.",
    icon: "Send",
    path: "/pagos",
    grupo: "Finanzas",
    origen: "local",
    tablas: ["supplier_payments"],
    roles: ["administrador_general", "administrador_financiero"],
  },
  {
    id: "financiero",
    numero: 10,
    nombre: "Financiero",
    descripcion: "ERP ligero: plan contable, asientos, diario, mayor y balances.",
    icon: "Landmark",
    path: "/financiero",
    grupo: "Finanzas",
    origen: "local",
    tablas: ["ledger_accounts", "journal_entries", "journal_lines", "cost_centers"],
    roles: ["administrador_general", "administrador_financiero"],
  },
  {
    id: "documental",
    numero: 11,
    nombre: "Documental",
    descripcion: "Contratos, facturas, licencias y documentación con versionado.",
    icon: "FolderOpen",
    path: "/documental",
    grupo: "Servicio",
    origen: "local",
    tablas: ["documents"],
    roles: STAFF,
  },
  {
    id: "soporte",
    numero: 12,
    nombre: "Soporte",
    descripcion: "Tickets con estados, prioridades, comentarios e historial.",
    icon: "LifeBuoy",
    path: "/soporte",
    grupo: "Servicio",
    origen: "local",
    tablas: ["tickets", "ticket_comments"],
    roles: STAFF,
  },
  {
    id: "parametrizacion",
    numero: 14,
    nombre: "Parametrización",
    descripcion: "Patrones de numeración automática de facturas, cobros y documentos.",
    icon: "Settings2",
    path: "/parametrizacion",
    grupo: "Sistema",
    origen: "local",
    tablas: ["numbering_patterns"],
    roles: ["administrador_general", "administrador_financiero"],
  },
  {
    id: "auditoria",
    numero: 13,
    nombre: "Auditoría",
    descripcion: "Registro de todas las operaciones realizadas en la plataforma.",
    icon: "ShieldCheck",
    path: "/auditoria",
    grupo: "Sistema",
    origen: "local",
    tablas: ["audit_log"],
    roles: ["administrador_general", "administrador_tecnico"],
  },
];

export const LOCAL_MODULES = MODULES.filter((m) => m.origen === "local");

export function getModule(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id);
}
