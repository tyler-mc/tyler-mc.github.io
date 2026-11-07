#!/usr/bin/env node
/* Dumps the frames tools/mascot_sheet.py draws: today's computed bodies and every authored body/boil variant, each with the default face.
   Not a test. Run: python3 tools/mascot_sheet.py [out.png] */
import {compose} from '../mascot/atlas.js';
import {BODY} from '../mascot/body.js';
import {KEYS} from './lint_mascot_body.mjs';
const base={dir:[0,0],stage:1};
const rows=[{label:'today',frames:['idle','breath','squash','stretch','land'].map(f=>({name:f,g:compose({...base,f})}))}];
for(const k of KEYS)if(BODY[k])rows.push({label:k,frames:BODY[k].v.map((_,i)=>({name:k+' v'+i,g:compose({...base,lv:k,bv:i})}))});
for(const [name,extra] of [['scared',{face:'scared'}],['huh',{face:'huh'}],['awe',{face:'awe'}],['happy',{happy:1}],['blink',{blink:1}],['gape',{gape:3}],['hat',{hat:'crown'}],['mask',{mask:1}]])
  rows.push({label:'faces: '+name,frames:KEYS.filter(k=>BODY[k]).map(k=>({name:k,g:compose({...base,lv:k,bv:0,...extra})}))});
console.log(JSON.stringify(rows.map(r=>({label:r.label,frames:r.frames.map(f=>({name:f.name,g:f.g.map(r=>r.join(''))}))}))));
