import { executeQuery, createSavedQuery } from '../models/query.js';
import { queryResultsToCSV, downloadCSV } from '../utils/export.js';

export function initQueryBuilder(state, storage) {
  const container = document.getElementById('query-builder');

  function render() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const sources = state.get('sources.manifest') || [];
    const savedQueries = state.get('queries.saved') || [];
    const themes = (state.get('themes.themes') || []).filter(t => !t.deleted);

    container.innerHTML = `
      <h2 style="margin-bottom:16px;">Query Builder</h2>

      ${themes.length > 0 ? `
        <div style="margin-bottom:12px;">
          <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">Quick: Select by Theme</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${themes.map(t => `
              <button class="btn btn-small theme-select-btn" data-theme-id="${t.id}" style="border-left:3px solid ${t.color}">
                ${escapeHtml(t.name)} (${t.codeIds.length})
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="form-row" style="margin-bottom:16px;">
        <div class="form-group" style="flex:2">
          <label>Select Codes</label>
          <select id="query-codes" multiple size="6" style="width:100%">
            ${codes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Hold Ctrl/Cmd to select multiple</div>
        </div>
        <div class="form-group" style="flex:1">
          <label>Operator</label>
          <select id="query-operator">
            <option value="OR">OR (any of selected)</option>
            <option value="AND">AND (all in same document)</option>
            <option value="NOT">NOT (first minus others)</option>
            <option value="COOCCUR">CO-OCCUR (overlapping ranges)</option>
            <option value="PROXIMITY">PROXIMITY (near each other)</option>
          </select>
          <div id="proximity-opts" style="margin-top:6px;display:none;">
            <label style="font-size:12px;">Max distance (chars)</label>
            <input type="number" id="query-proximity-dist" value="500" min="1" max="10000" style="width:100px;" />
          </div>
        </div>
        <div class="form-group" style="flex:1">
          <label>Filter Documents</label>
          <select id="query-docs" multiple size="6">
            <option value="" selected>All documents</option>
            ${sources.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:16px;display:flex;gap:8px;">
        <button class="btn btn-primary" id="query-run">Run Query</button>
        <button class="btn" id="query-save">Save Query</button>
        <button class="btn" id="query-export" disabled>Export CSV</button>
      </div>

      ${savedQueries.length > 0 ? `
        <div style="margin-bottom:16px;">
          <label style="font-size:13px;color:var(--text-secondary);">Saved Queries</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
            ${savedQueries.map(sq => `
              <span style="display:inline-flex;align-items:center;gap:2px;">
                <button class="btn btn-small saved-query-btn" data-query-id="${sq.id}">${escapeHtml(sq.name)}</button>
                <button class="btn btn-small saved-query-rename" data-query-id="${sq.id}" title="Rename" style="padding:2px 4px;">&#9998;</button>
                <button class="btn btn-small btn-danger saved-query-delete" data-query-id="${sq.id}" title="Delete" style="padding:2px 4px;">&times;</button>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div id="query-results"></div>
    `;

    // Run query
    document.getElementById('query-run').addEventListener('click', runQuery);
    document.getElementById('query-save').addEventListener('click', saveQuery);
    document.getElementById('query-export').addEventListener('click', exportResults);

    // Theme quick-select buttons
    container.querySelectorAll('.theme-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = themes.find(t => t.id === btn.dataset.themeId);
        if (!theme) return;
        const codesEl = document.getElementById('query-codes');
        const codeIdSet = new Set(theme.codeIds);
        Array.from(codesEl.options).forEach(o => o.selected = codeIdSet.has(o.value));
      });
    });

    // Proximity toggle
    const opEl = document.getElementById('query-operator');
    const proxOpts = document.getElementById('proximity-opts');
    opEl.addEventListener('change', () => {
      proxOpts.style.display = opEl.value === 'PROXIMITY' ? 'block' : 'none';
    });

    // Saved query buttons
    container.querySelectorAll('.saved-query-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sq = savedQueries.find(q => q.id === btn.dataset.queryId);
        if (sq) {
          applyQuery(sq.query);
          runQuery();
        }
      });
    });
    container.querySelectorAll('.saved-query-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        const sq = savedQueries.find(q => q.id === btn.dataset.queryId);
        if (!sq) return;
        const name = prompt('Rename query:', sq.name);
        if (name && name !== sq.name) {
          sq.name = name;
          state.set('queries.saved', [...savedQueries]);
        }
      });
    });
    container.querySelectorAll('.saved-query-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this saved query?')) return;
        const filtered = savedQueries.filter(q => q.id !== btn.dataset.queryId);
        state.set('queries.saved', filtered);
      });
    });
  }

  let lastResults = null;
  let lastQuery = null;

  function getQuery() {
    const codesEl = document.getElementById('query-codes');
    const codeIds = Array.from(codesEl.selectedOptions).map(o => o.value);
    const operator = document.getElementById('query-operator').value;
    const docsEl = document.getElementById('query-docs');
    const docFilter = Array.from(docsEl.selectedOptions).map(o => o.value).filter(Boolean);

    const proximityDistance = operator === 'PROXIMITY' ? parseInt(document.getElementById('query-proximity-dist')?.value || '500') : undefined;
    return { codes: codeIds, operator, documentFilter: docFilter.length > 0 ? docFilter : null, proximityDistance };
  }

  function applyQuery(query) {
    const codesEl = document.getElementById('query-codes');
    Array.from(codesEl.options).forEach(o => o.selected = query.codes.includes(o.value));
    document.getElementById('query-operator').value = query.operator;
  }

  function runQuery() {
    const query = getQuery();
    if (query.codes.length === 0) {
      document.getElementById('query-results').innerHTML = '<p style="color:var(--text-muted)">Select at least one code.</p>';
      return;
    }

    lastQuery = query;
    lastResults = executeQuery(state.get('codings') || {}, state.get('codebook') || {}, query);
    document.getElementById('query-export').disabled = lastResults.length === 0;

    renderResults(lastResults);
  }

  function renderResults(results) {
    const el = document.getElementById('query-results');
    const sources = state.get('sources.manifest') || [];
    const sourceMap = {};
    for (const s of sources) sourceMap[s.id] = s;

    if (results.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No results found.</p>';
      return;
    }

    el.innerHTML = `
      <h3 style="margin-bottom:8px;">${results.length} result(s)</h3>
      <table>
        <thead>
          <tr><th>Document</th><th>Code</th><th>Speaker</th><th>Text</th></tr>
        </thead>
        <tbody>
          ${results.map(r => {
            const src = sourceMap[r.sourceId];
            return `<tr>
              <td>${escapeHtml(src?.title || r.sourceId)}</td>
              <td><span class="code-color" style="background:${r.code?.color || '#999'};display:inline-block;width:8px;height:8px;border-radius:50;"></span> ${escapeHtml(r.code?.name || '')}</td>
              <td>${escapeHtml(r.segment.speaker || '')}</td>
              <td>${escapeHtml(r.segment.text?.slice(0, 200) || '')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function saveQuery() {
    const query = getQuery();
    if (query.codes.length === 0) { alert('Select codes first.'); return; }
    const name = prompt('Query name:');
    if (!name) return;
    const saved = createSavedQuery(name, query);
    const list = [...(state.get('queries.saved') || []), saved];
    state.set('queries.saved', list);
    render();
  }

  function exportResults() {
    if (!lastResults || lastResults.length === 0) return;
    const sources = state.get('sources.manifest') || [];
    const csv = queryResultsToCSV(lastResults, lastQuery, sources);
    downloadCSV(csv, 'query-results.csv');
  }

  // Re-render when switching to queries tab
  state.subscribe('ui.activeTab', (tab) => {
    if (tab === 'queries') render();
  });

  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
