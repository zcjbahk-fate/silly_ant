const fs = require('fs');
const path = require('path');
const dirs = ['resource/角色卡'];
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
        let minor = parseInt(match[2], 10) + 1;
        const newVer = `v${major}.${minor.toString().padStart(2, '0')}`;
        const newEntry = `## ${newVer}\n\n- 优化：升级自动更新机制，支持本地服务器高速同步与多源加速\n- 优化：规范化发版部署与历史版本压缩包归档管理\n\n`;
        content = content.replace(/(#.*更新日志\s*\n+)/, `$1${newEntry}`);
        fs.writeFileSync(mdPath, content, 'utf8');
        console.log('Updated ' + mdPath + ' to ' + newVer);
      }
    }
  }
}
