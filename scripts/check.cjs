const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(p,x.name)):[path.join(p,x.name)]);}
for(const file of walk('src').filter(x=>x.endsWith('.js')&&!x.includes('vendor'))){cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}
for(const file of [...walk('src'),...walk('supabase')].filter(x=>/\.(js|sql|ts|json)$/.test(x))){const s=fs.readFileSync(file,'utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bre_[A-Za-z0-9_]{28,}\b|\bsb_secret_[A-Za-z0-9_]+/.test(s))throw Error('Potential secret: '+file);}
console.log('Syntax and credential-pattern checks passed');
