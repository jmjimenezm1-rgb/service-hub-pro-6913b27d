CREATE POLICY "documentos_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "documentos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos' AND public.is_staff(auth.uid()));
CREATE POLICY "documentos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documentos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'documentos' AND public.is_staff(auth.uid()));
CREATE POLICY "documentos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documentos' AND public.is_staff(auth.uid()));