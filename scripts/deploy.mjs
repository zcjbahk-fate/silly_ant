// 一键发版脚本 — bundle 打包 → Eagle 归档 → git push
// 用法:
//   node scripts/deploy.mjs              # 发版全部
//   node scripts/deploy.mjs 精神小妹      # 只发版指定角色卡或预设
//   node scripts/deploy.mjs --bundle-only # 只打包不推送
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveOldVersion, createHistoryZip } from './zip-utils.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const EAGLE_API = 'http://localhost:41595';
const EAGLE_ARCHIVE_FOLDER = '角色卡归档';

// ─── 公共脚本同步到 dist ────────────────────────────────

function syncPublicScripts() {
  const scriptMap = [
    { src: 'work/公共脚本/自动更新角色卡.js', dst: 'dist/酒馆助手/自动更新角色卡/index.js' },
    { src: 'work/公共脚本/自动更新预设.js', dst: 'dist/酒馆助手/自动更新预设/index.js' },
  ];

  for (const { src, dst } of scriptMap) {
    const srcPath = resolve(ROOT, src);
    const dstPath = resolve(ROOT, dst);
    if (!existsSync(srcPath)) continue;
    mkdirSync(dirname(dstPath), { recursive: true });
    copyFileSync(srcPath, dstPath);
    console.log(`    🔄 同步: ${src} → ${dst}`);
  }
}

// ─── 从 YAML 提取当前版本号（打包前的旧版本） ─────────────

function extractCurrentVersion(yamlPath) {
  if (!existsSync(yamlPath)) return null;
  const content = readFileSync(yamlPath, 'utf-8');
  const match = content.match(/^\s*当前版本:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}


async function getEagleToken() {
  try {
    const res = await fetch(`${EAGLE_API}/api/application/info`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.preferences?.developer?.apiToken || null;
  } catch {
    return null;
  }
}

// ─── YAML 配置解析（仅提取必要字段） ──────────────────────

function parseConfigs(yamlPath) {
  const content = readFileSync(yamlPath, 'utf-8');
  const lines = content.split('\n');
  const configs = [];
  let inConfigSection = false;
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trimStart().startsWith('#')) continue;

    if (/^配置:\s*$/.test(line)) {
      inConfigSection = true;
      continue;
    }
    if (!inConfigSection) continue;
    if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) break;

    const nameMatch = line.match(/^  ([^\s#][^:]*?):\s*$/);
    if (nameMatch) {
      if (current && current.type) configs.push(current);
      current = { name: nameMatch[1].trim(), type: null, exportPath: null, localPath: null };
      continue;
    }
    if (!current) continue;

    const typeMatch = line.match(/^\s{4}类型:\s*(.+)$/);
    if (typeMatch) { current.type = typeMatch[1].trim(); continue; }

    const localMatch = line.match(/^\s{4}本地文件路径:\s*(.+)$/);
    if (localMatch) { current.localPath = localMatch[1].trim(); continue; }

    const exportMatch = line.match(/^\s{4}导出文件路径:\s*(.+)$/);
    if (exportMatch) { current.exportPath = exportMatch[1].trim(); }
  }

  if (current && current.type) configs.push(current);
  return configs;
}

// ─── 版本号提取与同步 ──────────────────────────────────

function extractVersion(changelogPath) {
  if (!existsSync(changelogPath)) return null;
  const content = readFileSync(changelogPath, 'utf-8');
  const match = content.match(/^##\s*(.*)\s*$/m);
  return match ? match[1].trim() : null;
}

function syncCardVersionInYaml(yamlPath, version) {
  if (!existsSync(yamlPath)) return;
  let content = readFileSync(yamlPath, 'utf-8');
  if (/^版本:\s*.*$/m.test(content)) {
    content = content.replace(/^版本:\s*.*$/m, `版本: "${version}"`);
  } else {
    content = `版本: "${version}"\n` + content;
  }
  if (/^\s*当前版本:\s*.+$/m.test(content)) {
    content = content.replace(/^(\s*当前版本:\s*).*$/m, `$1${version}`);
  } else if (/^(\s*更新日志链接:\s*.+)$/m.test(content)) {
    content = content.replace(/^(\s*更新日志链接:\s*.+)$/m, `$1\n          当前版本: ${version}`);
  }
  // 清理按钮列表中残留的历史硬编码更新角色卡按钮，只保留常驻更新日志
  content = content.replace(/(\s*-\s*名称:\s*["']?更新角色卡:[^"'\r\n]+?["']?\s*\n\s*可见:\s*true\s*)/g, '');
  writeFileSync(yamlPath, content, 'utf-8');
}

function syncPresetVersionInYaml(yamlPath, version) {
  if (!existsSync(yamlPath)) return;
  let content = readFileSync(yamlPath, 'utf-8');
  if (/^\s*当前版本:\s*.+$/m.test(content)) {
    content = content.replace(/^(\s*当前版本:\s*).*$/m, `$1${version}`);
  } else if (/^(\s*更新日志链接:\s*.+)$/m.test(content)) {
    content = content.replace(/^(\s*更新日志链接:\s*.+)$/m, `$1\n          当前版本: ${version}`);
  }
  // 清理按钮列表中残留的历史硬编码更新预设按钮，只保留常驻更新日志
  content = content.replace(/(\s*-\s*名称:\s*["']?更新预设:[^"'\r\n]+?["']?\s*\n\s*可见:\s*true\s*)/g, '');
  writeFileSync(yamlPath, content, 'utf-8');
}

// ─── Eagle API（带 Token 认证） ──────────────────────────

async function eagleFetch(path, options = {}) {
  const token = eagleFetch._token;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${EAGLE_API}${path}${sep}token=${token}`;

  if (options.body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    });
  }
  return fetch(url);
}

function findFolderRecursive(folders, name) {
  for (const f of folders) {
    if (f.name === name) return f;
    if (f.children && f.children.length > 0) {
      const found = findFolderRecursive(f.children, name);
      if (found) return found;
    }
  }
  return null;
}

function findChildFolder(folder, name) {
  if (!folder.children) return null;
  return folder.children.find(f => f.name === name) || null;
}

function findFolderById(folders, id) {
  for (const f of folders) {
    if (f.id === id) return f;
    if (f.children && f.children.length > 0) {
      const found = findFolderById(f.children, id);
      if (found) return found;
    }
  }
  return null;
}

async function getFolderList() {
  const res = await eagleFetch('/api/folder/list');
  const data = await res.json();
  return data.data || [];
}

async function createFolder(name, parentId) {
  const body = { folderName: name };
  if (parentId) body.parent = parentId;
  const res = await eagleFetch('/api/folder/create', { body });
  const data = await res.json();
  if (data.status === 'success') {
    console.log(`    📁 Eagle: 创建文件夹「${name}」`);
    return data.data.id;
  }
  throw new Error(`创建 Eagle 文件夹失败: ${JSON.stringify(data)}`);
}

async function resolveEagleFolderPath(folders, pathSegments) {
  let currentFolder = null;

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (i === 0) {
      currentFolder = findFolderRecursive(folders, segment);
      if (!currentFolder) {
        const newId = await createFolder(segment, null);
        folders = await getFolderList();
        currentFolder = findFolderById(folders, newId);
      }
    } else {
      let child = findChildFolder(currentFolder, segment);
      if (!child) {
        const newId = await createFolder(segment, currentFolder.id);
        folders = await getFolderList();
        child = findFolderById(folders, newId);
      }
      currentFolder = child;
    }
  }
  return currentFolder.id;
}

async function getFolderItems(folderId) {
  try {
    const res = await eagleFetch(`/api/item/list?folders=${folderId}&limit=200`);
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

async function moveItemsToTrash(itemIds) {
  if (!itemIds || itemIds.length === 0) return;
  try {
    await eagleFetch('/api/item/moveToTrash', {
      body: { itemIds }
    });
  } catch (e) {
    console.warn(`    ⚠️ Eagle 清理旧条目失败:`, e.message);
  }
}

async function archiveToEagle(filePath, cardName, version, cardType = '角色卡') {
  const versionTag = version || 'unknown';
  const displayName = `${cardName}_${versionTag}`;
  const tags = [cardName, versionTag];
  if (cardType !== '角色卡') tags.push(cardType);

  let pathSegments;
  if (cardType === '预设') {
    pathSegments = ['预设', '自用'];
  } else if (cardType === '世界书') {
    pathSegments = ['世界书', cardName];
  } else {
    pathSegments = [EAGLE_ARCHIVE_FOLDER];
  }

  // 获取文件夹列表并定位/创建目标文件夹
  const folders = await getFolderList();
  const targetFolderId = await resolveEagleFolderPath(folders, pathSegments);

  // 清理目标文件夹中该卡/预设/世界书的历史旧版本条目（以及同名条目）
  const existingItems = await getFolderItems(targetFolderId);
  const oldItemIds = existingItems
    .filter(item => {
      if (item.isDeleted) return false;
      return item.name === cardName || item.name.startsWith(`${cardName}_`);
    })
    .map(item => item.id);

  if (oldItemIds.length > 0) {
    await moveItemsToTrash(oldItemIds);
    console.log(`    🗑️ Eagle: 已清理「${pathSegments.join('/')}」中的 ${oldItemIds.length} 个旧版本条目`);
  }

  // 添加文件到 Eagle（使用本地路径，Windows 需要反斜杠）
  const normalizedPath = filePath.replace(/\//g, '\\');
  const res = await eagleFetch('/api/item/addFromPath', {
    body: {
      path: normalizedPath,
      name: displayName,
      folderId: targetFolderId,
      tags,
      annotation: `版本: ${versionTag}`
    }
  });

  const data = await res.json();
  if (data.status === 'success') {
    console.log(`    🦅 Eagle: 已归档 → ${pathSegments.join('/')}/${displayName}`);
  } else {
    console.warn(`    ⚠️ Eagle 归档失败:`, JSON.stringify(data));
  }
}

async function archiveHistoryZipToEagle(cardName, version, cardType = '角色卡') {
  const zipPath = createHistoryZip(cardName, cardType);
  if (!zipPath) return;

  const displayName = `${cardName}_历史版本`;
  const tags = [cardName, '历史版本'];
  if (cardType !== '角色卡') tags.push(cardType);

  let pathSegments;
  if (cardType === '预设') {
    pathSegments = ['预设', '旧版'];
  } else if (cardType === '世界书') {
    pathSegments = ['世界书', '旧版'];
  } else {
    pathSegments = [EAGLE_ARCHIVE_FOLDER, '旧版'];
  }

  const folders = await getFolderList();
  const targetFolderId = await resolveEagleFolderPath(folders, pathSegments);

  // 清理「旧版」文件夹中该卡已有的历史版本 zip
  const existingItems = await getFolderItems(targetFolderId);
  const oldZipIds = existingItems
    .filter(item => {
      if (item.isDeleted) return false;
      return item.name === displayName || item.name.startsWith(`${cardName}_历史版本`);
    })
    .map(item => item.id);

  if (oldZipIds.length > 0) {
    await moveItemsToTrash(oldZipIds);
    console.log(`    🗑️ Eagle: 已清理「${pathSegments.join('/')}」中的旧历史版本压缩包`);
  }

  const normalizedPath = zipPath.replace(/\//g, '\\');
  const res = await eagleFetch('/api/item/addFromPath', {
    body: {
      path: normalizedPath,
      name: displayName,
      folderId: targetFolderId,
      tags,
      annotation: `${cardName} 历史版本合集 (截至 ${version || 'unknown'})`
    }
  });

  const data = await res.json();
  if (data.status === 'success') {
    console.log(`    🦅 Eagle: 历史版本已归档 → ${pathSegments.join('/')}/${displayName}.zip`);
  } else {
    console.warn(`    ⚠️ Eagle 历史版本归档失败:`, JSON.stringify(data));
  }
}

// ─── 主流程 ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const bundleOnly = args.includes('--bundle-only');
  const targetNames = args.filter(a => !a.startsWith('--'));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 silly_ant 发版工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 0. 同步公共脚本到 dist（确保 dist 始终使用最新版本）
  console.log('  🔄 同步公共脚本...');
  syncPublicScripts();
  console.log('');

  // 1. 读取配置
  const configPath = resolve(ROOT, 'tavern_sync.yaml');
  if (!existsSync(configPath)) {
    console.error('❌ 找不到 tavern_sync.yaml');
    process.exit(1);
  }

  let configs = parseConfigs(configPath);
  if (targetNames.length > 0) {
    configs = configs.filter(c => targetNames.includes(c.name));
    if (configs.length === 0) {
      console.error(`❌ 未找到指定的配置: ${targetNames.join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`  📋 待处理: ${configs.map(c => c.name).join(', ')}\n`);

  // 2. 逐个打包
  const bundledCards = [];
  for (const config of configs) {
    console.log(`  📦 打包: ${config.name}`);
    try {
      let version = null;
      if (config.exportPath) {
        const basePath = resolve(ROOT, config.exportPath);
        const changelogPath = resolve(dirname(basePath), '更新日志.md');
        version = extractVersion(changelogPath);
      }

      // 归档旧版本到历史目录（在同步版本号和打包之前）
      if (config.exportPath && config.localPath) {
        const localYamlPath = resolve(ROOT, config.localPath);
        const oldVersion = extractCurrentVersion(localYamlPath);
        if (oldVersion && oldVersion !== version) {
          const basePath = resolve(ROOT, config.exportPath);
          for (const ext of ['.png', '.json']) {
            const candidate = basePath + ext;
            if (existsSync(candidate)) {
              archiveOldVersion(candidate, config.name, oldVersion, config.type);
              console.log(`    📂 旧版本 ${oldVersion} 已归档到历史目录`);
              break;
            }
          }
        }
      }

      // 若为角色卡且有版本号，打包前自动同步 YAML 中的版本字段
      if (config.type === '角色卡' && version && config.localPath) {
        const localYamlPath = resolve(ROOT, config.localPath);
        syncCardVersionInYaml(localYamlPath, version);
      }

      // 若为预设且有版本号，打包前自动同步 YAML 中的当前版本字段
      if (config.type === '预设' && version && config.localPath) {
        const localYamlPath = resolve(ROOT, config.localPath);
        syncPresetVersionInYaml(localYamlPath, version);
      }

      execSync(`node tavern_sync.mjs bundle ${config.name}`, {
        cwd: ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputFile = null;
      if (config.exportPath) {
        const basePath = resolve(ROOT, config.exportPath);
        for (const ext of ['.png', '.json']) {
          const candidate = basePath + ext;
          if (existsSync(candidate)) { outputFile = candidate; break; }
        }
      }

      console.log(`    ✅ 打包成功${version ? ` (版本: ${version})` : ''}`);
      bundledCards.push({ ...config, outputFile, version });
    } catch (e) {
      console.error(`    ❌ 打包失败: ${e.message}`);
    }
  }

  if (bundleOnly) {
    console.log('\n  ✅ 打包完成 (--bundle-only 模式，跳过 Eagle 归档和 git 推送)\n');
    return;
  }

  // 3. Eagle 归档
  const token = await getEagleToken();
  if (token) {
    eagleFetch._token = token;
    console.log('\n  🦅 Eagle 归档中...');
    for (const card of bundledCards) {
      if (!card.outputFile) continue;
      try {
        await archiveToEagle(card.outputFile, card.name, card.version, card.type);
      } catch (e) {
        console.warn(`    ⚠️ Eagle 归档出错 (${card.name}):`, e.message);
      }
      // 归档历史版本 zip 到「旧版」文件夹
      try {
        await archiveHistoryZipToEagle(card.name, card.version, card.type);
      } catch (e) {
        console.warn(`    ⚠️ Eagle 历史版本归档出错 (${card.name}):`, e.message);
      }
    }
  } else {
    console.log('\n  ⏭️ Eagle 未运行或无 Token，跳过归档');
  }

  // 4. Git 推送
  console.log('\n  📤 Git 推送中...');
  try {
    execSync('git add .', { cwd: ROOT, stdio: 'pipe' });

    const dateStr = new Date().toISOString().slice(0, 10);
    const cardNames = bundledCards.map(c => c.name).join(', ');
    const commitMsg = `release: ${dateStr} [${cardNames}]`;

    try {
      execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT, stdio: 'pipe' });
      console.log(`    ✅ commit: ${commitMsg}`);
    } catch (e) {
      const output = e.stdout?.toString() || e.stderr?.toString() || '';
      if (output.includes('nothing to commit')) {
        console.log('    ℹ️ 没有新的变更需要提交');
      } else {
        throw e;
      }
    }

    try {
      execSync('git push', { cwd: ROOT, stdio: 'pipe' });
      console.log('    ✅ push 完成');
    } catch (pushErr) {
      // 若因本地代理配置端口未开启导致失败，尝试使用直连 push
      try {
        execSync('git -c http.proxy="" -c https.proxy="" push', { cwd: ROOT, stdio: 'pipe' });
        console.log('    ✅ push 完成 (直连)');
      } catch (fallbackErr) {
        throw pushErr;
      }
    }
  } catch (e) {
    console.error(`    ❌ Git 操作失败: ${e.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ 发版完成！');
  console.log('  → 在酒馆中选择角色卡/预设即可看到更新按钮');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => {
  console.error('❌ 发版过程出错:', e);
  process.exit(1);
});
