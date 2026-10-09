import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const root = resolve("dist");
let count = 0;
async function checkedText(path) {
  const bytes=await readFile(path);
  assert(!(bytes[0]===239&&bytes[1]===187&&bytes[2]===191),`Unexpected BOM: ${path}`);
  const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  assert(!/(?<!\r)\n|\r(?!\n)/.test(text),`Expected CRLF: ${path}`);
  return text;
}
async function walk(dir) {
  for (const e of await readdir(dir, {withFileTypes:true})) {
    const p = resolve(dir,e.name);
    if(e.isDirectory()) { await walk(p); continue; }
    count++;
    if(/\.(js|css|html)$/.test(e.name)) {
      await checkedText(p);
    }
    if(e.name.endsWith(".js")) {
      execFileSync(process.execPath,["--check",p],{stdio:"inherit"});
      const js=await checkedText(p);
      for(const [,ref] of js.matchAll(/from\s+["'](\.[^"']+)["']/g)){
        const target=resolve(dirname(p),ref);assert(target.startsWith(root+sep),"Module escaped dist");await readFile(target);
      }
    }
    if(!e.name.endsWith(".html")) continue;
    const html=await readFile(p,"utf8");
    assert(html.includes('lang="ko"')&&html.includes('name="viewport"')&&html.includes('<title>'),"Missing metadata");
    assert(html.includes("connect-src 'none'")&&html.includes("object-src 'none'"),"Missing connection policy");
    assert(!/<iframe\b|\son\w+=/i.test(html),"Inline execution or frame");
    for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if(/^(https?:|data:)/.test(ref)) continue;
      const target=resolve(dirname(p),ref.endsWith("/")?ref+"index.html":ref);
      assert(target.startsWith(root+sep),"Asset escaped dist");
      await readFile(target);
    }
  }
}
await walk(root);
for(const path of ["architecture.md","README.md","docs/decisions.md","docs/verification.md","package.json",".gitattributes"])
  await checkedText(path);
for(const dir of ["test","tools"])for(const e of await readdir(dir,{withFileTypes:true}))if(e.isFile()&&/\.(js|mjs)$/.test(e.name))await checkedText(resolve(dir,e.name));
const html=await readFile(resolve(root,"index.html"),"utf8"),app=await readFile(resolve(root,"src/app.js"),"utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,"Duplicate HTML id");
for(const [,id] of html.matchAll(/\bfor="([^"]+)"/g))assert(ids.includes(id),`Label target missing: ${id}`);
for(const [,id] of app.matchAll(/\$\("#([\w-]+)"\)/g))assert(ids.includes(id),`UI target missing: ${id}`);
console.log(`PASS: ${count} public files; syntax, local assets/imports, UI IDs/labels, metadata, CSP; source/docs/tests UTF-8 without BOM + CRLF. Browser NOT_RUN.`);
