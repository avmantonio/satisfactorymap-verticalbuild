// Project the viewer slice without declaring whole campaign strands complete.
// Source associations are the "Viewer strand spec" links in map.md.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const featureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(featureDir, '../..');
const feature = path.basename(featureDir);
const source = fs.readFileSync(path.join(featureDir, 'map.md'), 'utf8');
const associations = [...source.matchAll(/^- \*\*([^*]+)\*\*[^\n]*\[Viewer strand spec\]\(([^)]+)\)/gm)]
  .map(([, title, target]) => ({
    id: title.toLowerCase().replace(/\s+/g, '-'),
    specPath: path.relative(workspaceRoot, path.resolve(featureDir, target)).replaceAll('\\', '/'),
  }));
if (associations.length !== 6 || new Set(associations.map(a => a.id)).size !== 6) {
  throw new Error('Expected six distinct viewer-strand spec associations in map.md');
}
const before = JSON.parse(fs.readFileSync(path.join(featureDir, 'graph/graph.json'), 'utf8'));
for (const association of associations) {
  const node = before.nodes.find(n => n.id === association.id);
  if (!node || node.level !== 'strand') throw new Error('Unknown strand: ' + association.id);
  if (!fs.existsSync(path.join(workspaceRoot, association.specPath))) {
    throw new Error('Missing spec: ' + association.specPath);
  }
}

// Read the installed generator; never edit or configure the global plugin.
let projectionModule = process.argv[2];
if (!projectionModule) {
  const pluginRoot = path.join(os.homedir(), '.codex/plugins/cache/personal-plugins/wayfinder-graph');
  const candidates = fs.readdirSync(pluginRoot)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map(version => path.join(pluginRoot, version, 'scripts/projection.mjs'));
  projectionModule = candidates.find(candidate => fs.existsSync(candidate));
}
if (!projectionModule) throw new Error('Pass the installed Wayfinder scripts/projection.mjs as the first argument');
const { syncFromTracker, upsertNode, renderProjections } = await import(pathToFileURL(path.resolve(projectionModule)).href);
if (![syncFromTracker, upsertNode, renderProjections].every(fn => typeof fn === 'function')) {
  throw new Error('Installed Wayfinder generator has an incompatible projection API');
}
syncFromTracker({ workspaceRoot, feature });
for (const association of associations) {
  upsertNode({ workspaceRoot, feature, node: {
    ...association,
    // These documents cover the first viewer, not the whole campaign strand.
    status: 'open',
  } });
}
renderProjections({ workspaceRoot, feature, targets: ['html'] });
console.log('Projected six viewer strand spec links; campaign strands remain open.');
