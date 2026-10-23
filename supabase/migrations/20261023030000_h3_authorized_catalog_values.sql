-- Initial catalog values supplied by the human user, 2026-10-23 America/Lima.
-- Existing H3 model/commands and approved Spec remain unchanged.
-- PASAPORTE is not added: outside the approved TIPO_DI contract pending clarification.
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'F','F',1 from public.catalogo where codigo='SEXO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'M','M',2 from public.catalogo where codigo='SEXO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CASADO','Casado (a)',1 from public.catalogo where codigo='ESTADO_CIVIL';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CONVIVIENTE','Conviviente',2 from public.catalogo where codigo='ESTADO_CIVIL';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'DIVORCIADO','Divorciado (a)',3 from public.catalogo where codigo='ESTADO_CIVIL';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'SOLTERO','Soltero (a)',4 from public.catalogo where codigo='ESTADO_CIVIL';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'VIUDO','Viudo (a)',5 from public.catalogo where codigo='ESTADO_CIVIL';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'A_NEG','A-',1 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'A_POS','A+',2 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'AB_NEG','AB-',3 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'AB_POS','AB+',4 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'B_NEG','B-',5 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'B_POS','B+',6 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'O_NEG','O-',7 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'O_POS','O+',8 from public.catalogo where codigo='GRUPO_SANGUINEO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'ANALFABETO','Analfabeto',1 from public.catalogo where codigo='GRADO_INSTRUCCION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'PRIMARIA','Primaria',2 from public.catalogo where codigo='GRADO_INSTRUCCION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'SECUNDARIA','Secundaria',3 from public.catalogo where codigo='GRADO_INSTRUCCION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'TECNICO','Tecnico',4 from public.catalogo where codigo='GRADO_INSTRUCCION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'SUPERIOR','Superior',5 from public.catalogo where codigo='GRADO_INSTRUCCION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'AZULES','Azules',1 from public.catalogo where codigo='COLOR_OJOS';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'MARRONES','Marrones',2 from public.catalogo where codigo='COLOR_OJOS';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'NEGROS','Negros',3 from public.catalogo where codigo='COLOR_OJOS';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'PARDOS','Pardos',4 from public.catalogo where codigo='COLOR_OJOS';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'VERDES','Verdes',5 from public.catalogo where codigo='COLOR_OJOS';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CASTANO','Castaño',1 from public.catalogo where codigo='COLOR_CABELLO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'MARRON','Marrón',2 from public.catalogo where codigo='COLOR_CABELLO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'NEGRO','Negro',3 from public.catalogo where codigo='COLOR_CABELLO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'PELIRROJO','Pelirrojo',4 from public.catalogo where codigo='COLOR_CABELLO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CONVIVIENTE','Conviviente',1 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CUNADO','Cuñado (a)',2 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'CONYUGE','Cónyuge',3 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'HERMANO','Hermano (a)',4 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'HIJO','Hijo (a)',5 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'MADRE','Madre',6 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'PADRE','Padre',7 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'PRIMO','Primo (a)',8 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'SOBRINO','Sobrino (a)',9 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'SUEGRO','Suegro (a)',10 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'TIO','Tio (a)',11 from public.catalogo where codigo='PARENTESCO';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select id,'VECINO','Vecino (a)',12 from public.catalogo where codigo='PARENTESCO';
