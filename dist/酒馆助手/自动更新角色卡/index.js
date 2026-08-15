// 角色卡自动更新脚本 (纯本地运行，无外部 CDN 依赖)
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
  角色卡名称: n.z.string().default('未填写'),
  角色卡链接: n.z.string().default('未填写'),
  更新日志链接: n.z.string().default('未填写')
}).prefault({}) : null;

function createUpdateCardAction(cardInfo) {
  return {
    name: `更新角色卡: ${cardInfo.name}${cardInfo.version ? ' (' + cardInfo.version + ')' : ''}`,
    function: async () => {
      try {
        const primaryWb = getCharWorldbookNames('current')?.primary;
        if (primaryWb) {
          const choice = await SillyTavern.callGenericPopup(
            '更新角色卡将会覆盖掉现在的世界书, 你需要备份吗?',
            SillyTavern.POPUP_TYPE.CONFIRM,
            '',
            {
              leftAlign: true,
              customButtons: ['备份并更新'],
              okButton: '仅更新',
              cancelButton: '取消',
              wide: true
            }
          );
          if (!choice) return;
          if (choice === 2) {
            const backupName = `${primaryWb} (备份)`;
            if (await createOrReplaceWorldbook(backupName, await getWorldbook(primaryWb))) {
              toastr.success(`已将世界书备份为 '${backupName}'`);
            }
          }
        }
        const ok = await importRawCharacter(cardInfo.name, cardInfo.content);
        if (ok) {
          replaceCharacter(cardInfo.name, { version: cardInfo.version });
          toastr.success(`更新角色卡 '${cardInfo.name}' 成功`);
        } else {
          toastr.error('更新角色卡失败, 请刷新重试');
        }
      } catch (err) {
        console.error('[自动更新] 更新角色卡出错:', err);
        toastr.error(`更新角色卡失败: ${err.message || err}`);
      }
    }
  };
}

function createChangelogAction(cardInfo) {
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
      Promise.resolve(renderMd(cardInfo.changelog)).then(html => {
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
  if (!vars.角色卡名称 || vars.角色卡名称 === '未填写' || !vars.角色卡链接 || vars.角色卡链接 === '未填写') {
    return;
  }

  let changelogText = '';
  let remoteVersion = '';
  if (vars.更新日志链接 && vars.更新日志链接 !== '未填写') {
    try {
      changelogText = await fetchResource(vars.更新日志链接, 'text');
      remoteVersion = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
    } catch (e) {
      console.warn('[自动更新] 获取更新日志失败:', e);
    }
  }

  const cardBlob = await fetchResource(vars.角色卡链接, 'blob');
  const cardData = {
    name: vars.角色卡名称,
    version: remoteVersion,
    content: cardBlob,
    changelog: changelogText || '暂无更新日志'
  };

  const localVersion = await getCharacter(cardData.name).then(c => c?.version?.trim() || '0.0.0').catch(() => '0.0.0');
  let hasUpdate = false;
  try {
    if (cardData.version) {
      hasUpdate = compareVersions(localVersion, cardData.version) < 0;
    }
  } catch (err) {
    hasUpdate = localVersion !== cardData.version && cardData.version !== '';
  }

  const actions = [createUpdateCardAction(cardData)];
  if (changelogText) {
    actions.push(createChangelogAction(cardData));
  }

  if (hasUpdate) {
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
