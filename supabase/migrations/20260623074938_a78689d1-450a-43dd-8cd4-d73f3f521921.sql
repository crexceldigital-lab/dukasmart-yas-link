
create or replace function public.gen_duka_id() returns text
  language sql
  set search_path = public
  as $$ select 'DY-'||lpad(nextval('duka_id_seq')::text,5,'0'); $$;

create or replace function public.touch_upd() returns trigger
  language plpgsql
  set search_path = public
  as $$ begin new.updated_at = now(); return new; end; $$;

revoke all on function public.cur_mid() from public, anon;
grant execute on function public.cur_mid() to authenticated;

revoke all on function public.gen_duka_id() from public, anon, authenticated;

revoke all on function public.get_link_with_merchant(text) from public;
grant execute on function public.get_link_with_merchant(text) to anon, authenticated;
