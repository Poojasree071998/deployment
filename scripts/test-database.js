const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000/api';

/**
 * Test script to verify the "Mongo-by-Me" provisioning flow.
 * It creates a database instance and polls the API until it's ready.
 */
async function runDatabaseTest() {
  console.log('\n🧪 Starting Database Provisioning Test...');
  console.log('-----------------------------------------');

  try {
    // 1. Check if backend is alive
    console.log('🔍 Checking backend connectivity...');
    const healthRes = await fetch(`${BACKEND_URL.replace('/api', '')}/health`).catch(() => null);
    if (!healthRes || !healthRes.ok) {
      throw new Error(`Backend not found at ${BACKEND_URL}. Please run "npm run dev" first.`);
    }
    console.log('✅ Backend is online.\n');

    // 2. Create a test database
    const dbName = `test-db-${Math.random().toString(36).substr(2, 5)}`;
    console.log(`🏗️  Creating database: ${dbName}...`);
    const dbRes = await fetch(`${BACKEND_URL}/databases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dbName,
        type: 'mongodb'
      })
    });
    
    if (!dbRes.ok) {
      const errorData = await dbRes.json();
      throw new Error(`Failed to create database record: ${errorData.error || dbRes.statusText}`);
    }

    const db = await dbRes.json();
    console.log(`✅ Database record created with ID: ${db._id}`);
    console.log(`⏳ Initial Status: ${db.status}\n`);

    // 3. Poll for status
    console.log('📋 Monitoring provisioning status:');
    let status = 'creating';
    let currentDB = null;
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds timeout

    while (status === 'creating') {
      if (Date.now() - startTime > timeout) {
        throw new Error('Test timed out after 60s');
      }

      const statusRes = await fetch(`${BACKEND_URL}/databases`);
      const databases = await statusRes.json();
      currentDB = databases.find(d => d._id === db._id);
      
      if (currentDB) {
        status = currentDB.status;
        process.stdout.write(`\r   Current Status: ${status.toUpperCase()}... `);
        
        if (status === 'failed') {
          console.log('\n');
          throw new Error('Provisioning failed in the backend.');
        }
      }
      
      if (status === 'creating') {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('\n\n✨ TEST PASSED: Database successfully provisioned!');
    console.log(`🔗 Connection String: ${currentDB.connectionString}`);
    console.log(`🔌 Host Port: ${currentDB.port}`);
    console.log('-----------------------------------------\n');

    // Cleanup (optional: delete the test DB)
    // console.log('🧹 Cleaning up test database...');
    // await fetch(`${BACKEND_URL}/databases/${db._id}`, { method: 'DELETE' });

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

runDatabaseTest();
