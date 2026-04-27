import { defineConfig } from 'vite'
import { resolve } from 'path'

function getHtmlEntries(dir, entries = {}) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = resolve(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      getHtmlEntries(fullPath, entries)
    } else if (file.endsWith('.html')) {
      const name = fullPath
        .replace(process.cwd(), '')
        .replace(/\\/g, '/')
        .replace(/^\//, '')
        .replace('.html', '')

      entries[name] = fullPath
    }
  }

  return entries
}

export default defineConfig({
  base: "/Hamy-School/",
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...getHtmlEntries(resolve(__dirname, 'src'))
      }
    }
  },

  server: {
    open: true
  }
})