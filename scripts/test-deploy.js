const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

/**
 * Test script to verify the deployment flow in MOCK_MODE.
 * It creates a project, triggers a deployment, and polls for logs.
 */
async function runTest() {
  console.log('\n🧪 Starting Deployment Flow Test...');
  console.log('------------------------------------');

  try {
    // 1. Check if backend is alive
    console.log('🔍 Checking backend connectivity...');
    const healthRes = await fetch(`${BACKEND_URL.replace('/api', '')}/health`).catch(() => null);
    if (!healthRes || !healthRes.ok) {
      throw new Error(`Backend not found at ${BACKEND_URL}. Please run "npm run dev" first.`);
    }
    console.log('✅ Backend is online.\n');

    // 2. Create a test project
    const projectName = `test-app-${Math.random().toString(36).substr(2, 5)}`;
    console.log(`🏗️  Creating project: ${projectName}...`);
    const projectRes = await fetch(`${BACKEND_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        gitUrl: `https://github.com/example/${projectName}`,
        subdomain: projectName
      })
    });
    
    if (!projectRes.ok) throw new Error('Failed to create project');
    const project = await projectRes.json();
    console.log(`✅ Project created with ID: ${project._id}\n`);

    // 3. Trigger deployment
    console.log('🚀 Triggering deployment...');
    const deployRes = await fetch(`${BACKEND_URL}/deployments/${project._id}`, {
      method: 'POST'
    });
    
    if (!deployRes.ok) throw new Error('Failed to trigger deployment');
    const deployment = await deployRes.json();
    console.log(`✅ Deployment started (ID: ${deployment._id})\n`);

    // 4. Poll for logs and status
    console.log('📋 Monitoring deployment logs:');
    let status = 'pending';
    let seenLogs = 0;
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds timeout

    while (status !== 'deployed') {
      if (Date.now() - startTime > timeout) {
        throw new Error('Test timed out after 60s');
      }

      const logsRes = await fetch(`${BACKEND_URL}/deployments/${project._id}`);
      const deployments = await logsRes.json();
      const currentDep = deployments.find(d => d._id === deployment._id);
      
      if (currentDep) {
        status = currentDep.status;
        
        // Print new logs
        if (currentDep.logs && currentDep.logs.length > seenLogs) {
          for (let i = seenLogs; i < currentDep.logs.length; i++) {
            const log = currentDep.logs[i];
            const time = new Date(log.timestamp).toLocaleTimeString();
            console.log(`   [${time}] ${log.message}`);
          }
          seenLogs = currentDep.logs.length;
        }

        if (status === 'failed') {
          throw new Error('Deployment failed!');
        }
      }
      
      if (status !== 'deployed') {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('\n✨ TEST PASSED: Application successfully deployed!');
    console.log(`🔗 Deployment URL: ${deployment.url || 'N/A'}`);
    console.log('------------------------------------\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

runTest();
