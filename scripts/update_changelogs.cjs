const fs = require('fs');
const path = require('path');
const dirs = ['resource/角色卡', 'resource/预设'];
const changelogEntry = `- 修复：预设「更新日志」按钮与角色卡同名残留，新旧按钮名均被清理
- 优化：更新成功后自动刷新页面，无需手动切换`;

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
