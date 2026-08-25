// 角色卡自动更新脚本 (多源加速：本地优先 → CDN 加速 → GitHub 回退)
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
  角色卡名称: n.z.string().default('未填写'),
  角色卡链接: n.z.string().default('未填写'),
  更新日志链接: n.z.string().default('未填写'),
  当前版本: n.z.string().default('0.0.0')
}).prefault({}) : null;

// ─── 弹窗渲染 Markdown ──────────────────────────────────
function showChangelogPopup(changelogText) {
  const renderMd = (md) => {
    if (typeof marked !== 'undefined' && marked.parse) {
      try { return marked.parse(md, { breaks: true }); } catch (e) {}
    }
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  };
  Promise.resolve(renderMd(changelogText || '暂无更新日志')).then(html => {
    SillyTavern.callGenericPopup(html, SillyTavern.POPUP_TYPE.TEXT, '', {
      leftAlign: true,
      wider: true,
      allowVerticalScrolling: true
    });
  });
}

// ─── 从卡片 Blob 中提取 embedded character_book ───────────
async function extractCharacterBookFromBlob(blob) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // 1. 如果是 JSON 文件
    try {
      const text = new TextDecoder('utf-8').decode(uint8);
      if (text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        return json.data?.character_book || json.character_book || null;
      }
    } catch {}

    // 2. 如果是 PNG 文件
    const dataView = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    let offset = 8;
    while (offset < uint8.length) {
      const length = dataView.getUint32(offset);
      const type = String.fromCharCode(uint8[offset+4], uint8[offset+5], uint8[offset+6], uint8[offset+7]);
      if (type === 'tEXt') {
        const chunkData = uint8.subarray(offset + 8, offset + 8 + length);
        const nullIdx = chunkData.indexOf(0);
        const keyword = String.fromCharCode(...chunkData.subarray(0, nullIdx));
        if (keyword === 'chara' || keyword === 'ccv3') {
          const b64Bytes = chunkData.subarray(nullIdx + 1);
          let b64Str = '';
          for (let i = 0; i < b64Bytes.length; i++) b64Str += String.fromCharCode(b64Bytes[i]);
          const binStr = atob(b64Str);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
          const decoded = new TextDecoder('utf-8').decode(bytes);
          const charObj = JSON.parse(decoded);
          return charObj.data?.character_book || charObj.character_book || null;
        }
      }
      offset += 12 + length;
    }
  } catch (e) {
    console.warn('[自动更新] 解析卡片世界书失败:', e);
  }
  return null;
}

// ─── 按钮：更新角色卡 ───────────────────────────────────
function createUpdateCardAction(cardInfo) {
  const versionDisplay = cardInfo.version ? ` (${cardInfo.version})` : '';
  const btnName = `更新角色卡: ${cardInfo.name}${versionDisplay}`;
  return {
    name: btnName,
    function: async () => {
      try {
        let cardBlob = cardInfo.content;
        if (!cardBlob) {
          toastr.info('正在下载最新角色卡...', '更新中');
          cardBlob = await fetchResource(cardInfo.cardUrl, 'blob');
        }
        if (!cardBlob) {
          toastr.error('下载角色卡失败，请检查网络连接');
          return;
        }

        let primaryWb = null;
        try {
          primaryWb = getCharWorldbookNames('current')?.primary;
        } catch {}
        if (!primaryWb) primaryWb = cardInfo.name;

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
            try {
              if (await createOrReplaceWorldbook(backupName, await getWorldbook(primaryWb))) {
                toastr.success(`已将世界书备份为 '${backupName}'`);
              }
            } catch {}
          }
        }

        // ① 导入最新角色卡图片/数据
        const ok = await importRawCharacter(cardInfo.name, cardBlob);

        // ② 强制覆写已有世界书为最新版，彻底解决酒馆导入不覆盖世界书的缺陷
        let wbUpdated = false;
        try {
          const newWb = await extractCharacterBookFromBlob(cardBlob);
          if (newWb && primaryWb) {
            await createOrReplaceWorldbook(primaryWb, newWb);
            wbUpdated = true;
            console.log(`[自动更新] ✅ 已成功覆盖更新世界书: ${primaryWb}`);
          }
        } catch (wbErr) {
          console.warn('[自动更新] 覆写世界书失败:', wbErr);
        }

        if (ok || wbUpdated) {
          toastr.success(`更新角色卡 '${cardInfo.name}' 成功! 世界书已同步更新为最新版。\n提示：请开启【新对话】以加载最新角色卡设定。2 秒后刷新...`);
          
          // 移除更新按钮并更新本地变量，防止按钮残留
          const currentOthers = _(getScriptButtons()).filter(btn => !btn.name.startsWith('更新角色卡') && btn.name !== '更新日志').value();
          replaceScriptButtons([
            ...currentOthers,
            { name: '更新日志', visible: true }
          ]);
          if (cardInfo.version) {
            insertOrAssignVariables({ 当前版本: cardInfo.version }, { type: 'script' });
          }
          // 自动刷新页面以加载最新角色卡
          setTimeout(() => location.reload(), 2500);
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

// ─── 按钮：更新日志（常驻，点击检查更新 + 展示日志） ─────
function createChangelogAction(vars) {
  return {
    name: '更新日志',
    function: async () => {
      toastr.info('正在获取更新日志并检查版本...', '更新检测');
      let changelogText = '';
      let remoteVersion = '';

      if (vars.更新日志链接 && vars.更新日志链接 !== '未填写') {
        const result = await fetchResource(vars.更新日志链接, 'text');
        if (result) {
          changelogText = result;
          remoteVersion = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
        }
      }

      if (!changelogText) {
        toastr.warning('获取远程更新日志失败，请检查网络连接', '网络提示');
        return;
      }

      // 获取当前版本
      let localVer = vars.当前版本 || '';
      if (!localVer || localVer === '0.0.0') {
        try {
          const char = await getCharacter(vars.角色卡名称);
          localVer = char?.version?.trim() || '0.0.0';
        } catch {
          localVer = '0.0.0';
        }
      }

      const hasUpdate = hasNewerVersion(localVer, remoteVersion);
      showChangelogPopup(changelogText);

      const otherButtons = _(getScriptButtons()).filter(btn => !btn.name.startsWith('更新角色卡') && btn.name !== '更新日志').value();

      if (hasUpdate) {
        const updateAction = createUpdateCardAction({
          name: vars.角色卡名称,
          version: remoteVersion,
          cardUrl: vars.角色卡链接,
          content: null
        });
        eventClearEvent(getButtonEvent(updateAction.name));
        eventOn(getButtonEvent(updateAction.name), updateAction.function);

        replaceScriptButtons([
          ...otherButtons,
          { name: updateAction.name, visible: true },
          { name: '更新日志', visible: true }
        ]);

        toastr.info(`检测到新版本: ${remoteVersion} (当前: ${localVer})，已显示更新按钮`, '发现新版本');
      } else {
        replaceScriptButtons([
          ...otherButtons,
          { name: '更新日志', visible: true }
        ]);
        toastr.success(`当前已是最新版本 (${localVer})`, '版本状态');
      }
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
  if (!vars.角色卡名称 || vars.角色卡名称 === '未填写' || !vars.角色卡链接 || vars.角色卡链接 === '未填写') {
    return;
  }

  // 1. 常驻绑定「更新日志」按钮
  const changelogAction = createChangelogAction(vars);
  eventClearEvent(getButtonEvent(changelogAction.name));
  eventOn(getButtonEvent(changelogAction.name), changelogAction.function);

  // 2. 初始确保「更新日志」按钮存在
  const otherButtons = _(getScriptButtons()).filter(btn => !btn.name.startsWith('更新角色卡') && btn.name !== '更新日志').value();
  replaceScriptButtons([
    ...otherButtons,
    { name: '更新日志', visible: true }
  ]);

  // 3. 静默后台比对版本（不阻塞载入）
  try {
    let changelogText = '';
    let remoteVersion = '';
    if (vars.更新日志链接 && vars.更新日志链接 !== '未填写') {
      const result = await fetchResource(vars.更新日志链接, 'text');
      if (result) {
        changelogText = result;
        remoteVersion = changelogText.match(/^##\s*(.*)\s*$/m)?.[1]?.trim() ?? '';
      }
    }

    if (remoteVersion) {
      let localVer = vars.当前版本 || '';
      if (!localVer || localVer === '0.0.0') {
        try {
          const char = await getCharacter(vars.角色卡名称);
          localVer = char?.version?.trim() || '0.0.0';
        } catch {
          localVer = '0.0.0';
        }
      }

      const hasUpdate = hasNewerVersion(localVer, remoteVersion);
      console.log(`[自动更新] ${vars.角色卡名称} | 本地: [${localVer}] | 远程: [${remoteVersion}] | 需要更新: ${hasUpdate}`);

      if (hasUpdate) {
        const updateAction = createUpdateCardAction({
          name: vars.角色卡名称,
          version: remoteVersion,
          cardUrl: vars.角色卡链接,
          content: null
        });
        eventClearEvent(getButtonEvent(updateAction.name));
        eventOn(getButtonEvent(updateAction.name), updateAction.function);

        const currentOthers = _(getScriptButtons()).filter(btn => !btn.name.startsWith('更新角色卡') && btn.name !== '更新日志').value();
        replaceScriptButtons([
          ...currentOthers,
          { name: updateAction.name, visible: true },
          { name: '更新日志', visible: true }
        ]);

        toastr.info(`检测到角色卡【${vars.角色卡名称}】有新版本: ${remoteVersion}`, '角色卡更新提示');
      } else {
        const currentOthers = _(getScriptButtons()).filter(btn => !btn.name.startsWith('更新角色卡') && btn.name !== '更新日志').value();
        replaceScriptButtons([
          ...currentOthers,
          { name: '更新日志', visible: true }
        ]);
      }
    }
  } catch (e) {
    console.warn('[自动更新] 静默检查版本失败:', e);
  }
}));
