// 角色卡自动更新脚本 (纯本地运行，无外部 CDN 依赖)
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
  角色卡名称: n.z.string().default('未填写'),
  角色卡链接: n.z.string().default('未填写'),
  更新日志链接: n.z.string().default('未填写')
}).prefault({}) : null;

function createUpdateCardAction(cardInfo) {
  const versionDisplay = cardInfo.version ? ` (${cardInfo.version})` : '';
  return {
    name: `更新角色卡: ${cardInfo.name}${versionDisplay}`,
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
          toastr.success(`更新角色卡 '${cardInfo.name}' 成功! 请刷新或重新载入`);
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
  // 添加时间戳以绕过 GitHub Raw 的 5 分钟 CDN 缓存
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

  let cardBlob = null;
  try {
    cardBlob = await fetchResource(vars.角色卡链接, 'blob');
  } catch (e) {
    console.warn('[自动更新] 获取远程角色卡文件失败:', e);
    return;
  }

  const cardData = {
    name: vars.角色卡名称,
    version: remoteVersion,
    content: cardBlob,
    changelog: changelogText || '暂无更新日志'
  };

  const localVersion = await getCharacter(cardData.name).then(c => c?.version?.trim() || '0.0.0').catch(() => '0.0.0');
  const hasUpdate = hasNewerVersion(localVersion, cardData.version);

  console.log(`[自动更新] ${cardData.name} 本地版本: [${localVersion}], 远程版本: [${cardData.version}], 是否需要更新: ${hasUpdate}`);

  const isUpdateRelatedBtn = (btnName) => btnName.startsWith('更新角色卡') || btnName === '更新日志';

  if (hasUpdate) {
    const actions = [createUpdateCardAction(cardData)];
    if (changelogText) {
      actions.push(createChangelogAction(cardData));
    }

    // 绑定事件
    actions.forEach(action => {
      eventClearEvent(getButtonEvent(action.name));
      eventOn(getButtonEvent(action.name), action.function);
    });

    // 清理旧的更新按钮并添加新按钮
    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    const newButtons = actions.map(act => ({ name: act.name, visible: true }));
    replaceScriptButtons(remainingButtons.concat(newButtons));

    toastr.info(`检测到角色卡【${cardData.name}】有新版本: ${cardData.version || '最新版'}`, '角色卡更新提示');
  } else {
    // 无更新时，清除更新按钮
    const remainingButtons = _(getScriptButtons()).filter(btn => !isUpdateRelatedBtn(btn.name)).value();
    replaceScriptButtons(remainingButtons);
  }
}));
