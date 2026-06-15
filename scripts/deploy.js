/**
 * Fusionne les 3 dist/ en un seul dossier deploy/ prêt à uploader sur o2switch.
 *
 * Structure finale :
 *   deploy/
 *   ├── index.html        (portfolio)
 *   ├── assets/           (portfolio)
 *   ├── .htaccess         (racine)
 *   ├── tools/            (app tools)
 *   └── party/            (app party)
 *
 * Usage : node scripts/deploy.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const deployDir = path.join(root, 'deploy')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// Nettoyer le dossier deploy
if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true })
fs.mkdirSync(deployDir)

// 1. Portfolio → racine du deploy
copyDir(path.join(root, 'apps/portfolio/dist'), deployDir)
console.log('✓ Portfolio copié')

// 2. Tools → deploy/tools/
copyDir(path.join(root, 'apps/tools/dist'), path.join(deployDir, 'tools'))
console.log('✓ Tools copié')

// 3. Party → deploy/party/
copyDir(path.join(root, 'apps/party/dist'), path.join(deployDir, 'party'))
console.log('✓ Party copié')

console.log(`\nDossier deploy/ prêt → ${deployDir}`)
