import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {PDFDocument} from 'pdf-lib'
import {renderExpediente} from '../supabase/functions/_shared/expediente/renderers.ts'
import {fichaFixture} from '../tests/ficha-fixture.ts'
const directory='.cache/h6-layout',at=new Date('2035-01-03T02:00:00Z'),results=[]
mkdirSync(directory,{recursive:true})
for(const code of ['SOLICITUD','DECLARACION_JURADA','CARTA_PODER','FICHA_DATOS_PERSONALES','FICHA_MATRICULA'])for(const extensive of [false,true]){
 const source=fichaFixture(extensive?100:1)
 if(extensive){source.datos_ficha.alumno.nombres='ÁNGELA '+ 'Ñ'.repeat(120);source.datos_ficha.alumno.domicilio='DIRECCIÓN '+ 'X'.repeat(470);source.datos_ficha.alumno.senas_particulares='SEÑAS '+ 'Ü'.repeat(470)}
 const data={capitania_nombre:'PISCO',apoderado_nombre:'APODERADO SINTÉTICO '+(extensive?'Á'.repeat(120):''),apoderado_tipo_di_etiqueta:'DNI',apoderado_numero_di:'00000001'}
 const before=JSON.stringify(source),bytes=await renderExpediente(code,source,at,data),file=`${directory}/${code}-${extensive?'extensive':'normal'}.pdf`,pdf=await PDFDocument.load(bytes)
 assert.equal(JSON.stringify(source),before);assert.ok(bytes.length<=2097152&&pdf.getPageCount()<=20);writeFileSync(file,bytes)
 if(process.env.CI==='true'){
  const text=spawnSync('pdftotext',['-bbox','-enc','UTF-8',file,'-'],{encoding:'utf8',windowsHide:true});assert.equal(text.status,0)
  const pages=[...text.stdout.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)];assert.equal(pages.length,pdf.getPageCount())
  for(const [,width,height,body] of pages){const words=[...body.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">/g)];assert.ok(words.length);assert.ok(words.every(([,x1,y1,x2,y2])=>Number(x1)>=30&&Number(x2)<=Number(width)-30&&Number(y1)>=20&&Number(y2)<=Number(height)-5),'No printed word may leave the page margins')}
 }
 const rendered=spawnSync('pdftoppm',['-scale-to','1000','-png',file,file.slice(0,-4)],{encoding:'utf8',windowsHide:true});assert.equal(rendered.status,0,'Independent raster rendering')
 results.push({code,extensive,pages:pdf.getPageCount(),bytes:bytes.length,visualHuman:'PENDING'})
}
writeFileSync(directory+'/results.json',JSON.stringify(results,null,2));console.log('H6 fixed forms normal/extensive synthetic PDFs, immutable source, size/pages and independent rasterization PASSED: '+JSON.stringify(results))
