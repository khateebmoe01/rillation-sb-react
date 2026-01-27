// WebSocket connection
let ws = null
let reconnectInterval = null

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('Connected to automation server')
    addLog('info', 'Connected to server')
    clearInterval(reconnectInterval)
  }

  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data)
      handleMessage(type, data)
    } catch (err) {
      console.error('Invalid message:', err)
    }
  }

  ws.onclose = () => {
    console.log('Disconnected from server')
    addLog('warning', 'Disconnected from server, reconnecting...')
    reconnectInterval = setInterval(() => {
      console.log('Attempting to reconnect...')
      connect()
    }, 3000)
  }

  ws.onerror = (err) => {
    console.error('WebSocket error:', err)
  }
}

function handleMessage(type, data) {
  switch (type) {
    case 'init':
      updateStatus(data)
      break
    case 'status':
      updateCurrentStep(data)
      if (typeof data === 'string') {
        addLog('status', data)
      }
      break
    case 'progress':
      updateProgress(data.percent)
      if (data.message) {
        addLog('status', data.message)
      }
      break
    case 'log':
      addLog(data.level, data.message)
      break
    case 'success':
      addLog('success', typeof data === 'string' ? data : JSON.stringify(data))
      break
    case 'error':
      addLog('error', typeof data === 'string' ? data : JSON.stringify(data))
      updateStatus({ status: 'failed' })
      break
    case 'workflow-start':
      updateStatus({ status: 'running', currentWorkflow: data.workflow })
      addLog('status', `Starting workflow: ${data.workflow}`)
      break
    case 'workflow-complete':
      updateStatus({ status: 'completed' })
      addLog('success', 'Workflow completed!')
      enableControls()
      break
    case 'workflow-error':
      updateStatus({ status: 'failed' })
      addLog('error', `Workflow failed: ${data.error}`)
      enableControls()
      break
  }
}

function updateStatus(data) {
  const badge = document.getElementById('status-badge')
  const status = data.status || 'idle'

  badge.textContent = status.charAt(0).toUpperCase() + status.slice(1)
  badge.className = `status-badge ${status}`

  if (data.currentWorkflow) {
    document.getElementById('current-step').textContent = `Workflow: ${data.currentWorkflow}`
  }

  if (data.progress !== undefined) {
    updateProgress(data.progress)
  }

  // Update button states
  if (status === 'running') {
    document.getElementById('start-btn').disabled = true
    document.getElementById('pause-btn').disabled = false
    document.getElementById('resume-btn').disabled = true
    document.getElementById('pipeline-btn').disabled = true
  } else if (status === 'paused') {
    document.getElementById('start-btn').disabled = true
    document.getElementById('pause-btn').disabled = true
    document.getElementById('resume-btn').disabled = false
    document.getElementById('pipeline-btn').disabled = true
  } else {
    enableControls()
  }
}

function enableControls() {
  document.getElementById('start-btn').disabled = false
  document.getElementById('pause-btn').disabled = true
  document.getElementById('resume-btn').disabled = true
  document.getElementById('pipeline-btn').disabled = false
}

function updateCurrentStep(step) {
  if (typeof step === 'string') {
    document.getElementById('current-step').textContent = step
  }
}

function updateProgress(percent) {
  document.getElementById('progress-fill').style.width = `${percent}%`
  document.getElementById('progress-text').textContent = `${percent}%`
}

function addLog(level, message) {
  const container = document.getElementById('log-container')
  const entry = document.createElement('div')
  entry.className = `log-entry log-${level}`

  const time = new Date().toLocaleTimeString()
  entry.innerHTML = `<span class="log-time">[${time}]</span>${escapeHtml(message)}`

  container.appendChild(entry)

  // Auto-scroll if enabled
  const autoScroll = document.getElementById('auto-scroll').checked
  if (autoScroll) {
    container.scrollTop = container.scrollHeight
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// API calls
async function startWorkflow() {
  const workflow = document.getElementById('workflow-select').value
  const input = getWorkflowInput(workflow)

  try {
    const response = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, input }),
    })

    const result = await response.json()
    if (!result.success) {
      addLog('error', result.error || 'Failed to start workflow')
    }
  } catch (err) {
    addLog('error', `Failed to start workflow: ${err.message}`)
  }
}

async function pauseWorkflow() {
  try {
    await fetch('/api/pause', { method: 'POST' })
  } catch (err) {
    addLog('error', `Failed to pause: ${err.message}`)
  }
}

async function resumeWorkflow() {
  try {
    await fetch('/api/resume', { method: 'POST' })
  } catch (err) {
    addLog('error', `Failed to resume: ${err.message}`)
  }
}

async function runPipeline() {
  const tableName = document.getElementById('pipeline-table-name').value
  const csvPath = document.getElementById('pipeline-csv-path').value
  const enrichmentType = document.getElementById('pipeline-enrichment-type').value

  if (!tableName || !csvPath) {
    addLog('error', 'Please fill in table name and CSV path')
    return
  }

  try {
    const response = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableName, csvPath, enrichmentType }),
    })

    const result = await response.json()
    if (!result.success) {
      addLog('error', result.error || 'Failed to start pipeline')
    }
  } catch (err) {
    addLog('error', `Failed to start pipeline: ${err.message}`)
  }
}

function getWorkflowInput(workflow) {
  // Get input based on selected workflow
  // This would be enhanced with dynamic input fields
  const input = {}

  switch (workflow) {
    case 'createTable':
      input.tableName = prompt('Enter table name:') || 'New Table'
      break
    case 'uploadCSV':
      input.filePath = prompt('Enter CSV file path:')
      input.tableId = prompt('Enter table ID:')
      break
    case 'addEnrichment':
      input.tableId = prompt('Enter table ID:')
      input.enrichmentConfig = {
        type: prompt('Enter enrichment type (apollo_person, clearbit_person, etc.):'),
        columnName: prompt('Enter column name:'),
        sourceColumn: prompt('Enter source column name:'),
      }
      break
    // Add more workflow-specific inputs as needed
  }

  return input
}

function clearLogs() {
  document.getElementById('log-container').innerHTML = ''
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startWorkflow)
document.getElementById('pause-btn').addEventListener('click', pauseWorkflow)
document.getElementById('resume-btn').addEventListener('click', resumeWorkflow)
document.getElementById('pipeline-btn').addEventListener('click', runPipeline)
document.getElementById('clear-logs-btn').addEventListener('click', clearLogs)

// Initialize
connect()

// Fetch initial status
fetch('/api/status')
  .then((res) => res.json())
  .then((data) => updateStatus(data))
  .catch((err) => console.error('Failed to fetch status:', err))
