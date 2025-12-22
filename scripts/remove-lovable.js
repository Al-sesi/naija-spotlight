
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const log = (msg) => console.log(`[CleanLovable] ${msg}`);

// 1. Clean package.json
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let changed = false;
  if (packageJson.dependencies && packageJson.dependencies['lovable-tagger']) {
    delete packageJson.dependencies['lovable-tagger'];
    changed = true;
    log('Removed lovable-tagger from dependencies');
  }
  if (packageJson.devDependencies && packageJson.devDependencies['lovable-tagger']) {
    delete packageJson.devDependencies['lovable-tagger'];
    changed = true;
    log('Removed lovable-tagger from devDependencies');
  }
  if (changed) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    log('Updated package.json');
  }
}

// 2. Clean vite.config.ts
const viteConfigPath = path.join(rootDir, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  let content = fs.readFileSync(viteConfigPath, 'utf8');
  let changed = false;
  
  // Remove import
  if (content.includes('import { componentTagger } from "lovable-tagger";')) {
    content = content.replace(/import { componentTagger } from "lovable-tagger";\r?\n?/g, '');
    changed = true;
    log('Removed componentTagger import from vite.config.ts');
  }
  
  // Remove usage in plugins
  // Matches: mode === "development" && componentTagger()
  // Or: componentTagger()
  const pluginRegex = /,\s*mode\s*===\s*["']development["']\s*&&\s*componentTagger\(\)/g;
  if (pluginRegex.test(content)) {
    content = content.replace(pluginRegex, '');
    changed = true;
    log('Removed componentTagger usage from vite.config.ts');
  }

  if (changed) {
    fs.writeFileSync(viteConfigPath, content);
    log('Updated vite.config.ts');
  }
}

// 3. Clean index.html
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  let changed = false;
  
  // Remove meta tags containing lovable.dev
  const metaRegex = /<meta[^>]*content="[^"]*lovable\.dev[^"]*"[^>]*>\s*/g;
  if (metaRegex.test(content)) {
    content = content.replace(metaRegex, '');
    changed = true;
    log('Removed Lovable meta tags from index.html');
  }

  if (changed) {
    fs.writeFileSync(indexHtmlPath, content);
    log('Updated index.html');
  }
}

log('Cleanup complete!');
