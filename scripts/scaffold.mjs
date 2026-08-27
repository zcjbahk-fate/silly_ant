#!/usr/bin/env node
/**
 * 角色卡快速脚手架工具
 * 用法:
 *   node scripts/scaffold.mjs <角色卡名称>
 *   npm run create <角色卡名称>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const cardName = process.argv[2];
if (!cardName) {
  console.error('❌ 请指定角色卡名称！');
  console.log('用法: npm run create <角色卡名称>');
  process.exit(1);
}

const workCardDir = resolve(ROOT, `work/角色卡/${cardName}`);
const resourceCardDir = resolve(ROOT, `resource/角色卡/${cardName}`);
const syncYamlPath = resolve(ROOT, 'tavern_sync.yaml');

if (existsSync(workCardDir)) {
  console.error(`❌ 角色卡目录已存在: work/角色卡/${cardName}`);
  process.exit(1);
}

console.log(`\n🚀 开始创建角色卡【${cardName}】脚手架...\n`);

// 1. 创建工作区目录结构
const dirs = [
  workCardDir,
  resolve(workCardDir, '世界书'),
  resolve(workCardDir, '第一条消息'),
  resolve(workCardDir, '正则'),
  resolve(workCardDir, '脚本'),
  resourceCardDir
];

for (const d of dirs) {
  mkdirSync(d, { recursive: true });
  console.log(`  📁 创建目录: ${d.replace(ROOT, '')}`);
}

// 2. 创建主 YAML 模板
const yamlContent = `# yaml-language-server: $schema=https://testingcf.jsdelivr.net/gh/StageDog/tavern_sync/dist/schema/character.zh.json
头像: 头像
版本: "v1.00"
作者: ""
备注: ""

第一条消息:
  - 文件: 第一条消息\\0

角色描述: ""

锚点: {}

世界书名称: 与角色卡名称相同
条目:
  - 名称: "[核心]核心设定"
    启用: true
    激活策略:
      类型: 蓝灯
    插入位置:
      类型: 角色定义之前
      顺序: 100
    激活概率: 100
    递归:
      不可被其他条目激活: false
      不可激活其他条目: false
    文件: 世界书\\[核心]核心设定

扩展字段:
  正则: []
  酒馆助手:
    脚本库:
      - 名称: 自动更新
        id: 79f220fa-0e7f-4b0c-9c02-e25f8df5e8c1
        启用: true
        类型: 脚本
        文件: ../../公共脚本/自动更新角色卡
        导出时携带:
          数据: true
          按钮: true
        按钮:
          启用: true
          按钮列表:
            - 名称: 更新日志
              可见: true
        数据:
          角色卡名称: ${cardName}
          角色卡链接: https://raw.githubusercontent.com/zcjbahk-fate/silly_ant/refs/heads/main/resource/角色卡/${cardName}/${cardName}.png
          更新日志链接: https://raw.githubusercontent.com/zcjbahk-fate/silly_ant/refs/heads/main/resource/角色卡/${cardName}/更新日志.md
          当前版本: v1.00
    变量: {}
`;

writeFileSync(resolve(workCardDir, `${cardName}.yaml`), yamlContent, 'utf-8');
console.log(`  📄 创建主配置: work/角色卡/${cardName}/${cardName}.yaml`);

// 3. 创建第一条消息
const msg0Content = `（开场白场景描写与第一条对话内容）\n\n<StatusPlaceHolderImpl/>\n`;
writeFileSync(resolve(workCardDir, '第一条消息/0.txt'), msg0Content, 'utf-8');
console.log(`  📄 创建开场白: work/角色卡/${cardName}/第一条消息/0.txt`);

// 4. 创建初始核心世界书条目
const worldbook0Content = `<worldinfo_核心设定>
  世界观背景:
    时代与环境: 现代/都市/异世界
    核心设定:
      - 设定一
      - 设定二

  主要角色:
    ${cardName}:
      身份: 主角
      特征: 特征描述
</worldinfo_核心设定>
`;
writeFileSync(resolve(workCardDir, '世界书/[核心]核心设定.txt'), worldbook0Content, 'utf-8');
console.log(`  📄 创建世界书: work/角色卡/${cardName}/世界书/[核心]核心设定.txt`);

// 5. 创建更新日志
const changelogContent = `# 更新日志\n\n## v1.00\n\n- 初版发布\n`;
writeFileSync(resolve(resourceCardDir, '更新日志.md'), changelogContent, 'utf-8');
console.log(`  📄 创建更新日志: resource/角色卡/${cardName}/更新日志.md`);

// 6. 在 tavern_sync.yaml 中注册配置
if (existsSync(syncYamlPath)) {
  let syncContent = readFileSync(syncYamlPath, 'utf-8');
  const cardConfigBlock = `  ${cardName}:
    类型: 角色卡
    酒馆中的名称: ${cardName}
    本地文件路径: work/角色卡/${cardName}/${cardName}.yaml
    导出文件路径: resource/角色卡/${cardName}/${cardName}\n`;

  // 插入到 配置: 下方
  if (/^配置:\s*$/m.test(syncContent)) {
    syncContent = syncContent.replace(/^配置:\s*$/m, `配置:\n${cardConfigBlock}`);
    writeFileSync(syncYamlPath, syncContent, 'utf-8');
    console.log(`  🔗 已在 tavern_sync.yaml 中自动注册【${cardName}】`);
  }
}

console.log(`\n🎉 角色卡【${cardName}】创建完成！`);
console.log(`👉 接下来放入 头像.png，编写世界书和消息后，运行 npm run deploy ${cardName} 一键发版。\n`);
