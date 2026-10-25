UPDATE public.journal_entries e SET source_table='invoices',source_id=e.invoice_id FROM public.invoices i WHERE e.invoice_id=i.id AND e.source_table IS NULL AND e.deleted_at IS NULL AND (e.concepto LIKE 'Factura '||i.numero||' · %' OR e.concepto='Emisión factura '||i.numero) AND NOT EXISTS(SELECT 1 FROM public.journal_entries x WHERE x.source_table='invoices' AND x.source_id=i.id) AND e.id=(SELECT x.id FROM public.journal_entries x WHERE x.invoice_id=i.id AND x.deleted_at IS NULL AND (x.concepto LIKE 'Factura '||i.numero||' · %' OR x.concepto='Emisión factura '||i.numero) ORDER BY x.created_at LIMIT 1);
UPDATE public.journal_entries e SET source_table='payments',source_id=p.id FROM public.payments p WHERE e.source_table IS NULL AND e.deleted_at IS NULL AND (e.concepto LIKE 'Cobro '||p.referencia||' · %' OR e.concepto='Cobro factura '||(SELECT numero FROM public.invoices WHERE id=p.invoice_id)) AND NOT EXISTS(SELECT 1 FROM public.journal_entries x WHERE x.source_table='payments' AND x.source_id=p.id) AND e.id=(SELECT x.id FROM public.journal_entries x WHERE x.deleted_at IS NULL AND (x.concepto LIKE 'Cobro '||p.referencia||' · %' OR x.concepto='Cobro factura '||(SELECT numero FROM public.invoices WHERE id=p.invoice_id)) ORDER BY x.created_at LIMIT 1);
CREATE OR REPLACE FUNCTION public.protect_automatic_accounting() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE protected boolean;
BEGIN
 IF pg_trigger_depth()>1 OR current_user NOT IN ('authenticated','anon') THEN RETURN coalesce(NEW,OLD); END IF;
 IF TG_TABLE_NAME='journal_entries' THEN
 IF TG_OP='INSERT' THEN protected:=NEW.source_table IS NOT NULL OR NEW.reversal_of IS NOT NULL;
 ELSE protected:=OLD.source_table IS NOT NULL OR NEW.source_table IS NOT NULL OR NEW.reversal_of IS NOT NULL; END IF;
 ELSE SELECT source_table IS NOT NULL INTO protected FROM public.journal_entries WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW.entry_id ELSE OLD.entry_id END;
 IF TG_OP='UPDATE' AND NOT coalesce(protected,false) THEN SELECT source_table IS NOT NULL INTO protected FROM public.journal_entries WHERE id=NEW.entry_id; END IF;
 END IF;
 IF protected THEN RAISE EXCEPTION 'Modifica el movimiento de origen; su asiento contable es de solo lectura.'; END IF;
 RETURN coalesce(NEW,OLD);
END; $$;
CREATE TRIGGER protect_automatic_entries_insert BEFORE INSERT ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.protect_automatic_accounting();
CREATE TRIGGER protect_automatic_lines_insert BEFORE INSERT ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.protect_automatic_accounting();