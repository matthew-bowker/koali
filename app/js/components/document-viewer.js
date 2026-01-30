import { detectSourceType, isTranscriptType } from '../models/source.js';
import { parseText } from '../parsers/text.js';
import { parseVTT } from '../parsers/vtt.js';
import { parseSRT } from '../parsers/srt.js';
import { parseZoomJSON } from '../parsers/zoom-json.js';
import { parseDOCX } from '../parsers/docx.js';
import { parsePDF } from '../parsers/pdf.js';

const parserMap = {
  'text': parseText,
  'transcript-vtt': parseVTT,
  'transcript-srt': parseSRT,
  'transcript-zoom-json': parseZoomJSON,
  'docx': parseDOCX,
  'pdf': parsePDF,
};

export function initDocumentViewer(state, storage) {
  const viewer = document.getElementById('document-viewer');
  const toolbar = document.getElementById('document-toolbar');
  const titleEl = document.getElementById('doc-title');
  const searchEl = document.getElementById('doc-search');
  let currentParsed = null;
  let currentSourceId = null;
  let contentRoot = null;

  state.subscribe('sources.activeSourceId', async (sourceId) => {
    if (!sourceId) {
      viewer.innerHTML = '<div class="empty-state">Select a document from the left panel to begin coding.</div>';
      toolbar.classList.add('hidden');
      currentParsed = null;
      currentSourceId = null;
      return;
    }

    const sources = state.get('sources.manifest') || [];
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    currentSourceId = sourceId;
    toolbar.classList.remove('hidden');
    titleEl.textContent = source.title;
    viewer.innerHTML = '<div class="empty-state">Loading...</div>';

    // Try cache first
    let parsed = await storage.getCached(`parsed-${sourceId}`);
    if (!parsed) {
      // Re-parse from file
      try {
        const file = await storage.readFile(`sources/${source.filename}`);
        const parser = parserMap[source.type];
        if (!parser) {
          viewer.innerHTML = `<div class="empty-state">Unsupported file type: ${source.type}</div>`;
          return;
        }
        parsed = await parser(file);
        await storage.setCached(`parsed-${sourceId}`, parsed);
      } catch (e) {
        console.error('Failed to load document:', e);
        viewer.innerHTML = `<div class="empty-state">Failed to load document: ${e.message}</div>`;
        return;
      }
    }

    currentParsed = parsed;
    renderDocument(parsed, source);
  });

  // Re-render highlights when codings change
  state.subscribe('codings', () => {
    if (currentSourceId && contentRoot) {
      renderHighlights();
    }
  });

  function renderDocument(parsed, source) {
    viewer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'doc-content';
    contentRoot = container;

    if (isTranscriptType(source.type) || parsed.cues) {
      renderTranscript(container, parsed);
    } else if (parsed.html) {
      renderHTML(container, parsed);
    } else if (parsed.pages && parsed.pages.length > 1) {
      renderPages(container, parsed);
    } else {
      renderPlainText(container, parsed);
    }

    viewer.appendChild(container);
    setupSelectionHandler();
    renderHighlights();
  }

  function renderTranscript(container, parsed) {
    const cues = parsed.cues || [];
    for (const cue of cues) {
      const row = document.createElement('div');
      row.className = 'transcript-cue';
      row.dataset.cueIndex = cue.index;

      const timeEl = document.createElement('span');
      timeEl.className = 'cue-time';
      timeEl.textContent = cue.startTime || '';

      const speakerEl = document.createElement('span');
      speakerEl.className = 'cue-speaker';
      speakerEl.textContent = cue.speaker || '';

      const textEl = document.createElement('span');
      textEl.className = 'cue-text';
      textEl.textContent = cue.text;

      row.appendChild(timeEl);
      row.appendChild(speakerEl);
      row.appendChild(textEl);
      container.appendChild(row);
    }
  }

  function renderHTML(container, parsed) {
    const div = document.createElement('div');
    div.className = 'doc-html-content';
    div.innerHTML = parsed.html;
    container.appendChild(div);
  }

  function renderPages(container, parsed) {
    for (const page of parsed.pages) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'doc-page';
      pageDiv.dataset.page = page.pageNum;

      const numEl = document.createElement('div');
      numEl.className = 'doc-page-num';
      numEl.textContent = `Page ${page.pageNum}`;

      const textEl = document.createElement('div');
      textEl.className = 'doc-page-text';
      textEl.textContent = page.text;

      pageDiv.appendChild(numEl);
      pageDiv.appendChild(textEl);
      container.appendChild(pageDiv);
    }
  }

  function renderPlainText(container, parsed) {
    const pre = document.createElement('div');
    pre.className = 'doc-plain-text';
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = parsed.text || '';
    container.appendChild(pre);
  }

  // ── Text Selection ──
  function setupSelectionHandler() {
    viewer.addEventListener('mouseup', handleSelection);
  }

  function handleSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRoot) {
      return;
    }

    // Ensure selection is within our content
    if (!contentRoot.contains(sel.anchorNode) || !contentRoot.contains(sel.focusNode)) {
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) return;

    const startOffset = computeOffset(contentRoot, range.startContainer, range.startOffset);
    const endOffset = computeOffset(contentRoot, range.endContainer, range.endOffset);

    // For transcripts, also capture cue info
    let cueInfo = null;
    const startCue = range.startContainer.parentElement?.closest('.transcript-cue');
    const endCue = range.endContainer.parentElement?.closest('.transcript-cue');
    if (startCue) {
      cueInfo = {
        startCueIndex: parseInt(startCue.dataset.cueIndex),
        endCueIndex: endCue ? parseInt(endCue.dataset.cueIndex) : parseInt(startCue.dataset.cueIndex)
      };
    }

    // For pages, capture page info
    let pageInfo = null;
    const startPage = range.startContainer.parentElement?.closest('.doc-page');
    if (startPage) {
      pageInfo = { page: parseInt(startPage.dataset.page) };
    }

    // Get speaker if transcript
    let speaker = null;
    if (startCue) {
      const speakerEl = startCue.querySelector('.cue-speaker');
      if (speakerEl) speaker = speakerEl.textContent;
    }

    state.set('ui.selectedText', {
      sourceId: currentSourceId,
      start: { offset: startOffset, ...pageInfo, ...(cueInfo ? { cueIndex: cueInfo.startCueIndex } : {}) },
      end: { offset: endOffset, ...(cueInfo ? { cueIndex: cueInfo.endCueIndex } : {}) },
      text,
      speaker
    }, { trackDirty: false });
  }

  function computeOffset(root, node, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return charCount + offset;
      }
      charCount += walker.currentNode.textContent.length;
    }
    return charCount;
  }

  // ── Highlight Rendering ──
  function renderHighlights() {
    // Remove existing highlights
    contentRoot.querySelectorAll('.code-highlight').forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    contentRoot.querySelectorAll('.highlight-tag').forEach(el => el.remove());

    const codings = state.get(`codings.${currentSourceId}`);
    if (!codings || !codings.segments || codings.segments.length === 0) return;

    const codes = state.get('codebook.codes') || [];
    const codeMap = {};
    for (const c of codes) codeMap[c.id] = c;

    // Sort segments by start offset descending (apply from end to avoid offset shifts)
    const sortedSegments = [...codings.segments].sort((a, b) => {
      return (b.start?.offset || 0) - (a.start?.offset || 0);
    });

    for (const segment of sortedSegments) {
      const code = codeMap[segment.codeId];
      if (!code) continue;

      try {
        const range = offsetToRange(contentRoot, segment.start.offset, segment.end.offset);
        if (!range) continue;

        const mark = document.createElement('mark');
        mark.className = 'code-highlight';
        mark.style.backgroundColor = hexToRGBA(code.color || '#FFD700', 0.3);
        mark.dataset.segmentId = segment.id;
        mark.dataset.codeId = segment.codeId;
        mark.title = code.name;

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          state.set('ui.activeCodeId', segment.codeId, { trackDirty: false });
        });

        // Right-click to uncode
        mark.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showSegmentPopover(e, segment, code);
        });

        highlightRange(range, mark);

        // Show note indicator if segment has a note attached
        if (segment.noteId) {
          const noteTag = document.createElement('span');
          noteTag.className = 'highlight-tag highlight-note-tag';
          noteTag.textContent = '\u{1F4DD}';
          noteTag.title = 'View note';
          noteTag.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.dispatchEvent(new CustomEvent('koali-edit-note', { detail: { noteId: segment.noteId } }));
          });
          mark.style.position = 'relative';
          mark.appendChild(noteTag);
        }
      } catch (e) {
        console.warn('Could not highlight segment:', segment.id, e.message);
      }
    }
  }

  function highlightRange(range, mark) {
    // If surroundContents works (single text node), use it directly
    try {
      range.surroundContents(mark);
      return;
    } catch (_) {
      // Range spans multiple nodes — wrap each text node individually
    }

    const doc = range.startContainer.ownerDocument;
    const walker = doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (range.intersectsNode(node)) {
        textNodes.push(node);
      }
    }

    for (const node of textNodes) {
      const clone = mark.cloneNode(false);
      let target = node;

      // Trim to range boundaries for start/end nodes
      if (node === range.startContainer && range.startOffset > 0) {
        target = node.splitText(range.startOffset);
      }
      if (target === range.endContainer && range.endOffset < target.textContent.length) {
        target.splitText(range.endOffset);
      } else if (node === range.endContainer && range.endOffset < node.textContent.length) {
        node.splitText(range.endOffset);
        target = node;
      }

      target.parentNode.insertBefore(clone, target);
      clone.appendChild(target);
    }
  }

  function offsetToRange(root, startOffset, endOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let startNode = null, startOff = 0;
    let endNode = null, endOff = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.textContent.length;

      if (!startNode && charCount + len > startOffset) {
        startNode = node;
        startOff = startOffset - charCount;
      }
      if (!endNode && charCount + len >= endOffset) {
        endNode = node;
        endOff = endOffset - charCount;
        break;
      }
      charCount += len;
    }

    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    return range;
  }

  // ── Segment Popover (Uncode) ──
  function showSegmentPopover(e, segment, code) {
    // Remove any existing popover
    document.querySelectorAll('.segment-popover').forEach(el => el.remove());

    const popover = document.createElement('div');
    popover.className = 'segment-popover';
    popover.style.left = e.clientX + 'px';
    popover.style.top = e.clientY + 'px';
    const hasNote = !!segment.noteId;
    popover.innerHTML = `
      <div class="segment-popover-header">
        <span class="code-color" style="background:${code.color}"></span>
        <strong>${code.name}</strong>
      </div>
      <div class="segment-popover-text">${(segment.text || '').slice(0, 80)}${(segment.text || '').length > 80 ? '...' : ''}</div>
      <div class="segment-popover-actions">
        <button class="btn btn-small segment-note-btn">${hasNote ? 'View Note' : 'Add Note'}</button>
        <button class="btn btn-small btn-danger segment-uncode-btn">Remove Code</button>
      </div>
    `;

    document.body.appendChild(popover);

    popover.querySelector('.segment-note-btn').addEventListener('click', () => {
      popover.remove();
      if (segment.noteId) {
        window.dispatchEvent(new CustomEvent('koali-edit-note', { detail: { noteId: segment.noteId } }));
      } else {
        window.dispatchEvent(new CustomEvent('koali-new-note', {
          detail: { segmentId: segment.id, sourceId: currentSourceId, segmentText: segment.text }
        }));
      }
    });

    popover.querySelector('.segment-uncode-btn').addEventListener('click', () => {
      state.pushUndo();
      const coding = state.get(`codings.${currentSourceId}`);
      if (coding) {
        coding.segments = coding.segments.filter(s => s.id !== segment.id);
        coding.version++;
        coding.modified = new Date().toISOString();
        state.set(`codings.${currentSourceId}`, { ...coding });
      }
      popover.remove();
    });

    // Close on outside click
    const closeHandler = (ev) => {
      if (!popover.contains(ev.target)) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  // ── Search ──
  searchEl.addEventListener('input', () => {
    const query = searchEl.value.trim().toLowerCase();
    if (!query || !contentRoot) return;

    // Simple text search: find and scroll to first match
    const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const idx = walker.currentNode.textContent.toLowerCase().indexOf(query);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(walker.currentNode, idx);
        range.setEnd(walker.currentNode, idx + query.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        walker.currentNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  });
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
