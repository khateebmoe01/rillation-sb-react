// Centralized Clay.com UI selectors - Updated based on actual UI testing
// Last updated: 2026-01-26

export const ClaySelectors = {
  // Login page
  login: {
    emailInput: 'input[type="email"], input[name="email"]',
    passwordInput: 'input[type="password"]',
    loginButton: 'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")',
    googleLogin: 'button:has-text("Google"), [data-provider="google"]',
  },

  // Home / Workspace list
  home: {
    searchInput: 'input[placeholder*="Search"]',
    newButton: 'button:has-text("New"), button:has-text("+ New")',
    newWorkbookOption: 'text=Workbook',
    newFolderOption: 'text=Folder',
    workspaceList: '[class*="files"], [class*="workspace"]',
    workspaceItem: '[class*="file-row"], tr:has(td)',
    allFilesTab: 'text=All files, button:has-text("All files")',
    recentsTab: 'text=Recents',
    favoritesTab: 'text=Favorites',
  },

  // Workbook editor (main canvas)
  workbook: {
    title: 'input[value*="Untitled"], input[placeholder*="workbook"], [contenteditable="true"]',
    titleInput: 'input[value="Untitled workbook"]',
    settingsButton: 'text=Workbook settings, button:has-text("settings")',
    descriptionInput: 'textarea[placeholder*="describe"]',
    canvas: '[class*="canvas"], [class*="grid"]',
    overviewTab: 'text=Overview, button:has-text("Overview")',
    addButton: 'button:has-text("Add"), button:has-text("+ Add")',
  },

  // Left sidebar - Create panel
  createPanel: {
    panel: '[class*="sidebar"], [class*="create"]',
    collapseButton: '[class*="collapse"]',

    // Sources section
    sourcesHeader: 'text=Sources',
    findPeople: 'text=Find people',
    findCompanies: 'text=Find companies',
    findJobs: 'text=Find jobs',
    findLocalBusinesses: 'text=Find local businesses',
    importFromCSV: 'text=Import from CSV',
    importFromCRM: 'text=Import from CRM',
    allSources: 'text=All sources',

    // Tables section
    tablesHeader: 'text=Tables',
    blankTable: 'text=Blank table',
    useTemplate: 'text=Use a template',

    // Signals section
    signalsHeader: 'text=Signals',
    jobChange: 'text=Job change',
    newsFundraising: 'text=News & fundraising',
    newHire: 'text=New hire',
    jobPosting: 'text=Job posting',
  },

  // Table view (inside workbook)
  table: {
    container: '[class*="table"], [role="grid"], [class*="spreadsheet"]',
    headerRow: '[class*="header"], thead tr, [role="row"]:first-child',
    columnHeader: 'th, [role="columnheader"]',
    row: 'tr, [role="row"]',
    cell: 'td, [role="cell"], [role="gridcell"]',
    addColumnButton: 'button:has-text("Add column"), button:has-text("+"), [class*="add-column"]',
    addRowButton: 'button:has-text("Add row"), [class*="add-row"]',
    columnMenu: '[class*="column-menu"], [role="menu"]',
  },

  // CSV Import modal
  csvImport: {
    modal: '[role="dialog"], [class*="modal"]',
    dropzone: '[class*="dropzone"], [class*="upload-area"], [class*="drop"]',
    fileInput: 'input[type="file"]',
    browseButton: 'button:has-text("Browse"), button:has-text("Choose"), button:has-text("Select")',
    fileName: '[class*="file-name"]',
    previewTable: '[class*="preview"], table',
    columnMapping: '[class*="mapping"]',
    importButton: 'button:has-text("Import"), button:has-text("Upload"), button:has-text("Add")',
    cancelButton: 'button:has-text("Cancel")',
    progressBar: '[role="progressbar"], [class*="progress"]',
  },

  // Add column / Enrichment panel
  addColumn: {
    panel: '[class*="column-config"], [class*="enrichment"], [role="dialog"]',
    searchInput: 'input[placeholder*="Search"], input[type="search"]',

    // Column types
    textColumn: 'text=Text',
    numberColumn: 'text=Number',
    enrichmentColumn: 'text=Enrichment',
    formulaColumn: 'text=Formula',
    aiColumn: 'text=AI, text=GPT, text=Generate',

    // Enrichment options (from Clay's "Find people", etc.)
    apolloEnrichment: 'text=Apollo, text=Find person',
    clearbitEnrichment: 'text=Clearbit, text=Enrich',
    emailFinder: 'text=Find email, text=Email finder',
    phoneFinder: 'text=Find phone, text=Phone finder',
    linkedinEnrichment: 'text=LinkedIn',
    companyEnrichment: 'text=Find company, text=Company',

    // Configuration
    columnNameInput: 'input[placeholder*="name"], input[name="name"], input[name="columnName"]',
    sourceColumnSelect: 'select, [class*="select"], [role="combobox"]',
    saveButton: 'button:has-text("Add"), button:has-text("Save"), button:has-text("Create")',
    cancelButton: 'button:has-text("Cancel")',
  },

  // AI Prompt configuration
  aiPrompt: {
    promptTextarea: 'textarea[placeholder*="prompt"], textarea[name="prompt"], textarea',
    modelSelect: 'select[name="model"], [class*="model-select"]',
    sourceColumnsSelect: '[class*="source-columns"], [class*="variable"]',
    previewButton: 'button:has-text("Preview"), button:has-text("Test")',
    previewOutput: '[class*="preview-output"], [class*="result"]',
  },

  // Run / Enrichment controls
  runControls: {
    runButton: 'button:has-text("Run"), button:has-text("Enrich"), button:has-text("Start")',
    runAllButton: 'button:has-text("Run all")',
    pauseButton: 'button:has-text("Pause")',
    stopButton: 'button:has-text("Stop")',
    progressIndicator: '[class*="progress"], [role="progressbar"]',
    statusText: '[class*="status"]',
    rowCount: '[class*="row-count"], [class*="count"]',
  },

  // Export
  export: {
    exportButton: 'button:has-text("Export"), button:has-text("Download")',
    exportModal: '[role="dialog"]:has-text("Export")',
    formatSelect: 'select[name="format"]',
    csvOption: 'text=CSV',
    jsonOption: 'text=JSON',
    downloadButton: 'button:has-text("Download"), a[download]',
  },

  // Common elements
  common: {
    loading: '[class*="loading"], [class*="spinner"], [class*="skeleton"]',
    modal: '[role="dialog"], [class*="modal"]',
    modalClose: 'button[aria-label="Close"], [class*="close"]',
    toast: '[class*="toast"], [role="alert"]',
    dropdown: '[role="listbox"], [role="menu"], [class*="dropdown"]',
    dropdownItem: '[role="option"], [role="menuitem"]',
    confirmButton: 'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")',
    deleteButton: 'button:has-text("Delete")',
    tooltip: '[role="tooltip"], [class*="tooltip"]',
  },

  // Navigation
  nav: {
    home: 'text=Home, a[href*="home"]',
    signals: 'text=Signals',
    campaigns: 'text=Campaigns',
    claygents: 'text=Claygents',
    exports: 'text=Exports',
    trash: 'text=Trash',
    settings: 'text=Settings',
    resources: 'text=Resources',
  },
}

// Helper to get all selectors as flat object for testing
export function getAllSelectors(): Record<string, string> {
  const all: Record<string, string> = {}

  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'string') {
        all[path] = value
      } else if (typeof value === 'object' && value !== null) {
        flatten(value as Record<string, unknown>, path)
      }
    }
  }

  flatten(ClaySelectors)
  return all
}

export default ClaySelectors
