# Koali: Lightweight Qualitative Analysis Tool

## Product Specification Document
**Version:** 1.0 Draft  
**Last Updated:** January 2025

---

## 1. Executive Summary

Koali is a lightweight, browser-based qualitative data analysis (QDA) tool designed for researchers who need essential thematic analysis capabilities without the complexity, cost, or privacy concerns of enterprise software like NVivo.

### Core Principles
- **Entirely local**: No server, no cloud, no data leaves your machine
- **Browser-based**: Runs in modern browsers with zero installation
- **Folder-based collaboration**: Teams share a project folder (Dropbox, OneDrive, network drive) for async collaboration
- **Open formats**: All project data stored in human-readable JSON
- **Privacy-first**: Your research data stays yours

### Target Users
- Academic researchers conducting qualitative studies
- UX researchers analyzing interview transcripts
- Graduate students learning thematic analysis
- Small research teams needing collaboration without IT overhead

---

## 2. User Personas

### Persona 1: Dr. Sarah Chen — Academic Researcher
- **Role**: Associate Professor of Sociology
- **Context**: Conducting a study with 25 interview transcripts, working with 2 graduate assistants
- **Pain points**: NVivo is expensive, requires IT installation, worried about cloud privacy for sensitive interviews
- **Needs**: Hierarchical coding, inter-rater reliability checks, exportable codebook

### Persona 2: Marcus Webb — UX Researcher
- **Role**: Senior UX Researcher at mid-size tech company
- **Context**: Analyzing 15 user interview recordings from Zoom, working solo but may share findings
- **Pain points**: Zoom transcripts are messy, needs quick coding without learning complex software
- **Needs**: Clean transcript parsing, fast coding workflow, visual summaries for stakeholder reports

### Persona 3: Aisha Patel — Graduate Student
- **Role**: PhD candidate in Public Health
- **Context**: First major qualitative project, 12 focus group transcripts
- **Pain points**: No budget for software, learning TA methodology, needs to share with advisor
- **Needs**: Intuitive interface, note capability for reflexive practice, ability to share project files

---

## 3. Feature Requirements

### 3.1 Document Management

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Import PDF | Parse and display PDF documents with selectable text |
| Import DOCX | Parse Microsoft Word .docx files |
| Import plain text | Support .txt files |
| Import Zoom transcripts | Parse Zoom VTT and JSON transcript formats |
| Import Teams transcripts | Parse Microsoft Teams VTT/DOCX transcripts |
| Import generic VTT/SRT | Support standard subtitle/caption formats |
| Document list | View all project documents with metadata |
| Document viewer | Read documents with scroll, search, zoom |
| Document deletion | Remove documents from project |
| Speaker identification | Parse and display speaker labels from transcripts |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Import DOC | Parse legacy .doc files (limited support acceptable) |
| Document metadata | Edit title, description, custom attributes |
| Document grouping | Organize documents into folders/categories |
| Full-text search | Search across all documents in project |


#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Audio/video linking | Link transcript segments to timestamps |
| OCR for scanned PDFs | Extract text from image-based PDFs |
| Batch import | Import multiple files at once |

---

### 3.2 Coding System

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Create codes | Define new codes with name and description |
| Hierarchical codes | Organize codes into parent-child tree structure (unlimited depth) |
| Apply code to text | Select text → assign one or more codes |
| View coded segments | See all text segments assigned to a code |
| Code colors | Assign colors to codes for visual distinction |
| Edit codes | Rename, redescribe, change color, move in hierarchy |
| Delete codes | Remove codes (with option to preserve or delete applications) |
| Merge codes | Combine two codes into one |
| Codebook export | Export code definitions to CSV/PDF |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Code shortcuts | Keyboard shortcuts for frequently-used codes |
| Quick coding | Type-ahead code search while text selected |
| Code frequency count | Show how many segments per code |
| Uncode | Remove code from specific segment |
| Code description templates | Structured fields for code definitions |

#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Code sets | Group codes for specific analyses |
| Code versioning | Track changes to code definitions over time |

---

### 3.3 Notes & Annotations

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Document notes | Attach note to entire document |
| Segment notes | Attach note to specific text selection |
| Code notes | Attach note to code definition |
| Project notes | Standalone notes not attached to anything |
| Rich text notes | Basic formatting (bold, italic, lists) in notes |
| Note list | View all notes in project |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Note linking | Link notes to each other |
| Note search | Full-text search within notes |
| Note timestamps | Track creation and modification times |
| Note author | Track who wrote each note (for collaboration) |

#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Note templates | Pre-structured note formats (reflexive, analytic, etc.) |
| Note export | Export notes to standalone document |

---

### 3.4 Queries & Analysis

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Code query | Retrieve all segments coded with specific code(s) |
| Boolean queries | AND, OR, NOT operations on codes |
| Query results export | Export query results to CSV |

#### P1 — Should Have (MVP stretch)
| Feature | Description |
|---------|-------------|
| Code co-occurrence | Find segments with multiple specific codes |
| Proximity query | Find codes occurring near each other |
| Save queries | Store queries for reuse |


---

### 3.5 Visualization

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Code frequency chart | Bar/column chart of code application counts |
| Code hierarchy tree | Visual tree view of code structure |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Code by document matrix | Heatmap of codes × documents |
| Word frequency | Basic word cloud or frequency list |
| Export charts | Download visualizations as PNG/SVG |

#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Code co-occurrence network | Graph visualization of code relationships |
| Coding timeline | Visualize coding density across document |
| Custom chart colors | Match institutional/publication styles |

---

### 3.6 Inter-Rater Reliability (IRR)

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Coder identification | Track which user applied each code |
| Cohen's Kappa | Calculate pairwise agreement statistic |
| Percent agreement | Simple agreement percentage |
| Disagreement report | List segments where coders disagree |
| IRR by code | Calculate reliability per code |

#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Krippendorff's Alpha | More robust multi-coder statistic |
| IRR export | Export reliability reports |
| Consensus coding | Workflow for resolving disagreements |

---

### 3.7 Collaboration

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Folder-based project | Project stored in user-accessible folder |
| Multi-user support | Multiple users can work on same project |
| User identification | Each user identified by name/ID |
| Async merge | Changes from different users merged on project open |
| Conflict detection | Identify when users edited same item |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Conflict resolution UI | Interface to resolve detected conflicts |
| Activity log | See recent changes and who made them |
| User permissions | Basic roles (owner, editor, viewer) |

#### P2 — Nice to Have
| Feature | Description |
|---------|-------------|
| Change history | Full audit trail of all project changes |
| Rollback | Revert to previous project state |
| Comments | Comment on specific items for team discussion |

---

### 3.8 Project Management

#### P0 — Must Have (MVP)
| Feature | Description |
|---------|-------------|
| Create project | Initialize new project in selected folder |
| Open project | Open existing project from folder |
| Project settings | Configure project name, description |
| User settings | Set current user name/identifier |

#### P1 — Should Have
| Feature | Description |
|---------|-------------|
| Recent projects | Quick access to recently opened projects |
| Project backup | One-click backup of entire project |
| Project export | Export complete project as ZIP |

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Core UI** | Vanilla JavaScript + CSS | Zero dependencies, maximum longevity |
| **UI Components** | Web Components (optional) | Native, no framework lock-in |
| **PDF Parsing** | PDF.js (Mozilla) | Industry standard, well-maintained |
| **DOCX Parsing** | Mammoth.js | Lightweight, good fidelity |
| **DOC Parsing** | Limitation noted | Suggest DOCX conversion |
| **VTT/SRT Parsing** | Custom parser | Simple formats, ~100 lines |
| **Zoom JSON Parsing** | Custom parser | Specific format handling |
| **Rich Text Editing** | Quill.js or custom | Notes need basic formatting |
| **Visualizations** | Chart.js or D3.js | Flexible, no dependencies |
| **File System** | File System Access API | Direct folder read/write |
| **Caching** | IndexedDB | Performance for large projects |
| **Text Search** | FlexSearch or custom | Client-side full-text search |

### 4.2 Browser Compatibility

| Browser | Support Level | Notes |
|---------|---------------|-------|
| Chrome 86+ | Full | File System Access API supported |
| Edge 86+ | Full | Chromium-based, same as Chrome |
| Opera 72+ | Full | Chromium-based |
| Firefox | Degraded | No File System Access; fallback to download/upload |
| Safari | Degraded | No File System Access; fallback to download/upload |

**Fallback Mode**: For unsupported browsers, Koali will offer:
- Manual file upload for opening projects
- Download button for saving (downloads ZIP)
- Warning that collaboration features require Chrome/Edge

### 4.3 Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Koali Application                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Document  │  │   Coding    │  │   Query     │             │
│  │   Viewer    │  │   Panel     │  │   Builder   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────┴────────────────┴────────────────┴──────┐             │
│  │              State Management                  │             │
│  │         (In-memory project state)              │             │
│  └──────────────────────┬────────────────────────┘             │
│                         │                                       │
│  ┌──────────────────────┴────────────────────────┐             │
│  │              Persistence Layer                 │             │
│  │  ┌─────────────┐          ┌─────────────────┐ │             │
│  │  │  IndexedDB  │          │ File System API │ │             │
│  │  │  (Cache)    │          │ (Project Folder)│ │             │
│  │  └─────────────┘          └─────────────────┘ │             │
│  └───────────────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PDF.js     │  │  Mammoth    │  │  Transcript │             │
│  │  Parser     │  │  Parser     │  │  Parsers    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Key Technical Decisions

**1. No Build Step Required**
- Application runs directly from HTML/JS/CSS files
- Can be hosted on any static file server (GitHub Pages, local file://)
- Single HTML file option for maximum portability

**2. Offline-First**
- All functionality works without internet after initial load
- Service worker for offline capability (optional enhancement)

**3. Memory Management**
- Large documents loaded in chunks/pages
- Only visible content rendered
- IndexedDB used to cache parsed content

**4. Defensive File Handling**
- All file operations wrapped in try-catch
- Graceful handling of malformed files
- User-friendly error messages

---

## 5. Data Model

### 5.1 Project Folder Structure

```
MyResearchProject/
├── koali.json                    # Project manifest
├── settings.json                 # User and project settings
├── codebook.json                 # Code definitions and hierarchy
├── sources/
│   ├── interview-01.pdf          # Original source files
│   ├── interview-02.docx
│   ├── focus-group-1.vtt
│   └── manifest.json             # Source metadata
├── coding/
│   ├── interview-01.coding.json  # Coding data per source
│   ├── interview-02.coding.json
│   └── focus-group-1.coding.json
├── notes/
│   ├── note-abc123.json          # Individual note files
│   ├── note-def456.json
│   └── manifest.json             # Note index
├── queries/
│   └── saved-queries.json        # Saved query definitions
└── .koali/
    ├── sync-log.json             # Collaboration sync state
    └── local-cache/              # User-specific cache (gitignored)
```

### 5.2 Core Data Schemas

#### Project Manifest (koali.json)
```json
{
  "koaliVersion": "1.0",
  "projectId": "uuid-v4",
  "name": "My Research Project",
  "description": "Study of...",
  "created": "2025-01-15T10:30:00Z",
  "modified": "2025-01-20T14:22:00Z",
  "creators": ["user-id-1"],
  "settings": {
    "defaultLanguage": "en",
    "timestampFormat": "ISO8601"
  }
}
```

#### Codebook (codebook.json)
```json
{
  "version": 1,
  "modified": "2025-01-20T14:22:00Z",
  "modifiedBy": "user-id-1",
  "codes": [
    {
      "id": "code-uuid-1",
      "name": "Barriers to Access",
      "description": "Mentions of obstacles preventing access to services",
      "color": "#E63946",
      "parentId": null,
      "created": "2025-01-15T11:00:00Z",
      "createdBy": "user-id-1",
      "modified": "2025-01-18T09:30:00Z",
      "modifiedBy": "user-id-2",
      "children": ["code-uuid-2", "code-uuid-3"]
    },
    {
      "id": "code-uuid-2",
      "name": "Financial Barriers",
      "description": "Cost-related obstacles",
      "color": "#E63946",
      "parentId": "code-uuid-1",
      "created": "2025-01-15T11:05:00Z",
      "createdBy": "user-id-1",
      "children": []
    }
  ]
}
```

#### Source Manifest (sources/manifest.json)
```json
{
  "sources": [
    {
      "id": "source-uuid-1",
      "filename": "interview-01.pdf",
      "originalName": "Participant_001_Interview.pdf",
      "title": "Interview with P001",
      "type": "pdf",
      "imported": "2025-01-15T10:35:00Z",
      "importedBy": "user-id-1",
      "size": 245680,
      "pageCount": 12,
      "attributes": {
        "participant": "P001",
        "date": "2025-01-10",
        "location": "Urban"
      }
    },
    {
      "id": "source-uuid-2",
      "filename": "focus-group-1.vtt",
      "originalName": "zoom_transcript_20250112.vtt",
      "title": "Focus Group - Urban Participants",
      "type": "transcript-vtt",
      "imported": "2025-01-15T10:40:00Z",
      "importedBy": "user-id-1",
      "size": 89420,
      "duration": "01:23:45",
      "speakers": ["Moderator", "P001", "P002", "P003"],
      "attributes": {
        "group": "Urban",
        "date": "2025-01-12"
      }
    }
  ]
}
```

#### Coding Data (coding/interview-01.coding.json)
```json
{
  "sourceId": "source-uuid-1",
  "version": 3,
  "modified": "2025-01-20T14:20:00Z",
  "segments": [
    {
      "id": "seg-uuid-1",
      "codeId": "code-uuid-2",
      "start": {
        "page": 3,
        "offset": 1247
      },
      "end": {
        "page": 3,
        "offset": 1389
      },
      "text": "I couldn't afford the copay, so I just didn't go",
      "created": "2025-01-16T09:15:00Z",
      "createdBy": "user-id-1",
      "noteId": null
    },
    {
      "id": "seg-uuid-2",
      "codeId": "code-uuid-1",
      "start": {
        "page": 5,
        "offset": 2103
      },
      "end": {
        "page": 5,
        "offset": 2287
      },
      "text": "The clinic is only open during work hours...",
      "created": "2025-01-16T09:22:00Z",
      "createdBy": "user-id-2",
      "noteId": "note-xyz789"
    }
  ]
}
```

#### Transcript-Specific Coding (for VTT/SRT sources)
```json
{
  "sourceId": "source-uuid-2",
  "version": 2,
  "modified": "2025-01-19T16:45:00Z",
  "segments": [
    {
      "id": "seg-uuid-10",
      "codeId": "code-uuid-3",
      "start": {
        "cueIndex": 45,
        "timestamp": "00:15:32.500",
        "charOffset": 0
      },
      "end": {
        "cueIndex": 47,
        "timestamp": "00:16:01.200",
        "charOffset": 42
      },
      "speaker": "P002",
      "text": "Transportation is the biggest issue for me...",
      "created": "2025-01-17T11:30:00Z",
      "createdBy": "user-id-1"
    }
  ]
}
```

#### Note (notes/note-abc123.json)
```json
{
  "id": "note-abc123",
  "type": "analytic",
  "title": "Emerging pattern: systemic barriers",
  "content": "<p>Noticing that barriers cluster into <strong>systemic</strong> vs <strong>individual</strong> categories...</p>",
  "linkedTo": {
    "type": "code",
    "id": "code-uuid-1"
  },
  "created": "2025-01-17T14:00:00Z",
  "createdBy": "user-id-1",
  "modified": "2025-01-18T10:30:00Z",
  "modifiedBy": "user-id-1",
  "tags": ["theory-building", "barriers"]
}
```

#### Sync Log (.koali/sync-log.json)
```json
{
  "lastSync": "2025-01-20T14:22:00Z",
  "users": {
    "user-id-1": {
      "name": "Sarah",
      "lastActive": "2025-01-20T14:22:00Z",
      "color": "#2196F3"
    },
    "user-id-2": {
      "name": "Marcus",
      "lastActive": "2025-01-19T16:45:00Z",
      "color": "#4CAF50"
    }
  },
  "pendingConflicts": [
    {
      "type": "code-rename",
      "itemId": "code-uuid-5",
      "versions": [
        {"value": "Transportation Issues", "by": "user-id-1", "at": "2025-01-20T10:00:00Z"},
        {"value": "Transport Barriers", "by": "user-id-2", "at": "2025-01-20T11:30:00Z"}
      ]
    }
  ]
}
```

---

## 6. User Interface Design

### 6.1 Application Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────┐  Koali    My Research Project           Sarah ▼    [Settings] │
│  │ 🐨 │                                                                │
├──┴─────┴────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌────────────────────────────────┐ ┌─────────────────┐ │
│ │              │ │                                │ │                 │ │
│ │  SOURCES     │ │     DOCUMENT VIEWER            │ │   CODE PANEL    │ │
│ │              │ │                                │ │                 │ │
│ │ 📄 Interview │ │  Page 3 of 12                  │ │ ▼ Barriers      │ │
│ │    P001      │ │  ─────────────────────         │ │   ├─ Financial  │ │
│ │ 📄 Interview │ │                                │ │   ├─ Transport  │ │
│ │    P002      │ │  "I couldn't afford the        │ │   └─ Time       │ │
│ │ 📝 Focus Grp │ │   copay, so I just didn't      │ │ ▼ Facilitators  │ │
│ │              │ │   go to the appointment."      │ │   ├─ Support    │ │
│ │ [+ Import]   │ │   ██████████████████████       │ │   └─ Resources  │ │
│ │              │ │         [Financial Barriers]   │ │                 │ │
│ │──────────────│ │                                │ │ [+ New Code]    │ │
│ │              │ │  The next week I tried to      │ │                 │ │
│ │  NOTES       │ │  reschedule but they said...   │ │─────────────────│ │
│ │              │ │                                │ │                 │ │
│ │ 📝 Emerging  │ │                                │ │ SELECTED TEXT   │ │
│ │    patterns  │ │                                │ │ ─────────────── │ │
│ │ 📝 Methods   │ │                                │ │ "I couldn't     │ │
│ │    note      │ │                                │ │ afford..."      │ │
│ │              │ │                                │ │                 │ │
│ │ [+ New Note] │ │  ◀ Prev    Page 3    Next ▶   │ │ [Apply Code ▼]  │ │
│ └──────────────┘ └────────────────────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│  Sources: 8  │  Codes: 24  │  Coded segments: 156  │  Last saved: 2m   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Key Views

#### 1. Home / Project Selection
- Create new project (select folder location)
- Open existing project (select project folder)
- Recent projects list
- User identity setup

#### 2. Main Workspace (shown above)
- Three-panel layout: Sources | Document | Codes
- Resizable panels
- Collapsible sidebars for focus mode

#### 3. Document Viewer
- PDF: Rendered pages with text selection layer
- DOCX: Rendered HTML with original formatting preserved
- Transcripts: Speaker-labeled segments with timestamps
- Highlight overlay showing coded segments
- Click coded segment to see code details

#### 4. Coding Panel
- Hierarchical tree view of codes
- Drag-and-drop to reorganize
- Right-click context menu for edit/delete/merge
- Code search/filter
- Quick-apply recently used codes

#### 5. Note Editor
- Rich text editing area
- Link selector (attach to code, document, segment, or standalone)
- Tags input
- Linked items display

#### 6. Query Builder
- Visual query construction
- Code selector (multi-select for boolean)
- Operator selection (AND/OR/NOT)
- Document filter (by attributes)
- Results display with context
- Export button

#### 7. Matrix Query View
- Row selector (codes or code groups)
- Column selector (document attributes)
- Generated matrix with cell counts
- Click cell to see segments
- Export to CSV

#### 8. Visualizations
- Code frequency bar chart
- Code hierarchy tree diagram
- Code × document heatmap
- Word frequency display

#### 9. IRR Dashboard
- Coder selector (compare 2+ coders)
- Code selector (specific codes or all)
- Agreement statistics display
- Disagreement list with resolve workflow

#### 10. Settings
- User profile (name, color)
- Project settings
- Display preferences
- Keyboard shortcuts reference

### 6.3 Interaction Patterns

#### Coding Workflow
1. User reads document in viewer
2. Selects text passage with mouse
3. Selection triggers code panel highlight
4. User either:
   - Clicks existing code in tree → code applied
   - Types in quick-search → filtered codes shown → click to apply
   - Uses keyboard shortcut for frequent codes
5. Coded segment highlighted in document
6. Optional: Click "Add note" on segment

#### Code Management
- **Create**: Click "+ New Code" or right-click parent → "Add child"
- **Edit**: Double-click code name or right-click → "Edit"
- **Move**: Drag code to new parent in tree
- **Merge**: Select two codes → right-click → "Merge"
- **Delete**: Right-click → "Delete" → confirm dialog

#### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Apply code 1-9 | `1` - `9` (when text selected) |
| Quick code search | `/` (when text selected) |
| New code | `Ctrl/Cmd + Shift + C` |
| New note | `Ctrl/Cmd + Shift + M` |
| Save project | `Ctrl/Cmd + S` |
| Search documents | `Ctrl/Cmd + F` |
| Next document | `Ctrl/Cmd + ]` |
| Previous document | `Ctrl/Cmd + [` |

---

## 7. Collaboration System

### 7.1 Collaboration Model

Koali uses **file-based asynchronous collaboration**:

1. Project lives in a shared folder (Dropbox, OneDrive, Google Drive, network share)
2. Each user opens the project from their synced copy
3. Changes are saved to individual JSON files
4. On project open, Koali merges changes from all files
5. Conflicts are detected and surfaced for resolution

### 7.2 Sync Strategy

#### File Locking: None
- No file locking (cloud sync services don't support it reliably)
- Last-write-wins at the file level
- Fine-grained merging at the data level

#### Merge Logic by Data Type

| Data Type | Merge Strategy |
|-----------|----------------|
| Codebook | Merge all codes; detect rename conflicts |
| Code applications | Additive (all applications from all users kept) |
| Notes | Additive (all notes kept); content conflicts flagged |
| Source list | Additive (all sources kept) |
| Deleted items | Tombstone records prevent resurrection |

#### Conflict Types & Resolution

| Conflict | Detection | Resolution |
|----------|-----------|------------|
| Same code renamed differently | Names differ, same ID | User picks preferred name |
| Same segment coded differently | Same location, different codes | Keep both (valid disagreement) |
| Note content edited by multiple | Same note ID, different content | Show diff, user picks or merges |
| Code deleted while in use | Code ID in use but marked deleted | Prompt to restore or reassign |

### 7.3 User Identification

```json
// Local user config (stored in browser localStorage, not synced)
{
  "userId": "user-uuid-generated-on-first-run",
  "displayName": "Sarah",
  "color": "#2196F3"
}
```

- User ID generated on first run (UUID)
- Display name set by user
- Color auto-assigned (can be changed)
- All actions tagged with user ID

### 7.4 Sync UI Elements

#### Sync Status Indicator
- 🟢 Synced (no pending changes)
- 🟡 Changes pending save
- 🔴 Conflicts detected (click to resolve)
- 🔄 Syncing... (cloud service actively syncing)

#### Conflict Resolution Dialog
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Conflicts Detected                              [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Code "code-uuid-5" was renamed by multiple users:      │
│                                                         │
│  ○ "Transportation Issues" (Sarah, Jan 20 10:00am)      │
│  ○ "Transport Barriers" (Marcus, Jan 20 11:30am)        │
│  ○ Custom: [____________________]                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Next conflict (2 of 3)                       [→] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              [Skip for now]  [Apply & Continue]         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Security & Privacy

### 8.1 Security Model

#### Data Location
- **All data stays on user's device** (or shared folder they control)
- No Koali servers, no cloud accounts, no telemetry
- Application can run from `file://` protocol

#### Execution Context
- Runs in browser sandbox
- Only accesses folders explicitly granted by user
- No access to arbitrary file system locations

### 8.2 File System Access API Security

The File System Access API provides:
- **User consent required**: Browser prompts for folder access
- **Permission persistence**: Optional, user-controlled
- **Sandboxed access**: Only granted folder accessible

### 8.3 Data Sensitivity Considerations

Qualitative research data often includes:
- Interview transcripts (potentially identifiable)
- Sensitive topics (health, trauma, etc.)
- IRB-protected information

**Koali's approach:**
- No data transmission whatsoever
- No analytics or crash reporting that could leak data
- Clear documentation of data storage locations
- Recommendation for encrypted shared folders for sensitive data

### 8.4 Recommended User Practices

1. Use encrypted folder solutions for sensitive data (Cryptomator, VeraCrypt)
2. Set cloud sync to "Files On-Demand" to limit local copies
3. Use organization-approved sharing solutions
4. Regular backups of project folders
5. Clear browser data if using shared computers

---

## 9. Performance Considerations

### 9.1 Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 3 seconds |
| Open project (10 docs) | < 2 seconds |
| Open large PDF (100 pages) | < 3 seconds |
| Code application | < 100ms (feels instant) |
| Query (1000 segments) | < 1 second |
| Autosave | < 500ms, non-blocking |

### 9.2 Optimization Strategies

#### Large Document Handling
- **PDF**: Render only visible pages; lazy-load others
- **Text extraction**: Cache parsed text in IndexedDB
- **Virtualized scrolling**: Only render visible content

#### Memory Management
- Unload documents not recently viewed
- Limit undo history length
- Compact data structures

#### Save Performance
- **Debounced autosave**: Save 2 seconds after last change
- **Incremental saves**: Only rewrite changed files
- **Background saves**: Non-blocking write operations

### 9.3 IndexedDB Caching

```
IndexedDB: koali-cache
├── parsed-documents/
│   ├── {sourceId}: { pages: [...], text: "...", textIndex: {...} }
├── thumbnails/
│   ├── {sourceId}-{pageNum}: Blob
├── search-index/
│   └── {projectId}: FlexSearch index
└── user-preferences/
    └── settings
```

---

## 10. Development Roadmap

### Phase 1: MVP Core (Months 1-3)

**Milestone 1.1: Project Foundation (Weeks 1-4)**
- [ ] Project creation and folder structure
- [ ] Basic UI shell with three-panel layout
- [ ] User identification system
- [ ] Settings and preferences

**Milestone 1.2: Document Support (Weeks 5-8)**
- [ ] PDF import and viewing (PDF.js)
- [ ] DOCX import and viewing (Mammoth)
- [ ] Plain text support
- [ ] Zoom VTT transcript parsing
- [ ] Document list and navigation

**Milestone 1.3: Core Coding (Weeks 9-12)**
- [ ] Code creation and hierarchical organization
- [ ] Text selection and code application
- [ ] Coded segment highlighting
- [ ] Code editing and deletion
- [ ] Codebook display and export

### Phase 2: Analysis Features (Months 4-5)

**Milestone 2.1: Notes & Queries (Weeks 13-16)**
- [ ] Note creation and rich text editing
- [ ] Note linking to codes, documents, segments
- [ ] Basic code queries (retrieve all segments)
- [ ] Boolean query operations
- [ ] Query results export

**Milestone 2.2: Visualization (Weeks 17-20)**
- [ ] Code frequency charts
- [ ] Code hierarchy visualization
- [ ] Code × document matrix view

### Phase 3: Collaboration (Months 6-7)

**Milestone 3.1: Multi-User Support (Weeks 21-24)**
- [ ] Multi-user sync detection
- [ ] Merge logic implementation
- [ ] Conflict detection
- [ ] Activity log

**Milestone 3.2: Collaboration Polish (Weeks 25-28)**
- [ ] Conflict resolution UI
- [ ] User presence indicators
- [ ] IRR calculation (Cohen's Kappa)
- [ ] Disagreement reports

### Phase 4: Polish & Advanced Features (Months 8-10)

**Milestone 4.1: Enhanced Analysis (Weeks 29-32)**
- [ ] Matrix coding queries
- [ ] Code co-occurrence queries
- [ ] Word frequency analysis
- [ ] Advanced IRR (Krippendorff's Alpha)

**Milestone 4.2: Quality of Life (Weeks 33-36)**
- [ ] Keyboard shortcuts throughout
- [ ] Quick code search
- [ ] Full-text document search
- [ ] Teams transcript support
- [ ] Export polish (better formats)

**Milestone 4.3: Hardening (Weeks 37-40)**
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Browser compatibility testing
- [ ] Documentation and help system
- [ ] Error handling and recovery

### Future Considerations (Post-1.0)
- Audio/video integration
- Plugin/extension system
- DOC file support
- Network diagram visualization
- AI-assisted coding suggestions (opt-in, local models)
- Mobile companion app (read-only)

---

## 11. Appendices

### Appendix A: Transcript Format Specifications

#### Zoom VTT Format
```vtt
WEBVTT

1
00:00:05.000 --> 00:00:08.500
Sarah Chen: Welcome everyone to today's focus group.

2
00:00:09.200 --> 00:00:15.800
Sarah Chen: Before we begin, I'd like to go around and have
everyone introduce themselves.

3
00:00:16.500 --> 00:00:22.100
P001: Hi, I'm participant one. I've been using the
service for about two years.
```

#### Zoom JSON Format
```json
{
  "recording_id": "abc123",
  "meeting_topic": "Focus Group Session 1",
  "timeline": [
    {
      "speaker_name": "Sarah Chen",
      "speaker_id": 12345,
      "start_time": 5000,
      "end_time": 8500,
      "text": "Welcome everyone to today's focus group."
    }
  ]
}
```

#### Teams DOCX Transcript
```
0:0:5.0 --> 0:0:8.5
Sarah Chen
Welcome everyone to today's focus group.

0:0:9.2 --> 0:0:15.8
Sarah Chen
Before we begin, I'd like to go around and have everyone introduce themselves.
```

### Appendix B: Codebook Export Format (CSV)
```csv
Code ID,Code Name,Parent,Description,Color,Created,Created By,Segment Count
code-uuid-1,Barriers to Access,,Mentions of obstacles...,#E63946,2025-01-15,Sarah,45
code-uuid-2,Financial Barriers,Barriers to Access,Cost-related obstacles,#E63946,2025-01-15,Sarah,18
code-uuid-3,Transportation Barriers,Barriers to Access,Travel-related obstacles,#E63946,2025-01-16,Marcus,12
```

### Appendix C: Query Results Export Format
```csv
Query,Executed,Code(s),Operator,Document Filter,Results Count
Financial barriers query,2025-01-20T14:30:00Z,"Financial Barriers",N/A,All documents,18

Segment ID,Document,Page/Location,Speaker,Text,Coded By,Coded At
seg-uuid-1,Interview P001,Page 3,N/A,"I couldn't afford the copay...",Sarah,2025-01-16
seg-uuid-2,Interview P002,Page 5,N/A,"The medication costs are...",Marcus,2025-01-17
```

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Code** | A label applied to segments of text representing a concept, theme, or category |
| **Codebook** | The complete set of codes with their definitions and hierarchy |
| **Coding** | The process of applying codes to text segments |
| **Segment** | A portion of text that has been coded |
| **Note** | A researcher's annotation about codes, data, or analysis |
| **Thematic Analysis (TA)** | A method for identifying and analyzing patterns in qualitative data |
| **Inter-Rater Reliability (IRR)** | Statistical measure of agreement between coders |
| **Cohen's Kappa** | Statistical measure of inter-rater reliability for two coders |
| **Krippendorff's Alpha** | Statistical measure of inter-rater reliability for multiple coders |

---

## 12. Open Questions

1. **DOC support**: Worth the complexity of parsing legacy .doc format, or simply recommend users convert to DOCX?

2. **Maximum scale**: Should we set explicit limits (e.g., max 50 documents, max 500 pages per document) to ensure performance?

3. **Localization**: Plan for internationalization from the start, or add later?

4. **Accessibility**: Target WCAG 2.1 AA from MVP, or focus on functionality first?

5. **Distribution**: 
   - Single HTML file (maximum portability)?
   - GitHub Pages hosting?
   - Downloadable package for fully offline use?

6. **Naming**: "Koali" confirmed, or open to alternatives?

---

*End of specification document*
