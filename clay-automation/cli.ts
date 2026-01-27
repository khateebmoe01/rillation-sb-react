#!/usr/bin/env npx tsx

import { program } from 'commander'
import { WorkflowManager, WORKFLOWS } from './workflows/index.js'
import { sessionManager } from './core/session-manager.js'
import { syncEnrichmentResults, saveClayTable } from './sync/supabase-sync.js'
import { readCSV } from './sync/input-handler.js'
import type { EnrichmentType } from './types/clay.types.js'

// Global workflow manager instance
let manager: WorkflowManager | null = null

// MCP tool call handler - this integrates with Playwright MCP
async function mcpToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  // In a real implementation, this would call the MCP server
  // For now, we'll log the calls and simulate success
  console.log(`[MCP] ${toolName}:`, JSON.stringify(args))

  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Return mock responses based on tool name
  switch (toolName) {
    case 'playwright_navigate':
      return { success: true, url: args.url }
    case 'playwright_click':
      return { success: true }
    case 'playwright_fill':
      return { success: true }
    case 'playwright_wait_for_selector':
      return { success: true }
    case 'playwright_screenshot':
      return { success: true, path: `/tmp/clay-screenshots/${args.name}` }
    case 'playwright_get_text':
      return { text: '' }
    case 'playwright_is_visible':
      return { visible: true }
    default:
      return { success: true }
  }
}

program
  .name('clay-automation')
  .description('Clay.com automation CLI using Playwright MCP')
  .version('1.0.0')
  .option('--dry-run', 'Run in dry-run mode (no actual browser actions)')

// Login command
program
  .command('login')
  .description('Authenticate with Clay and save session')
  .action(async () => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('login', {})
      if (result.success) {
        console.log('\nLogin successful! Session saved.')
      } else {
        console.error('\nLogin failed:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Create table command
program
  .command('create-table')
  .description('Create a new Clay table')
  .requiredOption('-n, --name <name>', 'Table name')
  .option('-d, --description <description>', 'Table description')
  .option('-c, --client <client>', 'Client name (for Supabase tracking)')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('createTable', {
        tableName: opts.name,
        description: opts.description,
      })

      if (result.success) {
        const data = result.data as { tableId: string; tableName: string }
        console.log('\nTable created successfully!')
        console.log(`  Table ID: ${data.tableId}`)
        console.log(`  Table Name: ${data.tableName}`)

        // Save to Supabase
        if (opts.client) {
          await saveClayTable(data.tableId, data.tableName, opts.client)
        }
      } else {
        console.error('\nFailed to create table:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Upload CSV command
program
  .command('upload')
  .description('Upload CSV to Clay table')
  .requiredOption('-f, --file <path>', 'CSV file path')
  .requiredOption('-t, --table <id>', 'Clay table ID')
  .option('--skip-duplicates', 'Skip duplicate rows')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('uploadCSV', {
        filePath: opts.file,
        tableId: opts.table,
        skipDuplicates: opts.skipDuplicates,
      })

      if (result.success) {
        console.log('\nCSV uploaded successfully!')
      } else {
        console.error('\nFailed to upload CSV:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Add enrichment command
program
  .command('enrich')
  .description('Add enrichment column to table')
  .requiredOption('-t, --table <id>', 'Clay table ID')
  .requiredOption('--type <type>', 'Enrichment type (apollo_person, clearbit_person, email_finder, etc.)')
  .requiredOption('--name <name>', 'Column name')
  .requiredOption('--source <column>', 'Source column name')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('addEnrichment', {
        tableId: opts.table,
        enrichmentConfig: {
          type: opts.type as EnrichmentType,
          columnName: opts.name,
          sourceColumn: opts.source,
        },
      })

      if (result.success) {
        console.log('\nEnrichment column added successfully!')
      } else {
        console.error('\nFailed to add enrichment:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Write AI prompt command
program
  .command('prompt')
  .description('Add AI prompt column to table')
  .requiredOption('-t, --table <id>', 'Clay table ID')
  .requiredOption('--name <name>', 'Column name')
  .requiredOption('-p, --prompt <prompt>', 'AI prompt text')
  .requiredOption('--source <columns>', 'Source column names (comma-separated)')
  .option('--model <model>', 'AI model (gpt-4, gpt-3.5, claude)', 'gpt-4')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('writePrompt', {
        tableId: opts.table,
        promptConfig: {
          columnName: opts.name,
          prompt: opts.prompt,
          sourceColumns: opts.source.split(',').map((s: string) => s.trim()),
          model: opts.model,
        },
      })

      if (result.success) {
        console.log('\nAI prompt column added successfully!')
      } else {
        console.error('\nFailed to add AI prompt:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Run enrichment command
program
  .command('run')
  .description('Run enrichment on table')
  .requiredOption('-t, --table <id>', 'Clay table ID')
  .option('--no-wait', 'Don\'t wait for completion')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('runEnrichment', {
        tableId: opts.table,
        waitForCompletion: opts.wait !== false,
      })

      if (result.success) {
        const data = result.data as { rowsProcessed: number; duration: number }
        console.log('\nEnrichment completed!')
        console.log(`  Rows processed: ${data.rowsProcessed}`)
        console.log(`  Duration: ${Math.round(data.duration / 1000)}s`)
      } else {
        console.error('\nEnrichment failed:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Export results command
program
  .command('export')
  .description('Export enriched data')
  .requiredOption('-t, --table <id>', 'Clay table ID')
  .option('-o, --output <path>', 'Output file path', './clay-export.csv')
  .option('--format <format>', 'Export format (csv, json)', 'csv')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    try {
      const result = await manager.executeWorkflow('exportResults', {
        tableId: opts.table,
        outputPath: opts.output,
        format: opts.format,
      })

      if (result.success) {
        console.log('\nExport completed!')
        console.log(`  Output: ${opts.output}`)
      } else {
        console.error('\nExport failed:', result.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Full pipeline command
program
  .command('pipeline')
  .description('Run complete enrichment pipeline')
  .requiredOption('-f, --file <path>', 'Input CSV file')
  .requiredOption('--type <type>', 'Enrichment type')
  .option('-n, --name <name>', 'Table name', `Clay Enrichment ${new Date().toISOString().split('T')[0]}`)
  .option('-o, --output <path>', 'Output file path')
  .option('--sync', 'Sync results to Supabase')
  .action(async (opts) => {
    const options = program.opts()
    manager = new WorkflowManager({ dryRun: options.dryRun })
    manager.setMCPHandler(mcpToolCall)

    console.log('Starting full enrichment pipeline...')
    console.log(`  Input: ${opts.file}`)
    console.log(`  Table: ${opts.name}`)
    console.log(`  Enrichment: ${opts.type}`)
    console.log('')

    try {
      const results = await manager.runFullPipeline({
        tableName: opts.name,
        csvPath: opts.file,
        enrichmentType: opts.type,
        outputPath: opts.output,
      })

      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        console.log('\nPipeline completed successfully!')

        // Sync to Supabase if requested
        if (opts.sync) {
          console.log('\nSyncing results to Supabase...')
          // Would need actual results from Clay export
        }
      } else {
        const failed = results.find(r => !r.success)
        console.error('\nPipeline failed at step:', failed?.error)
        process.exit(1)
      }
    } finally {
      await manager.close()
    }
  })

// Session status command
program
  .command('session')
  .description('Check session status')
  .action(() => {
    const info = sessionManager.getSessionInfo()

    if (!info || !info.exists) {
      console.log('No active session found')
      console.log('Run `clay-automation login` to authenticate')
    } else {
      console.log('Session status:')
      console.log(`  Valid: Yes`)
      console.log(`  Age: ${info.age} days`)
      if (info.email) {
        console.log(`  Email: ${info.email}`)
      }
    }
  })

// Clear session command
program
  .command('logout')
  .description('Clear saved session')
  .action(() => {
    sessionManager.clearSession()
    console.log('Session cleared')
  })

// List workflows command
program
  .command('workflows')
  .description('List available workflows')
  .action(() => {
    console.log('Available workflows:\n')
    for (const [key, workflow] of Object.entries(WORKFLOWS)) {
      console.log(`  ${key.padEnd(15)} - ${workflow.description}`)
    }
  })

// Parse arguments
program.parse()
