CREATE TABLE public.accounting_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 movimiento text NOT NULL CHECK (movimiento IN ('factura','cobro','compra','pago')),
 variante text NOT NULL DEFAULT '',
 nombre text NOT NULL,
 contrapartida_id uuid NOT NULL REFERENCES public.ledger_accounts(id),
 principal_id uuid NOT NULL REFERENCES public.ledger_accounts(id),
 iva_id uuid REFERENCES public.ledger_accounts(id),
 retencion_id uuid REFERENCES public.ledger_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid,
 updated_by uuid,
 UNIQUE(movimiento,variante)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.accounting_rules TO authenticated;
GRANT ALL ON public.accounting_rules TO service_role;
ALTER TABLE public.accounting_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounting_rules_read ON public.accounting_rules FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE POLICY accounting_rules_write ON public.accounting_rules FOR ALL TO authenticated USING(public.has_role(auth.uid(),'administrador_general') OR public.has_role(auth.uid(),'administrador_financiero')) WITH CHECK(public.has_role(auth.uid(),'administrador_general') OR public.has_role(auth.uid(),'administrador_financiero'));
CREATE TRIGGER accounting_rules_updated BEFORE UPDATE ON public.accounting_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.journal_entries ADD COLUMN source_table text, ADD COLUMN source_id uuid, ADD COLUMN source_fingerprint text, ADD COLUMN reversal_of uuid REFERENCES public.journal_entries(id), ADD COLUMN reversed_at timestamptz;
CREATE UNIQUE INDEX accounting_active_source ON public.journal_entries(source_table,source_id) WHERE source_table IS NOT NULL AND reversal_of IS NULL AND reversed_at IS NULL;
CREATE UNIQUE INDEX accounting_single_reversal ON public.journal_entries(reversal_of) WHERE reversal_of IS NOT NULL;
CREATE SEQUENCE public.accounting_entry_sequence;

CREATE OR REPLACE FUNCTION public.accounting_account(_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _id IS NULL OR NOT EXISTS(SELECT 1 FROM public.ledger_accounts WHERE id=_id AND deleted_at IS NULL AND estado='activo') THEN
 RAISE EXCEPTION 'Falta una cuenta contable activa en Parametrización.';
 END IF;
 RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.accounting_account(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.accounting_reverse(_entry uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.journal_entries; rid uuid; num text;
BEGIN
 SELECT * INTO e FROM public.journal_entries WHERE id=_entry FOR UPDATE;
 IF e.reversed_at IS NOT NULL THEN RETURN NULL; END IF;
 num:='AUT-'||extract(year from current_date)::text||'-'||lpad(nextval('public.accounting_entry_sequence')::text,8,'0');
 INSERT INTO public.journal_entries(numero,fecha,ejercicio,concepto,invoice_id,cost_center_id,estado,source_table,source_id,reversal_of,created_by,updated_by)
 VALUES(num,current_date,extract(year from current_date)::integer,'Reverso de '||e.numero,e.invoice_id,e.cost_center_id,'activo',e.source_table,e.source_id,e.id,auth.uid(),auth.uid()) RETURNING id INTO rid;
 INSERT INTO public.journal_lines(entry_id,account_id,descripcion,debe,haber,created_by,updated_by)
 SELECT rid,account_id,'Reverso · '||coalesce(descripcion,''),haber,debe,auth.uid(),auth.uid() FROM public.journal_lines WHERE entry_id=e.id AND deleted_at IS NULL;
 UPDATE public.journal_entries SET reversed_at=now() WHERE id=e.id;
 INSERT INTO public.audit_log(modulo,entidad,entidad_id,accion,user_id,user_email,valor_nuevo)
 VALUES('financiero','journal_entries',rid,'insert',auth.uid(),auth.jwt()->>'email',jsonb_build_object('numero',num,'reverso_de',e.id));
 RETURN num;
END; $$;
REVOKE ALL ON FUNCTION public.accounting_reverse(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_accounting_movement(_table text,_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d jsonb; kind text; variant text; r public.accounting_rules; active boolean; old_entry public.journal_entries; fingerprint text; num text; eid uuid; dt date; b numeric:=0; tax numeric:=0; withheld numeric:=0; total numeric:=0; lines jsonb; item jsonb; counter uuid; main uuid; taxacc uuid; retacc uuid; reverse_num text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'No autorizado para contabilizar.'; END IF;
 IF _table NOT IN ('invoices','payments','purchase_invoices','supplier_payments') THEN RAISE EXCEPTION 'Movimiento no válido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_table||_id::text,0));
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',_table) INTO d USING _id;
 IF d IS NULL THEN RAISE EXCEPTION 'Movimiento no encontrado'; END IF;
 kind:=CASE _table WHEN 'invoices' THEN 'factura' WHEN 'payments' THEN 'cobro' WHEN 'purchase_invoices' THEN 'compra' ELSE 'pago' END;
 variant:=CASE WHEN kind='compra' THEN coalesce(d->>'categoria','') WHEN kind IN ('cobro','pago') THEN coalesce(d->>'metodo','') ELSE '' END;
 active:=d->>'deleted_at' IS NULL AND CASE kind WHEN 'factura' THEN d->>'estado' IN ('emitida','enviada','pagada','parcial','vencida') WHEN 'compra' THEN d->>'estado' IN ('aprobada','contabilizada','pagada','parcial') ELSE d->>'estado'='cobrado' END;
 SELECT * INTO old_entry FROM public.journal_entries WHERE source_table=_table AND source_id=_id AND reversal_of IS NULL AND reversed_at IS NULL FOR UPDATE;
 IF NOT active THEN
 IF old_entry.id IS NOT NULL THEN RETURN public.accounting_reverse(old_entry.id); END IF;
 RETURN NULL;
 END IF;
 dt:=coalesce(CASE kind WHEN 'cobro' THEN (d->>'fecha_cobro')::date WHEN 'pago' THEN (d->>'fecha_pago')::date ELSE (d->>'fecha_emision')::date END,current_date);
 total:=round(coalesce((d->>'total')::numeric,(d->>'importe')::numeric,0),2);
 b:=round(coalesce((d->>'base_imponible')::numeric,0)-CASE WHEN kind='factura' THEN coalesce((d->>'descuento')::numeric,0) ELSE 0 END,2);
 tax:=round(coalesce((d->>'iva')::numeric,0),2); withheld:=round(coalesce((d->>'retencion')::numeric,0),2);
 fingerprint:=md5(jsonb_build_array(total,b,tax,withheld,dt,d->>'client_id',d->>'supplier_id',d->>'invoice_id',d->>'purchase_invoice_id',d->>'cost_center_id',variant,d->>'numero',d->>'referencia')::text);
 IF old_entry.id IS NOT NULL AND old_entry.source_fingerprint=fingerprint THEN RETURN old_entry.numero; END IF;
 SELECT * INTO r FROM public.accounting_rules WHERE movimiento=kind AND variante IN ('',variant) ORDER BY (variante=variant) DESC LIMIT 1;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Configura las cuentas de % en Parametrización antes de confirmar el movimiento.',kind; END IF;
 counter:=public.accounting_account(r.contrapartida_id); main:=public.accounting_account(r.principal_id);
 IF kind IN ('factura','compra') THEN
 IF abs(b+tax-withheld-total)>0.01 THEN RAISE EXCEPTION 'Los importes del movimiento no cuadran: base + IVA - retención debe ser igual al total.'; END IF;
 IF tax<>0 THEN taxacc:=public.accounting_account(r.iva_id); END IF;
 IF withheld<>0 THEN retacc:=public.accounting_account(r.retencion_id); END IF;
 IF kind='factura' THEN lines:=jsonb_build_array(jsonb_build_object('account',counter,'value',total),jsonb_build_object('account',main,'value',-b),jsonb_build_object('account',taxacc,'value',-tax),jsonb_build_object('account',retacc,'value',withheld));
 ELSE lines:=jsonb_build_array(jsonb_build_object('account',main,'value',b),jsonb_build_object('account',taxacc,'value',tax),jsonb_build_object('account',counter,'value',-total),jsonb_build_object('account',retacc,'value',-withheld)); END IF;
 ELSE
 IF total<=0 THEN RAISE EXCEPTION 'El importe del cobro o pago debe ser positivo.'; END IF;
 lines:=CASE kind WHEN 'cobro' THEN jsonb_build_array(jsonb_build_object('account',main,'value',total),jsonb_build_object('account',counter,'value',-total)) ELSE jsonb_build_array(jsonb_build_object('account',counter,'value',total),jsonb_build_object('account',main,'value',-total)) END;
 END IF;
 IF old_entry.id IS NOT NULL THEN reverse_num:=public.accounting_reverse(old_entry.id); END IF;
 num:='AUT-'||extract(year from dt)::text||'-'||lpad(nextval('public.accounting_entry_sequence')::text,8,'0');
 INSERT INTO public.journal_entries(numero,fecha,ejercicio,concepto,invoice_id,cost_center_id,estado,source_table,source_id,source_fingerprint,created_by,updated_by)
 VALUES(num,dt,extract(year from dt)::integer,initcap(kind)||' '||coalesce(d->>'numero',d->>'referencia'),CASE WHEN kind='factura' THEN _id WHEN kind='cobro' THEN (d->>'invoice_id')::uuid ELSE NULL END,(d->>'cost_center_id')::uuid,'activo',_table,_id,fingerprint,auth.uid(),auth.uid()) RETURNING id INTO eid;
 FOR item IN SELECT value FROM jsonb_array_elements(lines) LOOP
 IF (item->>'value')::numeric<>0 THEN
 INSERT INTO public.journal_lines(entry_id,account_id,descripcion,debe,haber,created_by,updated_by) VALUES(eid,(item->>'account')::uuid,coalesce(d->>'concepto',d->>'numero',d->>'referencia'),greatest((item->>'value')::numeric,0),greatest(-(item->>'value')::numeric,0),auth.uid(),auth.uid());
 END IF;
 END LOOP;
 INSERT INTO public.audit_log(modulo,entidad,entidad_id,accion,user_id,user_email,valor_nuevo) VALUES('financiero','journal_entries',eid,'insert',auth.uid(),auth.jwt()->>'email',jsonb_build_object('numero',num,'movimiento',_table,'origen',_id));
 RETURN num;
END; $$;
REVOKE ALL ON FUNCTION public.sync_accounting_movement(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_accounting_movement(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accounting_movement_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.sync_accounting_movement(TG_TABLE_NAME,NEW.id);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.accounting_movement_trigger() FROM PUBLIC;
CREATE TRIGGER accounting_invoices AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.accounting_movement_trigger();
CREATE TRIGGER accounting_payments AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.accounting_movement_trigger();
CREATE TRIGGER accounting_purchases AFTER INSERT OR UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.accounting_movement_trigger();
CREATE TRIGGER accounting_supplier_payments AFTER INSERT OR UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.accounting_movement_trigger();

CREATE OR REPLACE FUNCTION public.protect_automatic_accounting() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE protected boolean;
BEGIN
 IF pg_trigger_depth()>1 OR current_user NOT IN ('authenticated','anon') THEN RETURN coalesce(NEW,OLD); END IF;
 IF TG_TABLE_NAME='journal_entries' THEN protected:=OLD.source_table IS NOT NULL;
 ELSE SELECT source_table IS NOT NULL INTO protected FROM public.journal_entries WHERE id=OLD.entry_id; END IF;
 IF protected THEN RAISE EXCEPTION 'Modifica el movimiento de origen; su asiento contable es de solo lectura.'; END IF;
 RETURN coalesce(NEW,OLD);
END; $$;
CREATE TRIGGER protect_automatic_entries BEFORE UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.protect_automatic_accounting();
CREATE TRIGGER protect_automatic_lines BEFORE UPDATE OR DELETE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.protect_automatic_accounting();