#!/usr/bin/env node
/**
 * Build script: concatenates ES module source files into a single IIFE bundle (app/js/koali.js).
 * Strips import/export statements, deduplicates helper functions, and wraps in an IIFE.
 *
 * Usage: node build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APP = path.join(ROOT, 'app');
const OUT = path.join(APP, 'js', 'koali.js');

// Order matters: dependencies before dependents.
const SOURCE_FILES = [
  'js/utils/uuid.js',
  'js/models/source.js',
  'js/models/codebook.js',
  'js/models/coding.js',
  'js/models/note.js',
  'js/models/theme.js',
  'js/models/query.js',
  'js/models/project.js',
  'js/parsers/text.js',
  'js/parsers/vtt.js',
  'js/parsers/srt.js',
  'js/parsers/zoom-json.js',
  'js/parsers/docx.js',
  'js/parsers/pdf.js',
  'js/utils/irr.js',
  'js/utils/merge.js',
  'js/utils/export.js',
  'js/state.js',
  'js/storage.js',
  'js/components/source-panel.js',
  'js/components/document-viewer.js',
  'js/components/code-panel.js',
  'js/components/note-editor.js',
  'js/components/query-builder.js',
  'js/components/visualizations.js',
  'js/components/irr-dashboard.js',
  'js/components/conflict-resolver.js',
  'js/components/settings.js',
  'js/components/theme-panel.js',
  'js/components/project-home.js',
  'js/app.js',
];

// Helper functions that are duplicated across source files.
// Only the FIRST occurrence will be kept; subsequent ones are dropped.
const DEDUP_FUNCTIONS = new Set([
  'escapeHtml', 'escapeAttr', 'csvEscape', 'hexToRGBA',
  'uuid', 'shortId',
]);

// Per-file renames for top-level const/let that collide across files.
// key = source file, value = { oldName: newName }
const RENAMES = {
  'js/components/document-viewer.js': { parserMap: '_viewerParserMap' },
};

// Track which dedup-eligible functions we've already emitted.
const emittedFunctions = new Set();

function stripModuleSyntax(code) {
  const lines = code.split('\n');
  const out = [];
  let skipExportBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip import lines (various forms)
    if (/^import\s/.test(trimmed) && (trimmed.includes(' from ') || /^import\s+['"]/.test(trimmed))) {
      continue;
    }
    // Skip export { ... } blocks
    if (/^export\s*\{/.test(trimmed)) {
      if (!trimmed.includes('}')) skipExportBlock = true;
      continue;
    }
    if (skipExportBlock) {
      if (trimmed.includes('}')) skipExportBlock = false;
      continue;
    }
    // Strip "export " prefix from declarations
    let cleaned = line;
    const exportPrefixes = [
      'export default ', 'export async function ', 'export function ',
      'export class ', 'export const ', 'export let ',
    ];
    for (const prefix of exportPrefixes) {
      if (trimmed.startsWith(prefix)) {
        cleaned = line.replace(prefix, prefix.replace('export ', '').replace('default ', ''));
        break;
      }
    }
    out.push(cleaned);
  }
  return out.join('\n');
}

function deduplicateHelpers(code, filePath) {
  const lines = code.split('\n');
  const out = [];
  let skipping = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (skipping) {
      // Count braces to find end of function
      for (const ch of lines[i]) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0) {
        skipping = false;
        braceDepth = 0;
      }
      continue;
    }

    // Check if this line starts a function we should deduplicate
    const fnMatch = trimmed.match(/^function\s+(\w+)\s*\(/);
    if (fnMatch && DEDUP_FUNCTIONS.has(fnMatch[1])) {
      if (emittedFunctions.has(fnMatch[1])) {
        // Skip this duplicate
        skipping = true;
        braceDepth = 0;
        for (const ch of lines[i]) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        if (braceDepth <= 0) { skipping = false; braceDepth = 0; }
        continue;
      }
      emittedFunctions.add(fnMatch[1]);
    }

    out.push(lines[i]);
  }
  return out.join('\n');
}

function applyRenames(code, filePath) {
  const renames = RENAMES[filePath];
  if (!renames) return code;
  let result = code;
  for (const [oldName, newName] of Object.entries(renames)) {
    // Replace as whole word
    result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
  }
  return result;
}

// Read existing bundle to extract preamble (dialog helpers not in source files)
// and postamble (app init wiring, keyboard shortcuts, settings button)
const existingBundle = fs.readFileSync(OUT, 'utf-8');

function extractPreamble(bundle) {
  // Everything before the first source-file section marker
  const marker = '// ── js/';
  const idx = bundle.indexOf(marker);
  if (idx === -1) {
    // Fallback: before KoaliState
    const si = bundle.indexOf('class KoaliState');
    if (si === -1) return '';
    const chunk = bundle.substring(0, si);
    return chunk.replace(/^\(function\(\)\s*\{\s*\n"use strict";\s*\n/, '').trim();
  }
  const chunk = bundle.substring(0, idx);
  return chunk.replace(/^\(function\(\)\s*\{\s*\n"use strict";\s*\n/, '').trim();
}

function extractPostamble(bundle) {
  const markers = [
    '// ── App Initialization ──',
    'const state = new KoaliState',
  ];
  for (const marker of markers) {
    const idx = bundle.indexOf(marker);
    if (idx !== -1) {
      let post = bundle.substring(idx);
      post = post.replace(/\n\}\)\(\);\s*$/, '');
      return post.trim();
    }
  }
  return '';
}

const preamble = extractPreamble(existingBundle);
// No postamble needed — app.js is now a source file that contains all init code

// Mark preamble helpers as already emitted
// The preamble contains uuid, shortId, escapeHtml already
for (const fn of DEDUP_FUNCTIONS) {
  const re = new RegExp(`function\\s+${fn}\\s*\\(`);
  if (re.test(preamble)) {
    emittedFunctions.add(fn);
  }
}

// Build the bundle
let bundle = '(function() {\n"use strict";\n\n';

if (preamble) {
  bundle += '// ── Dialog Helpers & Utilities ──\n\n';
  bundle += preamble + '\n\n';
}

for (const relPath of SOURCE_FILES) {
  const absPath = path.join(APP, relPath);
  if (!fs.existsSync(absPath)) {
    console.warn(`  SKIP (not found): ${relPath}`);
    continue;
  }
  let code = fs.readFileSync(absPath, 'utf-8');
  code = stripModuleSyntax(code);
  code = applyRenames(code, relPath);
  code = deduplicateHelpers(code, relPath);
  bundle += `// ── ${relPath} ──\n\n`;
  bundle += code.trim() + '\n\n';
  console.log(`  Added: ${relPath}`);
}

bundle += '})();\n';

fs.writeFileSync(OUT, bundle, 'utf-8');
const lineCount = bundle.split('\n').length;
console.log(`\nBundle written to ${OUT} (${lineCount} lines, ${(bundle.length / 1024).toFixed(1)} KB)`);
console.log(`Deduplicated functions: ${Array.from(emittedFunctions).join(', ')}`);
