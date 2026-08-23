// 预设自动更新脚本 (本地优先 + GitHub 回退，无外部 CDN 依赖)
// ─── 版本比对 ──────────────────────────────────────────
function hasNewerVersion(localVer, remoteVer) {
  if (!remoteVer) return false;
  if (!localVer || localVer === '0.0.0' || localVer === '0' || localVer === '') return true;
  if (localVer.trim() === remoteVer.trim()) return false;

  const semverRegex = /^\D*(\d+(?:\.\d+)*)/;
  const match1 = localVer.toString().match(semverRegex);
  const match2 = remoteVer.toString().match(semverRegex);

  if (match1 && match2) {
    const p1 = match1[1].split('.').map(x => parseInt(x, 10) || 0);
    const p2 = match2[1].split('.').map(x => parseInt(x, 10) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  }

  return localVer.trim() !== remoteVer.trim();
}

// ─── 多源获取：本地优先 → CDN 加速 → GitHub 回退 ─────────
function toLocalUrl(url) {
  const idx = url.indexOf('/resource/');
  if (idx === -1) return null;
  const relativePath = url.substring(idx + '/resource/'.length);
  return 'http://localhost:8787/' + relativePath;
}

function toCdnUrl(url) {
  const match = url.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)/);
  if (!match) return null;
  const [, user, repo, branch, p] = match;
  const encodedPath = p.split('/').map(encodeURIComponent).join('/');
  return `https://testingcf.jsdelivr.net/gh/${user}/${repo}@${branch}/${encodedPath}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchResource(url, type) {
  // ① 尝试本地文件服务器（1 秒超时，本机瞬间返回）
  const localUrl = toLocalUrl(url);
  if (localUrl) {
    try {
      const res = await fetch(localUrl, { cache: 'no-store', signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        console.log('[自动更新] ✅ 本地获取成功:', localUrl);
        return type === 'text' ? res.text() : res.blob();
      }
    } catch (e) {
      console.log('[自动更新] 本地服务器未响应，尝试 CDN / GitHub');
    }
  }

  // ② 尝试 CDN 镜像加速（3 秒超时，国内网络毫秒级直连）
  const cdnUrl = toCdnUrl(url);
  if (cdnUrl) {
    try {
      const sep = cdnUrl.includes('?') ? '&' : '?';
      const noCacheUrl = `${cdnUrl}${sep}_t=${Date.now()}`;
      const res = await fetch(noCacheUrl, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log('[自动更新] ✅ CDN 镜像获取成功:', cdnUrl);
        return type === 'text' ? res.text() : res.blob();
      }
    } catch (e) {
      console.warn('[自动更新] CDN 镜像请求失败，回退到 GitHub Raw:', e.message);
    }
  }

  // ③ 回退到 GitHub Raw（带缓存破坏 + 3 次重试，每次 3 秒超时）
  for (let retry = 0; retry < 3; retry++) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const noCacheUrl = `${url}${sep}_t=${Date.now()}`;
      const res = await fetch(noCacheUrl, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(`[自动更新] ✅ GitHub 获取成功 (第${retry + 1}次)`);
        return type === 'text' ? res.text() : res.blob();
      }
    } catch (e) {
      console.warn(`[自动更新] GitHub 请求失败 (第${retry + 1}次):`, e.message);
    }
    if (retry < 2) await sleep(1000 * (retry + 1));
  }

  // ④ 最终回退：不带缓存破坏的原始请求
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return type === 'text' ? res.text() : res.blob();
  } catch (e) {}

  console.warn('[自动更新] ⚠️ 所有获取方式均失败:', url);
  return null;
}

// ─── Zod 变量 Schema ────────────────────────────────────
const n = (typeof z !== 'undefined') ? z : window.z;
const r = n ? n.z.object({
  预设名称: n.z.string().default('未填写'),
  预设链接: n.z.string().default('未填写'),
  更新日志链接: n.z.string().default('未填写'),
  当前版本: n.z.string().default('0.0.0')
}).prefault({}) : null;

// ─── 按钮：更新预设 ─────────────────────────────────────
function createUpdatePresetAction(presetInfo) {
  const versionDisplay = presetInfo.version ? ` (${presetInfo.version})` : '';
  return {
    name: `更新预设: ${presetInfo.name}${versionDisplay}`,
    function: async () => {
      try {
        const ok = await importRawPreset(presetInfo.name, presetInfo.content);
        if (ok) {
          loadPreset(presetInfo.name);
          toastr.success(`更新预设 '${presetInfo.name}' 成功! 请重新选择预设`);
        } else {
          toastr.error('更新预设失败, 请刷新重试');
        }
      } catch (err) {
        console.error('[自动更新] 更新预设出错:', err);
        toastr.error(`更新预设失败: ${err.message || err}`);
      }
    }
  };
}

// ─── 按钮：更新日志 ─────────────────────────────────────
function createChangelogAction(presetInfo) {
  return {
    name: '更新日志',
    function: () => {
      const renderMd = (md) => {
        if (typeof marked !== 'undefined' && marked.parse) {
          try { return marked.parse(md, { breaks: true }); } catch (e) {}
        }
        return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      };
      Promise.resolve(renderMd(presetInfo.changelog)).then(html => {
        SillyTavern.callGenericPopup(html, SillyTavern.POPUP_TYPE.TEXT, '', {
          leftAlign: true,
          wider: true,
          allowVerticalScrolling: true
        });
      });
    }
  };
}

// ─── 主逻辑 ─────────────────────────────────────────────
$(errorCatched(async () => {
  let vars = getVariables({ type: 'script' }) || {};
  if (r) {
    vars = r.parse(vars);
    insertOrAssignVariables(vars, { type: 'script' });
  }
  if (!vars.预设名称 || vars.预设名称 === '未填写' || !vars.预设链接 || vars.预设链接 === '未填写') {
    return;
  }

  // 获取远程更新日志 & 版本号
  let changelogText = '';
  let remoteVersion = '';
  if (vars.更新日志链接 && vars.更新日志链接 !== '未填写') {
    const result = await fetchResource(vars.更新日志链接, 'text');
    if (result) {
      changelogText = result;
      remoteVersion = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
    }
  }

  // 获取远程预设文件
  const presetContent = await fetchResource(vars.预设链接, 'text');
  if (!presetContent) {
    console.warn('[自动更新] 无法获取远程预设，跳过更新检测');
    return;
  }

  const presetData = {
    name: vars.预设名称,
    version: remoteVersion,
    content: presetContent,
    changelog: changelogText || '暂无更新日志'
  };

  // 版本比对
  const localVersion = vars.当前版本 || '0.0.0';
  const hasUpdate = hasNewerVersion(localVersion, presetData.version);

  console.log(`[自动更新] ${presetData.name} | 本地: [${localVersion}] | 远程: [${presetData.version}] | 需要更新: ${hasUpdate}`);

  const isUpdateRelatedBtn = (btnName) => btnName.startsWith('更新预设') || btnName === '更新日志';

  if (hasUpdate) {
    const actions = [createUpdatePresetAction(presetData)];
    if (changelogText) {
      actions.push(createChangelogAction(presetData));
    }

    actions.forEach(action => {
      eventClearEvent(getButtonEvent(action.name));
      eventOn(getButtonEvent(action.name), action.function);
    });

    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    const newButtons = actions.map(act => ({ name: act.name, visible: true }));
    replaceScriptButtons(remainingButtons.concat(newButtons));

    toastr.info(`检测到预设【${presetData.name}】有新版本: ${presetData.version || '最新版'}`, '预设更新提示');
  } else {
    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    replaceScriptButtons(remainingButtons);
  }
}));
