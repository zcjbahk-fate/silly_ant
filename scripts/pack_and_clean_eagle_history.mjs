// 一次性迁移脚本：将 Eagle 中的历史散落版本收集并打包为 zip，上传到「角色卡归档/旧版」，并清理 Eagle 旧项目
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const EAGLE_API = 'http://localhost:41595';
const EAGLE_LIB_IMAGES = 'F:\\酒馆.library\\images';
const HISTORY_DIR = resolve(ROOT, 'resource', '.history');

const TARGET_SUBFOLDERS = {
  'MSYR8VBOJG48Y': '精神小妹',
  'MSYRTCOI8C48M': '陈蛮村',
  'MSYRTCOZWELFA': '寻找伪人',
  'MSYRTCPDG65NF': '美人团外卖',
  'MSYRTCPPML8XC': '蓝天航空',
  'MSYRTCPZYBJ0S': '李紫涵',
  'MSYS5YPBXV8GZ': '滨莲市',
  'MT5U7TTRBT8M1': '桃色公寓'
};

async function getEagleToken() {
  const res = await fetch(`${EAGLE_API}/api/application/info`);
  const data = await res.json();
  return data?.data?.preferences?.developer?.apiToken || null;
}

async function eagleFetch(path, token, options = {}) {
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

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📦 历史文件打包 & Eagle 归档整理');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const token = await getEagleToken();
  if (!token) {
    console.error('❌ 无法连接 Eagle 或未获取到 Token');
    process.exit(1);
  }

  // 1. 扫描 Eagle 本地库目录，按角色卡收集所有历史条目
  console.log('  🔍 扫描 Eagle 本地库中的历史版本文件...');
  const cardItems = {};
  Object.values(TARGET_SUBFOLDERS).forEach(name => { cardItems[name] = []; });
  const allItemIdsToDelete = [];

  if (existsSync(EAGLE_LIB_IMAGES)) {
    const dirs = readdirSync(EAGLE_LIB_IMAGES);
    for (const d of dirs) {
      const metaPath = join(EAGLE_LIB_IMAGES, d, 'metadata.json');
      if (!existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        if (meta.folders && Array.isArray(meta.folders)) {
          for (const fid of meta.folders) {
            if (TARGET_SUBFOLDERS[fid]) {
              const cardName = TARGET_SUBFOLDERS[fid];
              const files = readdirSync(join(EAGLE_LIB_IMAGES, d)).filter(f => f !== 'metadata.json');
              if (files.length > 0) {
                const filePath = join(EAGLE_LIB_IMAGES, d, files[0]);
                cardItems[cardName].push({
                  id: meta.id,
                  name: meta.name,
                  ext: meta.ext,
                  tags: meta.tags,
                  filePath
                });
                allItemIdsToDelete.push(meta.id);
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  // 2. 将文件整理到 resource/.history/角色卡/<卡名>/
  console.log('\n  📂 整理历史文件并生成 zip 压缩包...');
  const zipDir = resolve(HISTORY_DIR, '_zip');
  mkdirSync(zipDir, { recursive: true });

  const generatedZips = {};

  for (const [cardName, items] of Object.entries(cardItems)) {
    const cardHistDir = resolve(HISTORY_DIR, '角色卡', cardName);
    mkdirSync(cardHistDir, { recursive: true });

    // 复制 Eagle 里的所有历史文件
    for (const item of items) {
      const destName = `${item.name}.${item.ext || 'png'}`;
      const destPath = resolve(cardHistDir, destName);
      if (existsSync(item.filePath)) {
        copyFileSync(item.filePath, destPath);
      }
    }

    // 同时也把当前 resource/角色卡/<卡名>/<卡名>.png 归档进去（当前版本 v1.02/v1.10/v1.20）
    const currentPng = resolve(ROOT, 'resource', '角色卡', cardName, `${cardName}.png`);
    if (existsSync(currentPng)) {
      // 提取当前 changelog 的第二项（即刚刚更新前的旧版本）
      const mdPath = resolve(ROOT, 'resource', '角色卡', cardName, '更新日志.md');
      if (existsSync(mdPath)) {
        const content = readFileSync(mdPath, 'utf8');
        const matches = [...content.matchAll(/^##\s*(v\d+\.\d+)/gm)];
        const prevVer = matches.length > 1 ? matches[1][1] : (matches[0] ? matches[0][1] : 'prev');
        const prevDest = resolve(cardHistDir, `${cardName}_${prevVer}.png`);
        if (!existsSync(prevDest)) {
          copyFileSync(currentPng, prevDest);
        }
      }
    }

    // 压缩打包
    const files = readdirSync(cardHistDir);
    if (files.length === 0) continue;

    const zipPath = resolve(zipDir, `${cardName}_历史版本.zip`);
    if (existsSync(zipPath)) {
      try { unlinkSync(zipPath); } catch {}
    }

    const escapedSrc = cardHistDir.replace(/'/g, "''") + '\\*';
    const escapedDst = zipPath.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${escapedSrc}' -DestinationPath '${escapedDst}' -Force"`,
      { stdio: 'pipe' }
    );

    console.log(`    📦 ${cardName}: 已打包 ${files.length} 个历史文件 → ${cardName}_历史版本.zip`);
    generatedZips[cardName] = zipPath;
  }

  // 3. 上传 zip 到 Eagle 的「角色卡归档/旧版」
  console.log('\n  🦅 上传历史版本 zip 到 Eagle「角色卡归档/旧版」...');
  // 查找「旧版」文件夹 ID
  const foldersRes = await eagleFetch('/api/folder/list', token);
  const foldersData = await foldersRes.json();
  const allFolders = foldersData.data || [];

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

  const archiveFolder = findFolderRecursive(allFolders, '角色卡归档');
  let oldFolder = archiveFolder ? findChildFolder(archiveFolder, '旧版') : null;
  if (!oldFolder && archiveFolder) {
    const createRes = await eagleFetch('/api/folder/create', token, {
      body: { folderName: '旧版', parent: archiveFolder.id }
    });
    const cData = await createRes.json();
    oldFolder = { id: cData.data.id, name: '旧版' };
  }

  const oldFolderId = oldFolder ? oldFolder.id : archiveFolder?.id;

  for (const [cardName, zipPath] of Object.entries(generatedZips)) {
    const displayName = `${cardName}_历史版本`;
    const normalizedPath = zipPath.replace(/\//g, '\\');
    const res = await eagleFetch('/api/item/addFromPath', token, {
      body: {
        path: normalizedPath,
        name: displayName,
        folderId: oldFolderId,
        tags: [cardName, '历史版本', 'zip'],
        annotation: `${cardName} 历史版本归档合集`
      }
    });
    const data = await res.json();
    if (data.status === 'success') {
      console.log(`    ✅ Eagle 归档成功: ${displayName}.zip → 角色卡归档/旧版`);
    } else {
      console.warn(`    ⚠️ Eagle 归档失败 (${displayName}):`, JSON.stringify(data));
    }
  }

  // 4. 将 Eagle 中旧的散落条目移入回收站
  console.log(`\n  🗑️ 清理 Eagle 中 ${allItemIdsToDelete.length} 个旧散落条目...`);
  if (allItemIdsToDelete.length > 0) {
    const trashRes = await eagleFetch('/api/item/moveToTrash', token, {
      body: { itemIds: allItemIdsToDelete }
    });
    const trashData = await trashRes.json();
    if (trashData.status === 'success') {
      console.log('    ✅ 已成功将旧散落条目移入 Eagle 回收站');
    } else {
      console.warn('    ⚠️ 移入回收站失败:', JSON.stringify(trashData));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎉 历史版本整理与 Eagle 清理完成！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => {
  console.error('❌ 执行失败:', e);
  process.exit(1);
});
