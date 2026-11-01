-- 心 · 夜游 —— 云端图库初始化脚本
-- 用法：在 Supabase 项目里打开 SQL Editor，把下面全部内容粘贴进去，点 Run，只需执行一次。

-- 1) 照片清单表：名字、存储路径、时间
create table if not exists public.photos (
  id uuid primary key,
  name text not null unique,
  path text not null,
  type text,
  size bigint,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

drop policy if exists "photos select" on public.photos;
drop policy if exists "photos insert" on public.photos;
drop policy if exists "photos delete" on public.photos;

create policy "photos select" on public.photos for select using (true);
create policy "photos insert" on public.photos for insert with check (true);
create policy "photos delete" on public.photos for delete using (true);

-- 2) 存放图片的桶（公开读，页面才能直接显示图片）
insert into storage.buckets (id, name, public)
values ('album', 'album', true)
on conflict (id) do update set public = true;

drop policy if exists "album read" on storage.objects;
drop policy if exists "album write" on storage.objects;
drop policy if exists "album delete" on storage.objects;

create policy "album read" on storage.objects for select using (bucket_id = 'album');
create policy "album write" on storage.objects for insert with check (bucket_id = 'album');
create policy "album delete" on storage.objects for delete using (bucket_id = 'album');
