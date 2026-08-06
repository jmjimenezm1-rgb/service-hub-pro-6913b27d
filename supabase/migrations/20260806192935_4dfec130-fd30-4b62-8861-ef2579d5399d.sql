CREATE TABLE public.numbering_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad text NOT NULL,
  nombre text NOT NULL,
  patron text NOT NULL,
  proximo_numero integer NOT NULL DEFAULT 1,
  reinicio text NOT NULL DEFAULT 'anual',
  periodo_actual text,
  estado record_status NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT numbering_patterns_entidad_chk CHECK (entidad IN ('factura','cobro','rectificativa','asiento','documento','ticket')),
  CONSTRAINT numbering_patterns_reinicio_chk CHECK (reinicio IN ('nunca','anual','mensual'))
);

CREATE UNIQUE INDEX numbering_patterns_entidad_unq
  ON public.numbering_patterns (entidad) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.numbering_patterns TO authenticated;
GRANT ALL ON public.numbering_patterns TO service_role;

ALTER TABLE public.numbering_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "numbering_patterns_select" ON public.numbering_patterns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "numbering_patterns_insert" ON public.numbering_patterns
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "numbering_patterns_update" ON public.numbering_patterns
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "numbering_patterns_delete" ON public.numbering_patterns
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_numbering_patterns_updated
  BEFORE UPDATE ON public.numbering_patterns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.numbering_patterns (entidad, nombre, patron, proximo_numero, reinicio, periodo_actual)
VALUES
  ('factura', 'Facturas ordinarias', 'FAC-{YYYY}-{0000}', 1, 'anual', to_char(now(), 'YYYY')),
  ('rectificativa', 'Facturas rectificativas', 'RFAC-{YYYY}-{0000}', 1, 'anual', to_char(now(), 'YYYY')),
  ('cobro', 'Cobros', 'COB-{YYYY}-{0000}', 1, 'anual', to_char(now(), 'YYYY'));