-- Additive migration: historical captures and already-published v1 revisions remain intact.
begin;
alter table public.wablind_captures add column preview_path text;
alter table public.wablind_captures add column rights_basis text check(rights_basis in ('own','licensed','permission'));
alter table public.wablind_captures add column rights_reference text;
alter table public.wablind_projects add column capture_id uuid references public.wablind_captures(id);

create function public.wablind_stamp_entries(p_entries jsonb,p_old jsonb,p_key text) returns jsonb
language sql security definer set search_path = '' as $$
 select coalesce(jsonb_agg(case when exists (
   select 1 from jsonb_array_elements(coalesce(p_old,'[]'::jsonb)) o
   where o->>p_key=a->>p_key and o-'author'-'updatedAt'=a-'author'-'updatedAt'
 ) then (select o from jsonb_array_elements(p_old) o where o->>p_key=a->>p_key limit 1)
 else a || jsonb_build_object('author',auth.uid()::text,'updatedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end),'[]'::jsonb)
 from jsonb_array_elements(p_entries) a;
$$;
revoke all on function public.wablind_stamp_entries(jsonb,jsonb,text) from public,anon,authenticated;

create function public.wablind_require_text(p_obj jsonb,p_key text,p_max integer,p_min integer default 0) returns void
language plpgsql set search_path = '' as $$
begin
 if jsonb_typeof(p_obj->p_key) is distinct from 'string' or length(p_obj->>p_key) not between p_min and p_max then raise exception 'INVALID_DOCUMENT: invalid text %',p_key; end if;
end; $$;
create function public.wablind_safe_url(p_url text) returns boolean
language sql immutable set search_path = '' as $$
 select p_url is not null and length(p_url) between 1 and 2048 and p_url ~* '^https?://[^/?#[:space:]@]+([/?#].*)?$' and p_url !~ '[[:cntrl:]]';
$$;
revoke all on function public.wablind_require_text(jsonb,text,integer,integer),public.wablind_safe_url(text) from public,anon,authenticated;

create or replace function public.wablind_checked_document(p_doc jsonb,p_old jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m jsonb; result jsonb; d jsonb; r jsonb; field text; row_data jsonb; value_data jsonb;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 if p_doc ? 'publicView' then raise exception 'INVALID_DOCUMENT: a public view is not a private source'; end if;
 if p_doc is null or octet_length(p_doc::text)>5242880
 or coalesce(p_doc->>'schemaVersion','') not in ('1','2')
 or jsonb_typeof(p_doc->'blocks') is distinct from 'array'
 or jsonb_typeof(p_doc->'annotations') is distinct from 'array'
 or jsonb_typeof(p_doc->'source') is distinct from 'object'
 or coalesce(length(p_doc->>'title'),0) not between 1 and 300
 then raise exception 'INVALID_DOCUMENT'; end if;
 if jsonb_array_length(p_doc->'blocks') not between 1 and 1500 or jsonb_array_length(p_doc->'annotations')>1500 then raise exception 'INVALID_DOCUMENT'; end if;
 perform public.wablind_require_text(p_doc,'id',80,1);
 if coalesce(p_doc->>'id','') !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception 'INVALID_DOCUMENT: document id'; end if;
 if exists(select 1 from jsonb_array_elements(p_doc->'blocks') b group by b->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_doc->'annotations') a group by a->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_doc->'annotations') a group by a->>'elementId',a->>'category' having count(*)>1)
 then raise exception 'INVALID_DOCUMENT: duplicate source or annotation'; end if;
 for d in select value from jsonb_array_elements(p_doc->'blocks') loop
   perform public.wablind_require_text(d,'id',80,1);
   if coalesce(d->>'id','') !~ '^[a-zA-Z0-9_-]{1,80}$' or coalesce(d->>'kind','') not in ('heading','paragraph','quote','code','list','table','image') then raise exception 'INVALID_DOCUMENT: source element'; end if;
 end loop;
 for d in select value from jsonb_array_elements(p_doc->'annotations') loop
   perform public.wablind_require_text(d,'id',80,1);
   perform public.wablind_require_text(d,'elementId',80,1);
   if coalesce(d->>'id','') !~ '^[a-zA-Z0-9_-]{1,80}$'
   or not exists(select 1 from jsonb_array_elements(p_doc->'blocks') b where b->>'id'=d->>'elementId')
   or coalesce(d->>'category','') not in ('section','main','description','list','table','reference','authorship','activity','omit') then raise exception 'INVALID_DOCUMENT: annotation target'; end if;
   perform public.wablind_require_text(d,'description',4000,1);
   perform public.wablind_require_text(d,'note',2000);
 end loop;
 if p_old is not null and (p_doc->'source' is distinct from p_old->'source' or p_doc->'blocks' is distinct from p_old->'blocks' or p_doc->'id' is distinct from p_old->'id') then
   raise exception 'INVALID_DOCUMENT: a new source needs a new project';
 end if;
 if p_old->>'schemaVersion'='2' and p_doc->>'schemaVersion'='1' then raise exception 'INVALID_DOCUMENT: format downgrade'; end if;
 result := jsonb_set(p_doc,'{annotations}',public.wablind_stamp_entries(p_doc->'annotations',p_old->'annotations','id'));
 if p_doc->>'schemaVersion'='1' then
   if p_doc ? 'mediation' then raise exception 'INVALID_DOCUMENT: mediation requires format 2'; end if;
   return result;
 end if;
 m := p_doc->'mediation';
 if jsonb_typeof(m) is distinct from 'object'
 or jsonb_typeof(m->'decisions') is distinct from 'array'
 or jsonb_typeof(m->'representations') is distinct from 'array'
 or jsonb_typeof(m->'references') is distinct from 'array'
 or jsonb_typeof(m->'summary'->'elementIds') is distinct from 'array'
 or coalesce(m->>'rightsBasis','') not in ('pending','own','licensed','permission')
 then raise exception 'INVALID_DOCUMENT: mediation'; end if;
 if jsonb_array_length(m->'decisions')>1500 or jsonb_array_length(m->'representations')>100 or jsonb_array_length(m->'references')>30 or jsonb_array_length(m->'summary'->'elementIds')>1500 then raise exception 'INVALID_DOCUMENT: mediation quota'; end if;
 foreach field in array array['task','purpose','context','rightsReference'] loop perform public.wablind_require_text(m,field,2000); end loop;
 perform public.wablind_require_text(m,'responsible',150);
 perform public.wablind_require_text(m,'sourceTitle',300);
 perform public.wablind_require_text(m,'sourceAuthor',500);
 perform public.wablind_require_text(m->'summary','text',12000);
 if exists(select 1 from jsonb_array_elements(m->'decisions') x group by x->>'elementId' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(m->'representations') x group by x->>'id' having count(*)>1)
 then raise exception 'INVALID_DOCUMENT: duplicate mediation'; end if;
 for d in select value from jsonb_array_elements(m->'decisions') loop
   perform public.wablind_require_text(d,'elementId',80,1);
   if jsonb_typeof(d->'treatments') is distinct from 'array' then raise exception 'INVALID_DOCUMENT: treatments'; end if;
   if jsonb_array_length(d->'treatments') not between 1 and 6 or exists(select 1 from jsonb_array_elements_text(d->'treatments') x group by x having count(*)>1) then raise exception 'INVALID_DOCUMENT: treatments cardinality'; end if;
   if coalesce(d->>'classification','') not in ('heading','paragraph','quote','code','image','list','table','reference') then raise exception 'INVALID_DOCUMENT: classification'; end if;
   foreach field in array array['role','rationale','omitReason'] loop perform public.wablind_require_text(d,field,2000); end loop;
   perform public.wablind_require_text(d,'description',4000);
   perform public.wablind_require_text(d,'explanation',6000);
   if not exists(select 1 from jsonb_array_elements(p_doc->'blocks') b where b->>'id'=d->>'elementId')
   or exists(select 1 from jsonb_array_elements(d->'treatments') t where jsonb_typeof(t) is distinct from 'string' or (t #>> '{}') not in ('preserve','describe','explain','summarize','omit'))
   then raise exception 'INVALID_DOCUMENT: decision'; end if;
 end loop;
 for r in select value from jsonb_array_elements(m->'representations') loop
   perform public.wablind_require_text(r,'id',80,1);
   if jsonb_typeof(r->'elementIds') is distinct from 'array' then raise exception 'INVALID_DOCUMENT: representation'; end if;
   if coalesce(r->>'id','') !~ '^[a-zA-Z0-9_-]{1,80}$' or jsonb_array_length(r->'elementIds') not between 1 and 1500 then raise exception 'INVALID_DOCUMENT: representation cardinality'; end if;
   if coalesce(r->>'kind','') not in ('text','table') or coalesce(r->>'relation','') not in ('alternative','complementary','sequential') then raise exception 'INVALID_DOCUMENT: representation type'; end if;
   perform public.wablind_require_text(r,'title',300,1);
   perform public.wablind_require_text(r,'text',12000);
   foreach field in array array['function','condition','alternative'] loop perform public.wablind_require_text(r,field,2000); end loop;
   if jsonb_typeof(r->'columns') is distinct from 'array' or jsonb_typeof(r->'rows') is distinct from 'array' then raise exception 'INVALID_DOCUMENT: table shape'; end if;
   if jsonb_array_length(r->'columns')>30 or jsonb_array_length(r->'rows')>200 then raise exception 'INVALID_DOCUMENT: table quota'; end if;
   if r->>'kind'='text' and trim(r->>'text')='' then raise exception 'INVALID_DOCUMENT: empty representation'; end if;
   if r->>'kind'='table' and (jsonb_array_length(r->'columns')=0 or jsonb_array_length(r->'rows')=0) then raise exception 'INVALID_DOCUMENT: empty table'; end if;
   for value_data in select value from jsonb_array_elements(r->'columns') loop
     if jsonb_typeof(value_data) is distinct from 'string' or length(value_data #>> '{}')>500 then raise exception 'INVALID_DOCUMENT: table heading'; end if;
   end loop;
   for row_data in select value from jsonb_array_elements(r->'rows') loop
     if jsonb_typeof(row_data) is distinct from 'array' then raise exception 'INVALID_DOCUMENT: table row'; end if;
     if jsonb_array_length(row_data)>30 or (r->>'kind'='table' and jsonb_array_length(row_data)<>jsonb_array_length(r->'columns')) then raise exception 'INVALID_DOCUMENT: table width'; end if;
     for value_data in select value from jsonb_array_elements(row_data) loop
       if jsonb_typeof(value_data) is distinct from 'string' or length(value_data #>> '{}')>2000 then raise exception 'INVALID_DOCUMENT: table cell'; end if;
     end loop;
   end loop;
   if exists(select 1 from jsonb_array_elements_text(r->'elementIds') i where not exists(select 1 from jsonb_array_elements(p_doc->'blocks') b where b->>'id'=i))
   then raise exception 'INVALID_DOCUMENT: representation target'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(m->'references') x group by x->>'id' having count(*)>1) then raise exception 'INVALID_DOCUMENT: duplicate reference'; end if;
 for r in select value from jsonb_array_elements(m->'references') loop
   if coalesce(r->>'id','') !~ '^[a-zA-Z0-9_-]{1,80}$' or not public.wablind_safe_url(r->>'url') then raise exception 'INVALID_DOCUMENT: reference URL'; end if;
   perform public.wablind_require_text(r,'title',300,1);
   perform public.wablind_require_text(r,'author',500);
 end loop;
 if exists(select 1 from jsonb_array_elements_text(m->'summary'->'elementIds') i where not exists(select 1 from jsonb_array_elements(p_doc->'blocks') b where b->>'id'=i)) then raise exception 'INVALID_DOCUMENT: summary target'; end if;
 result := jsonb_set(result,'{mediation,decisions}',public.wablind_stamp_entries(m->'decisions',p_old->'mediation'->'decisions','elementId'));
 return jsonb_set(result,'{mediation,representations}',public.wablind_stamp_entries(m->'representations',p_old->'mediation'->'representations','id'));
end; $$;

create function public.wablind_create_from_capture(p_capture uuid,p_title text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d jsonb; result jsonb;
begin
 select document into d from public.wablind_captures where id=p_capture and owner_id=auth.uid();
 if d is null then raise exception 'FORBIDDEN'; end if;
 if p_title is not null then d := jsonb_set(d,'{title}',to_jsonb(p_title)); end if;
 result := public.wablind_create_project(d);
 update public.wablind_projects set capture_id=p_capture where id=(result->>'id')::uuid;
 return result;
end; $$;
revoke all on function public.wablind_create_from_capture(uuid,text) from public,anon,authenticated;
grant execute on function public.wablind_create_from_capture(uuid,text) to authenticated;

create or replace function public.wablind_publish(p_id uuid,p_expected integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.wablind_projects; doc jsonb; m jsonb; b jsonb; d jsonb; r jsonb; visible integer := 0; omitted boolean;
begin
 select * into p from public.wablind_projects where id=p_id for update;
 if p.owner_id is distinct from auth.uid() or auth.uid() is null then raise exception 'FORBIDDEN'; end if;
 if p.version is distinct from p_expected then raise exception 'CONFLICT'; end if;
 select document into doc from public.wablind_revisions where id=p.current_revision_id;
 if doc->>'schemaVersion'='1' and coalesce(doc->'source'->>'rights','review-required') not in ('demo-original','authorized') then raise exception 'INVALID_DOCUMENT: source rights review required'; end if;
 m := doc->'mediation';
 if doc->>'schemaVersion'='2' then
   if coalesce(trim(m->>'task'),'')='' or coalesce(trim(m->>'purpose'),'')='' or coalesce(trim(m->>'responsible'),'')='' or coalesce(trim(m->>'sourceTitle'),'')='' or coalesce(m->>'rightsBasis','pending')='pending' or coalesce(trim(m->>'rightsReference'),'')='' then raise exception 'INVALID_DOCUMENT: task, source and rights review required'; end if;
   if coalesce(trim(m->'summary'->>'text'),'')<>'' and jsonb_array_length(m->'summary'->'elementIds')=0 then raise exception 'INVALID_DOCUMENT: summary provenance'; end if;
   for d in select value from jsonb_array_elements(m->'decisions') loop
     if coalesce(trim(d->>'role'),'')='' or coalesce(trim(d->>'rationale'),'')='' then raise exception 'INVALID_DOCUMENT: decision rationale'; end if;
     if d->'treatments' ? 'omit' and coalesce(trim(d->>'omitReason'),'')='' then raise exception 'INVALID_DOCUMENT: omission reason'; end if;
     if d->'treatments' ? 'describe' and coalesce(trim(d->>'description'),'')='' then raise exception 'INVALID_DOCUMENT: description'; end if;
     if d->'treatments' ? 'explain' and coalesce(trim(d->>'explanation'),'')='' then raise exception 'INVALID_DOCUMENT: explanation'; end if;
   end loop;
   for r in select value from jsonb_array_elements(m->'representations') loop
     if coalesce(trim(r->>'function'),'')='' or coalesce(trim(r->>'condition'),'')='' or coalesce(trim(r->>'author'),'')='' then raise exception 'INVALID_DOCUMENT: representation context'; end if;
   end loop;
 end if;
 for b in select value from jsonb_array_elements(doc->'blocks') loop
   select value into d from jsonb_array_elements(coalesce(m->'decisions','[]'::jsonb)) where value->>'elementId'=b->>'id';
   omitted := case when d is not null then d->'treatments' ? 'omit' else exists(select 1 from jsonb_array_elements(doc->'annotations') a where a->>'elementId'=b->>'id' and a->>'category'='omit') end;
   if not coalesce(omitted,false) then
     visible := visible + 1;
     if doc->>'schemaVersion'='1' and b->>'kind'='table' and not exists(select 1 from jsonb_array_elements(b->'rows') rr cross join lateral jsonb_array_elements(rr) c where c->'header'='true'::jsonb) then raise exception 'INVALID_DOCUMENT: missing table headers'; end if;
     if b->>'kind'='image' and (b->'alt' is null or b->'alt'='null'::jsonb)
     and not (coalesce(d->'treatments' ? 'describe',false) and coalesce(trim(d->>'description'),'')<>'')
     and not exists(select 1 from jsonb_array_elements(doc->'annotations') a where a->>'elementId'=b->>'id' and a->>'category'='description' and length(trim(a->>'description'))>0)
     then raise exception 'INVALID_DOCUMENT: missing image description'; end if;
   end if;
 end loop;
 if visible=0 then raise exception 'INVALID_DOCUMENT: empty reading'; end if;
 update public.wablind_projects set published_revision_id=current_revision_id,updated_at=now() where id=p_id;
 return jsonb_build_object('published',true,'revisionId',p.current_revision_id);
end; $$;

create or replace function public.wablind_publication(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d jsonb; entries jsonb; key text; source_block jsonb; decision jsonb; legacy_omit jsonb;
  element_order jsonb := '[]'::jsonb; omissions jsonb := '[]'::jsonb; omitted_ids jsonb := '[]'::jsonb; is_omitted boolean;
begin
 select r.document into d from public.wablind_projects p join public.wablind_revisions r on r.id=p.published_revision_id and r.project_id=p.id where p.id=p_id;
 if d is null then raise exception 'NOT_FOUND'; end if;
 -- A public view includes a manifest, not the source content that was omitted.
 -- Decisions take precedence over migrated legacy markers, as in readingProjection.
 for source_block in select value from jsonb_array_elements(d->'blocks') loop
   element_order := element_order || jsonb_build_array(source_block->>'id');
   select value into decision from jsonb_array_elements(coalesce(d->'mediation'->'decisions','[]'::jsonb)) where value->>'elementId'=source_block->>'id';
   select value into legacy_omit from jsonb_array_elements(d->'annotations') where value->>'elementId'=source_block->>'id' and value->>'category'='omit';
   is_omitted := case when decision is not null then decision->'treatments' ? 'omit' else legacy_omit is not null end;
   if coalesce(is_omitted,false) then
     omitted_ids := omitted_ids || jsonb_build_array(source_block->>'id');
     omissions := omissions || jsonb_build_array(jsonb_build_object('elementId',source_block->>'id','reason',case when decision is not null then coalesce(decision->>'omitReason','') else coalesce(legacy_omit->>'description','') end));
   end if;
 end loop;
 select coalesce(jsonb_agg(b),'[]'::jsonb) into entries from jsonb_array_elements(d->'blocks') b where not (omitted_ids ? (b->>'id'));
 d := jsonb_set(d,'{blocks}',entries);
 select coalesce(jsonb_agg(a || jsonb_build_object('author','Mediação WABlind')),'[]'::jsonb) into entries from jsonb_array_elements(d->'annotations') a where not (omitted_ids ? (a->>'elementId'));
 d := jsonb_set(d,'{annotations}',entries);
 if d->>'schemaVersion'='2' then
   foreach key in array array['decisions','representations'] loop
     select coalesce(jsonb_agg(a || jsonb_build_object('author',coalesce(d->'mediation'->>'responsible','Mediação WABlind'))),'[]'::jsonb) into entries from jsonb_array_elements(d->'mediation'->key) a
     where (key='decisions' and not (omitted_ids ? (a->>'elementId')))
        or (key='representations' and exists(select 1 from jsonb_array_elements_text(a->'elementIds') target where not (omitted_ids ? target)));
     d := jsonb_set(d,array['mediation',key],entries);
   end loop;
 end if;
 return jsonb_set(d,'{publicView}',jsonb_build_object('elementOrder',element_order,'omissions',omissions));
end; $$;

create or replace function public.wablind_normalize_url(p_url text) returns text
language plpgsql immutable set search_path = '' as $$
declare parts text[]; scheme text; authority text; suffix text;
begin
 if p_url is null then return null; end if;
 parts := regexp_match(regexp_replace(trim(p_url),'#.*$',''), '^(https?://)([^/?#]+)(.*)$','i');
 if parts is null then return trim(p_url); end if;
 scheme := lower(parts[1]); authority := lower(parts[2]); suffix := parts[3];
 if scheme='https://' then authority := regexp_replace(authority,':443$',''); else authority := regexp_replace(authority,':80$',''); end if;
 if suffix='' or left(suffix,1)='?' then suffix := '/' || suffix; end if;
 return scheme || authority || suffix;
end; $$;

create or replace function public.wablind_search_publications(p_query text,p_limit integer default 8)
returns table(id uuid,title text,source_url text,updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select p.id,coalesce(r.document->>'title','Página sem título'),r.document->'source'->>'url',p.updated_at
 from public.wablind_projects p join public.wablind_revisions r on r.id=p.published_revision_id and r.project_id=p.id
 where p.published_revision_id is not null and (trim(coalesce(p_query,''))='' or position(lower(trim(p_query)) in lower(r.document->>'title'))>0 or position(lower(trim(p_query)) in lower(r.document->'source'->>'url'))>0)
 order by p.updated_at desc limit greatest(1,least(20,coalesce(p_limit,8)));
$$;
create function public.wablind_publications_by_url(p_url text)
returns table(id uuid,title text,source_url text,updated_at timestamptz,purpose text)
language sql stable security definer set search_path = '' as $$
 select p.id,r.document->>'title',r.document->'source'->>'url',p.updated_at,coalesce(r.document->'mediation'->>'purpose','')
 from public.wablind_projects p join public.wablind_revisions r on r.id=p.published_revision_id and r.project_id=p.id
 where public.wablind_normalize_url(r.document->'source'->>'url')=public.wablind_normalize_url(p_url)
 order by p.updated_at desc limit 50;
$$;
create or replace function public.wablind_publication_by_url(p_url text) returns uuid
language sql stable security definer set search_path = '' as $$
 select id from public.wablind_publications_by_url(p_url) limit 1;
$$;
revoke all on function public.wablind_publications_by_url(text) from public,anon,authenticated;
grant execute on function public.wablind_publications_by_url(text) to anon,authenticated;
commit;
