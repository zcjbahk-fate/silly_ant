#!/usr/bin/env node
/**
 * PreToolUse Hook: 发版前检查
 * 拦截 run_command 中的 deploy 命令。
 * 若更新日志未填写、格式不规范、或版本号未发生递增变更，则返回 deny 取消 deploy 执行。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

// 从 stdin 读取 hook payload
async function readStdin() {
  if (process.stdin.isTTY) return {};
  return new Promise((resolvePromise) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolvePromise(data ? JSON.parse(data) : {});
      } catch {
        resolvePromise({});
      }
    });
    setTimeout(() => {
      process.stdin.destroy();
      resolvePromise({});
    }, 100);
  });
}

function parseConfigs(yamlPath) {
  if (!existsSync(yamlPath)) return [];
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

function normalizeVersion(v) {
  if (!v) return '';
  return v.trim().replace(/^[vV]/, '');
}

function extractVersionFromYaml(yamlPath) {
  if (!existsSync(yamlPath)) return null;
  const content = readFileSync(yamlPath, 'utf-8');
  const vMatch = content.match(/^\s*版本:\s*["']?([^"'\r\n]+)["']?/m);
  if (vMatch) return vMatch[1].trim();
  const cvMatch = content.match(/^\s*当前版本:\s*["']?([^"'\r\n]+)["']?/m);
  if (cvMatch) return cvMatch[1].trim();
  return null;
}

function parseLatestChangelogSection(changelogPath) {
  if (!existsSync(changelogPath)) return null;
  const content = readFileSync(changelogPath, 'utf-8');
  
  const versionRegex = /^##(?![#])\s*([^\r\n]+)/gm;
  const match = versionRegex.exec(content);
  if (!match) return { rawVersion: null, body: '', fullContent: content };

  const rawVersion = match[1].trim();
  const startIndex = match.index + match[0].length;
  
  const nextMatch = versionRegex.exec(content);
  const endIndex = nextMatch ? nextMatch.index : content.length;
  const body = content.slice(startIndex, endIndex).trim();

  return { rawVersion, body, fullContent: content };
}

async function main() {
  const payload = await readStdin();
  const toolCall = payload.toolCall;

  // 1. 如果不是 run_command，直接放行
  if (!toolCall || toolCall.name !== 'run_command') {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const cmd = toolCall.args?.CommandLine || '';
  
  // 2. 检查是否为发版命令 (deploy.mjs 或 npm run deploy)
  const isDeployCmd = /deploy\.mjs|npm\s+run\s+deploy/i.test(cmd);
  if (!isDeployCmd) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  // 3. 解析命令中的目标卡片参数
  const configPath = resolve(ROOT, 'tavern_sync.yaml');
  const allConfigs = parseConfigs(configPath);

  const tokens = cmd.split(/\s+/).filter(Boolean);
  const args = tokens.filter(t => !t.endsWith('deploy.mjs') && !t.startsWith('-') && t !== 'node' && t !== 'npm' && t !== 'run' && t !== 'deploy');

  let targetConfigs = allConfigs;
  if (args.length > 0) {
    targetConfigs = allConfigs.filter(c => args.includes(c.name));
  }

  const cardsToCheck = targetConfigs.filter(c => c.type === '角色卡' || c.type === '预设');
  if (cardsToCheck.length === 0) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const errors = [];

  for (const card of cardsToCheck) {
    const yamlPath = card.localPath ? resolve(ROOT, card.localPath) : null;
    const exportBase = card.exportPath ? resolve(ROOT, card.exportPath) : null;
    const changelogPath = exportBase ? resolve(dirname(exportBase), '更新日志.md') : null;

    if (!changelogPath || !existsSync(changelogPath)) {
      errors.push(`【${card.name}】未找到更新日志文件: resource/${card.type}/${card.name}/更新日志.md`);
      continue;
    }

    const changelogInfo = parseLatestChangelogSection(changelogPath);
    if (!changelogInfo.rawVersion) {
      errors.push(`【${card.name}】更新日志格式错误：顶部缺少版本小节（如 \`## v1.01\`）`);
      continue;
    }

    const cleanBody = changelogInfo.body.replace(/[-*#\s]/g, '');
    if (cleanBody.length < 2) {
      errors.push(`【${card.name}】更新日志的最新版本 [${changelogInfo.rawVersion}] 下未填写具体修改说明！`);
      continue;
    }

    if (yamlPath && existsSync(yamlPath)) {
      const yamlVer = extractVersionFromYaml(yamlPath);
      if (yamlVer) {
        const normYaml = normalizeVersion(yamlVer);
        const normChangelog = normalizeVersion(changelogInfo.rawVersion);

        if (normYaml === normChangelog) {
          errors.push(
            `【${card.name}】版本号未变更！当前主 YAML 版本为 [${yamlVer}]，更新日志最新小节也是 [${changelogInfo.rawVersion}]。\n` +
            `   👉 发版前必须在更新日志顶端新增递增的新版本（如 \`## v${(parseFloat(normYaml) + 0.01).toFixed(2)}\`）并记录修改要点！`
          );
          continue;
        }
      }
    }
  }

  if (errors.length > 0) {
    const reason = `❌ 发版被 Hook 门禁拦截！检测到以下问题：\n\n` +
      errors.map((e, idx) => `${idx + 1}. ${e}`).join('\n\n') +
      `\n\n💡 请先完善更新日志并递增版本号后再执行发版。`;

    console.log(JSON.stringify({
      decision: 'deny',
      reason: reason
    }));
    return;
  }

  console.log(JSON.stringify({ decision: 'allow' }));
}

main().catch(err => {
  console.error('Hook 检查出错:', err);
  console.log(JSON.stringify({ decision: 'allow' }));
});
