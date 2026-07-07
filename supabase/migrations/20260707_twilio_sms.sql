-- =============================================================================
--  Twilio SMS — storage bucket for PDFs linked from outgoing SMS  (2026-07-07)
-- =============================================================================
--  SMS can't carry a PDF attachment the way email does, so the app uploads
--  the generated PDF (subscription fiche / invoice) here and texts a link.
--  This script is ADDITIVE and IDEMPOTENT: safe to re-run.
--
--  HOW TO RUN
--    Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('sms-attachments', 'sms-attachments', true)
on conflict (id) do nothing;

drop policy if exists "sms-attachments public read" on storage.objects;
create policy "sms-attachments public read" on storage.objects for select
  using (bucket_id = 'sms-attachments');

drop policy if exists "sms-attachments write" on storage.objects;
create policy "sms-attachments write" on storage.objects for insert to authenticated
  with check (bucket_id = 'sms-attachments' and public.is_active_staff());

drop policy if exists "sms-attachments update" on storage.objects;
create policy "sms-attachments update" on storage.objects for update to authenticated
  using (bucket_id = 'sms-attachments' and public.is_active_staff());

drop policy if exists "sms-attachments delete" on storage.objects;
create policy "sms-attachments delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sms-attachments' and public.is_active_staff());
