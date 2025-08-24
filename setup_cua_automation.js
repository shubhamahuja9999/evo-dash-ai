#!/usr/bin/env node
/**
 * Setup script for CUA automation
 * This script ensures the Python CUA automation script is properly set up
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Define paths
const scriptPath = path.join(__dirname, 'cua_automation.py');
const envPath = path.join(__dirname, '.env');

// Check if Python is installed
console.log('🔍 Checking Python installation...');
exec('python3 --version', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Python 3 is not installed or not in PATH');
    console.error('Please install Python 3 and try again');
    process.exit(1);
  }
  
  console.log(`✅ ${stdout.trim()} detected`);
  
  // Check if required Python packages are installed
  console.log('🔍 Checking required Python packages...');
  const requiredPackages = ['selenium', 'openai', 'pytz'];
  
  exec('pip3 list', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error checking Python packages:', error);
      process.exit(1);
    }
    
    const missingPackages = [];
    requiredPackages.forEach(pkg => {
      if (!stdout.includes(pkg)) {
        missingPackages.push(pkg);
      }
    });
    
    if (missingPackages.length > 0) {
      console.log(`⚠️ Missing Python packages: ${missingPackages.join(', ')}`);
      console.log('📦 Installing missing packages...');
      
      exec(`pip3 install ${missingPackages.join(' ')}`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error installing packages:', error);
          console.error('Please install them manually using:');
          console.error(`pip3 install ${missingPackages.join(' ')}`);
        } else {
          console.log('✅ Packages installed successfully');
        }
        
        checkScriptPermissions();
      });
    } else {
      console.log('✅ All required Python packages are installed');
      checkScriptPermissions();
    }
  });
});

function checkScriptPermissions() {
  console.log('🔍 Checking script permissions...');
  
  // Make sure the script is executable
  fs.access(scriptPath, fs.constants.X_OK, (err) => {
    if (err) {
      console.log('⚠️ Script is not executable, setting permissions...');
      fs.chmod(scriptPath, 0o755, (err) => {
        if (err) {
          console.error('❌ Error setting script permissions:', err);
          console.error('Please make the script executable manually:');
          console.error(`chmod +x ${scriptPath}`);
        } else {
          console.log('✅ Script permissions set successfully');
        }
        
        checkEnvFile();
      });
    } else {
      console.log('✅ Script is executable');
      checkEnvFile();
    }
  });
}

function checkEnvFile() {
  console.log('🔍 Checking environment variables...');
  
  // Check if OpenAI API key is set in .env
  fs.readFile(envPath, 'utf8', (err, data) => {
    if (err) {
      console.error('⚠️ Could not read .env file:', err);
    } else {
      const openaiKeyMatch = data.match(/OPENAI_API_KEY=["']?([^"'\n]+)["']?/);
      
      if (!openaiKeyMatch) {
        console.log('⚠️ OPENAI_API_KEY not found in .env file');
        console.log('AI features in CUA automation may not work properly');
      } else {
        console.log('✅ OPENAI_API_KEY found in .env file');
      }
    }
    
    console.log('\n✅ CUA Automation setup complete!');
    console.log('You can now use the CUA dashboard to execute automation commands');
  });
}
