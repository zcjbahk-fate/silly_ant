const fs = require('fs');
const path = require('path');
const dirs = ['resource/角色卡', 'resource/预设'];
const changelogEntry = `- 修复：解决预设脚本干扰导致角色卡「更新日志」按钮无法常驻的问题
- 优化：角色卡更新成功后自动刷新页面以加载最新数据`;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const mdPath = path.join(dir, item, '更新日志.md');
    if (!fs.existsSync(mdPath)) continue;
    let content = fs.readFileSync(mdPath, 'utf8');
    const match = content.match(/^##\s*v(\d+)\.(\d+)/m);
    if (!match) continue;
    const major = match[1];
    const minor = parseInt(match[2]) + 1;
    const newVer = `v${major}.${minor.toString().padStart(2, '0')}`;
    const newEntry = `## ${newVer}\n\n${changelogEntry}\n\n`;
    content = content.replace(/(# 更新日志\s*\n)/, `$1\n${newEntry}`);
    fs.writeFileSync(mdPath, content, 'utf8');
    console.log(`✅ ${mdPath} -> ${newVer}`);
  }
}
