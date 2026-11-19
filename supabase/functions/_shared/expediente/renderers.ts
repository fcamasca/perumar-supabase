import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ageAtEnrollment, type Source } from '../ficha/contract.ts'
import { renderFicha } from '../ficha/render.ts'
import { perumarLogoPng } from '../ficha/brand.ts'
import { DocumentoError, templateVersion } from './contract.ts'

// Four fixed institutional forms, not a database-configurable template engine.
export async function renderExpediente(code: string, source: Source, at: Date, data: Record<string, string>) {
  const version=templateVersion(code)
  if(code==='FICHA_MATRICULA')return renderFicha(source,at,'H6')
  if(!source.datos_ficha?.alumno || !Number.isFinite(at.getTime()))throw new DocumentoError(422,'DOCUMENT_SNAPSHOT')
  const a=source.datos_ficha.alumno, snap=source.datos_ficha
  if(snap.contactos.length>100)throw new DocumentoError(413,'DOCUMENT_LIMIT')
  const text=(v:unknown)=>v===null||v===undefined?'':String(v)
  const cat=(key:string)=>text(snap.catalogos[key]?.etiqueta)
  const geo=(prefix:string,part:string)=>text(snap.geografia[text(a[`${prefix}_${part}_id`])])
  const name=[a.nombres,a.apellido_paterno,a.apellido_materno].map(text).filter(Boolean).join(' ')
  const age=ageAtEnrollment(text(a.fecha_nacimiento),at.toISOString()).replace('Sin dato','')
  const course=text(source.ciclo?.carrera?.nombre),place=text(source.ciclo?.distrito?.nombre)
  const authority=data.capitania_nombre||place
  const date=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'numeric',month:'long',year:'numeric'}).format(at)
  const birth=/^\d{4}-\d{2}-\d{2}$/.test(text(a.fecha_nacimiento))?text(a.fecha_nacimiento).split('-').reverse().join('/') : ''
  const titles:Record<string,string>={SOLICITUD:'SOLICITUD',DECLARACION_JURADA:'DECLARACIÓN JURADA',CARTA_PODER:'CARTA PODER',FICHA_DATOS_PERSONALES:'FICHA DE DATOS PERSONALES'}
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold)
  pdf.setTitle(titles[code]);pdf.setProducer(`PERÚ MAR / ${version}`);pdf.setCreationDate(at)
  const logo=await pdf.embedPng(Uint8Array.from(atob(perumarLogoPng),c=>c.charCodeAt(0)))
  let page=pdf.addPage([595.28,841.89]),y=0
  const ink=rgb(.06,.15,.20),margin=44,width=507.28,line=13,size=10
  const draw=(s:string,x:number,baseline:number,strong=false,fontSize=size)=>{
    try{page.drawText(s.normalize('NFC'),{x,y:baseline,font:strong?bold:font,size:fontSize,color:ink})}catch{throw new DocumentoError(422,'DOCUMENT_GLYPH')}
  }
  const wrap=(s:string,strong=false)=>{
    if([...s].some(c=>c.charCodeAt(0)<32&&!['\t','\n'].includes(c)))throw new DocumentoError(422,'DOCUMENT_GLYPH')
    const rows:string[]=[]
    for(const paragraph of s.replace(/\r\n?/g,'\n').split('\n')){
      let current=''
      for(const c of paragraph.normalize('NFC')){
        let fits:boolean;try{fits=(strong?bold:font).widthOfTextAtSize(current+c,size)<=width}catch{throw new DocumentoError(422,'DOCUMENT_GLYPH')}
        if(!fits && current){const space=current.lastIndexOf(' ');if(space>0){rows.push(current.slice(0,space));current=current.slice(space+1)}else{rows.push(current);current=''}}
        current+=c
      }
      rows.push(current)
    }return rows
  }
  const header=()=>{
    y=797;page.drawImage(logo,{x:margin,y:y-38,width:38,height:38})
    draw('PERÚ MAR',margin+47,y-13,true,13);draw('Gestión Académica',margin+47,y-29,false,9)
    y-=61;draw(titles[code],margin,y,true,14);y-=23;draw(`Matrícula: ${source.codigo_matricula}`,margin,y,false,9);y-=23
  }
  const next=()=>{if(pdf.getPageCount()>=20)throw new DocumentoError(413,'DOCUMENT_LIMIT');page=pdf.addPage([595.28,841.89]);header()}
  const paragraph=(s:string,strong=false)=>{for(const row of wrap(s,strong)){if(y<75)next();draw(row,margin,y,strong);y-=line}y-=6}
  const field=(label:string,value:unknown)=>paragraph(`${label}: ${text(value)}`)
  const address=[a.domicilio,a.numero_mz_lt].map(text).filter(Boolean).join(' ')
  const identity=`Yo, ${name}, de ${age}, identificado con ${cat('TIPO_DI')} N.º ${text(a.numero_di)}, de estado civil ${cat('ESTADO_CIVIL')}, con domicilio en ${address}, distrito de ${geo('domicilio','distrito')}, provincia de ${geo('domicilio','provincia')} y departamento de ${geo('domicilio','departamento')}`
  header()
  if(code==='SOLICITUD'){
    paragraph(`SOLICITO: Inscripción y obtención de Libreta de Embarco / Carné ${course}`,true)
    paragraph(`SEÑOR CAPITÁN DE PUERTO DE ${authority.toLocaleUpperCase('es-PE')}.`)
    paragraph(`${identity}, ante usted con el debido respeto me presento y expongo:`)
    // Institutional reference text; NOT an academic result inferred or validated by H6.
    paragraph(`Que, de conformidad con las disposiciones legales vigentes de la Autoridad Marítima y habiendo culminado y aprobado el curso para ${course}, solicito a usted tenga a bien disponer a quien corresponda la inscripción y obtención de Libreta de Embarco / Carné correspondiente.`)
    paragraph('PARA TAL EFECTO, ADJUNTO:',true)
    for(const item of ['UNA (01) Ficha de Datos.','DOS (02) copias fotostáticas simples del documento de identidad.','UN (01) Certificado de aptitud psicofísica.','UNA (01) Declaración jurada simple de no encontrarse requisitoriado por la Autoridad Judicial y Policial.','CUATRO (04) fotos a colores tamaño pasaporte con fondo azul.','UN (01) original del Certificado Oficial de Estudios de Educación Secundaria de Menores.',`UN (01) original y copia del Certificado Académico de haber aprobado el Curso ${course}.`,'UN (01) recibo de pago al Banco de la Nación por el derecho correspondiente.'])paragraph(`- ${item}`)
    paragraph('POR LO EXPUESTO: Es gracia que espero alcanzar de usted.')
  }else if(code==='DECLARACION_JURADA'){
    paragraph('Ley de Procedimiento Administrativo General — Art. 42 de la Ley 27444')
    paragraph(`${identity}, en pleno ejercicio de mis derechos ciudadanos y al amparo del artículo y ley en referencia:`)
    paragraph('DECLARO BAJO JURAMENTO no tener antecedentes penales, policiales ni judiciales. Asimismo, conozco que, en caso de detectarse fraude o falsedad en mi presente declaración, habrá lugar a la nulidad que genere, sometiéndome en tal circunstancia a la sanción que establece la ley.')
    paragraph('Para mayor veracidad estampo mi huella dactilar índice derecho y firma correspondiente.')
  }else if(code==='CARTA_PODER'){
    if(!data.apoderado_nombre||!data.apoderado_numero_di)throw new DocumentoError(422,'DOCUMENT_REPRESENTATIVE_REQUIRED')
    paragraph(`${identity}, en pleno ejercicio de mis derechos ciudadanos y en uso de mis facultades y en nombre propio:`)
    paragraph(`Otorgo poder a favor de ${data.apoderado_nombre}, identificado con ${data.apoderado_tipo_di_etiqueta} N.º ${data.apoderado_numero_di}, para que, en mi nombre y representación, ante la Capitanía de Puerto de ${authority}, efectúe los trámites de inscripción y obtención de Libreta de Embarco / Carné de ${course} y recoja los documentos correspondientes.`)
  }else{
    paragraph(`CAPITANÍA GUARDACOSTAS: ${authority}`,true)
    field('Nombres',a.nombres);field('Apellidos',[a.apellido_paterno,a.apellido_materno].map(text).filter(Boolean).join(' '))
    field(cat('TIPO_DI')||'Documento',a.numero_di);field('L.M.','');field('Fecha de nacimiento',birth);field('Edad',age)
    field('Lugar de nacimiento',[geo('nacimiento','distrito'),geo('nacimiento','provincia'),geo('nacimiento','departamento')].join(' / '))
    field('Grado de instrucción',cat('GRADO_INSTRUCCION'));field('Ojos / Cabello',`${cat('COLOR_OJOS')} / ${cat('COLOR_CABELLO')}`)
    field('Estatura (cm)',a.estatura_cm);field('Peso (kg)',a.peso_kg);field('Sexo',cat('SEXO'));field('Grupo sanguíneo/RH',cat('GRUPO_SANGUINEO'))
    field('Señas particulares',a.senas_particulares);field('Domicilio actual',address)
    field('Distrito / Provincia / Departamento',[geo('domicilio','distrito'),geo('domicilio','provincia'),geo('domicilio','departamento')].join(' / '))
    field('Teléfono fijo',a.telefono_fijo);field('Celular',a.celular);field('Correo',a.email)
    paragraph('PERSONA A NOTIFICAR EN CASO DE EMERGENCIA',true)
    for(const c of snap.contactos){field('Nombres y apellidos',[c.nombre,c.apellido].map(text).join(' '));field('Parentesco',(c.parentesco as {etiqueta?:string})?.etiqueta);field('Celular',c.celular);field('Dirección',c.direccion)}
  }
  if(y<185)next();y-=12;paragraph(`${place}${place?', ':''}${date}`)
  if(['DECLARACION_JURADA','FICHA_DATOS_PERSONALES'].includes(code)){page.drawRectangle({x:margin,y:y-65,width:50,height:65,borderColor:ink,borderWidth:.6});draw('Índice derecho',margin,y-79,false,9)}
  page.drawLine({start:{x:margin+200,y:y-63},end:{x:margin+width,y:y-63},color:ink,thickness:.6});draw('FIRMA',margin+295,y-79,false,9)
  const pages=pdf.getPages();pages.forEach((p,i)=>{page=p;draw(`Generado en Lima: ${new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'medium'}).format(at)}`,margin,27,false,8);draw(`${i+1} / ${pages.length}`,520,27,false,8)})
  const bytes=await pdf.save({useObjectStreams:false});if(bytes.length>2097152)throw new DocumentoError(413,'DOCUMENT_LIMIT');return bytes
}
