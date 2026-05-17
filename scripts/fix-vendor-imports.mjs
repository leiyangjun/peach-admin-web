import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/vendor/vue-cron-generator/src')

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, files)
    else if (name.endsWith('.vue') || name.endsWith('.js')) files.push(p)
  }
  return files
}

function mixinPathFor(file) {
  const dir = path.dirname(file)
  const rel = path.relative(root, dir).replace(/\\/g, '/')
  const depth = rel ? rel.split('/').length : 0
  return `${'../'.repeat(depth + 1)}mixins/cronI18n.js`
}

for (const file of walk(path.join(root, 'components'))) {
  let s = fs.readFileSync(file, 'utf8')
  const correct = mixinPathFor(file)
  s = s.replace(/from ['"]\.\.\/(?:\.\.\/)*mixins\/cronI18n\.js['"]/g, `from '${correct}'`)
  s = s.replace(/from ['"]\.\/time\/([^'"]+)['"]/g, "from './time/$1.vue'")
  s = s.replace(/from ['"]\.\.\/config\/([^'"]+)['"]/g, (m, p) => {
    if (p.endsWith('.vue')) return m
    return `from '../config/${p}.vue'`
  })
  s = s.replace(/from ['"]\.\.\/\.\.\/constant\/filed['"]/g, "from '../../constant/filed.js'")
  s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/constant\/filed['"]/g, "from '../../../constant/filed.js'")
  s = s.replace(/from ['"]\.\.\/\.\.\/mixins\/watchTime['"]/g, "from '../../mixins/watchTime.js'")
  s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/mixins\/watchValue['"]/g, "from '../../../mixins/watchValue.js'")
  s = s.replace(/from ['"]\.\.\/\.\.\/\.\.\/mixins\/watchTime['"]/g, "from '../../../mixins/watchTime.js'")
  fs.writeFileSync(file, s)
}

// cron.vue 专用
const cronFile = path.join(root, 'components/cron.vue')
let cron = fs.readFileSync(cronFile, 'utf8')
cron = cron.replace(/from '\.\.\/util\/tools'/g, "from '../util/tools.js'")
cron = cron.replace(/from '\.\.\/constant\/filed'/g, "from '../constant/filed.js'")
fs.writeFileSync(cronFile, cron)

console.log('fixed vendor imports')
