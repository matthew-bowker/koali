export function queryResultsToCSV(results, query, sources) {
  const sourceMap = {};
  for (const s of (sources || [])) sourceMap[s.id] = s;

  const header = 'Segment ID,Document,Location,Speaker,Text,Code,Coded By,Coded At';
  const rows = results.map(r => {
    const src = sourceMap[r.sourceId];
    const docName = src ? src.title : r.sourceId;
    const location = r.segment.start?.page ? `Page ${r.segment.start.page}` :
                     r.segment.start?.cueIndex != null ? `Cue ${r.segment.start.cueIndex}` :
                     `Offset ${r.segment.start?.offset || 0}`;
    return [
      r.segment.id,
      csvEscape(docName),
      csvEscape(location),
      csvEscape(r.segment.speaker || ''),
      csvEscape(r.segment.text),
      csvEscape(r.code?.name || ''),
      r.segment.createdBy,
      r.segment.created
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generate a printable HTML codebook and open browser print dialog.
 */
export function printCodebookPDF(codes, segmentCounts = {}) {
  const active = codes.filter(c => !c.deleted);
  const codeMap = {};
  for (const c of active) codeMap[c.id] = c;

  function renderCodeRow(code, depth) {
    const parent = code.parentId ? (codeMap[code.parentId]?.name || '') : '';
    const count = segmentCounts[code.id] || 0;
    const indent = depth * 20;
    return `
      <tr>
        <td style="padding-left:${indent + 8}px;">
          <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${code.color};margin-right:6px;vertical-align:middle;"></span>
          <strong>${esc(code.name)}</strong>
        </td>
        <td>${esc(parent)}</td>
        <td>${esc(code.description)}</td>
        <td style="text-align:center;">${count}</td>
      </tr>
    `;
  }

  function buildTree(codes) {
    const roots = codes.filter(c => !c.parentId);
    function children(parentId) {
      return codes.filter(c => c.parentId === parentId);
    }
    function renderNode(code, depth) {
      let html = renderCodeRow(code, depth);
      for (const child of children(code.id)) {
        html += renderNode(child, depth + 1);
      }
      return html;
    }
    return roots.map(c => renderNode(c, 0)).join('');
  }

  const html = `<!DOCTYPE html><html><head><title>Codebook</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 6px 8px; border-bottom: 2px solid #ddd; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>Codebook</h1>
    <p style="color:#666;margin-bottom:16px;">Generated ${new Date().toLocaleDateString()} &mdash; ${active.length} codes</p>
    <table>
      <thead><tr><th>Code</th><th>Parent</th><th>Description</th><th>Segments</th></tr></thead>
      <tbody>${buildTree(active)}</tbody>
    </table>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function csvEscape(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
