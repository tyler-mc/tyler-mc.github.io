#!/usr/bin/env node
/* Tests for the room editor's save path: tools/dev_server.py's /__room/* endpoints and game/dev/roomfmt.js.
   Copies game/rooms to a temp dir and runs the server on a spare port with ROOMS_DIR pointing at the copy, so the
   real rooms are never written (checked by hashing them before and after). Run: node tools/test_rooms.mjs */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url))),REAL=path.join(ROOT,'game','rooms');
const fmt=await import(pathToFileURL(path.join(ROOT,'game','dev','roomfmt.js')).href);
const read=f=>fs.readFileSync(f,'utf8');
const hashDir=d=>{const h=crypto.createHash('sha256');for(const n of fs.readdirSync(d).sort()){const p=path.join(d,n);if(fs.statSync(p).isFile())h.update(n+'\0').update(fs.readFileSync(p))}return h.digest('hex')};
const load=async text=>(await import('data:text/javascript,'+encodeURIComponent(text))).default;
const freePort=()=>new Promise(res=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const realHash=hashDir(REAL);
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'rooms-test-'));
fs.cpSync(REAL,TMP,{recursive:true,filter:s=>!s.includes(`${path.sep}.bak`)});
const T=n=>path.join(TMP,n);
const IDX0=read(T('index.js'));
const FILES=[.../rooms:begin[^\n]*\n([\s\S]*?)\/\* rooms:end/.exec(IDX0)[1].matchAll(/from '\.\/([a-z][a-z0-9_-]*)\.js'/g)].map(m=>m[1]);
const ORIG=Object.fromEntries(FILES.map(f=>[f,read(T(f+'.js'))]));

const PORT=await freePort();
const srv=spawn('python3',['-I',path.join(ROOT,'tools','dev_server.py'),String(PORT)],{env:{...process.env,ROOMS_DIR:TMP},stdio:['ignore','pipe','pipe']});
let srvLog='';srv.stdout.on('data',d=>srvLog+=d);srv.stderr.on('data',d=>srvLog+=d);

/* raw node:http so the test controls Host, Origin, Content-Type and Content-Length */
function req(method,p,body,headers={}){
  return new Promise(res=>{
    const buf=body===undefined?null:Buffer.isBuffer(body)?body:Buffer.from(typeof body==='string'?body:JSON.stringify(body));
    const r=http.request({host:'127.0.0.1',port:PORT,method,path:p,headers:{Host:`localhost:${PORT}`,...(buf?{'Content-Type':'application/json','Content-Length':buf.length}:{}),...headers}},
      s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{let j=null;try{j=JSON.parse(d)}catch(_){}res({status:s.statusCode,json:j})})});
    r.on('error',e=>res({status:0,err:e.code}));
    if(buf)r.write(buf);r.end();
  });
}
const save=(file,room,comment='',h)=>req('POST','/__room/save',{file,room,comment},h);
const del=(file,h)=>req('POST','/__room/delete',{file},h);
const mod=f=>load(ORIG[f]);
const room=(id,over={})=>({id,name:'Test Room',biome:'roots',at:[400,400],grid:['####','#T.#','####'],ents:[],...over});

let pass=0,fail=0;
async function test(name,fn){try{await fn();pass++;console.log('ok   '+name)}catch(e){fail++;console.log('FAIL '+name+'\n     '+(e&&e.message||e).split('\n').join('\n     '))}}

try{
  for(let i=0;;i++){const r=await req('GET','/__room/ping');if(r.status===200)break;if(i>50)throw new Error('server did not start:\n'+srvLog);await sleep(100)}

  await test('roomfmt.serialize reproduces every room file byte for byte',async()=>{
    for(const f of FILES)assert.equal(fmt.serialize(await mod(f),fmt.headerComment(ORIG[f])),ORIG[f],f);
  });
  await test('roomfmt.check accepts every room and problems() finds nothing in the real set',async()=>{
    const rs=await Promise.all(FILES.map(mod));
    for(const r of rs)assert.equal(fmt.check(r),'',r.id);
    assert.deepEqual(fmt.problems(rs),[]);
  });
  await test('problems() catches a broken set',async()=>{
    const msgs=fmt.problems([
      room('hub',{biome:'hub',at:[0,0],grid:['####','#..#','#...','####']}),                 /* no S; right edge open at row 2 */
      room('aa',{at:[4,0],grid:['####','#G.#','#..#','####']}),                              /* gate, no plate, no torch; row 2 shut */
      room('bb',{at:[5,1],grid:['#####','#T..#','#####']}),                                  /* overlaps aa */
    ]).map(p=>p.id+': '+p.msg).join('\n');
    for(const s of ['hub: No start','aa: Torch missing','aa: Gate without','hub: right edge is open at rows 2 but aa is rock','Overlaps bb'])assert.ok(msgs.includes(s),'missing "'+s+'" in\n'+msgs);
  });
  await test('ping answers locally and refuses a foreign Host',async()=>{
    assert.equal((await req('GET','/__room/ping')).json.ok,true);
    assert.equal((await req('GET','/__room/ping',undefined,{Host:'evil.example'})).status,403);
  });
  await test('every room saved back with its header comment is byte-identical and deep-equal',async()=>{
    for(const f of FILES){
      const m=await mod(f),r=await save(f,m,fmt.headerComment(ORIG[f]));
      assert.equal(r.status,200,f+': '+JSON.stringify(r.json));
      const now=read(T(f+'.js'));
      assert.equal(now,ORIG[f],f+' changed');
      assert.deepEqual(await load(now),m,f);
    }
    assert.equal(read(T('index.js')),IDX0,'index.js changed by plain re-saves');
    for(const f of FILES)assert.equal(fs.statSync(T(f+'.js')).mode&0o777,0o644,f+'.js mode');
  });
  const before=fs.readdirSync(TMP).sort().join();
  const rejects=[
    ['path traversal ../x',()=>save('../x',room('trav')),400],
    ['file name index',()=>save('index',room('idxx')),400],
    ['file name with a dot',()=>save('a.b',room('dot')),400],
    ['unknown glyph',()=>save('bad1',room('bad1',{grid:['####','#Z.#','####']})),400],
    ['mismatched row widths',()=>save('bad2',room('bad2',{grid:['####','#T.','####']})),400],
    ['duplicate id',()=>save('bad3',room('r1')),409],
    ['quote in name',()=>save('bad4',room('bad4',{name:"O'Brien"})),400],
    ['float ent value',()=>save('bad5',room('bad5',{ents:[{at:[1,1],amp:1.5}]})),400],
    ['ent outside the grid',()=>save('bad6',room('bad6',{ents:[{at:[9,1],amp:3}]})),400],
    ['comment closing marker',()=>save('bad7',room('bad7'),'hi */ export default 1; /*'),400],
    ['oversize body',()=>req('POST','/__room/save',Buffer.alloc(300*1024,32)),413],
    ['non-JSON content type',()=>req('POST','/__room/save',JSON.stringify({file:'bad8',room:room('bad8')}),{'Content-Type':'text/plain'}),415],
    ['foreign Origin',()=>save('bad9',room('bad9'),'',{Origin:'http://evil.example'}),403],
    ['foreign Host',()=>save('bad10',room('bad10'),'',{Host:'evil.example'}),403],
    ['body is not JSON',()=>req('POST','/__room/save','{nope'),400],
    ['delete the hub',()=>del('hub'),400],
    ['delete a missing room',()=>del('nope'),404],
    ['delete ../index',()=>del('../index'),400],
  ];
  for(const [name,fn,code] of rejects)await test('rejects '+name+' with '+code,async()=>{const r=await fn();assert.equal(r.status,code,JSON.stringify(r))});
  await test('rejected requests left the rooms folder untouched',async()=>{
    assert.equal(fs.readdirSync(TMP).sort().join(),before);
    for(const f of FILES)assert.equal(read(T(f+'.js')),ORIG[f]);
    assert.equal(read(T('index.js')),IDX0);
  });
  await test('a new room is written and added to the regenerated registry',async()=>{
    const r=await save('zz1',room('zz'),'A test room.');
    assert.equal(r.status,200,JSON.stringify(r.json));
    assert.deepEqual(r.json.registry,[...(await Promise.all(FILES.map(mod))).map(m=>m.id),'zz']);
    assert.equal(read(T('zz1.js')),fmt.serialize(room('zz'),'A test room.'));
    const idx=read(T('index.js'));
    assert.ok(idx.includes("import R_zz from './zz1.js';\n")&&/const LIST=\[[^\]]*,R_zz\];/.test(idx),idx);
    assert.equal(idx.replace(/\/\* rooms:begin[\s\S]*rooms:end \*\//,''),IDX0.replace(/\/\* rooms:begin[\s\S]*rooms:end \*\//,''),'outside the block changed');
    const live=await import(pathToFileURL(T('index.js')).href+'?v=new');
    assert.equal(live.ORDER.at(-1),'zz');assert.equal(live.ROOMS.zz.w,4);
  });
  await test('delete removes the file, restores the registry byte for byte and keeps a backup',async()=>{
    const r=await del('zz1');
    assert.equal(r.status,200,JSON.stringify(r.json));
    assert.ok(!fs.existsSync(T('zz1.js')));
    assert.equal(read(T('index.js')),IDX0);
    assert.ok(fs.readdirSync(T('.bak')).some(n=>n.startsWith('zz1.')));
  });
  await test('two concurrent new rooms both land in the registry',async()=>{
    const [a,b]=await Promise.all([save('ca',room('ca')),save('cb',room('cb',{at:[500,400]}))]);
    assert.equal(a.status,200);assert.equal(b.status,200);
    const idx=read(T('index.js'));assert.ok(idx.includes("from './ca.js'")&&idx.includes("from './cb.js'"),idx);
    assert.equal((await del('ca')).status,200);assert.equal((await del('cb')).status,200);
    assert.equal(read(T('index.js')),IDX0);
  });
  await test('two concurrent saves of one room leave one whole version and no temp files',async()=>{
    const m=await mod('roots2'),A={...m,name:'Hollow A'},B={...m,name:'Hollow B',grid:m.grid.map((s,i)=>i===5?'.'.repeat(s.length):s)};
    const rs=await Promise.all([save('roots2',A),save('roots2',B),save('roots2',A),save('roots2',B)]);
    assert.ok(rs.every(r=>r.status===200),JSON.stringify(rs));
    const now=read(T('roots2.js'));assert.ok(now===fmt.serialize(A,'')||now===fmt.serialize(B,''));
    assert.ok(!fs.readdirSync(TMP).some(n=>n.startsWith('.tmp-')));
  });
  await test('backups are capped at 5 per room',async()=>{
    const m=await mod('roots2');for(let i=0;i<7;i++){await save('roots2',{...m,name:'Hollow '+i});await sleep(3)}
    assert.ok(fs.readdirSync(T('.bak')).filter(n=>n.startsWith('roots2.')).length<=5);
    assert.equal((await save('roots2',m,fmt.headerComment(ORIG.roots2))).status,200);
    assert.equal(read(T('roots2.js')),ORIG.roots2);
  });
}finally{
  srv.kill();
  fs.rmSync(TMP,{recursive:true,force:true});
}
const untouched=hashDir(REAL)===realHash;
console.log(untouched?'ok   game/rooms untouched':'FAIL game/rooms changed during the test');
if(!untouched)fail++;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
