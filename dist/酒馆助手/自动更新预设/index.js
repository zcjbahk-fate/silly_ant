// 预设自动更新脚本 (纯本地运行，无外部 CDN 依赖)
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
    return localVer.trim() !== remoteVer.trim();
  }

  return localVer.trim() !== remoteVer.trim();
}

const n = (typeof z !== 'undefined') ? z : window.z;
const r = n ? n.z.object({
  预设名称: n.z.string().default('未填写'),
  预设链接: n.z.string().default('未填写'),
  更新日志链接: n.z.string().default('未填写')
}).prefault({}) : null;

function a(t) {
  return {
    name: `更新预设: ${t.name}`,
    function: async () => {
      try {
        if (getPresetNames().includes(t.name)) return;
        const ok = await importRawPreset(t.name, t.content);
        if (ok) {
          loadPreset(t.name);
          toastr.success(`更新预设 '${t.name}' 成功! 请重新选择预设`);
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

function s(t) {
  return {
    name: '更新日志',
    function: () => {
      const renderMd = (md) => {
        if (typeof marked !== 'undefined' && marked.parse) {
          try {
            return marked.parse(md, { breaks: true });
          } catch (e) {}
        }
        return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      };
      Promise.resolve(renderMd(t.changelog)).then(html => {
        SillyTavern.callGenericPopup(html, SillyTavern.POPUP_TYPE.TEXT, '', {
          leftAlign: true,
          wider: true,
          allowVerticalScrolling: true
        });
      });
    }
  };
}

async function fetchResource(url, type) {
  const sep = url.includes('?') ? '&' : '?';
  const noCacheUrl = `${url}${sep}_t=${Date.now()}`;
  try {
    const res = await fetch(noCacheUrl, { cache: 'no-store' });
    if (res.ok) return type === 'text' ? res.text() : res.blob();
  } catch (e) {
    console.warn(`[自动更新] 带时间戳请求失败，尝试原始链接: ${url}`, e);
  }
  const fallbackRes = await fetch(url);
  if (fallbackRes.ok) return type === 'text' ? fallbackRes.text() : fallbackRes.blob();
  throw new Error(`(${fallbackRes.status}) ${await fallbackRes.text()}`);
}

$(errorCatched(async () => {
  let vars = getVariables({ type: 'script' }) || {};
  if (r) {
    vars = r.parse(vars);
    insertOrAssignVariables(vars, { type: 'script' });
  }
  if (!vars.预设名称 || vars.预设名称 === '未填写' || !vars.预设链接 || vars.预设链接 === '未填写') {
    return;
  }

  let changelogText = '';
  let versionTag = '';
  if (vars.更新日志链接 && vars.更新日志链接 !== '未填写') {
    try {
      changelogText = await fetchResource(vars.更新日志链接, 'text');
      versionTag = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
    } catch (e) {
      console.warn('[自动更新] 获取预设更新日志失败:', e);
    }
  }

  let presetContent = '';
  try {
    presetContent = await fetchResource(vars.预设链接, 'text');
  } catch (e) {
    console.warn('[自动更新] 获取远程预设文件失败:', e);
    return;
  }

  const targetPresetName = `${vars.预设名称}` + (versionTag ? versionTag : '');
  const presetData = {
    name: targetPresetName,
    content: presetContent,
    changelog: changelogText || '暂无更新日志'
  };

  const isNotInstalled = !getPresetNames().includes(presetData.name);
  const isUpdateRelatedBtn = (btnName) => btnName.startsWith('更新预设') || btnName === '更新日志';

  if (isNotInstalled) {
    const actions = [a(presetData)];
    if (changelogText) {
      actions.push(s(presetData));
    }

    actions.forEach(action => {
      eventClearEvent(getButtonEvent(action.name));
      eventOn(getButtonEvent(action.name), action.function);
    });

    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    const newButtons = actions.map(act => ({ name: act.name, visible: true }));
    replaceScriptButtons(remainingButtons.concat(newButtons));

    toastr.info(`检测到预设【${targetPresetName}】有新版本`, '预设更新提示');
  } else {
    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    replaceScriptButtons(remainingButtons);
  }
}));
