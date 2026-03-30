/**
 * Local reverse proxy for Sitecore Docker containers
 * Solves the Windows 11 HNS bug — containers can't publish ports.
 *
 * Proxies:
 *   https://xmcloudcm.localhost (127.0.0.1:443) → Traefik container:443
 *   http://localhost:3000                        → Rendering container:3000
 *
 * Usage: node scripts/proxy.js
 * Requires hosts file: 127.0.0.1  xmcloudcm.localhost
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

const CERT_DIR = path.join(__dirname, '..', 'docker', 'traefik', 'certs');

function getContainerIp(name) {
  try {
    return execSync(
      `docker inspect ${name} --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"`,
      { encoding: 'utf-8' }
    ).trim();
  } catch {
    console.error(`WARNING: Could not get IP for ${name}`);
    return null;
  }
}

const traefikIp = getContainerIp('xmcloud-starter-js-traefik-1');
const renderingIp = getContainerIp('xmcloud-starter-js-rendering-nextjs-1');

console.log(`Traefik IP:   ${traefikIp || 'NOT FOUND'}`);
console.log(`Rendering IP: ${renderingIp || 'NOT FOUND'}`);

// ── HTTPS proxy for CM (port 443) ──────────────────────────────────
if (traefikIp) {
  const tlsOptions = {
    key: fs.readFileSync(path.join(CERT_DIR, 'xmcloudcm.localhost-key.pem')),
    cert: fs.readFileSync(path.join(CERT_DIR, 'xmcloudcm.localhost.pem')),
  };

  const cmProxy = https.createServer(tlsOptions, (clientReq, clientRes) => {
    const proxyReq = https.request({
      hostname: traefikIp,
      port: 443,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: 'xmcloudcm.localhost' },
      rejectAuthorized: false,
    }, (proxyRes) => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      }
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`CM proxy error: ${err.message}`);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end(`CM proxy error: ${err.message}`);
      } else {
        clientRes.end();
      }
    });

    clientReq.on('error', () => proxyReq.destroy());
    clientReq.pipe(proxyReq, { end: true });
  });

  cmProxy.on('connect', (req, clientSocket, head) => {
    const srvSocket = net.connect(443, traefikIp, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      srvSocket.write(head);
      srvSocket.pipe(clientSocket);
      clientSocket.pipe(srvSocket);
    });
    srvSocket.on('error', () => clientSocket.end());
  });

  cmProxy.listen(443, '127.0.0.1', () => {
    console.log(`\n✓ CM proxy:        https://xmcloudcm.localhost → ${traefikIp}:443`);
  });

  cmProxy.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port 443 in use. Run: netsh interface portproxy delete v4tov4 listenport=443 listenaddress=127.0.0.1');
      console.error('Then: powershell -Command "Restart-Service iphlpsvc -Force"');
    } else if (err.code === 'EACCES') {
      console.error('Port 443 requires admin privileges.');
    } else {
      console.error(`CM proxy error: ${err.message}`);
    }
  });
}

// ── HTTP proxy for Rendering Host (port 3000) ──────────────────────
if (renderingIp) {
  const renderProxy = http.createServer((clientReq, clientRes) => {
    const proxyReq = http.request({
      hostname: renderingIp,
      port: 3000,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: clientReq.headers.host || 'localhost:3000' },
    }, (proxyRes) => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      }
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`Rendering proxy error: ${err.message}`);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end(`Rendering proxy error: ${err.message}`);
      } else {
        clientRes.end();
      }
    });

    clientReq.on('error', () => proxyReq.destroy());
    clientReq.pipe(proxyReq, { end: true });
  });

  renderProxy.listen(3000, '127.0.0.1', () => {
    console.log(`✓ Rendering proxy: http://localhost:3000 → ${renderingIp}:3000`);
  });

  renderProxy.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port 3000 in use. Kill existing process or use a different port.');
    } else {
      console.error(`Rendering proxy error: ${err.message}`);
    }
  });
}

// Prevent crashes on transient errors
process.on('uncaughtException', (err) => {
  console.error(`Uncaught: ${err.message}`);
});

console.log('\nPress Ctrl+C to stop both proxies.\n');
