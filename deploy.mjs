import 'dotenv/config';
import SftpClient from 'ssh2-sftp-client';
import { readdir, stat } from 'fs/promises';
import { join, posix } from 'path';
import { Client } from 'ssh2';

const CONFIG = {
    host: process.env.DEPLOY_HOST,
    port: parseInt(process.env.DEPLOY_PORT || '22'),
    username: process.env.DEPLOY_USERNAME,
    password: process.env.DEPLOY_PASSWORD,
};

const LOCAL_DIST = './dist';
const REMOTE_ROOT = process.env.DEPLOY_REMOTE_PATH || '/opt/itinera-calculator/html';
const CONTAINER = process.env.DEPLOY_CONTAINER || 'itinera-calculator';

// --- SSH helper ---
function sshExec(cmd) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        let out = '';
        conn.on('ready', () => {
            conn.exec(cmd, (err, stream) => {
                if (err) { conn.end(); return reject(err); }
                stream.on('data', d => out += d.toString());
                stream.stderr.on('data', d => out += d.toString());
                stream.on('close', (code) => { conn.end(); resolve({ out, code }); });
            });
        });
        conn.on('error', reject);
        conn.connect(CONFIG);
    });
}

// --- Recursive upload ---
async function uploadDir(sftp, localDir, remoteDir) {
    const entries = await readdir(localDir, { withFileTypes: true });
    for (const entry of entries) {
        const localPath = join(localDir, entry.name);
        const remotePath = posix.join(remoteDir, entry.name);
        if (entry.isDirectory()) {
            try { await sftp.mkdir(remotePath, true); } catch (e) { /* exists */ }
            await uploadDir(sftp, localPath, remotePath);
        } else {
            const s = await stat(localPath);
            console.log(`  📄 ${remotePath} (${(s.size / 1024).toFixed(1)} KB)`);
            await sftp.put(localPath, remotePath);
        }
    }
}

// --- Main deploy ---
async function main() {
    if (!CONFIG.host || !CONFIG.username || !CONFIG.password) {
        console.error('❌ Missing credentials. Make sure .env file exists with DEPLOY_HOST, DEPLOY_USERNAME, DEPLOY_PASSWORD.');
        process.exit(1);
    }

    console.log(`🧹 Phase 1: Clean remote ${REMOTE_ROOT}/ directory...`);
    const { out: cleanOut } = await sshExec(`rm -rf ${REMOTE_ROOT}/* && mkdir -p ${REMOTE_ROOT}/assets`);
    if (cleanOut) console.log(cleanOut);
    console.log('✅ Remote directory cleaned.\n');

    console.log('📦 Phase 2: Uploading dist/ via SFTP...');
    const sftp = new SftpClient();
    try {
        await sftp.connect(CONFIG);
        await uploadDir(sftp, LOCAL_DIST, REMOTE_ROOT);
        console.log('✅ Upload complete!\n');
    } finally {
        await sftp.end();
    }

    console.log(`🔄 Phase 3: Restarting Docker container (${CONTAINER})...`);
    const { out: restartOut } = await sshExec(`docker restart ${CONTAINER}`);
    console.log(`  Container: ${restartOut.trim()}`);

    // Verify
    const { out: status } = await sshExec(`docker ps --filter name=${CONTAINER} --format "{{.Status}}"`);
    console.log(`  Status: ${status.trim()}`);

    console.log('\n🎉 Deployment complete! Site: https://calcolatore.itinerapro.com');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
