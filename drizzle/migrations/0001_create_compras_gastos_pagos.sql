-- Módulo de compras y gastos + pagos a proveedores

DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM ('borrador','recibida','aprobada','contabilizada','pagada','parcial','anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  razon_social text NOT NULL,
  nombre_comercial text,
  nif text,
  email text,
  telefono text,
  direccion text,
  categoria text,
  observaciones text,
  estado public.record_status NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  numero_proveedor text,
  supplier_id uuid REFERENCES public.suppliers(id),
  cost_center_id uuid REFERENCES public.cost_centers(id),
  account_id uuid REFERENCES public.ledger_accounts(id),
  categoria text,
  concepto text NOT NULL,
  estado public.purchase_status NOT NULL DEFAULT 'borrador',
  fecha_emision date NOT NULL DEFAULT current_date,
  fecha_recepcion date,
  fecha_vencimiento date,
  base_imponible numeric(14,2) NOT NULL DEFAULT 0,
  iva_pct numeric(6,2) NOT NULL DEFAULT 21,
  iva numeric(14,2) NOT NULL DEFAULT 0,
  retencion numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  pagado numeric(14,2) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'EUR',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  referencia text NOT NULL,
  purchase_invoice_id uuid REFERENCES public.purchase_invoices(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  importe numeric(14,2) NOT NULL DEFAULT 0,
  estado public.payment_status NOT NULL DEFAULT 'pendiente',
  metodo public.payment_method NOT NULL DEFAULT 'transferencia',
  fecha_prevista date,
  fecha_pago date,
  fecha_devolucion date,
  conciliado boolean NOT NULL DEFAULT false,
  fecha_conciliacion date,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id);
CREATE INDEX idx_supplier_payments_invoice ON public.supplier_payments(purchase_invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT ALL ON public.purchase_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payments TO authenticated;
GRANT ALL ON public.supplier_payments TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_staff_select ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY suppliers_staff_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY suppliers_staff_update ON public.suppliers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY suppliers_staff_delete ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador_general'));

CREATE POLICY purchase_invoices_staff_select ON public.purchase_invoices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY purchase_invoices_staff_insert ON public.purchase_invoices FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY purchase_invoices_staff_update ON public.purchase_invoices FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY purchase_invoices_staff_delete ON public.purchase_invoices FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador_general'));

CREATE POLICY supplier_payments_staff_select ON public.supplier_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY supplier_payments_staff_insert ON public.supplier_payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY supplier_payments_staff_update ON public.supplier_payments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY supplier_payments_staff_delete ON public.supplier_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador_general'));

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchase_invoices_updated BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_supplier_payments_updated BEFORE UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
