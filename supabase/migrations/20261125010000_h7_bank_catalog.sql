-- Bank directory consulted 2026-11-25; source and normalization in
-- supabase/reference/bancos-peru-2026-11-25.json. Project codes, not SBS codes.
-- Catalog data only: no financial schema, RPC or historical payment rewrite.
begin;
insert into public.catalogo(codigo,nombre) values('BANCO','Bancos del Perú')
on conflict(codigo) do nothing;
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
select c.id,v.codigo,v.nombre,v.orden from public.catalogo c
cross join (values
 ('AGROBANCO','Agrobanco',1),
 ('ALFIN','Alfin Banco',2),
 ('BANBIF','BanBif',3),
 ('BANCOM','Bancom',4),
 ('BCI','Banco BCI',5),
 ('BCP','BCP',6),
 ('BTG_PACTUAL','Banco BTG Pactual Perú',7),
 ('EFECTIVA','Banco Efectiva',8),
 ('FALABELLA','Banco Falabella',9),
 ('GNB','Banco GNB Perú',10),
 ('NACION','Banco de la Nación',11),
 ('PICHINCHA','Banco Pichincha',12),
 ('RIPLEY','Banco Ripley',13),
 ('SANTANDER','Banco Santander Perú',14),
 ('BANK_OF_CHINA','Bank of China (Perú)',15),
 ('BBVA','BBVA Perú',16),
 ('CITIBANK','Citibank del Perú',17),
 ('COFIDE','COFIDE',18),
 ('COMPARTAMOS','Compartamos Banco',19),
 ('ICBC','ICBC Perú Bank',20),
 ('INTERBANK','Interbank',21),
 ('MIBANCO','Mibanco',22),
 ('SANTANDER_CONSUMER','Santander Consumer Bank',23),
 ('SCOTIABANK','Scotiabank Perú',24)
) v(codigo,nombre,orden) where c.codigo='BANCO'
on conflict(catalogo_id,codigo) do nothing;
commit;
