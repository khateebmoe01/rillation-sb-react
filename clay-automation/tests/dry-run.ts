// Dry-run test for workflow execution
// Tests workflow logic without making actual browser calls

import { WorkflowManager, WORKFLOWS } from '../workflows/index.js'

async function runDryRunTests(): Promise<void> {
  console.log('Clay Automation Dry-Run Tests')
  console.log('='.repeat(60))
  console.log('')

  const manager = new WorkflowManager({ dryRun: true })

  // Mock MCP handler
  manager.setMCPHandler(async (toolName, args) => {
    console.log(`  [DRY] ${toolName}: ${JSON.stringify(args).slice(0, 50)}...`)
    await new Promise(resolve => setTimeout(resolve, 100))
    return { success: true, visible: true, text: 'mock text' }
  })

  const tests = [
    {
      workflow: 'createTable',
      input: { tableName: 'Test Table', description: 'A test table' },
    },
    {
      workflow: 'uploadCSV',
      input: { filePath: '/tmp/test.csv', tableId: 'test-123' },
    },
    {
      workflow: 'addEnrichment',
      input: {
        tableId: 'test-123',
        enrichmentConfig: {
          type: 'apollo_person',
          columnName: 'Apollo Data',
          sourceColumn: 'email',
        },
      },
    },
    {
      workflow: 'writePrompt',
      input: {
        tableId: 'test-123',
        promptConfig: {
          columnName: 'AI Summary',
          prompt: 'Summarize this person\'s background',
          sourceColumns: ['name', 'company', 'title'],
        },
      },
    },
    {
      workflow: 'runEnrichment',
      input: { tableId: 'test-123', waitForCompletion: false },
    },
    {
      workflow: 'exportResults',
      input: { tableId: 'test-123', outputPath: '/tmp/export.csv', format: 'csv' },
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`\nTesting: ${test.workflow}`)
    console.log('-'.repeat(40))

    try {
      const result = await manager.executeWorkflow(test.workflow, test.input)

      if (result.success) {
        console.log(`  PASS (${result.duration}ms)`)
        passed++
      } else {
        console.log(`  FAIL: ${result.error}`)
        failed++
      }
    } catch (error) {
      console.log(`  ERROR: ${(error as Error).message}`)
      failed++
    }
  }

  await manager.close()

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`  Passed: ${passed}/${tests.length}`)
  console.log(`  Failed: ${failed}/${tests.length}`)
  console.log('')

  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
runDryRunTests().catch(console.error)
