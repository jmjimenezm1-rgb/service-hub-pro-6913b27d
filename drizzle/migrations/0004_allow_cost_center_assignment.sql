CREATE OR REPLACE FUNCTION public.protect_automatic_accounting() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE protected boolean;
BEGIN
 IF pg_trigger_depth()>1 OR current_user NOT IN ('authenticated','anon') THEN RETURN coalesce(NEW,OLD); END IF;
 IF TG_TABLE_NAME='journal_entries' THEN
  IF TG_OP='INSERT' THEN protected:=NEW.source_table IS NOT NULL OR NEW.reversal_of IS NOT NULL;
  ELSIF TG_OP='UPDATE' THEN
   protected:=OLD.source_table IS NOT NULL OR NEW.source_table IS NOT NULL OR NEW.reversal_of IS NOT NULL;
   -- La imputación del centro de coste no es una modificación contable: se permite
   -- cuando el resto de columnas del asiento automático permanecen intactas.
   IF protected AND OLD.source_table IS NOT NULL
      AND NEW.numero IS NOT DISTINCT FROM OLD.numero
      AND NEW.fecha IS NOT DISTINCT FROM OLD.fecha
      AND NEW.concepto IS NOT DISTINCT FROM OLD.concepto
      AND NEW.ejercicio IS NOT DISTINCT FROM OLD.ejercicio
      AND NEW.estado IS NOT DISTINCT FROM OLD.estado
      AND NEW.invoice_id IS NOT DISTINCT FROM OLD.invoice_id
      AND NEW.source_table IS NOT DISTINCT FROM OLD.source_table
      AND NEW.source_id IS NOT DISTINCT FROM OLD.source_id
      AND NEW.source_fingerprint IS NOT DISTINCT FROM OLD.source_fingerprint
      AND NEW.reversal_of IS NOT DISTINCT FROM OLD.reversal_of
      AND NEW.reversed_at IS NOT DISTINCT FROM OLD.reversed_at
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
   THEN protected:=false; END IF;
  ELSE protected:=OLD.source_table IS NOT NULL OR OLD.reversal_of IS NOT NULL; END IF;
 ELSE SELECT source_table IS NOT NULL INTO protected FROM public.journal_entries WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW.entry_id ELSE OLD.entry_id END;
 IF TG_OP='UPDATE' AND NOT coalesce(protected,false) THEN SELECT source_table IS NOT NULL INTO protected FROM public.journal_entries WHERE id=NEW.entry_id; END IF;
 END IF;
 IF protected THEN RAISE EXCEPTION 'Modifica el movimiento de origen; su asiento contable es de solo lectura.'; END IF;
 RETURN coalesce(NEW,OLD);
END; $$;