#!/usr/bin/env node
/*
 Safe admin password reset helper for Saptarushi
 Writes content/admin-auth.json with the same PBKDF2 parameters used by serve.js
 Usage:
   node scripts/reset-admin.js --user admin --pass "new-password"
   or
   node scripts/reset-admin.js admin "new-password"

 Notes:
 - This script BACKS UP any existing content/admin-auth.json to content/admin-auth.json.bak
 - After running you must restart the server (serve.js) for the new credentials to be loaded
 - The script does not keep plaintext password anywhere on disk after writing the hash file
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function usageAndExit(code = 1) {
  console.log('Usage: node scripts/reset-admin.js --user <username> --pass <password>');
  console.log('   or: node scripts/reset-admin.js <username> <password>');
  process.exit(code);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let user = null, pass = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user' && argv[i+1]) { user = argv[i+1]; i++; continue; }
    if (a === '--pass' && argv[i+1]) { pass = argv[i+1]; i++; continue; }
    if (!user) { user = a; continue; }
    if (!pass) { pass = a; continue; }
  }
  return { user, pass };
}

async function main() {
  const { user, pass } = parseArgs();
  if (!user || !pass) return usageAndExit();

  const repoRoot = process.cwd();
  const contentDir = path.join(repoRoot, 'content');
  const authFile = path.join(contentDir, 'admin-auth.json');
  const backupFile = path.join(contentDir, 'admin-auth.json.bak');

  try {
    if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

    if (fs.existsSync(authFile)) {
      // backup
      fs.copyFileSync(authFile, backupFile);
      console.log('Backed up existing admin-auth.json to admin-auth.json.bak');
    }

    // match serve.js parameters
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(String(pass), salt, 120000, 32, 'sha256').toString('hex');

    const now = new Date().toISOString();
    const auth = { username: String(user).trim(), salt: salt, hash: hash, updatedAt: now };

    fs.writeFileSync(authFile, JSON.stringify(auth, null, 2), { encoding: 'utf8', mode: 0o600 });
    console.log('Wrote new content/admin-auth.json');
    console.log('Username:', auth.username);
    console.log('Please restart the server (node serve.js ...) so it picks up the new credentials.');
    console.log('Also clear admin token from any browser localStorage key `saptarushi-admin-token` before logging in.');
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : String(err));
    process.exit(2);
  }
}

main();
