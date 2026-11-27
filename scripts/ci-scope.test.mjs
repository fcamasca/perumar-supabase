import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedFiles, selectScope } from './ci-scope.mjs'
const before='a'.repeat(40),after='b'.repeat(40),push={before,after}
test('CSS, assets, documentation and empty pushes use quick validation',()=>{
 for(const files of [[],['src/styles.css'],['docs/deployment/ci.md','src/assets/logo.svg'],['README.md','public/icon.png']]) assert.equal(selectScope('push',push,files).full,false)
})
test('functional and unknown paths always require full regression',()=>{
 for(const file of ['supabase/migrations/change.sql','supabase/functions/ficha-matricula/index.ts','src/documents/EnrollmentDocuments.tsx','src/lib/env.ts','src/security/SessionProvider.tsx','scripts/check-local.mjs','tests/ExpedienteUi.test.tsx','package.json','package-lock.json','.github/workflows/ci.yml','vite.config.ts','public/_headers','docs/query.sql','unknown']) assert.equal(selectScope('push',push,['src/styles.css',file]).full,true,file)
})
test('PR is always full, including CSS-only changes',()=>assert.equal(selectScope('pull_request',{pull_request:{base:{ref:'main'}}},['src/styles.css']).full,true))
test('manual defaults full; quick is explicit; security trial overrides quick',()=>{
 assert.equal(selectScope('workflow_dispatch',{},[]).full,true)
 assert.equal(selectScope('workflow_dispatch',{inputs:{suite:'quick'}},null).full,false)
 for(const flag of [true,'true']) assert.equal(selectScope('workflow_dispatch',{inputs:{suite:'quick','security-failure':flag}},null).full,true)
 assert.equal(selectScope('push',{ref:'refs/heads/feature/h2-academic-privilege-trial'},[]).full,true)
})
test('failed comparison and unknown events fail closed to full',()=>{
 assert.equal(selectScope('push',push,null).full,true)
 assert.equal(selectScope('unknown',{},[]).full,true)
 assert.equal(changedFiles({...push,before:'0'.repeat(40)}),null)
 assert.equal(changedFiles({...push,before:'--invalid'}),null)
 assert.equal(changedFiles(push,()=>{throw Error('missing commit')}),null)
})
test('comparison covers full push and both paths of renames, with NUL-safe names',()=>{
 const files=changedFiles(push,args=>{
  assert.deepEqual(args,['diff','--no-renames','--name-only','-z',before,after,'--'])
  return 'src/styles.css\0src/lib/removed.ts\0docs/name with spaces.md\0'
 })
 assert.deepEqual(files,['src/styles.css','src/lib/removed.ts','docs/name with spaces.md'])
 assert.equal(selectScope('push',push,files).full,true)
})

test('CLI writes scope outputs for a real multi-commit push and empty push', async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs')
 const {tmpdir}=await import('node:os')
 const {join,resolve,sep}=await import('node:path')
 const {execFileSync}=await import('node:child_process')
 const root=resolve(tmpdir()),directory=mkdtempSync(join(root,'perumar-ci-scope-'))
 const git=args=>execFileSync('git',args,{cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 const run=(eventName,event)=>{
  const eventPath=join(directory,'event.json'),output=join(directory,'output.txt')
  writeFileSync(eventPath,JSON.stringify(event));writeFileSync(output,'')
  execFileSync(process.execPath,[resolve('scripts/ci-scope.mjs')],{cwd:directory,env:{...process.env,GITHUB_EVENT_NAME:eventName,GITHUB_EVENT_PATH:eventPath,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:join(directory,'summary.md')},stdio:'pipe'})
  return readFileSync(output,'utf8').trim()
 }
 assert.ok(directory.startsWith(root+sep)&&directory.slice(root.length+1).startsWith('perumar-ci-scope-'),'Unexpected test directory')
 try{
  git(['init']);git(['config','user.name','CI fixture']);git(['config','user.email','ci@example.invalid'])
  writeFileSync(join(directory,'base.txt'),'base');git(['add','base.txt']);git(['commit','-m','base']);const base=git(['rev-parse','HEAD'])
  mkdirSync(join(directory,'supabase'));writeFileSync(join(directory,'supabase','change.sql'),'select 1;');git(['add','supabase']);git(['commit','-m','SQL in first pushed commit'])
  mkdirSync(join(directory,'src'));writeFileSync(join(directory,'src','styles.css'),'body {}');git(['add','src']);git(['commit','-m','CSS in last pushed commit']);const head=git(['rev-parse','HEAD'])
  assert.equal(run('push',{before:base,after:head}),'full=true')
  git(['commit','--allow-empty','-m','empty']);const empty=git(['rev-parse','HEAD'])
  assert.equal(run('push',{before:head,after:empty}),'full=false')
  assert.equal(run('pull_request',{}),'full=true')
 }finally{
  rmSync(directory,{recursive:true,force:true})
 }
})
