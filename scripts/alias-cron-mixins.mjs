import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/vendor/vue-cron-generator')

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, files)
    else if (name.endsWith('.vue')) files.push(p)
  }
  return files
}

const re = /from ['"](?:\.\.\/)+mixins\/cronI18n\.js['"]/g
const replacement = "from '@cron-gen/mixins/cronI18n.js'"

for (const file of walk(root)) {
  let s = fs.readFileSync(file, 'utf8')
  const n = s.replace(re, replacement)
  if (n !== s) fs.writeFileSync(file, n)
}

console.log('alias mixin imports done')
