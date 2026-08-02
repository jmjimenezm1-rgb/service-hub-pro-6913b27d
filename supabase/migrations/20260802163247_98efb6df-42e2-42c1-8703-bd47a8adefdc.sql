create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('administrador_general','administrador_comercial','administrador_financiero','administrador_tecnico','soporte')
  )
$$;

do $$
declare t text;
begin
  foreach t in array array['clients','applications','invoice_series','coupons','invoices','invoice_lines','payments','cost_centers','ledger_accounts','journal_entries','journal_lines','documents','tickets','ticket_comments']
  loop
    execute format('drop policy "%1$s_auth_insert" on public.%1$I', t);
    execute format('drop policy "%1$s_auth_update" on public.%1$I', t);
    execute format('drop policy "%1$s_auth_delete" on public.%1$I', t);
    execute format('create policy "%1$s_staff_insert" on public.%1$I for insert to authenticated with check (public.is_staff(auth.uid()))', t);
    execute format('create policy "%1$s_staff_update" on public.%1$I for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()))', t);
    execute format('create policy "%1$s_staff_delete" on public.%1$I for delete to authenticated using (public.is_staff(auth.uid()))', t);
  end loop;
end $$;

drop policy "audit_log_auth_insert" on public.audit_log;
create policy "audit_log_insert" on public.audit_log for insert to authenticated with check (auth.uid() = user_id or user_id is null);