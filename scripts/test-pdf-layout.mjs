import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PDFDocument } from 'pdf-lib'
import { renderFicha } from '../supabase/functions/_shared/ficha/render.ts'
import { fichaFixture } from '../tests/ficha-fixture.ts'

// Synthetic print evidence only: no Auth, database, Storage, actual source PDF or personal data.
const directory='.cache/h5-results',now=new Date('2026-11-12T20:00:00Z')
mkdirSync(directory,{recursive:true})
const run=(program,args)=>{
  const result=spawnSync(program,args,{encoding:'utf8',windowsHide:true})
  assert.equal(result.status,0,`Independent PDF tool ${program} must succeed`)
  return result.stdout
}
const normal=fichaFixture()
Object.assign(normal.alumno_snapshot.alumno,{nacimiento_departamento_id:'d',nacimiento_provincia_id:'p',nacimiento_distrito_id:'r',domicilio_departamento_id:'d',domicilio_provincia_id:'p',domicilio_distrito_id:'r'})
normal.alumno_snapshot.geografia={d:'ICA',p:'PISCO',r:'SAN ANDRÉS'}
const extensive=fichaFixture(100)
Object.assign(extensive.alumno_snapshot.alumno,{
  nombres:'NOMBRE SINTÉTICO '+ 'Á'.repeat(120),
  domicilio:('DIRECCIÓN SINTÉTICA CON REFERENCIA DE PRUEBA. ').repeat(12).slice(0,480)+' FIN DOMICILIO',
  senas_particulares:('SEÑAS SINTÉTICAS SIN DATOS REALES. ').repeat(16).slice(0,480)+' FIN SEÑAS',
})
extensive.alumno_snapshot.contactos[0].direccion='DIRECCIÓN EXTENSA '+ 'X'.repeat(470)
extensive.empresa_patrocinadora_id='22222222-2222-4222-8222-222222222222'
extensive.empresa_patrocinadora={razon_social:'PATROCINADOR SINTÉTICO',ruc:'20000000001',persona_contacto:'PEÑA',telefono:'010000001',email:'sponsor@example.invalid'}
const results=[]
for(const [name,source] of [['layout-normal',normal],['layout-extensive',extensive]]){
  const before=JSON.stringify(source),bytes=await renderFicha(source,now),file=`${directory}/${name}.pdf`
  assert.equal(JSON.stringify(source),before,'Visual adaptation cannot mutate source')
  writeFileSync(file,bytes)
  const pdf=await PDFDocument.load(bytes),pages=pdf.getPageCount()
  assert.ok(pages<=20&&bytes.length<=2097152)
  const text=run('pdftotext',['-enc','UTF-8',file,'-'])
  const readable=text.replace(/\s+/g,' ')
  for(const label of ['CURSO','LIBRO','FOLIO','REGISTRO','FICHA DE MATRÍCULA','CURSO MODELO DE LA AUTORIDAD MARÍTIMA','Apellido Paterno','Apellido Materno','Nombres Completos','FOTO','FIRMA','Índice Izquierdo','Índice Derecho'])assert.ok(readable.includes(label),`Missing printed institutional label ${label}`)
  assert.ok(!text.includes('DECLARO BAJO JURAMENTO')&&!text.includes('Nota:'),'Unapproved legal block must not be copied')
  const bbox=run('pdftotext',['-bbox','-enc','UTF-8',file,'-'])
  const decoded=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'")
  const layouts=[...bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].map(([,width,height,body])=>({width:Number(width),height:Number(height),words:[...body.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map(([,x1,y1,x2,y2,word])=>({x1:Number(x1),y1:Number(y1),x2:Number(x2),y2:Number(y2),word:decoded(word)}))}))
  assert.equal(layouts.length,pages)
  for(const [index,layout] of layouts.entries()){
    assert.ok(layout.words.length>0)
    assert.ok(layout.words.every(w=>w.x1>=35&&w.x2<=layout.width-35&&w.y1>=24&&w.y2<=layout.height-18),'Every word must stay inside the printed margins')
    const footer=layout.words.filter(w=>w.y1>layout.height-49)
    assert.ok(footer.some(w=>w.word==='Emisión')&&footer.some(w=>w.word==='Página'))
    assert.ok(footer.every(w=>w.y1>layout.height-38),'No body text may overlap the running footer')
    if(index>0)assert.ok(layout.words.some(w=>w.word.includes('continuación')),'Continuation must retain the running header')
  }
  if(name==='layout-normal'){
    assert.equal(pages,1,'Normal one-contact/no-sponsor form must fit one A4 page at 9pt+')
    assert.ok(text.includes('MUÑOZ')&&text.includes('ÁNGELA LUCÍA')&&text.includes('Madre')&&text.includes('DIRECCIÓN DE PRUEBA'))
    const first=layouts[0].words,date=first.find(w=>w.word==='2026-01-01')
    assert.ok(date)
    for(const label of ['LIBRO','FOLIO','REGISTRO']){
      const heading=first.find(w=>w.word===label);assert.ok(heading)
      assert.ok(!first.some(w=>w.y1>=date.y1-1&&w.y2<=date.y2+1&&w.x2>heading.x1&&w.x1<heading.x2),`${label} value cell must remain blank`)
    }
  }else{
    assert.ok(pages>1,'Extensive data must continue instead of truncating/shrinking')
    for(let i=1;i<=100;i++)assert.ok(text.includes(`MUÑOZ ${i},`),`Missing historical contact ${i}`)
    for(const marker of ['FIN DOMICILIO','FIN SEÑAS','PATROCINADOR SINTÉTICO','20000000001','PEÑA','sponsor@example.invalid'])assert.ok(readable.includes(marker),`Missing complete value ${marker}`)
    assert.ok(text.replace(/\s+/g,'').includes('X'.repeat(470)),'Long unbroken contact address must remain complete')
  }
  run('pdftoppm',['-scale-to','1300','-png',file,`${directory}/${name}`])
  results.push({name,pages,bytes:bytes.length,visualAcceptance:'HUMAN PENDING'})
}
writeFileSync(`${directory}/layout-results.json`,JSON.stringify(results,null,2))
console.log('H5 institutional layout, empty cells, Spanish, complete values, 100 contacts, margins and independent rendering: PASSED technical '+JSON.stringify(results))
