-- WABlind 2.0. Apply to a dedicated Supabase project, not the thesis database.
begin;
create table public.wablind_projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  title text not null, version integer not null default 1,
  current_revision_id uuid, published_revision_id uuid,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.wablind_members (
  project_id uuid not null references public.wablind_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id), primary key(project_id,user_id)
);
create table public.wablind_revisions (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.wablind_projects(id) on delete cascade,
  author_id uuid not null references auth.users(id), version integer not null,
  document jsonb not null check(octet_length(document::text) <= 5242880),
  created_at timestamptz not null default now(), unique(project_id,version)
);
alter table public.wablind_projects add constraint wablind_current_fk foreign key(current_revision_id) references public.wablind_revisions(id);
alter table public.wablind_projects add constraint wablind_published_fk foreign key(published_revision_id) references public.wablind_revisions(id);
create table public.wablind_captures (
  id uuid primary key, owner_id uuid not null references auth.users(id),
  document jsonb not null check(octet_length(document::text) <= 5242880), storage_path text not null,
  created_at timestamptz not null default now()
);
create table public.wablind_capture_usage (
  user_id uuid not null references auth.users(id), day date not null,
  count integer not null, primary key(user_id,day)
);
create index wablind_members_user on public.wablind_members(user_id);
create index wablind_projects_owner on public.wablind_projects(owner_id);
create index wablind_captures_owner on public.wablind_captures(owner_id);
alter table public.wablind_projects enable row level security;
alter table public.wablind_members enable row level security;
alter table public.wablind_revisions enable row level security;
alter table public.wablind_captures enable row level security;
alter table public.wablind_capture_usage enable row level security;

create function public.wablind_can_read(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.wablind_projects p where p.id=p_id and
 (p.owner_id=auth.uid() or exists(select 1 from public.wablind_members m where m.project_id=p.id and m.user_id=auth.uid())));
$$;
create policy projects_read on public.wablind_projects for select to authenticated using(public.wablind_can_read(id));
create policy revisions_read on public.wablind_revisions for select to authenticated using(public.wablind_can_read(project_id));
create policy members_read on public.wablind_members for select to authenticated using(public.wablind_can_read(project_id));
create policy captures_read on public.wablind_captures for select to authenticated using(owner_id=auth.uid());
revoke all on public.wablind_projects,public.wablind_members,public.wablind_revisions,public.wablind_captures,public.wablind_capture_usage from anon,authenticated;
grant select on public.wablind_projects,public.wablind_members,public.wablind_revisions,public.wablind_captures to authenticated;
grant all on public.wablind_projects,public.wablind_members,public.wablind_revisions,public.wablind_captures,public.wablind_capture_usage to service_role;

create function public.wablind_checked_document(p_doc jsonb,p_old jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_annotations jsonb;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 if p_doc is null or octet_length(p_doc::text)>5242880
 or p_doc->>'schemaVersion' is distinct from '1'
 or jsonb_typeof(p_doc->'blocks') is distinct from 'array'
 or jsonb_typeof(p_doc->'annotations') is distinct from 'array'
 or jsonb_typeof(p_doc->'source') is distinct from 'object'
 or coalesce(length(p_doc->>'title'),0) not between 1 and 300
 then raise exception 'INVALID_DOCUMENT'; end if;
 if jsonb_array_length(p_doc->'blocks') not between 1 and 1500
 or jsonb_array_length(p_doc->'annotations')>1500 then raise exception 'INVALID_DOCUMENT'; end if;
 if p_old is not null and (p_doc->'source' is distinct from p_old->'source' or p_doc->'blocks' is distinct from p_old->'blocks' or p_doc->'id' is distinct from p_old->'id') then
  raise exception 'INVALID_DOCUMENT: a new source needs a new project';
 end if;
 select coalesce(jsonb_agg(case when exists (
   select 1 from jsonb_array_elements(coalesce(p_old->'annotations','[]'::jsonb)) old
   where old->>'id'=a->>'id' and old-'author'-'updatedAt'=a-'author'-'updatedAt'
 ) then (select old from jsonb_array_elements(p_old->'annotations') old where old->>'id'=a->>'id' limit 1)
 else a || jsonb_build_object('author',auth.uid()::text,'updatedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end),'[]'::jsonb)
 into v_annotations from jsonb_array_elements(p_doc->'annotations') a;
 return jsonb_set(p_doc,'{annotations}',v_annotations);
end; $$;

create function public.wablind_create_project(p_document jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_revision uuid := gen_random_uuid(); v_doc jsonb;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.wablind_projects where owner_id=auth.uid())>=50 then raise exception 'INVALID_DOCUMENT: project quota'; end if;
 v_doc := public.wablind_checked_document(p_document);
 insert into public.wablind_projects(id,owner_id,title) values(v_id,auth.uid(),v_doc->>'title');
 insert into public.wablind_revisions(id,project_id,author_id,version,document) values(v_revision,v_id,auth.uid(),1,v_doc);
 update public.wablind_projects set current_revision_id=v_revision where id=v_id;
 return jsonb_build_object('id',v_id,'owner_id',auth.uid(),'version',1,'document',v_doc);
end; $$;

create function public.wablind_save_revision(p_id uuid,p_document jsonb,p_expected integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.wablind_projects; v_id uuid := gen_random_uuid(); v_doc jsonb; old_doc jsonb;
begin
 select * into p from public.wablind_projects where id=p_id for update;
 if not public.wablind_can_read(p_id) then raise exception 'FORBIDDEN'; end if;
 if p.version is distinct from p_expected then raise exception 'CONFLICT'; end if;
 if p.version>=500 then raise exception 'INVALID_DOCUMENT: revision quota'; end if;
 select document into old_doc from public.wablind_revisions where id=p.current_revision_id;
 v_doc := public.wablind_checked_document(p_document,old_doc);
 insert into public.wablind_revisions(id,project_id,author_id,version,document) values(v_id,p_id,auth.uid(),p.version+1,v_doc);
 update public.wablind_projects set version=p.version+1,current_revision_id=v_id,title=v_doc->>'title',updated_at=now() where id=p_id;
 return jsonb_build_object('version',p.version+1,'revisionId',v_id,'document',v_doc);
end; $$;

create function public.wablind_publish(p_id uuid,p_expected integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.wablind_projects; v_doc jsonb;
begin
 select * into p from public.wablind_projects where id=p_id for update;
 if p.owner_id is distinct from auth.uid() or auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 if p.version is distinct from p_expected then raise exception 'CONFLICT'; end if;
 select document into v_doc from public.wablind_revisions where id=p.current_revision_id;
 if exists(select 1 from jsonb_array_elements(v_doc->'blocks') b where b->>'kind'='image'
   and (b->'alt' is null or b->'alt'='null'::jsonb)
   and not exists(select 1 from jsonb_array_elements(v_doc->'annotations') a where a->>'elementId'=b->>'id' and a->>'category'='description' and length(trim(a->>'description'))>0)) then
   raise exception 'INVALID_DOCUMENT: missing image description';
 end if;
 update public.wablind_projects set published_revision_id=current_revision_id,updated_at=now() where id=p_id;
 return jsonb_build_object('published',true,'revisionId',p.current_revision_id);
end; $$;
create function public.wablind_unpublish(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.wablind_projects where id=p_id and owner_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 update public.wablind_projects set published_revision_id=null,updated_at=now() where id=p_id;
 return jsonb_build_object('published',false);
end; $$;
create function public.wablind_publication(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_doc jsonb; v_annotations jsonb;
begin
 select r.document into v_doc from public.wablind_projects p join public.wablind_revisions r on r.id=p.published_revision_id and r.project_id=p.id where p.id=p_id;
 if v_doc is null then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(a || jsonb_build_object('author','Mediação WABlind')),'[]'::jsonb) into v_annotations from jsonb_array_elements(v_doc->'annotations') a;
 return jsonb_set(v_doc,'{annotations}',v_annotations);
end; $$;
create function public.wablind_add_member(p_id uuid,p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
 if not exists(select 1 from public.wablind_projects where id=p_id and owner_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.wablind_projects where id=p_id for update;
 select id into v_user from auth.users where lower(email)=lower(p_email) and email_confirmed_at is not null;
 if v_user is null then raise exception 'NOT_FOUND'; end if;
 insert into public.wablind_members(project_id,user_id) values(p_id,v_user) on conflict do nothing;
 return jsonb_build_object('added',true);
end; $$;
create function public.wablind_remove_member(p_id uuid,p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.wablind_projects where id=p_id and owner_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.wablind_projects where id=p_id for update;
 delete from public.wablind_members where project_id=p_id and user_id=p_user;
 return jsonb_build_object('removed',true);
end; $$;
create function public.wablind_capture_quota() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 insert into public.wablind_capture_usage(user_id,day,count) values(auth.uid(),current_date,1)
 on conflict(user_id,day) do update set count=public.wablind_capture_usage.count+1 returning count into n;
 if n>20 then raise exception 'INVALID_DOCUMENT: daily capture quota'; end if;
 return jsonb_build_object('remaining',20-n);
end; $$;

-- Function execution is opt-in, including helpers that are not public API.
revoke all on function public.wablind_can_read(uuid) from public,anon;
grant execute on function public.wablind_can_read(uuid) to authenticated;
revoke all on function public.wablind_checked_document(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.wablind_create_project(jsonb),public.wablind_save_revision(uuid,jsonb,integer),public.wablind_publish(uuid,integer),public.wablind_unpublish(uuid),public.wablind_add_member(uuid,text),public.wablind_remove_member(uuid,uuid),public.wablind_capture_quota() from public,anon;
grant execute on function public.wablind_create_project(jsonb),public.wablind_save_revision(uuid,jsonb,integer),public.wablind_publish(uuid,integer),public.wablind_unpublish(uuid),public.wablind_add_member(uuid,text),public.wablind_remove_member(uuid,uuid),public.wablind_capture_quota() to authenticated;
revoke all on function public.wablind_publication(uuid) from public;
grant execute on function public.wablind_publication(uuid) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('wablind-captures','wablind-captures',false,5242880,array['application/json']) on conflict(id) do nothing;
create policy wablind_capture_files_read on storage.objects for select to authenticated
 using(bucket_id='wablind-captures' and (storage.foldername(name))[1]=auth.uid()::text);
-- No client upload policy. The API writes only after authentication and capture validation.
commit;
