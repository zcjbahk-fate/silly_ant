#!/usr/bin/env node
/**
 * Stop Hook: 对话结束前的发版闭环守护
 * 检查是否有已修改但未发版的角色卡或预设，若有则阻止 Agent 停止并提示完成闭环。
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

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

async function main() {
  await readStdin();

  try {
    const gitStatus = execSync('git status --porcelain', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!gitStatus) {
      // 工作区干净，允许结束
      console.log(JSON.stringify({ decision: 'allow' }));
      return;
    }

    // 检查是否有 work/角色卡/ 或 work/预设/ 下的修改
    const lines = gitStatus.split('\n').map(l => l.trim()).filter(Boolean);
    const modifiedWorkCards = new Set();

    for (const line of lines) {
      // 提取文件路径
      const pathPart = line.slice(3).trim();
      const match = pathPart.match(/^work\/(角色卡|预设)\/([^/]+)\//);
      if (match) {
        modifiedWorkCards.add(match[2]);
      }
    }

    if (modifiedWorkCards.size > 0) {
      const cardList = Array.from(modifiedWorkCards).join('、');
      console.log(JSON.stringify({
        decision: 'continue',
        reason: `⚠️【发版闭环守护提醒】检测到以下角色卡/预设有未发版的修改：【${cardList}】。\n` +
          `请确保完成发版闭环操作：\n` +
          `1. 在 resource/ 对应目录下递增更新日志版本并记录修改要点；\n` +
          `2. 运行 node scripts/deploy.mjs <名称> 完成打包、Eagle 归档与 Git 提交！`
      }));
      return;
    }

    // 没有卡片代码层面的待发版变更
    console.log(JSON.stringify({ decision: 'allow' }));
  } catch (err) {
    // 若 git 命令执行异常，不阻塞
    console.log(JSON.stringify({ decision: 'allow' }));
  }
}

main();
