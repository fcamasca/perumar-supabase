import { ageAtEnrollment, projectFicha, limaDate, type Source } from '../../supabase/functions/_shared/ficha/contract'
import { perumarLogoPng } from '../../supabase/functions/_shared/ficha/brand'
import { institutionalNote } from '../../supabase/functions/_shared/ficha/note'
import { generatedCodes } from './contracts'
import { wordPackage } from './wordPackage'

const xml = (v: unknown) => {
  const value = String(v ?? '').normalize('NFC')
  if ([...value].some(c => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)))) throw new Error('Hay caracteres que Word no puede representar. Revisa los datos.')
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}
const run = (s: string, bold = false, size = 20) => `<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:color w:val="000000"/></w:rPr>${s.split('\n').map((line, i) => `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(line)}</w:t>`).join('')}</w:r>`
type Paragraph = { align?: 'left' | 'center' | 'right' | 'both'; bold?: boolean; size?: number; before?: number; after?: number; indent?: number; first?: number; keep?: boolean; title?: boolean }
const p = (s: string, o: Paragraph = {}) => `<w:p><w:pPr>${o.title ? '<w:pStyle w:val="Title"/>' : ''}<w:jc w:val="${o.align ?? 'left'}"/><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 160}" w:line="${o.size === 2 ? 20 : 260}" w:lineRule="auto"/>${o.indent || o.first ? `<w:ind w:left="${o.indent ?? 0}" w:firstLine="${o.first ?? 0}"/>` : ''}<w:widowControl/>${o.keep ? '<w:keepNext/>' : ''}</w:pPr>${run(s, o.bold, o.size)}</w:p>`
const table = (rows: string[][], widths: number[], border = true, header = false) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(edge => `<w:${edge} w:val="${border ? 'single' : 'nil'}" w:sz="4" w:color="606060"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((row, index) => `<w:tr><w:trPr>${header && index === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${row.map((cell, i) => `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/><w:vAlign w:val="center"/>${header && index === 0 ? '<w:shd w:fill="F2F2F2"/>' : ''}</w:tcPr>${p(cell, { size: 18, after: 0, keep: header && index === 0, bold: header && index === 0, align: header && index === 0 ? 'center' : 'left' })}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>${p('', { after: 20, size: 2 })}`

export function renderWordDocument(code: string, source: Source, at: Date, data: Record<string, string>) {
  if (!generatedCodes.includes(code) || !Number.isFinite(at.getTime())) throw new Error('No se pudo preparar el formato Word.')
  const model = projectFicha(source, at), snap = source.datos_ficha, a = snap.alumno
  const text = (v: unknown) => v === null || v === undefined ? '' : String(v)
  const cat = (key: string) => text(snap.catalogos[key]?.etiqueta)
  const geo = (prefix: string, part: string) => text(snap.geografia[text(a[`${prefix}_${part}_id`])])
  const name = [a.nombres, a.apellido_paterno, a.apellido_materno].map(text).filter(Boolean).join(' ')
  const age = ageAtEnrollment(text(a.fecha_nacimiento), at.toISOString()).replace('Sin dato', '')
  const course = text(source.ciclo?.carrera?.nombre), place = text(source.ciclo?.distrito?.nombre), authority = data.capitania_nombre || place
  const placeAndDate = `${place}${place ? ', ' : ''}${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' }).format(at)}`
  const address = [a.domicilio, a.numero_mz_lt].map(text).filter(Boolean).join(' '), document = `${cat('TIPO_DI')} ${text(a.numero_di)}`
  const identity = `Yo, ${name}, de ${age}${age ? ' de edad' : ''}, identificado con ${cat('TIPO_DI')} N.º ${text(a.numero_di)}, de estado civil ${cat('ESTADO_CIVIL')}, con domicilio legal en ${address}, del Distrito de ${geo('domicilio', 'distrito')}, Provincia de ${geo('domicilio', 'provincia')} y Departamento de ${geo('domicilio', 'departamento')}`
  let body: string, logo = false
  const margin = code === 'FICHA_MATRICULA' ? 720 : code === 'DECLARACION_JURADA' ? 2220 : 1680
  const title = (s: string) => p(s, { title: true, bold: true, size: 28, align: 'center', after: 360, keep: true })
  const para = (s: string) => p(s, { align: 'both', first: 400, after: 380 })
  const signature = (space = 700) => p(placeAndDate, { align: 'right', bold: true, before: space, after: 700, keep: true }) + p(`_______________________________\n${name}\n${document}`, { align: 'center', indent: 3600, after: 0 })
  if (code === 'DECLARACION_JURADA') {
    body = title('DECLARACIÓN JURADA') + p('Ley de Procedimiento Administrativo General\nArt. 42° de la Ley 27444', { bold: true, align: 'center', after: 600, keep: true })
      + para(`${identity}, en pleno ejercicio de mis derechos ciudadanos y al amparo del Artículo y Ley en referencia.`)
      + para('DECLARO BAJO JURAMENTO, no tener antecedentes penales, policiales ni judiciales, asimismo conozco que, en caso de detectarse fraude o falsedad en mi presente declaración, habrá lugar a la nulidad que genere, sometiéndome en tal circunstancia a la sanción que establece la ley.')
      + para('Para mayor veracidad estampo mi huella dactilar índice derecho, y firma correspondiente.') + signature(600)
  } else if (code === 'CARTA_PODER') {
    if (!data.apoderado_nombre || !data.apoderado_numero_di) throw new Error('Faltan los datos de la versión generada de la carta poder.')
    body = title('CARTA PODER') + para(`${identity}, en pleno ejercicio de mis derechos ciudadanos y en uso de mis facultades y en nombre propio:`)
      + para(`Otorgo Poder a favor de ${data.apoderado_nombre}, identificado con ${data.apoderado_tipo_di_etiqueta} N.º ${data.apoderado_numero_di}, para que, en mi nombre y representación, ante la Capitanía de Puerto de ${authority}, efectúe los trámites de Inscripción y obtención de Libreta de Embarco y Carné de ${course} y recoja el o los documentos correspondientes.`)
      + p('........................................................................................................\n........................................................................................................\n........................................................................................................') + signature(600)
  } else if (code === 'SOLICITUD') {
    body = table([['SOLICITO:', `Inscripción y obtención de Libreta de Embarco y Carné ${course}`]], [3900, 4646], false)
      + p(`SEÑOR, CAPITÁN DE FRAGATA, CAPITÁN DE PUERTO DE ${authority.toLocaleUpperCase('es-PE')}.\nS.C.P.`, { bold: true, after: 400 })
      + para(`${identity}, ante usted con el debido respeto me presento y expongo:`)
      + para(`Que, de conformidad con las disposiciones legales vigentes de la Autoridad Marítima y habiendo culminado y aprobado el curso para ${course}, Solicito a Ud. Señor, Capitán de Fragata, Capitán de Puerto de ${authority}, tenga a bien disponer a quien corresponda la Inscripción y obtención de Libreta de Embarco y Carné de ${course}.`)
      + p('PARA TAL EFECTO:', { bold: true, after: 260 }) + p('Adjunto:')
      + ['UNA (01) Ficha de Datos.', `DOS (02) Copias fotostáticas simples del ${cat('TIPO_DI') || 'documento de identidad'}.`, 'UN (01) Certificado de aptitud psicofísica.', 'UNA (01) Declaración jurada simple de no encontrarse requisitoriado por la Autoridad Judicial y Policial.', 'CUATRO (04) fotos a colores tamaño pasaporte con fondo azul.', 'UN (01) Original del Certificado Oficial de Estudios de Educación Secundaria de Menores.', `UN (01) Original y Copia del Certificado Académico de haber aprobado el Curso ${course}.`, 'UN (01) Recibo de pago al Banco de la Nación por el derecho correspondiente.'].map(s => p(`- ${s}`, { indent: 700, size: 18, after: 20 })).join('')
      + p('POR LO EXPUESTO:', { bold: true, before: 300, after: 100 }) + p('Es gracia que espero alcanzar de Ud.') + signature(260)
  } else if (code === 'FICHA_DATOS_PERSONALES') {
    const width = 8546
    body = title(`CAPITANÍA GUARDACOSTAS\nMARÍTIMA DE ${authority.toLocaleUpperCase('es-PE')}`) + p('FICHA DE DATOS PERSONALES', { bold: true, align: 'center', after: 500 })
    const row = (values: string[]) => table([values], values.map((_, i) => Math.floor(width / values.length) + (i === values.length - 1 ? width % values.length : 0)), false)
    body += row([`NOMBRES: ${text(a.nombres)}`, `APELLIDOS: ${[a.apellido_paterno, a.apellido_materno].map(text).join(' ')}`])
      + row([`${cat('TIPO_DI') || 'D.I.'}: ${text(a.numero_di)}`, 'L.M.:', `LUGAR DE NACIMIENTO: ${geo('nacimiento', 'distrito')}`])
    const location = (prefix: string) => row([`DISTRITO: ${geo(prefix, 'distrito')}`, `PROVINCIA: ${geo(prefix, 'provincia')}`, `DEPARTAMENTO: ${geo(prefix, 'departamento')}`])
    body += location('nacimiento') + row([`FECHA NACIMIENTO: ${text(a.fecha_nacimiento).split('-').reverse().join('-')}`, `GRADO DE INSTRUCCIÓN: ${cat('GRADO_INSTRUCCION')}`])
      + row([`OJOS: ${cat('COLOR_OJOS')}`, `CABELLO: ${cat('COLOR_CABELLO')}`, `ESTATURA: ${text(a.estatura_cm) ? `${(Number(a.estatura_cm) / 100).toFixed(2)} mts.` : ''}`])
      + row([`SEXO: ${cat('SEXO')}`, `PESO: ${text(a.peso_kg) ? `${text(a.peso_kg)} Kg.` : ''}`, `GRUPO SANGUÍNEO RH: ${cat('GRUPO_SANGUINEO')}`])
      + row([`SEÑAS PARTICULARES: ${text(a.senas_particulares)}`]) + row([`DOMICILIO ACTUAL: ${address}`])
      + row([`TELÉFONO FIJO: ${text(a.telefono_fijo)}`, `CELULAR: ${text(a.celular)}`]) + row([`CORREO: ${text(a.email)}`]) + location('domicilio')
      + p('PERSONA A NOTIFICAR EN CASO DE EMERGENCIA', { bold: true, before: 400, keep: true })
    for (const c of snap.contactos) body += row([`NOMBRES: ${text(c.nombre)}`, `APELLIDOS: ${text(c.apellido)}`]) + row([`DIRECCIÓN: ${text(c.direccion)}`]) + row([`PARENTESCO: ${text((c.parentesco as { etiqueta?: string })?.etiqueta)}`, `CELULAR: ${text(c.celular)}`])
    body += p(placeAndDate, { align: 'right', bold: true, before: 500, after: 1000, keep: true }) + p('.....................................................             Huella\n(Firma)', { align: 'right' })
  } else {
    logo = true; const width = 10466, section = (index: number) => Object.fromEntries(model.sections[index].fields)
    const context = section(0), person = section(1), addressFields = section(2), extra = section(3), sponsor = section(4)
    const formTable = (labels: string[], values: string[][]) => table([labels, ...values], labels.map((_, i) => Math.floor(width / labels.length) + (i === labels.length - 1 ? width % labels.length : 0)), true, true)
    body = '<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="685800" cy="685800"/><wp:docPr id="1" name="Escudo de Perú Mar" descr="Escudo institucional de Perú Mar"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="Escudo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="685800" cy="685800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
      + formTable(['CURSO', 'LIBRO', 'FOLIO', 'REGISTRO', 'FECHA DE EMISIÓN'], [[context.Curso, '', '', '', limaDate(at)]])
      + formTable(['PROMOCIÓN', 'PATROCINADOR'], [[context.Promoción, text(source.empresa_patrocinadora?.razon_social)]])
      + title('FICHA DE MATRÍCULA') + p('CURSO MODELO DE LA AUTORIDAD MARÍTIMA', { align: 'center', bold: true, after: 120 })
      + formTable(['Apellido Paterno', 'Apellido Materno', 'Nombres Completos'], [[text(a.apellido_paterno), text(a.apellido_materno), person.Nombres]])
      + formTable(['Estado Civil', 'Tipo Doc. Id.', 'N.º Doc. Id.', 'Edad', 'Sexo', 'Teléfono Fijo', 'Celular'], [[person['Estado civil'], person['Tipo de documento'], person['Número de documento'], ageAtEnrollment(text(a.fecha_nacimiento), at.toISOString()), person.Sexo, addressFields['Teléfono fijo'], addressFields.Celular]])
      + formTable(['Estatura', 'Peso', 'Grupo Sanguíneo/RH', 'Ojos', 'Cabello', 'Ocupación', 'Grado de Instrucción'], [[extra['Estatura (cm)'], extra['Peso (kg)'], extra['Grupo sanguíneo'], extra['Color de ojos'], extra['Color de cabello'], extra.Ocupación, extra['Grado de instrucción']]])
      + formTable(['Fecha de Nacimiento', 'Lugar de Nacimiento', 'Provincia', 'Departamento'], [[person['Fecha de nacimiento'], geo('nacimiento', 'distrito'), geo('nacimiento', 'provincia'), geo('nacimiento', 'departamento')]])
      + formTable(['Señas Particulares'], [[extra['Señas particulares']]])
      + formTable(['Domicilio Actual', 'N.º / Mz / Lt', 'Distrito', 'Provincia', 'Departamento'], [[addressFields.Domicilio, addressFields['N° / Mz / Lt'], geo('domicilio', 'distrito'), geo('domicilio', 'provincia'), geo('domicilio', 'departamento')]])
      + formTable(['Email'], [[addressFields['Correo electrónico']]])
      + formTable(['Persona a Notificar en caso de Emergencia', 'Parentesco', 'Celular', 'Dirección'], model.contacts.length ? model.contacts.map(c => [`${c[0]}, ${c[1]}`, c[2], c[3], c[4]]) : [['Sin contactos registrados.', '', '', '']])
      + formTable(['Patrocinador', 'Contacto', 'Celular/Teléfono', 'Email'], [source.empresa_patrocinadora ? [sponsor['Razón social'] + (sponsor.RUC === 'Sin dato' ? '' : `\nRUC: ${sponsor.RUC}`), sponsor['Persona de contacto'], sponsor.Teléfono, sponsor['Correo electrónico']] : ['', '', '', '']])
      + p('Nota:', { bold: true, keep: true, after: 60 }) + institutionalNote.map(s => p(s, { size: 18, after: 60 })).join('')
      + p(placeAndDate, { bold: true, align: 'right', before: 180, keep: true })
      + table([['\n\n\n', '\n\n\n', '\n\n\n'], ['Índice Izquierdo', 'Índice Derecho', 'FIRMA']], [2200, 2200, width - 4400], true)
      + p(`Emisión Lima: ${model.emitted}\nFecha de matrícula: ${context['Fecha de matrícula']}`, { size: 16, after: 0 })
  }
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="${margin}" w:bottom="1000" w:left="${margin}" w:header="300" w:footer="300"/></w:sectPr></w:body></w:document>`
  return wordPackage({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${logo ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': documentXml,
    'word/styles.xml': '<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:color w:val="000000"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>',
    'word/_rels/document.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${logo ? '<Relationship Id="rLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/escudo.png"/>' : ''}</Relationships>`,
    ...(logo ? { 'word/media/escudo.png': Uint8Array.from(atob(perumarLogoPng), c => c.charCodeAt(0)) } : {}),
  })
}
