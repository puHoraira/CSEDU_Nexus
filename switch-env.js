#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootEnvFiles = {
  local: '.env.local',
  production: '.env.production',
  dev: '.env.local',
  prod: '.env.production'
};

const backendEnvFiles = {
  local: 'backend/.env.local',
  production: 'backend/.env.production',
  dev: 'backend/.env.local',
  prod: 'backend/.env.production'
};

function switchEnvironment(env) {
  const rootTargetEnv = rootEnvFiles[env];
  const backendTargetEnv = backendEnvFiles[env];
  
  if (!rootTargetEnv || !backendTargetEnv) {
    console.error(`❌ Invalid environment: ${env}`);
    console.log('Available environments:');
    console.log('  • local (localhost development)');
    console.log('  • production (deployed version)');
    console.log('  • dev (alias for local)');
    console.log('  • prod (alias for production)');
    process.exit(1);
  }

  const rootEnvPath = path.join(__dirname, rootTargetEnv);
  const backendEnvPath = path.join(__dirname, backendTargetEnv);
  const rootTargetPath = path.join(__dirname, '.env');
  const backendTargetPath = path.join(__dirname, 'backend/.env');

  // Check if files exist
  if (!fs.existsSync(rootEnvPath)) {
    console.error(`❌ Root environment file not found: ${rootEnvPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(backendEnvPath)) {
    console.error(`❌ Backend environment file not found: ${backendEnvPath}`);
    process.exit(1);
  }

  try {
    // Copy root .env
    fs.copyFileSync(rootEnvPath, rootTargetPath);
    
    // Copy backend .env
    fs.copyFileSync(backendEnvPath, backendTargetPath);
    
    // Read config for display
    const rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
    const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    
    const apiUrl = rootEnvContent.match(/VITE_API_BASE_URL=(.+)/)?.[1] || 'unknown';
    const nodeEnv = backendEnvContent.match(/NODE_ENV=(\w+)/)?.[1] || 'unknown';
    const frontendUrl = backendEnvContent.match(/FRONTEND_URL=(.+)/)?.[1] || 'unknown';
    const backendUrl = backendEnvContent.match(/BACKEND_URL=(.+)/)?.[1] || 'unknown';
    
    console.log('✅ Environment switched successfully!');
    console.log('═══════════════════════════════════');
    console.log(`🌍 Mode: ${nodeEnv.toUpperCase()}`);
    console.log(`🖥️  Frontend: ${frontendUrl}`);
    console.log(`⚡ Backend: ${backendUrl}`);
    console.log(`🔗 API URL: ${apiUrl}`);
    console.log('═══════════════════════════════════');
    
    if (env === 'local' || env === 'dev') {
      console.log('📧 Email: Using fake SMTP (check console for preview URLs)');
      console.log('💾 Database: Development database (csedu_nexus_dev)');
      console.log('\n🚀 Quick Start:');
      console.log('   cd backend && npm run dev    # Start backend');
      console.log('   cd frontend && npm run dev   # Start frontend');
      console.log('\n🌐 URLs:');
      console.log('   Frontend: http://localhost:3000');
      console.log('   Backend:  http://localhost:5000');
    } else {
      console.log('📧 Email: Using production SMTP');
      console.log('💾 Database: Production database (csedu_nexus)');
      console.log('\n🚀 Deployment:');
      console.log('   docker-compose up -d         # Start containers');
      console.log('\n🌐 URLs:');
      console.log('   Frontend: https://nexus.farefin.com');
      console.log('   Backend:  https://nexus.farefin.com:5000');
    }
  } catch (error) {
    console.error(`❌ Failed to switch environment: ${error.message}`);
    process.exit(1);
  }
}

const env = process.argv[2];

if (!env) {
  console.log('🔧 CSEDU Nexus Environment Switcher');
  console.log('════════════════════════════════════');
  console.log('Usage: node switch-env.js <environment>');
  console.log('\nAvailable environments:');
  console.log('  🏠 local     - Localhost development (http://localhost:3000)');
  console.log('  🌍 production - Deployed version (https://nexus.farefin.com)');
  console.log('  🔧 dev       - Alias for local');
  console.log('  🚀 prod      - Alias for production');
  console.log('\nExamples:');
  console.log('  node switch-env.js local      # Switch to localhost');
  console.log('  node switch-env.js production # Switch to production');
  console.log('\nFeatures:');
  console.log('  • Automatically configures frontend and backend');
  console.log('  • Sets correct API URLs and database connections');
  console.log('  • Configures email settings (fake SMTP for local)');
  console.log('  • No more manual .env file editing! 🎉');
  process.exit(1);
}

switchEnvironment(env);