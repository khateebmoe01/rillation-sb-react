import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

import { WorkflowManager, WORKFLOWS } from './workflows/index.js'
import { EnvConfig } from './config/env.config.js'
import type { WSBroadcast, APIStartRequest, APIStatusResponse, APIResponse } from './types/webapp.types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Workflow manager instance
const workflowManager = new WorkflowManager()

// Track connected clients
const clients = new Set<WebSocket>()

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'webapp', 'public')))

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Broadcast to all connected WebSocket clients
function broadcast(event: Omit<WSBroadcast, 'timestamp'>): void {
  const message: WSBroadcast = {
    ...event,
    timestamp: new Date().toISOString(),
  }
  const json = JSON.stringify(message)

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json)
    }
  }
}

// Connect workflow manager events to WebSocket broadcasts
workflowManager.getLogger().addEventListener((event) => {
  broadcast({
    type: event.type,
    data: event.data,
  })
})

// REST API Routes

// Get current status
app.get('/api/status', (req, res) => {
  const state = workflowManager.getStatus()
  const response: APIStatusResponse = {
    status: state.status,
    currentWorkflow: state.currentWorkflow,
    currentStep: state.currentStep,
    progress: state.progress,
    startTime: state.startTime?.toISOString() || null,
    logsCount: state.logs.length,
  }
  res.json(response)
})

// Get available workflows
app.get('/api/workflows', (req, res) => {
  const workflows = Object.entries(WORKFLOWS).map(([key, workflow]) => ({
    id: key,
    name: workflow.name,
    description: workflow.description,
  }))
  res.json(workflows)
})

// Get recent logs
app.get('/api/logs', (req, res) => {
  const count = parseInt(req.query.count as string) || 50
  const logs = workflowManager.getLogger().getRecentLogs(count)
  res.json(logs)
})

// Start a workflow
app.post('/api/start', async (req, res) => {
  const { workflow, input } = req.body as APIStartRequest

  if (!WORKFLOWS[workflow]) {
    return res.status(400).json({
      success: false,
      error: `Unknown workflow: ${workflow}`,
    } as APIResponse)
  }

  const state = workflowManager.getStatus()
  if (state.status === 'running') {
    return res.status(400).json({
      success: false,
      error: 'A workflow is already running',
    } as APIResponse)
  }

  // Start workflow in background
  workflowManager
    .executeWorkflow(workflow, input || {})
    .then((result) => {
      broadcast({ type: 'workflow-complete', data: result })
    })
    .catch((error) => {
      broadcast({ type: 'error', data: error.message })
    })

  res.json({ success: true, message: 'Workflow started' } as APIResponse)
})

// Pause workflow
app.post('/api/pause', (req, res) => {
  workflowManager.pause()
  broadcast({ type: 'status', data: 'paused' })
  res.json({ success: true } as APIResponse)
})

// Resume workflow
app.post('/api/resume', (req, res) => {
  workflowManager.resume()
  broadcast({ type: 'status', data: 'resumed' })
  res.json({ success: true } as APIResponse)
})

// Run full pipeline
app.post('/api/pipeline', async (req, res) => {
  const { tableName, csvPath, enrichmentType, outputPath } = req.body

  if (!tableName || !csvPath || !enrichmentType) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: tableName, csvPath, enrichmentType',
    } as APIResponse)
  }

  const state = workflowManager.getStatus()
  if (state.status === 'running') {
    return res.status(400).json({
      success: false,
      error: 'A workflow is already running',
    } as APIResponse)
  }

  // Start pipeline in background
  workflowManager
    .runFullPipeline({ tableName, csvPath, enrichmentType, outputPath })
    .then((results) => {
      broadcast({ type: 'workflow-complete', data: results })
    })
    .catch((error) => {
      broadcast({ type: 'error', data: error.message })
    })

  res.json({ success: true, message: 'Pipeline started' } as APIResponse)
})

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket')
  clients.add(ws)

  // Send initial state
  const state = workflowManager.getStatus()
  ws.send(
    JSON.stringify({
      type: 'init',
      data: state,
      timestamp: new Date().toISOString(),
    } as WSBroadcast)
  )

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const { type, payload } = JSON.parse(message.toString())

      switch (type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', data: null, timestamp: new Date().toISOString() }))
          break
      }
    } catch (err) {
      console.error('Invalid WebSocket message:', err)
    }
  })

  ws.on('close', () => {
    console.log('Client disconnected')
    clients.delete(ws)
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
    clients.delete(ws)
  })
})

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'webapp', 'public', 'index.html'))
})

// Start server
const PORT = EnvConfig.webapp.port

server.listen(PORT, () => {
  console.log('═'.repeat(60))
  console.log('  Clay Automation Server')
  console.log('═'.repeat(60))
  console.log(`  Web UI:     http://localhost:${PORT}`)
  console.log(`  API:        http://localhost:${PORT}/api`)
  console.log(`  WebSocket:  ws://localhost:${PORT}`)
  console.log('═'.repeat(60))
  console.log('')
  console.log('Available endpoints:')
  console.log('  GET  /api/status     - Get current workflow status')
  console.log('  GET  /api/workflows  - List available workflows')
  console.log('  GET  /api/logs       - Get recent logs')
  console.log('  POST /api/start      - Start a workflow')
  console.log('  POST /api/pause      - Pause current workflow')
  console.log('  POST /api/resume     - Resume paused workflow')
  console.log('  POST /api/pipeline   - Run full enrichment pipeline')
  console.log('')
})

export { app, server, wss, broadcast }
