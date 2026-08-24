// zip 打包工具 — 零外部依赖，使用 PowerShell Compress-Archive
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const HISTORY_DIR = resolve(__dirname, '..', 'resource', '.history');

/**
 * 将旧版本导出文件归档到本地历史目录
 * @param {string} exportFilePath - 当前导出文件路径（打包前的旧版本）
 * @param {string} cardName - 角色卡/预设名称
 * @param {string} oldVersion - 旧版本号
 * @param {string} cardType - 类型：角色卡 / 预设 / 世界书
 * @returns {string|null} 归档后的文件路径
 */
export function archiveOldVersion(exportFilePath, cardName, oldVersion, cardType = '角色卡') {
  if (!existsSync(exportFilePath)) return null;

  const historySubDir = resolve(HISTORY_DIR, cardType, cardName);
  mkdirSync(historySubDir, { recursive: true });

  const ext = extname(exportFilePath);
  const versionedName = `${cardName}_${oldVersion || 'unknown'}${ext}`;
  const destPath = resolve(historySubDir, versionedName);

  // 避免重复归档同一版本
  if (existsSync(destPath)) return destPath;

  copyFileSync(exportFilePath, destPath);
  return destPath;
}

/**
 * 将历史目录打包为 zip，返回 zip 文件路径
 * @param {string} cardName - 角色卡/预设名称
 * @param {string} cardType - 类型
 * @returns {string|null} zip 文件路径
 */
export function createHistoryZip(cardName, cardType = '角色卡') {
  const historySubDir = resolve(HISTORY_DIR, cardType, cardName);
  if (!existsSync(historySubDir)) return null;

  // 检查目录中是否有文件
  const files = readdirSync(historySubDir);
  if (files.length === 0) return null;

  const zipDir = resolve(HISTORY_DIR, '_zip');
  mkdirSync(zipDir, { recursive: true });
  const zipPath = resolve(zipDir, `${cardName}_历史版本.zip`);

  // 删除旧 zip
  if (existsSync(zipPath)) {
    try { unlinkSync(zipPath); } catch {}
  }

  // 使用 PowerShell Compress-Archive 打包
  const escapedSrc = historySubDir.replace(/'/g, "''") + '\\*';
  const escapedDst = zipPath.replace(/'/g, "''");
  try {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${escapedSrc}' -DestinationPath '${escapedDst}' -Force"`,
      { stdio: 'pipe', timeout: 30000 }
    );
  } catch (e) {
    console.warn(`    ⚠️ zip 打包失败 (${cardName}):`, e.message);
    return null;
  }

  return existsSync(zipPath) ? zipPath : null;
}
