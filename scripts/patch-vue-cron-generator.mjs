/**
 * 一次性脚本：为 vendored vue-cron-generator 注入 i18n mixin、Element Plus 兼容替换
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/vendor/vue-cron-generator/src')

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      walk(p, files)
    } else if (name.endsWith('.vue')) {
      files.push(p)
    }
  }
  return files
}

function mixinImportFor(file) {
  const dir = path.dirname(file)
  const rel = path.relative(root, dir).replace(/\\/g, '/')
  const depth = rel ? rel.split('/').length : 0
  return `import cronI18n from '${'../'.repeat(depth + 1)}mixins/cronI18n.js'`
}

function patchFile(file) {
  let s = fs.readFileSync(file, 'utf8')
  const imp = mixinImportFor(file)
  const mixinPath = imp.match(/from '([^']+)'/)[1]

  if (!s.includes('cronI18n')) {
    s = s.replace(/<script>\r?\n/, `<script>\n${imp}\n`)
    if (s.includes('mixins: [')) {
      s = s.replace(/mixins: \[/, 'mixins: [cronI18n, ')
    } else if (s.includes('export default {')) {
      s = s.replace(/export default \{/, 'export default {\n  mixins: [cronI18n],')
    }
  }

  if (s.includes('cronTranslate(') && !s.includes('import { cronTranslate }')) {
    s = s.replace(imp + '\n', `${imp}\nimport { cronTranslate } from '${mixinPath}'\n`)
  }

  s = s.replace(/this\.\$t\((['"])([^'"]+)\1\)/g, 'cronTranslate($1$2$1)')

  if (s.includes('cronTranslate(') && !s.includes('import { cronTranslate }')) {
    s = s.replace(imp + '\n', `${imp}\nimport { cronTranslate } from '${mixinPath}'\n`)
  }

  s = s.replace(/default: 'mini'/g, "default: 'small'")
  s = s.replace(/<el-radio([^>]*):label="/g, '<el-radio$1:value="')
  s = s.replace(/slot="label"/g, '#label')
  s = s.replace(/slot="reference"/g, '#reference')
  s = s.replace(/slot="append"/g, '#append')
  s = s.replace(/v-model="visible"/g, 'v-model:visible="visible"')

  fs.writeFileSync(file, s)
}

const files = walk(path.join(root, 'components'))
for (const file of files) {
  patchFile(file)
}
console.log('patched', files.length, 'vue files')
