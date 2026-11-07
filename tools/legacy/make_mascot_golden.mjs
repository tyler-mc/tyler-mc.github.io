#!/usr/bin/env node
/* One-off: record the digests of the OS sprite as drawn by the ORIGINAL os.js code, so the atlas refactor can be proved pixel-identical.
   Usage: git show daedd6e:os.js | sed -n 1291,1374p > /tmp/old_block.js   (the original grid..drawBuddy block, on main)
          node tools/make_mascot_golden.mjs /tmp/old_block.js > tools/mascot_golden.json */
import fs from 'node:fs';import crypto from 'node:crypto';
import {looks,mockCtx} from './mascot_looks.mjs';
const src=fs.readFileSync(process.argv[2],'utf8');
const f=new Function('INK',src+';return drawBuddy');
const draw=f('#1A1716');
const dg=ctx=>crypto.createHash('sha256').update(ctx.px.map(c=>c||'.').join(',')).digest('hex').slice(0,10);
const out=looks().map(s=>{const c=mockCtx();draw(c,s);return dg(c)});
console.log(JSON.stringify({n:out.length,digests:out}));
