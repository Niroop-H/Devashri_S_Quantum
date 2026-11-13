import { mkdirSync, copyFileSync } from 'node:fs';
for (const route of ['studio', '1000-plus', 'industrial', 'lab', 'lab/operations', 'sensing', 'communication']) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${route}/index.html`);
}
