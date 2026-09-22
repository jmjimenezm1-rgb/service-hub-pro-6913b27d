DROP POLICY IF EXISTS audit_log_auth_read ON public.audit_log;
CREATE POLICY audit_log_staff_read ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));