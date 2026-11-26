-- TASK-H7-008: optional operational address + last user-confirmed normalized reference.
begin;
alter table public.empresa_patrocinadora
 add column domicilio_fiscal text check (domicilio_fiscal is null or (length(domicilio_fiscal)<=500 and domicilio_fiscal !~ '[[:cntrl:]]')),
 add column datos_tributarios jsonb;

create function private.valid_company_tax(v jsonb, company_ruc text) returns boolean
language plpgsql stable set search_path='' as $$
declare k text; n integer; total integer:=0; weights integer[]:=array[5,4,3,2,7,6,5,4,3,2];
begin
 if v is null then return true; end if;
 if jsonb_typeof(v)<>'object' or octet_length(v::text)>8192 then return false; end if;
 if not (v ?& array['ruc','razon_social','estado','condicion','direccion','ubigeo','source','as_of','proveedor','consultado_at'])
 or v-array['ruc','razon_social','estado','condicion','direccion','ubigeo','source','as_of','proveedor','consultado_at']<>'{}'::jsonb then return false;end if;
 if v->>'ruc' is distinct from company_ruc or company_ruc !~ '^20[0-9]{9}$' then return false;end if;
 for n in 1..10 loop total:=total+substring(company_ruc,n,1)::integer*weights[n];end loop;
 if ((11-total%11)%10)<>right(company_ruc,1)::integer then return false;end if;
 foreach k in array array['ruc','razon_social','source','as_of','proveedor','consultado_at'] loop
  if jsonb_typeof(v->k)<>'string' or btrim(v->>k)='' or (v->>k) ~ '[[:cntrl:]]' then return false;end if;
 end loop;
 foreach k in array array['estado','condicion','direccion','ubigeo'] loop
  if jsonb_typeof(v->k) not in ('string','null') then return false;end if;
  if jsonb_typeof(v->k)='string' and (btrim(v->>k)='' or (v->>k) ~ '[[:cntrl:]]') then return false;end if;
 end loop;
 if length(v->>'razon_social')>200 or length(v->>'estado')>80 or length(v->>'condicion')>80 or length(v->>'direccion')>500
 or (v->>'ubigeo' is not null and v->>'ubigeo' !~ '^[0-9]{6}$')
 or v->>'source'<>'SUNAT' or v->>'proveedor'<>'OpenRUC' then return false;end if;
 if v->>'as_of' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (v->>'as_of')::date::text<>v->>'as_of'
 or (v->>'as_of')::date>(current_timestamp at time zone 'UTC')::date then return false;end if;
 if v->>'consultado_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
 or to_char((v->>'consultado_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>v->>'consultado_at'
 or (v->>'consultado_at')::timestamptz>current_timestamp+interval '1 minute' then return false;end if;
 return true;
exception when others then return false;
end; $$;
revoke all on function private.valid_company_tax(jsonb,text) from public,anon,authenticated;
alter table public.empresa_patrocinadora add constraint empresa_tax_reference_valid check(private.valid_company_tax(datos_tributarios,ruc));
create or replace function public.guardar_empresa_patrocinadora(p jsonb) returns public.empresa_patrocinadora
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.empresa_patrocinadora; incoming public.empresa_patrocinadora; clean jsonb; parent public.alumno;
begin
 perform private.authorize(false);
 perform private.assert_fields(p-'datos_tributarios',array['id','expected_updated_at','ruc','razon_social','persona_contacto','telefono','email','domicilio_fiscal','datos_tributarios']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p);
 select * into incoming from jsonb_populate_record(null::public.empresa_patrocinadora,clean);
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.empresa_patrocinadora(ruc,razon_social,persona_contacto,telefono,email,domicilio_fiscal,datos_tributarios) values(incoming.ruc,incoming.razon_social,incoming.persona_contacto,incoming.telefono,incoming.email,incoming.domicilio_fiscal,incoming.datos_tributarios) returning * into result;
 else
 update public.empresa_patrocinadora set ruc=incoming.ruc,razon_social=incoming.razon_social,persona_contacto=incoming.persona_contacto,telefono=incoming.telefono,email=incoming.email,
 domicilio_fiscal=case when p ? 'domicilio_fiscal' then incoming.domicilio_fiscal else domicilio_fiscal end,
 datos_tributarios=case when p ? 'datos_tributarios' then incoming.datos_tributarios when ruc is distinct from incoming.ruc then null else datos_tributarios end
 where id=incoming.id and updated_at=(p->>'expected_updated_at')::timestamptz returning * into result;
 if not found then perform private.require_version(null,(p->>'expected_updated_at')::timestamptz); end if;
 end if;
 return result;
end; $$;

-- Existing academic RLS, grants, version stamp and redacted audit remain in place.
notify pgrst,'reload schema';
commit;
