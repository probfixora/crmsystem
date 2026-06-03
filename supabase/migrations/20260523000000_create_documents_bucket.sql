-- Create the bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Allow public uploads to the bucket (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow public uploads' and tablename = 'objects' and schemaname = 'storage'
  ) then
    execute 'create policy "Allow public uploads" on storage.objects for insert with check ( bucket_id = ''documents'' )';
  end if;
end $$;

-- Allow public viewing (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow public viewing' and tablename = 'objects' and schemaname = 'storage'
  ) then
    execute 'create policy "Allow public viewing" on storage.objects for select using ( bucket_id = ''documents'' )';
  end if;
end $$;

-- Allow users to update their files (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow public update' and tablename = 'objects' and schemaname = 'storage'
  ) then
    execute 'create policy "Allow public update" on storage.objects for update using ( bucket_id = ''documents'' )';
  end if;
end $$;
