#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envFiles = {
  local: '.env.local',
  production: '.env.production',
  dev: '.env.local',
  prod: '.env.production'
};

function switchEnvironment(env) {
  const targetEnv = envFiles[env];
  
  if (!targetEnv) {
    console.error(`❌ Invalid environment: ${env}`);
    console.log('Available environments:');
    console.log('  • local (localhost development)');
    console.log('  • production (deployed version)');
    console.log('  • dev (alias for local)');
    console.log('  • prod (alias for production)');
    process.exit(1);
  }

  const envPath = path.join(__dirname, targetEnv);
  const targetPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file not found: ${envPath}`);
    process.exit(1);
  }

  try {
    fs.copyFileSync(envPath, targetPath);
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const nodeEnv = envContent.match(/NODE_ENV=(\w+)/)?.[1] || 'unknown';
    const frontendUrl = envContent.match(/FRONTEND_URL=(.+)/)?.[1] || 'unknown';
    const backendUrl = envContent.match(/BACKEND_URL=(.+)/)?.[1] || 'unknown';
    
    console.log('✅ Environment switched successfully!');
    console.log(`🌍 Mode: ${nodeEnv.toUpperCase()}`);
    console.log(`🖥️  Frontend: ${frontendUrl}`);
    console.log(`⚡ Backend: ${backendUrl}`);
    
    if (env === 'local' || env === 'dev') {
      console.log('\n📧 Email: Using fake SMTP (check console for preview URLs)');
      console.log('💡 Run: npm run dev');
    } else {
      console.log('\n📧 Email: Using production SMTP');
      console.log('💡 Run: npm start');
    }
  } catch (error) {
    console.error(`❌ Failed to switch environment: ${error.message}`);
    process.exit(1);
  }
}

const env = process.argv[2];

if (!env) {
  console.log('🔧 Environment Switcher for CSEDU Nexus');
  console.log('\nUsage: node switch-env.js <environment>');
  console.log('\nAvailable environments:');
  console.log('  • local     - Localhost development (http://localhost:3000)');
  console.log('  • production - Deployed version (https://nexus.farefin.com)');
  console.log('  • dev       - Alias for local');
  console.log('  • prod      - Alias for production');
  console.log('\nExamples:');
  console.log('  node switch-env.js local');
  console.log('  node switch-env.js production');
  process.exit(1);
}

switchEnvironment(env);