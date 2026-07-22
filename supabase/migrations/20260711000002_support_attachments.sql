-- Storage bucket for support/feedback screenshots.
-- Authenticated users can upload; service_role can read for Resend forwarding.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support_attachments',
  'support_attachments',
  false,
  5 * 1024 * 1024,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do nothing;

-- Authenticated users (any logged-in user) can upload.
create policy "support_attachments_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'support_attachments');

-- Service role reads for Resend forwarding; users can read their own uploads.
create policy "support_attachments_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'support_attachments' and owner_id = auth.uid()::text);
