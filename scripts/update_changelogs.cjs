const fs = require('fs');
const path = require('path');
const dirs = ['resource/角色卡', 'resource/预设'];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const mdPath = path.join(dir, item, '更新日志.md');
    if (fs.existsSync(mdPath)) {
      let content = fs.readFileSync(mdPath, 'utf8');
      const match = content.match(/^##\s*v(\d+)\.(\d+)/m);
      if (match) {
        const major = match[1];
        let minor = parseInt(match[2]) + 1;
        const newVer = `v${major}.${minor.toString().padStart(2, '0')}`;
        const newEntry = `## ${newVer}\n\n- 修复：更新完成后「更新角色卡/预设」按钮未消失的问题\n- 优化：更新成功后自动刷新本地版本号变量\n\n`;
        content = content.replace(/(# 更新日志\s*)/, `$1\n${newEntry}`);
        fs.writeFileSync(mdPath, content, 'utf8');
        console.log('Updated ' + mdPath + ' to ' + newVer);
      }
    }
  }
}
