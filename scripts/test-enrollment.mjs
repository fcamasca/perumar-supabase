import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs';
import { inspectDatabase } from './local-platform.mjs';
let fixture, current = 'preparation', passed = 0;
const reject = r => assert.ok(r.error, 'request should be rejected');
try {
    fixture = await createFixtures();
    const clients = {};
    for (const [name, e] of Object.entries(fixture.entries)) {
        clients[name] = publicClient(fixture.config);
        checked(await clients[name].auth.signInWithPassword({ email: e.email, password: e.password }), 'login');
    }
    const { D, O, A } = clients, tag = randomUUID().slice(0, 6).toUpperCase();
    const rpc = async (c, n, args) => { const r = await c.rpc(n, args); if (r.error)
        console.error('RPC ' + n + ' code=' + r.error.code); return checked(r, n); };
    const rows = async (table) => checked(await D.from(table).select('*'), table);
    const byId = async (table, id) => checked(await D.from(table).select('*').eq('id', id).single(), table);
    const version = x => ({ id: x.id, expected_updated_at: x.updated_at });
    const scenario = async (id, fn) => { current = id; await fn(); passed++; console.log(id + ': PASSED technical DB/API'); };
    const vals = await rows('catalogo_valor'), cat = {};
    const authorized = JSON.parse(readFileSync('supabase/reference/h3-catalog-values.json','utf8')).catalogs;
    const definitions=await rows('catalogo');
    for(const [catalog, expected] of Object.entries(authorized)) {
        const definition=definitions.find(c=>c.codigo===catalog);
        const actual=vals.filter(v=>v.catalogo_id===definition.id && v.activo).map(v=>({codigo:v.codigo,nombre:v.nombre})).sort((a,b)=>a.codigo.localeCompare(b.codigo));
        assert.deepEqual(actual,[...expected].sort((a,b)=>a.codigo.localeCompare(b.codigo)));
    }
    assert.deepEqual(vals.filter(v=>v.catalogo_id===definitions.find(c=>c.codigo==='TIPO_DI').id).map(v=>v.codigo).sort(),['CARNET_EXTRANJERIA','DNI']);

    for (const name of ['SEXO', 'ESTADO_CIVIL', 'GRUPO_SANGUINEO', 'GRADO_INSTRUCCION', 'COLOR_OJOS', 'COLOR_CABELLO', 'PARENTESCO']) {
        cat[name] = inspectDatabase("insert into public.catalogo_valor(catalogo_id,codigo,nombre) select id,:'code',:'code' from public.catalogo where codigo=:'catalog' returning id;", { code: 'TEST_' + tag, catalog: name }).split('\n')[0];
    }
    const dni = vals.find(v => v.codigo === 'DNI').id, ce = vals.find(v => v.codigo === 'CARNET_EXTRANJERIA').id;
    const district = (await rows('distrito'))[0], province = await byId('provincia', district.provincia_id);
    const geo = { departamento_id: province.departamento_id, provincia_id: province.id, distrito_id: district.id };
    let seq = Math.floor(Math.random() * 1000000);
    const payload = () => ({ apellido_paterno: 'Ensayo', apellido_materno: 'Sintético', nombres: 'Alumno', tipo_di_id: dni, numero_di: String(++seq).padStart(8, '0'), fecha_nacimiento: '2000-10-22', sexo_id: vals.find(v=>v.codigo==='F' && v.catalogo_id===definitions.find(c=>c.codigo==='SEXO').id).id, celular: '+51 999 111 222', domicilio: 'SINTETICO', ...Object.fromEntries(Object.entries(geo).map(([k, v]) => ['nacimiento_' + k, v])), ...Object.fromEntries(Object.entries(geo).map(([k, v]) => ['domicilio_' + k, v])), grado_instruccion_id: cat.GRADO_INSTRUCCION, color_ojos_id: cat.COLOR_OJOS, color_cabello_id: cat.COLOR_CABELLO });
    const student = async () => rpc(O, 'guardar_alumno', { p: payload() });
    const contact = async (a) => rpc(O, 'guardar_contacto_emergencia', { p: { alumno_id: a.id, expected_alumno_updated_at: a.updated_at, apellido: 'Contacto', nombre: 'Sintético', parentesco_id: cat.PARENTESCO, celular: '999111222' } });
    const mat = await rpc(D, 'guardar_materia', { p: { codigo: tag, nombre: 'MATERIA ' + tag } });
    const career = async (suffix) => rpc(D, 'guardar_carrera', { p: { codigo: tag + suffix, nombre: 'CARRERA ' + tag + suffix, sigla: tag + suffix, modalidad_id: vals.find(v => v.codigo === 'CON_EXPERIENCIA').id }, materias: [mat.id] });
    const career1 = await career('A'), career2 = await career('B');
    const cycle = async (career, date) => rpc(D, 'guardar_ciclo', { p: { ...geo, carrera_id: career.id, capitania_id: (await rows('capitania'))[0].id, fecha_inicio: date, fecha_fin: date } });
    let c1 = await cycle(career1, '2045-01-01'), c2 = await cycle(career1, '2045-02-01'), c3 = await cycle(career2, '2045-03-01');
    const tariff = async (tipo, suffix, monto) => rpc(D, 'guardar_tarifa', { p: { codigo: tag + suffix, nombre: 'TARIFA ' + suffix, tipo, monto_por_defecto: monto } });
    const t = await tariff('CARRERA', 'C', '650.00'), opt = await tariff('OTRO', 'O', '80');
    const configure = async (c) => rpc(D, 'guardar_ciclo_tarifas', { ciclo_id: c.id, expected_updated_at: c.updated_at, configuracion: [{ tarifa_id: t.id, importe: c.id === c2.id ? '700' : '650', obligatorio: 'true' }, { tarifa_id: opt.id, importe: '80', obligatorio: 'false' }] });
    c1 = await configure(c1);
    c2 = await configure(c2);
    c3 = await configure(c3);
    const config = (await rows('ciclo_tarifa')), option = c => config.find(x => x.ciclo_id === c.id && x.tarifa_id === opt.id).id;
    const register = async (c, a, extras = {}, client = D) => rpc(client, 'registrar_matricula', { p: { alumno_id: a.id, expected_alumno_updated_at: a.updated_at, ciclo_id: c.id, expected_ciclo_updated_at: c.updated_at, ...extras }, opcionales: config.some(x => x.ciclo_id === c.id && x.tarifa_id === opt.id) ? [option(c)] : [] });
    let a, reg;
    await scenario('TEST-H3-004-009 alumno-contactos-catalogos', async () => {
        const approvedValue=(catalog,code)=>vals.find(v=>v.catalogo_id===definitions.find(c=>c.codigo===catalog).id && v.codigo===code).id;
        const initialContact={apellido:'INICIAL',nombre:'SINTETICO',parentesco_id:approvedValue('PARENTESCO','CONVIVIENTE'),celular:'999111222'};
        const initial=await rpc(O,'guardar_alumno',{p:{...payload(),grado_instruccion_id:approvedValue('GRADO_INSTRUCCION','PRIMARIA'),color_ojos_id:approvedValue('COLOR_OJOS','AZULES'),color_cabello_id:approvedValue('COLOR_CABELLO','CASTANO'),contactos:[initialContact,initialContact]}});
        assert.equal(checked(await D.from('alumno_contacto_emergencia').select('id').eq('alumno_id',initial.id),'initial contacts').length,2);
        const seededEnrollment=await register(c3,initial);
        assert.equal(seededEnrollment.alumno_snapshot.catalogos.COLOR_CABELLO.etiqueta,'Castaño');
        assert.equal(seededEnrollment.alumno_snapshot.contactos[0].parentesco.etiqueta,'Conviviente');
        const beforeInitial=(await rows('alumno')).length;
        reject(await O.rpc('guardar_alumno',{p:{...payload(),contactos:[{...initialContact,parentesco_id:cat.SEXO}]}}));
        assert.equal((await rows('alumno')).length,beforeInitial);
        a = await student();
        reject(await O.rpc('guardar_alumno', { p: { ...payload(), numero_di: '1234567' } }));
        reject(await O.rpc('guardar_alumno', { p: { ...payload(), color_ojos_id: cat.PARENTESCO } }));
        reject(await O.rpc('guardar_alumno', { p: { ...payload(), sexo_id: randomUUID() } }));
        reject(await O.rpc('guardar_alumno', { p: { ...payload(), tipo_di_id: dni, numero_di: a.numero_di } }));
        await rpc(O, 'guardar_alumno', { p: { ...payload(), tipo_di_id: ce, numero_di: a.numero_di } });
        reject(await O.rpc('registrar_matricula', { p: { alumno_id: a.id, expected_alumno_updated_at: a.updated_at, ciclo_id: c1.id, expected_ciclo_updated_at: c1.updated_at }, opcionales: [] }));
        const cc = await contact(a);
        a = await byId('alumno', a.id);
        await rpc(O, 'retirar_contacto_emergencia', { id: cc.id, expected_alumno_updated_at: a.updated_at });
        a = await byId('alumno', a.id);
        await contact(a);
        a = await byId('alumno', a.id);
        await contact(a);
        a = await byId('alumno', a.id);
    });
    await scenario('TEST-H3-012-018 tarifas-empresa-tampering', async () => {
        const company = await rpc(O, 'guardar_empresa_patrocinadora', { p: { ruc: '00' + String(++seq).padStart(9, '0'), razon_social: 'EMPRESA SINTETICA' } });
        reject(await O.rpc('guardar_empresa_patrocinadora', { p: { ruc: '123', razon_social: 'X' } }));
        reject(await O.rpc('guardar_tarifa', { p: { codigo: 'DENIED', nombre: 'DENIED', tipo: 'OTRO', monto_por_defecto: '1' } }));
        reject(await D.rpc('guardar_tarifa', { p: { codigo: 'BAD', nombre: 'BAD', tipo: 'OTRO', monto_por_defecto: '1.001' } }));
        reject(await D.rpc('registrar_matricula', { p: { alumno_id: a.id, ciclo_id: c1.id, importe: '1' }, opcionales: [] }));
        reg = await register(c1, a, { empresa_patrocinadora_id: company.id, descuento: '50', motivo_descuento: 'ENSAYO' });
        assert.equal(reg.alumno_snapshot.contactos.length, 2);
        for (const k of ['GRADO_INSTRUCCION', 'COLOR_OJOS', 'COLOR_CABELLO'])
            assert.equal(reg.alumno_snapshot.catalogos[k].id, cat[k]);
    });
    await scenario('TEST-H3-010-011 snapshot-historia-auditoria', async () => {
        const shot = JSON.stringify(reg.alumno_snapshot);
        const { id, updated_at, created_at, ...data } = a;
        void created_at;
        a = await rpc(O, 'guardar_alumno', { p: Object.fromEntries(Object.entries({ ...data, id, expected_updated_at: updated_at, nombres: 'Cambio' }).map(([k, v]) => [k, v === null ? null : String(v)])) });
        inspectDatabase("update public.catalogo_valor set nombre='ETIQUETA_MODIFICADA' where id=:'value'::uuid;", { value: cat.COLOR_OJOS });
        assert.equal(JSON.stringify((await byId('matricula', reg.id)).alumno_snapshot), shot);
        const audit = await rows('auditoria');
        assert.ok(!JSON.stringify(audit.filter(x => x.entidad === 'alumno')).includes('Sintético'));
        assert.ok(!JSON.stringify(audit).includes('alumno_snapshot'));
    });
    await scenario('TEST-H3-028-032 cambio-ciclo-descuento-cargos', async () => {
        let old = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', reg.id), 'charges');
        reject(await O.rpc('editar_matricula', { p: { ...version(reg), descuento: '5', motivo_descuento: 'NO' } }));
        reg = await rpc(O, 'editar_matricula', { p: { ...version(reg), ciclo_id: c2.id, expected_ciclo_updated_at: c2.updated_at }, opcionales: [option(c2)] });
        let charges = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', reg.id), 'charges');
        for (const x of old) {
            const h = charges.find(v => v.id === x.id);
            assert.equal(h.activo, false);
            assert.equal(h.motivo_inactivacion, 'CAMBIO_CICLO');
            assert.equal(h.descuento, x.descuento);
            assert.equal(h.importe_original, x.importe_original);
        }
        assert.equal(charges.find(x => x.activo && x.tipo === 'CARRERA').descuento, 0);
        reg = await rpc(D, 'editar_matricula', { p: { ...version(reg), descuento: '25', motivo_descuento: 'NUEVO' } });
        reg = await rpc(O, 'editar_matricula', { p: { ...version(reg), expected_ciclo_updated_at: c2.updated_at }, opcionales: [] });
        reg = await rpc(O, 'editar_matricula', { p: { ...version(reg), expected_ciclo_updated_at: c2.updated_at }, opcionales: [option(c2)] });
        charges = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', reg.id), 'charges');
        assert.equal(charges.filter(x => x.activo && x.tipo === 'OTRO').length, 1);
        assert.equal(charges.filter(x => !x.activo && x.tipo === 'OTRO').length, 2);
    });
    await scenario('TEST-H3-002-003 security-direct-bypass', async () => {
        for (const [name, client] of Object.entries(clients)) {
            for (const table of ['alumno', 'alumno_contacto_emergencia', 'empresa_patrocinadora', 'tarifa', 'ciclo_tarifa', 'matricula', 'matricula_cargo']) {
                reject(await client.from(table).insert({ id: randomUUID() }));
                reject(await client.from(table).update({ id: randomUUID() }).eq('id', reg.id));
                reject(await client.from(table).delete().eq('id', reg.id));
                if (['A', 'B', 'N', 'F', 'I'].includes(name))
                    assert.equal(checked(await client.from(table).select('*'), 'denied select').length, 0);
            }
        }
        reject(await A.rpc('guardar_alumno', { p: payload() }));
        reject(await clients.I.rpc('guardar_alumno', { p: payload() }));
    });
    await scenario('TEST-H3-021-027 history-cycle-code', async () => {
        const cp = c => ({ id: c.id, expected_updated_at: c.updated_at, carrera_id: c.carrera_id, fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin, nombre_promocion: c.nombre_promocion, ...geo, capitania_id: c.capitania_id });
        reject(await D.rpc('guardar_ciclo', { p: { ...cp(c2), carrera_id: career2.id } }));
        const code = reg.codigo_matricula;
        reject(await O.rpc('anular_matricula', { ...version(reg), motivo: ' ' }));
        reg = await rpc(O, 'anular_matricula', { ...version(reg), motivo: 'ENSAYO' });
        reject(await O.rpc('anular_matricula', { ...version(reg), motivo: 'REPEAT' }));
        const changed = await rpc(D, 'guardar_ciclo', { p: { ...cp(c2), carrera_id: career2.id } });
        assert.equal(changed.carrera_id, career2.id);
        assert.equal((await byId('matricula', reg.id)).codigo_matricula, code);
        reject(await D.rpc('registrar_matricula', { p: { alumno_id: a.id, expected_alumno_updated_at: a.updated_at, ciclo_id: changed.id, expected_ciclo_updated_at: changed.updated_at }, opcionales: [] }));
        reject(await O.rpc('editar_matricula', { p: { ...version(reg), codigo_matricula: '2026-TEST-001' } }));
    });
    await scenario('TEST-H3-023-024-026-032 concurrency', async () => {
        const b = await student();
        await contact(b);
        const ready = await byId('alumno', b.id);
        const args = { p: { alumno_id: ready.id, expected_alumno_updated_at: ready.updated_at, ciclo_id: c3.id, expected_ciclo_updated_at: c3.updated_at }, opcionales: [] };
        const race = await Promise.all([D.rpc('registrar_matricula', args), O.rpc('registrar_matricula', args)]);
        assert.equal(race.filter(x => !x.error).length, 1);
        const winner = race.find(x => !x.error).data;
        const edits = await Promise.all([D.rpc('editar_matricula', { p: { ...version(winner), empresa_patrocinadora_id: null } }), O.rpc('anular_matricula', { ...version(winner), motivo: 'RACE' })]);
        assert.equal(edits.filter(x => !x.error).length, 1);
        const all = await rows('matricula');
        assert.equal(new Set(all.map(x => x.codigo_matricula)).size, all.length);
    });
    const readyStudent = async () => { let x = await student(); await contact(x); return byId('alumno', x.id); };
    await scenario('TEST-H3-004-005-008 document-and-reference-boundaries', async () => {
        for (const extra of [{ numero_di: '123456789' }, { numero_di: 'ABCDEFGH' }, { tipo_di_id: ce, numero_di: 'A'.repeat(31) }, { tipo_di_id: ce, numero_di: 'A-1' }, { fecha_nacimiento: '2999-01-01' }, { nombres: ' ' }, { estatura_cm: '0' }, { peso_kg: '-1' }, { grado_instruccion_id: cat.SEXO }])
            reject(await O.rpc('guardar_alumno', { p: { ...payload(), ...extra } }));
        let x = await student();
        const contactArgs = { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, apellido: 'SINTETICO', nombre: 'SINTETICO', celular: '999111222' };
        reject(await O.rpc('guardar_contacto_emergencia', { p: { ...contactArgs, parentesco_id: cat.SEXO } }));
        inspectDatabase("update public.catalogo_valor set activo=false where id=:'value'::uuid;", { value: cat.PARENTESCO });
        try {
            reject(await O.rpc('guardar_contacto_emergencia', { p: { ...contactArgs, parentesco_id: cat.PARENTESCO } }));
        }
        finally {
            inspectDatabase("update public.catalogo_valor set activo=true where id=:'value'::uuid;", { value: cat.PARENTESCO });
        }
    });
    let extraCycle = await configure(await cycle(career1, '2046-01-01'));
    await scenario('TEST-H3-013-015-020 tariff-cardinality-state-discount', async () => {
        const zero = await tariff('OTRO', 'Z', '0.00');
        assert.equal(zero.monto_por_defecto, 0);
        const x = await readyStudent();
        for (const change of [{ descuento: '-1' }, { descuento: '651', motivo_descuento: 'OVER' }, { descuento: '1.001', motivo_descuento: 'PRECISION' }, { descuento: '1', motivo_descuento: ' ' }])
            reject(await D.rpc('registrar_matricula', { p: { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, ciclo_id: extraCycle.id, expected_ciclo_updated_at: extraCycle.updated_at, ...change }, opcionales: [] }));
        let empty = await cycle(career1, '2046-02-01');
        reject(await D.rpc('registrar_matricula', { p: { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, ciclo_id: empty.id, expected_ciclo_updated_at: empty.updated_at }, opcionales: [] }));
        empty = await rpc(D, 'guardar_ciclo_tarifas', { ciclo_id: empty.id, expected_updated_at: empty.updated_at, configuracion: [{ tarifa_id: t.id, importe: '0.00', obligatorio: 'false' }] });
        reject(await D.rpc('registrar_matricula', { p: { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, ciclo_id: empty.id, expected_ciclo_updated_at: empty.updated_at }, opcionales: [] }));
        extraCycle = await rpc(D, 'cambiar_estado_ciclo', { ...version(extraCycle), destino: 'EN_CURSO' });
        let enrolled = await register(extraCycle, x, {}, O);
        const previousCharges = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', enrolled.id), 'charges');
        const terminal = await rpc(D, 'cambiar_estado_ciclo', { ...version(extraCycle), destino: 'CERRADO' });
        for (const change of [{ codigo_matricula: '2026-TEST-999' }, { ciclo_id: c1.id, expected_ciclo_updated_at: c1.updated_at }, { empresa_patrocinadora_id: null }, { descuento: '0' }])
            reject(await D.rpc('editar_matricula', { p: { ...version(enrolled), ...change } }));
        reject(await D.rpc('guardar_ciclo_tarifas', { ciclo_id: terminal.id, expected_updated_at: terminal.updated_at, configuracion: [] }));
        reject(await D.rpc('registrar_matricula', { p: { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, ciclo_id: terminal.id, expected_ciclo_updated_at: terminal.updated_at }, opcionales: [] }));
        enrolled = await rpc(O, 'anular_matricula', { ...version(enrolled), motivo: 'TERMINAL' });
        assert.equal(enrolled.estado_codigo, 'ANULADO');
        assert.deepEqual(checked(await D.from('matricula_cargo').select('*').eq('matricula_id', enrolled.id), 'charges'), previousCharges);
    });
    await scenario('TEST-H3-017-025-026-027 code-and-price-history', async () => {
        const cc = await configure(await cycle(career1, '2047-01-01')), x = await readyStudent();
        const enrolled = await register(cc, x, { codigo_matricula: `2026-${tag.toLowerCase()}-123456` });
        assert.equal(enrolled.codigo_matricula, `2026-${tag}-123456`);
        assert.notEqual(enrolled.codigo_generado_original, enrolled.codigo_matricula);
        const before = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', enrolled.id), 'charges');
        const configNew = await rpc(D, 'guardar_ciclo_tarifas', { ciclo_id: cc.id, expected_updated_at: cc.updated_at, configuracion: [{ tarifa_id: t.id, importe: '999', obligatorio: 'true' }, { tarifa_id: opt.id, importe: '99', obligatorio: 'false' }] });
        assert.deepEqual(checked(await D.from('matricula_cargo').select('*').eq('matricula_id', enrolled.id), 'charges'), before);
        reject(await O.rpc('editar_matricula', { p: { ...version(enrolled), codigo_matricula: 'BAD' } }));
        inspectDatabase("update private.matricula_correlativo set ultimo=998 where sigla=:'sigla' and anio=extract(year from clock_timestamp() at time zone 'America/Lima');", { sigla: career1.sigla });
        const z = await register(configNew, await readyStudent());
        assert.ok(z.codigo_generado_original.endsWith('-999'));
        const zz = await register(configNew, await readyStudent());
        assert.ok(zz.codigo_generado_original.endsWith('-1000'));
        const entrants = [];
        for (let i = 0; i < 3; i++)
            entrants.push(await readyStudent());
        const race = await Promise.all(entrants.map(a => D.rpc('registrar_matricula', { p: { alumno_id: a.id, expected_alumno_updated_at: a.updated_at, ciclo_id: configNew.id, expected_ciclo_updated_at: configNew.updated_at }, opcionales: [] })));
        const wins = race.filter(r => !r.error);
        assert.ok(wins.length > 0);
        assert.equal(new Set(wins.map(r => r.data.codigo_matricula)).size, wins.length);
        assert.ok(race.every(r => !r.error || r.error.code === '40001'));
        assert.equal(inspectDatabase("select extract(year from timestamptz '2027-01-01 02:00:00+00' at time zone 'America/Lima');"), '2026');
        const originalDefinition = inspectDatabase("select pg_get_functiondef('public.registrar_matricula(jsonb,uuid[])'::regprocedure);");
        const nextYearDefinition = originalDefinition.replace("y:=extract(year from clock_timestamp() at time zone 'America/Lima')", "y:=extract(year from (clock_timestamp()+interval '1 year') at time zone 'America/Lima')");
        assert.notEqual(nextYearDefinition, originalDefinition);
        try {
            inspectDatabase(nextYearDefinition);
            const nextYear = await register(configNew, await readyStudent());
            assert.equal(nextYear.anio_generacion, Number(inspectDatabase("select extract(year from clock_timestamp() at time zone 'America/Lima');")) + 1);
            assert.equal(nextYear.correlativo, 1);
            assert.ok(nextYear.codigo_generado_original.endsWith('-001'));
        }
        finally {
            inspectDatabase(originalDefinition);
        }
        assert.equal(inspectDatabase("select pg_get_functiondef('public.registrar_matricula(jsonb,uuid[])'::regprocedure);"), originalDefinition);
    });
    await scenario('TEST-H3-002-003 same-token-revocation', async () => {
        checked(await fixture.admin.from('app_users').update({ active: false }).eq('id', fixture.entries.O.id), 'inactivate fixture');
        try {
            reject(await O.rpc('guardar_alumno', { p: payload() }));
            assert.equal(checked(await O.from('alumno').select('id'), 'revoked rows').length, 0);
        }
        finally {
            checked(await fixture.admin.from('app_users').update({ active: true }).eq('id', fixture.entries.O.id), 'restore fixture');
        }
    });
    await scenario('TEST-H3-006 existing-incomplete-read-complete', async () => {
        let legacy = await student();
        const variables = { subject: legacy.id, actor: fixture.entries.D.id };
        inspectDatabase("begin; select set_config('request.jwt.claim.sub',:'actor',true); alter table public.alumno alter column apellido_materno drop not null; alter table public.alumno disable trigger alumno_validate; update public.alumno set apellido_materno=null where id=:'subject'::uuid; alter table public.alumno enable trigger alumno_validate; commit;", variables);
        try {
            legacy = await byId('alumno', legacy.id);
            assert.equal(legacy.apellido_materno, null);
            const { id, created_at, updated_at, ...data } = legacy;
            void created_at;
            const p = Object.fromEntries(Object.entries({ ...data, id, expected_updated_at: updated_at }).map(([k, v]) => [k, v === null ? null : String(v)]));
            reject(await O.rpc('guardar_alumno', { p }));
            legacy = await rpc(O, 'guardar_alumno', { p: { ...p, apellido_materno: 'COMPLETADO' } });
            assert.equal(legacy.apellido_materno, 'COMPLETADO');
        }
        finally {
            inspectDatabase("begin; select set_config('request.jwt.claim.sub',:'actor',true); alter table public.alumno disable trigger alumno_validate; update public.alumno set apellido_materno=coalesce(apellido_materno,'RESTAURADO') where id=:'subject'::uuid; alter table public.alumno enable trigger alumno_validate; alter table public.alumno alter column apellido_materno set not null; commit;", variables);
        }
    });
    await scenario('TEST-H3-007-009-016-022 concurrent-source-invariants', async () => {
        const duplicatePayload = payload(), dups = await Promise.all([D.rpc('guardar_alumno', { p: duplicatePayload }), O.rpc('guardar_alumno', { p: duplicatePayload })]);
        assert.equal(dups.filter(r => !r.error).length, 1);
        let x = await student();
        const contactRecord = await contact(x);
        x = await byId('alumno', x.id);
        const cc = await configure(await cycle(career1, '2048-01-01'));
        const contactRace = await Promise.all([D.rpc('registrar_matricula', { p: { alumno_id: x.id, expected_alumno_updated_at: x.updated_at, ciclo_id: cc.id, expected_ciclo_updated_at: cc.updated_at }, opcionales: [] }), O.rpc('retirar_contacto_emergencia', { id: contactRecord.id, expected_alumno_updated_at: x.updated_at })]);
        assert.ok(contactRace.some(r => !r.error));
        if (!contactRace[0].error)
            assert.equal(contactRace[0].data.alumno_snapshot.contactos.length, 1);
        const y = await readyStudent(), configCycle = await configure(await cycle(career1, '2048-02-01'));
        const configRace = await Promise.all([D.rpc('registrar_matricula', { p: { alumno_id: y.id, expected_alumno_updated_at: y.updated_at, ciclo_id: configCycle.id, expected_ciclo_updated_at: configCycle.updated_at }, opcionales: [] }), D.rpc('guardar_ciclo_tarifas', { ciclo_id: configCycle.id, expected_updated_at: configCycle.updated_at, configuracion: [{ tarifa_id: t.id, importe: '777', obligatorio: 'true' }] })]);
        assert.ok(configRace.some(r => !r.error));
        if (!configRace[0].error) {
            const charge = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', configRace[0].data.id), 'race charge');
            assert.equal(charge.length, 1);
            assert.equal(charge[0].importe_original, 650);
        }
        const z = await readyStudent(), terminalCycle = await configure(await cycle(career1, '2048-03-01'));
        const race = await Promise.all([D.rpc('registrar_matricula', { p: { alumno_id: z.id, expected_alumno_updated_at: z.updated_at, ciclo_id: terminalCycle.id, expected_ciclo_updated_at: terminalCycle.updated_at }, opcionales: [] }), D.rpc('cambiar_estado_ciclo', { ...version(terminalCycle), destino: 'ANULADO', motivo: 'CONCURRENT' })]);
        assert.ok(race.some(r => !r.error));
        assert.ok(race.some(r => r.error));
    });
    await scenario('TEST-H3-019-031-035 rollback-audit-failure', async () => {
        // Test-only trigger is installed/removed administratively, never callable by product.
        inspectDatabase(`create function private.h3_test_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic failure'; end;$$;`);
        try {
            for (const table of ['matricula', 'matricula_cargo', 'auditoria']) {
                // Table is from this constant whitelist, never user input.
                inspectDatabase(`create trigger z_h3_test_failure after insert on public.${table} for each row execute function private.h3_test_failure();`);
                try {
                    const b = await byId('alumno', a.id), before = await rows('matricula'), chargesBefore = await rows('matricula_cargo'), auditBefore = await rows('auditoria'), counterBefore = inspectDatabase('select coalesce(sum(ultimo),0) from private.matricula_correlativo;');
                    reject(await D.rpc('registrar_matricula', { p: { alumno_id: b.id, expected_alumno_updated_at: b.updated_at, ciclo_id: c3.id, expected_ciclo_updated_at: c3.updated_at }, opcionales: [] }));
                    assert.deepEqual(await rows('matricula'), before);
                    assert.deepEqual(await rows('matricula_cargo'), chargesBefore);
                    assert.deepEqual(await rows('auditoria'), auditBefore);
                    assert.equal(inspectDatabase('select coalesce(sum(ultimo),0) from private.matricula_correlativo;'), counterBefore);
                }
                finally {
                    inspectDatabase(`drop trigger z_h3_test_failure on public.${table};`);
                }
            }
            const editable = (await rows('matricula')).find(m => m.estado_codigo === 'ACTIVO' && m.ciclo_id !== c1.id);
            assert.ok(editable);
            const destination = await byId('ciclo', c1.id), before = await byId('matricula', editable.id), oldCharges = checked(await D.from('matricula_cargo').select('*').eq('matricula_id', editable.id), 'edit rollback before'), eventsBefore = (await rows('auditoria')).length;
            inspectDatabase('create trigger z_h3_test_failure after update on public.matricula_cargo for each row execute function private.h3_test_failure();');
            try {
                reject(await O.rpc('editar_matricula', { p: { ...version(editable), ciclo_id: destination.id, expected_ciclo_updated_at: destination.updated_at }, opcionales: [] }));
                assert.deepEqual(await byId('matricula', editable.id), before);
                assert.deepEqual(checked(await D.from('matricula_cargo').select('*').eq('matricula_id', editable.id), 'edit rollback after'), oldCharges);
                assert.equal((await rows('auditoria')).length, eventsBefore);
            }
            finally {
                inspectDatabase('drop trigger z_h3_test_failure on public.matricula_cargo;');
            }
        }
        finally {
            inspectDatabase('drop function private.h3_test_failure();');
        }
    });
    console.log(JSON.stringify({ enrollmentTechnicalGroups: passed, result: 'PASSED', human: 'PENDING' }));
}
catch (error) {
    console.error('LOCATION ' + (error.stack?.split('\n').find(x => x.includes('test-enrollment.mjs:')) ?? error.name));
    console.error('FAILED ' + current + ': ' + (error instanceof assert.AssertionError || /^Falló /.test(error.message) ? error.message : 'internal details omitted'));
    process.exitCode = 1;
}
finally {
    if (fixture)
        await fixture.cleanup();
}
