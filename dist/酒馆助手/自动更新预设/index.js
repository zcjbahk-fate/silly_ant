// 预设自动更新脚本 (纯本地运行，无外部 CDN 依赖)
function compareVersions(v1, v2) {
  if (!v1 || !v2) return v1 === v2 ? 0 : (!v1 ? -1 : 1);
  const clean = (v) => v.toString().replace(/^[^\d]*/, '').split('.').map(x => parseInt(x, 10) || 0);
  const p1 = clean(v1);
  const p2 = clean(v2);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
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
          toastr.success(`更新预设 '${t.name}' 成功`);
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

async function i(url, type) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (res.ok) return type === 'text' ? res.text() : res.blob();
  throw new Error(`(${res.status}) ${await res.text()}`);
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
      changelogText = await i(vars.更新日志链接, 'text');
      versionTag = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
    } catch (e) {
      console.warn('[自动更新] 获取预设更新日志失败:', e);
    }
  }

  const presetContent = await i(vars.预设链接, 'text');
  const targetPresetName = `${vars.预设名称}` + (versionTag ? versionTag : '');
  const presetData = {
    name: targetPresetName,
    content: presetContent,
    changelog: changelogText || '暂无更新日志'
  };

  const isNotInstalled = !getPresetNames().includes(presetData.name);
  const actions = [a(presetData)];
  if (changelogText) {
    actions.push(s(presetData));
  }

  if (isNotInstalled) {
    actions.forEach(action => {
      eventClearEvent(getButtonEvent(action.name));
      eventOn(getButtonEvent(action.name), action.function);
    });
    replaceScriptButtons(
      _(getScriptButtons())
        .filter(btn => actions.every(act => act.name !== btn.name))
        .concat(actions.map(act => ({ name: act.name, visible: true })))
        .value()
    );
  } else {
    actions.forEach(action => {
      eventClearEvent(getButtonEvent(action.name));
    });
    replaceScriptButtons(
      _(getScriptButtons())
        .filter(btn => actions.every(act => act.name !== btn.name))
        .value()
    );
  }
}));
