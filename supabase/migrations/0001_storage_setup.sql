-- Create a public bucket for food images
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

-- Set up Row Level Security (RLS) for the bucket

-- Allow public read access to food images
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'food-images' );

-- Allow authenticated users to upload food images
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'food-images'
);

-- Allow users to delete their own uploaded images
create policy "Users can update/delete their own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'food-images' AND 
  auth.uid() = owner
);
