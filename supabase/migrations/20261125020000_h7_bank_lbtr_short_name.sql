-- Human-approved LBTR list, 2026-11-25. Preserve catalog-value IDs and payments.
-- Provenance: supabase/reference/bancos-lbtr-2026-11-25.json.
begin;
alter table public.catalogo_valor add column nombre_corto text;
alter table public.catalogo_valor add constraint catalogo_valor_nombre_corto_valid
 check(nombre_corto is null or (nombre_corto=btrim(nombre_corto) and length(nombre_corto) between 1 and 50));
comment on column public.catalogo_valor.nombre_corto is 'Nombre corto opcional; NULL cuando no se ha definido.';

create temporary table banco_lbtr_mapping(
 anterior text not null,codigo text primary key check(codigo ~ '^[0-9]{4}$'),
 nombre text not null,nombre_corto text
) on commit drop;
insert into banco_lbtr_mapping values
 ('BCP','0002','Banco de Crédito del Perú (BCP)','BCP'),
 ('INTERBANK','0003','Interbank','IBK'),
 ('CITIBANK','0007','Citibank Perú',null),
 ('SCOTIABANK','0009','Scotiabank Perú',null),
 ('BBVA','0011','BBVA Perú','BBVA'),
 ('NACION','0018','Banco de la Nación',null),
 ('BANCOM','0023','Banco de Comercio',null),
 ('PICHINCHA','0035','Banco Pichincha',null),
 ('BANBIF','0038','BanBif',null),
 ('SANTANDER_CONSUMER','0043','Santander Consumer Bank',null),
 ('MIBANCO','0049','Mibanco',null),
 ('GNB','0053','Banco GNB Perú',null),
 ('FALABELLA','0054','Banco Falabella',null),
 ('RIPLEY','0055','Banco Ripley',null),
 ('SANTANDER','0056','Banco Santander Perú',null),
 ('ALFIN','0058','Alfin Banco',null),
 ('ICBC','0060','ICBC Peru Bank',null),
 ('JP_MORGAN','0061','J.P. Morgan Banco de Inversión',null),
 ('BANK_OF_CHINA','0062','Bank of China (Perú)',null),
 ('BCI','0063','Banco BCI Perú',null),
 ('COMPARTAMOS','0091','Compartamos Banco',null);

-- Do not merge different IDs silently if a local installation already has both
-- the former internal code and its new LBTR equivalent.
do $$
begin
 if exists(select 1 from banco_lbtr_mapping m
 join public.catalogo c on c.codigo='BANCO'
 join public.catalogo_valor old_value on old_value.catalogo_id=c.id and old_value.codigo=m.anterior
 join public.catalogo_valor new_value on new_value.catalogo_id=c.id and new_value.codigo=m.codigo
 where old_value.id<>new_value.id) then
  raise exception using errcode='23514',message='BANK_LBTR_ID_CONFLICT',
   hint='Reconcile duplicate bank catalog values explicitly; no IDs merged.';
 end if;
end $$;

-- Rename/recode the existing entries in place. This list is explicitly approved
-- as the new active set; excluded entries stay present but inactive.
update public.catalogo_valor v
set codigo=m.codigo,nombre=m.nombre,nombre_corto=m.nombre_corto,orden=m.codigo::integer,activo=true
from banco_lbtr_mapping m,public.catalogo c
where c.codigo='BANCO' and v.catalogo_id=c.id and v.codigo in(m.anterior,m.codigo);

insert into public.catalogo_valor(catalogo_id,codigo,nombre,nombre_corto,orden)
select c.id,m.codigo,m.nombre,m.nombre_corto,m.codigo::integer
from banco_lbtr_mapping m cross join public.catalogo c where c.codigo='BANCO'
on conflict(catalogo_id,codigo) do nothing;

update public.catalogo_valor v set activo=false
from public.catalogo c where c.codigo='BANCO' and v.catalogo_id=c.id and v.activo
and not exists(select 1 from banco_lbtr_mapping m where m.codigo=v.codigo);
commit;
