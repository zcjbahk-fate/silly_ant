// 本地文件服务器 — 将 resource/ 目录通过 http://localhost:8787 提供访问
// 用途：让酒馆的自动更新脚本能从本地获取文件，避免依赖 GitHub Raw CDN
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const RESOURCE_DIR = resolve(__dirname, '..', 'resource');
const PORT = 8787;

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const server = createServer((req, res) => {
  // CORS + 禁止缓存
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // 解码 URL 中的中文路径，去掉查询参数
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = resolve(RESOURCE_DIR, '.' + urlPath);

    // 安全检查：防止路径穿越
    if (!filePath.startsWith(RESOURCE_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const stat = statSync(filePath);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
    createReadStream(filePath).pipe(res);
  } catch (e) {
    if (e.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(500);
      res.end('Internal Server Error');
      console.error(e);
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  📦 本地文件服务器已启动`);
  console.log(`  🌐 http://localhost:${PORT}/`);
  console.log(`  📁 服务目录: ${RESOURCE_DIR}`);
  console.log(`\n  酒馆的自动更新脚本将优先从此地址获取文件\n`);
});
