// 一键发版脚本 — bundle 打包 → Eagle 归档 → git push
// 用法:
//   node scripts/deploy.mjs              # 发版全部
//   node scripts/deploy.mjs 精神小妹      # 只发版指定角色卡
//   node scripts/deploy.mjs --bundle-only # 只打包不推送
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const EAGLE_API = 'http://localhost:41595';
const EAGLE_ARCHIVE_FOLDER = '角色卡归档';

// ─── Eagle Token 获取（从 Eagle API 自动读取） ────────────

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
      current = { name: nameMatch[1].trim(), type: null, exportPath: null };
      continue;
    }
    if (!current) continue;

    const typeMatch = line.match(/^\s{4}类型:\s*(.+)$/);
    if (typeMatch) { current.type = typeMatch[1].trim(); continue; }

    const exportMatch = line.match(/^\s{4}导出文件路径:\s*(.+)$/);
    if (exportMatch) { current.exportPath = exportMatch[1].trim(); }
  }

  if (current && current.type) configs.push(current);
  return configs;
}

// ─── 版本号提取 ──────────────────────────────────────────

function extractVersion(changelogPath) {
  if (!existsSync(changelogPath)) return null;
  const content = readFileSync(changelogPath, 'utf-8');
  const match = content.match(/^##\s*(.*)\s*$/m);
  return match ? match[1].trim() : null;
}

// ─── Eagle API（带 Token 认证） ──────────────────────────

async function eagleFetch(path, options = {}) {
  const token = eagleFetch._token;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${EAGLE_API}${path}${sep}token=${token}`;

  if (options.body) {
    // POST with body — Eagle 4.0 部分 API 需要 POST
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

async function getOrCreateSubfolder(folders, archiveFolderName, cardName) {
  // 1. 找到归档根文件夹
  let archiveFolder = findFolderRecursive(folders, archiveFolderName);
  let archiveFolderId;

  if (archiveFolder) {
    archiveFolderId = archiveFolder.id;
  } else {
    archiveFolderId = await createFolder(archiveFolderName, null);
    // 刷新文件夹列表
    folders = await getFolderList();
    archiveFolder = findFolderById(folders, archiveFolderId);
  }

  // 2. 在归档文件夹下找/创建角色卡子文件夹
  const childFolder = archiveFolder ? findChildFolder(archiveFolder, cardName) : null;
  if (childFolder) return childFolder.id;

  return await createFolder(cardName, archiveFolderId);
}

async function archiveToEagle(filePath, cardName, version) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const versionTag = version || 'unknown';
  const displayName = `${cardName}_${versionTag}_${dateStr}`;
  const tags = [cardName, versionTag, dateStr];

  // 获取文件夹列表并定位/创建目标文件夹
  const folders = await getFolderList();
  const targetFolderId = await getOrCreateSubfolder(folders, EAGLE_ARCHIVE_FOLDER, cardName);

  // 添加文件到 Eagle（使用本地路径，Windows 需要反斜杠）
  const normalizedPath = filePath.replace(/\//g, '\\');
  const res = await eagleFetch('/api/item/addFromPath', {
    body: {
      path: normalizedPath,
      name: displayName,
      folderId: targetFolderId,
      tags,
      annotation: `版本: ${versionTag} | 日期: ${dateStr}`
    }
  });

  const data = await res.json();
  if (data.status === 'success') {
    console.log(`    🦅 Eagle: 已归档 → ${EAGLE_ARCHIVE_FOLDER}/${cardName}/${displayName}`);
  } else {
    console.warn(`    ⚠️ Eagle 归档失败:`, JSON.stringify(data));
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

      let version = null;
      if (outputFile) {
        const changelogPath = resolve(dirname(outputFile), '更新日志.md');
        version = extractVersion(changelogPath);
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
      if (card.type !== '角色卡') {
        console.log(`    ⏭️ 跳过预设: ${card.name}`);
        continue;
      }
      try {
        await archiveToEagle(card.outputFile, card.name, card.version);
      } catch (e) {
        console.warn(`    ⚠️ Eagle 归档出错 (${card.name}):`, e.message);
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

    execSync('git push', { cwd: ROOT, stdio: 'pipe' });
    console.log('    ✅ push 完成');
  } catch (e) {
    console.error(`    ❌ Git 操作失败: ${e.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ 发版完成！');
  console.log('  → 在酒馆中选择角色卡即可看到更新按钮');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => {
  console.error('❌ 发版过程出错:', e);
  process.exit(1);
});
