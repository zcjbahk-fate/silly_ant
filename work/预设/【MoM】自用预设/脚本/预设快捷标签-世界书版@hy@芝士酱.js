$(
  (() => {
    "use strict";

    // --- [v7.467 配置与常量 (增强透明度与玻璃感)] ---
    const BUTTON_ID = "preset-tagger-ext-button";
    const PANEL_ID = "preset-tagger-panel";
    const FLOATING_BALL_ID = "preset-tagger-floating-ball";
    const QUICK_MENU_ID = "preset-tagger-quick-menu";
    const MAIN_OVERLAY_CLS = "preset-tagger-main-overlay";
    const QUICK_OVERLAY_CLS = "preset-tagger-quick-overlay";
    const CUSTOMIZE_OVERLAY_CLS = "preset-tagger-customize-overlay";
    const CUSTOMIZE_PANEL_ID = "preset-tagger-customize-panel";
    const STYLE_ID = "preset-tagger-styles";
    const THEME_STYLE_ID = "preset-tagger-theme";
    const STORAGE_KEY = "presetTagger_settings";
    const PLACEHOLDER_PROMPT_IDS = [
      "worldInfoBefore",
      "personaDescription",
      "charDescription",
      "charPersonality",
      "scenario",
      "worldInfoAfter",
      "dialogueExamples",
      "chatHistory",
    ];

    let isInitialized = false;
    let isBallDragging = false;
    let allPresetsCache = null;
    let lastScrollPosition = 0;

    let settings = {
      selectedByPreset: {}, // { [presetName]: { [uid]: { id?, name, idx? } } }
      selectedOrderByPreset: {}, // { [presetName]: string[] }
      groupsByPreset: {}, // { [presetName]: Array<{ id,name,collapsed,members[] }> }
      showBall: false,
      ballPosition: { left: null, top: null },
      ballColor: { r: 240, g: 240, b: 240, a: 0.6 },
      themeMode: "light", // 'light' | 'dark'
      // 世界书功能
      selectedWorldbooks: {}, // { [wbName]: true } - 已选择加入快捷菜单的世界书
      worldbookOrder: [], // 世界书排序
      worldbookGroups: [], // 世界书分组 { id, name, collapsed, members[] }
      currentFunctionTab: "preset", // 'preset' | 'worldbook' - 当前功能标签
    };

    const log = (m, ...a) => console.log(`[PresetTagger] ${m}`, ...a);

    // --- 工具函数 ---
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const hexToRgb = (hex) => {
      let h = (hex || "").replace("#", "").trim();
      if (!h) return { r: 240, g: 240, b: 240 };
      if (h.length === 3)
        h = h
          .split("")
          .map((c) => c + c)
          .join("");
      const x = parseInt(h, 16);
      return { r: (x >> 16) & 255, g: (x >> 8) & 255, b: x & 255 };
    };
    const rgbToHex = (r, g, b) => {
      const s = (n) => clamp(n, 0, 255).toString(16).padStart(2, "0");
      return `#${s(r)}${s(g)}${s(b)}`;
    };
    const _srgbToLin = (u) => {
      u /= 255;
      return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
    };
    const luminance = (r, g, b) =>
      0.2126 * _srgbToLin(r) + 0.7152 * _srgbToLin(g) + 0.0722 * _srgbToLin(b);
    const mix = (r1, g1, b1, r2, g2, b2, t) => ({
      r: Math.round(r1 * (1 - t) + r2 * t),
      g: Math.round(g1 * (1 - t) + g2 * t),
      b: Math.round(b1 * (1 - t) + b2 * t),
    });
    const toRgb = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
    const toRgba = ({ r, g, b }, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;
    const textOn = (bg) =>
      luminance(bg.r, bg.g, bg.b) < 0.6 ? "#ffffff" : "#0b1220";

    // RGB <-> HSV
    function rgbToHsv(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (d !== 0) {
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h *= 60;
      }
      const s = max === 0 ? 0 : d / max;
      const v = max;
      return { h, s, v };
    }
    function hsvToRgb(h, s, v) {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0,
        g = 0,
        b = 0;
      if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
      };
    }

    // --- 保存/加载 ---
    function saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        log("保存设置失败:", e);
      }
    }
    function loadSettings() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const loaded = JSON.parse(saved);
          settings = {
            selectedByPreset: {},
            selectedOrderByPreset: {},
            groupsByPreset: {},
            showBall: false,
            ballPosition: { left: null, top: null },
            ballColor: { r: 240, g: 240, b: 240, a: 0.6 },
            themeMode: "light",
            selectedWorldbooks: {},
            worldbookOrder: [],
            worldbookGroups: [],
            currentFunctionTab: "preset",
            ...loaded,
          };
          settings.selectedOrderByPreset ||= {};
          settings.groupsByPreset ||= {};
          settings.selectedWorldbooks ||= {};
          settings.worldbookOrder ||= [];
          settings.worldbookGroups ||= [];
          settings.currentFunctionTab ||= "preset";
        }
      } catch (e) {
        log("加载设置失败:", e);
      }
    }

    // --- SillyTavern 交互 ---
    function getAllSillyTavernPresets() {
      if (allPresetsCache) return allPresetsCache;
      const all = {};
      try {
        const names = window.parent.TavernHelper.getPresetNames();
        for (const n of names) {
          try {
            const p = window.parent.TavernHelper.getPreset(n);
            if (p && Array.isArray(p.prompts)) all[n] = p;
          } catch (err) {
            log(`预设 '${n}' 加载失败，跳过:`, err.message);
          }
        }
      } catch (error) {
        log("获取预设列表出错:", error);
        toastr?.error?.("无法加载预设列表，请检查控制台。");
        return {};
      }
      allPresetsCache = all;
      return all;
    }

    // --- 选择结构 & UID ---
    const getSelectedMap = (presetName) =>
      (settings.selectedByPreset[presetName] ||= {});
    const getSelectedOrder = (presetName) =>
      (settings.selectedOrderByPreset[presetName] ||= []);

    function ensureOrderArray(presetName) {
      const m = getSelectedMap(presetName);
      let arr = getSelectedOrder(presetName);
      arr = arr.filter((uid) => !!m[uid]);
      const missing = Object.keys(m).filter((uid) => !arr.includes(uid));
      settings.selectedOrderByPreset[presetName] = [...arr, ...missing];
      saveSettings();
    }

    // --- 分组选项 ---
    function getGroups(presetName) {
      if (!settings.groupsByPreset) settings.groupsByPreset = {};
      return (settings.groupsByPreset[presetName] ||= []);
    }

    function ensureGroupsCleanupForPreset(presetName) {
      const m = getSelectedMap(presetName);
      const groups = getGroups(presetName);
      groups.forEach((g) => {
        g.members = (g.members || []).filter((uid) => !!m[uid]);
      });
    }

    function findGroupById(presetName, gid) {
      const groups = getGroups(presetName);
      return groups.find((g) => g.id === gid) || null;
    }

    // --- 世界书辅助函数 ---
    function getSelectedWorldbooks() {
      if (!settings.selectedWorldbooks) settings.selectedWorldbooks = {};
      return settings.selectedWorldbooks;
    }

    function getWorldbookOrder() {
      if (!settings.worldbookOrder) settings.worldbookOrder = [];
      return settings.worldbookOrder;
    }

    function getWorldbookGroups() {
      if (!settings.worldbookGroups) settings.worldbookGroups = [];
      return settings.worldbookGroups;
    }

    function ensureWorldbookOrderArray() {
      const m = getSelectedWorldbooks();
      let arr = getWorldbookOrder();
      arr = arr.filter((name) => !!m[name]);
      const missing = Object.keys(m).filter((name) => !arr.includes(name));
      settings.worldbookOrder = [...arr, ...missing];
      saveSettings();
    }

    function ensureWorldbookGroupsCleanup() {
      const m = getSelectedWorldbooks();
      const groups = getWorldbookGroups();
      groups.forEach((g) => {
        g.members = (g.members || []).filter((name) => !!m[name]);
      });
    }

    function findWorldbookGroupById(gid) {
      const groups = getWorldbookGroups();
      return groups.find((g) => g.id === gid) || null;
    }

    function isWorldbookSelected(wbName) {
      return !!getSelectedWorldbooks()[wbName];
    }

    function setWorldbookSelected(wbName, flag) {
      const m = getSelectedWorldbooks();
      const order = getWorldbookOrder();
      if (flag) {
        m[wbName] = true;
        if (!order.includes(wbName)) order.push(wbName);
      } else {
        delete m[wbName];
        const i = order.indexOf(wbName);
        if (i >= 0) order.splice(i, 1);
        const groups = getWorldbookGroups();
        groups.forEach((g) => {
          g.members = (g.members || []).filter((x) => x !== wbName);
        });
      }
      settings.selectedWorldbooks = m;
      settings.worldbookOrder = order;
      saveSettings();
    }

    async function toggleWorldbookGlobal(wbName, enabled) {
      try {
        const current = window.parent.TavernHelper.getGlobalWorldbookNames();
        let newList;
        if (enabled) {
          newList = current.includes(wbName) ? current : [...current, wbName];
        } else {
          newList = current.filter((n) => n !== wbName);
        }
        await window.parent.TavernHelper.rebindGlobalWorldbooks(newList);
      } catch (error) {
        log("切换世界书全局状态出错:", error);
        window.parent.toastr?.error?.("切换世界书状态失败！");
      }
    }

    // 自动清理不存在的世界书，返回被清理的名称列表
    function cleanupInvalidWorldbooks(showToast = true) {
      try {
        const systemWbs = new Set(
          window.parent.TavernHelper.getWorldbookNames() || [],
        );
        const selected = getSelectedWorldbooks();
        const invalid = Object.keys(selected).filter(
          (name) => !systemWbs.has(name),
        );
        if (invalid.length > 0) {
          invalid.forEach((name) => delete selected[name]);
          settings.worldbookOrder = getWorldbookOrder().filter((n) =>
            systemWbs.has(n),
          );
          getWorldbookGroups().forEach((g) => {
            g.members = (g.members || []).filter((n) => systemWbs.has(n));
          });
          saveSettings();
          log(`已清理 ${invalid.length} 个无效世界书: ${invalid.join(", ")}`);
          if (showToast) {
            const names =
              invalid.length <= 3
                ? invalid.join("、")
                : `${invalid.slice(0, 3).join("、")} 等${invalid.length}个`;
            window.parent.toastr?.info?.(`已自动清理不存在的世界书：${names}`);
          }
          return invalid;
        }
        return [];
      } catch (e) {
        log("清理无效世界书时出错:", e);
        return [];
      }
    }

    function buildNameIndexMap(prompts) {
      const map = {};
      const idxByPromptId = new Map();
      prompts.forEach((p) => {
        const nm = p.name || "";
        if (!nm) return;
        map[nm] = (map[nm] || 0) + 1;
        idxByPromptId.set(p, map[nm]);
      });
      return idxByPromptId;
    }

    function makeUid(p, idxMap) {
      if (p?.id) return `id:${p.id}`;
      const nm = p?.name || "";
      const idx = Math.max(1, idxMap.get(p) || 1);
      return `name:${nm}#${idx}`;
    }
    function parseNameUid(uid) {
      const m = /^name:(.*)#(\d+)$/.exec(uid || "");
      if (!m) return null;
      return { name: m[1], idx: parseInt(m[2], 10) || 1 };
    }
    function findPromptByUidInPreset(preset, uid, selObj) {
      if (!preset?.prompts) return null;
      if (uid?.startsWith("id:")) {
        const id = selObj?.id || uid.slice(3);
        return preset.prompts.find((pp) => pp.id === id) || null;
      }
      const parsed = parseNameUid(uid);
      if (!parsed) return null;
      const list = preset.prompts.filter(
        (pp) => (pp.name || "") === parsed.name,
      );
      if (list.length === 0) return null;
      const i = clamp(parsed.idx, 1, list.length) - 1;
      return list[i] || null;
    }

    // --- 迁移 ---
    function migrateSelectionsIfNeeded() {
      let migratedAny = false;
      if (settings.selectedPrompts) {
        try {
          const cur =
            window.parent?.TavernHelper?.getLoadedPresetName?.() || "in_use";
          const m = getSelectedMap(cur);
          for (const oldId in settings.selectedPrompts) {
            const uid = `id:${oldId}`;
            if (!m[uid]) m[uid] = { id: oldId, name: "" };
          }
          delete settings.selectedPrompts;
          migratedAny = true;
        } catch (e) {
          log("旧版 selectedPrompts 迁移失败:", e);
        }
      }
      try {
        const all = getAllSillyTavernPresets();
        for (const presetName in settings.selectedByPreset) {
          const m = settings.selectedByPreset[presetName] || {};
          const preset = all[presetName];
          if (!preset?.prompts) continue;

          const newM = {};
          Object.keys(m).forEach((uid) => {
            if (uid.startsWith("id:")) {
              newM[uid] = m[uid];
              return;
            }
            if (uid.startsWith("name:") && !/#\d+$/.test(uid)) {
              const nm = uid.slice(5);
              const list = preset.prompts.filter(
                (pp) => (pp.name || "") === nm,
              );
              const idx = list.length > 0 ? 1 : 1;
              const newUid = `name:${nm}#${idx}`;
              newM[newUid] = { name: nm, idx };
              migratedAny = true;
            } else {
              newM[uid] = m[uid];
            }
          });
          settings.selectedByPreset[presetName] = newM;
          ensureOrderArray(presetName);
        }
      } catch (e) {
        log("UID 规范化失败:", e);
      }

      if (migratedAny) {
        saveSettings();
        try {
          toastr?.info?.("已迁移旧版选择数据到新格式");
        } catch (_) {}
      }
    }

    function isSelected(presetName, p, idxMap) {
      const m = getSelectedMap(presetName);
      const uid = makeUid(p, idxMap);
      return !!m[uid];
    }
    function setSelected(presetName, p, idxMap, flag) {
      const m = getSelectedMap(presetName);
      const order = getSelectedOrder(presetName);
      const uid = makeUid(p, idxMap);
      if (flag) {
        if (uid.startsWith("id:")) m[uid] = { id: p.id, name: p.name || "" };
        else {
          const parsed = parseNameUid(uid);
          m[uid] = { name: parsed.name, idx: parsed.idx };
        }
        if (!order.includes(uid)) order.push(uid);
      } else {
        delete m[uid];
        const i = order.indexOf(uid);
        if (i >= 0) order.splice(i, 1);
        const groups = getGroups(presetName);
        groups.forEach((g) => {
          g.members = (g.members || []).filter((x) => x !== uid);
        });
      }
      settings.selectedByPreset[presetName] = m;
      settings.selectedOrderByPreset[presetName] = order;
      saveSettings();
    }

    // --- 主题 ---
    function ensureThemeStyleTag() {
      const doc = window.parent.document;
      if (!doc.getElementById(THEME_STYLE_ID)) {
        const tag = doc.createElement("style");
        tag.id = THEME_STYLE_ID;
        doc.head.appendChild(tag);
      }
    }

    // --- 核心：玻璃拟态样式生成 (v2.3 - 增强透明度/玻璃感) ---
    function applyThemeFromBallColor() {
      ensureThemeStyleTag();
      const doc = window.parent.document;

      let surface,
        headerBg,
        hoverBg,
        selectedBg,
        borderCol,
        accentCol,
        btnBg,
        btnHover;
      let textMain, textStrong, textHeader, textBtn;
      let glassGradient, glassShadow, panelBorder, itemBorder;
      let inputBg, inputBorder, selRowBg, selRowHover;
      let toolbarBtnBg, toolbarBtnColor, toolbarBtnBorder;

      const c = settings.ballColor || { r: 240, g: 240, b: 240, a: 0.6 };
      const primary = { r: c.r, g: c.g, b: c.b };

      // 玻璃拟态核心参数：大幅降低 Alpha 值，使其更像玻璃
      if (settings.themeMode === "dark") {
        // 深色玻璃：低不透明度 (0.5 - 0.7)
        surface = { r: 15, g: 20, b: 30 };

        // 背景变得更透明，依赖 blur 提供可读性
        glassGradient = `linear-gradient(145deg, ${toRgba(primary, 0.15)}, ${toRgba({ r: 10, g: 15, b: 25 }, 0.5)} 90%)`;
        panelBorder = `1px solid rgba(255, 255, 255, 0.15)`;
        glassShadow = `0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.08)`;

        accentCol = primary;

        textMain = "#f0f0f0";
        textStrong = "#ffffff";
        textHeader = "#ffffff";
        textBtn = "#ffffff";

        // 按钮半透明
        btnBg = `rgba(255, 255, 255, 0.1)`;
        btnHover = `rgba(255, 255, 255, 0.2)`;
        itemBorder = `rgba(255, 255, 255, 0.1)`;

        toolbarBtnBg = "rgba(255, 255, 255, 0.1)";
        toolbarBtnBorder = "rgba(255, 255, 255, 0.2)";
        toolbarBtnColor = "#ffffff";

        inputBg = "rgba(0,0,0,0.5)"; // 输入框半透明
        inputBorder = "rgba(255,255,255,0.25)";

        selRowBg = "rgba(60, 60, 70, 0.4)"; // 已选条目更通透
        selRowHover = "rgba(80, 80, 90, 0.7)";
      } else {
        // 浅色玻璃：低不透明度
        surface = { r: 255, g: 255, b: 255 };

        // 浅色玻璃：主题混色 0.02-0.05
        const tint1 = mix(255, 255, 255, primary.r, primary.g, primary.b, 0.05);
        const tint2 = mix(250, 250, 252, primary.r, primary.g, primary.b, 0.1);

        // 从 0.95 降至 0.7 左右，实现通透
        glassGradient = `linear-gradient(135deg, ${toRgba(tint1, 0.95)}, ${toRgba(tint2, 0.55)})`;

        const borderTone = mix(
          100,
          100,
          100,
          primary.r,
          primary.g,
          primary.b,
          0.5,
        );
        panelBorder = `1px solid ${toRgba(borderTone, 0.25)}`;
        glassShadow = `0 20px 40px -10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.6)`;

        accentCol = primary;

        textMain = "#050505";
        textStrong = "#000000";
        textHeader = "#111111";
        textBtn = "#000000";

        btnBg = `rgba(255, 255, 255, 0.5)`;
        btnHover = `rgba(255, 255, 255, 0.8)`;
        itemBorder = `rgba(0, 0, 0, 0.1)`;

        toolbarBtnBg = "rgba(255, 255, 255, 0.5)";
        toolbarBtnBorder = "rgba(0, 0, 0, 0.15)";
        toolbarBtnColor = "#111827";

        inputBg = "rgba(255,255,255,0.6)";
        inputBorder = "rgba(0,0,0,0.2)";

        selRowBg = "rgba(255, 255, 255, 0.4)";
        selRowHover = "rgba(255, 255, 255, 0.7)";
      }

      // 生成 CSS
      const css = `
        /* 面板通用：强玻璃拟态 */
        #${PANEL_ID}, #${QUICK_MENU_ID}, #${CUSTOMIZE_PANEL_ID} {
            background: ${glassGradient} !important;
            backdrop-filter: blur(12px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
            box-shadow: ${glassShadow} !important;
            border: ${panelBorder} !important;
            border-radius: 20px !important;
            color: ${textMain} !important;
        }

        /* 头部与底部 */
        #${PANEL_ID} .panel-header, #${CUSTOMIZE_PANEL_ID} .cz-header {
            background: transparent !important;
            border-bottom: 1px solid ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
        }
        #${PANEL_ID} .panel-header h4, #${CUSTOMIZE_PANEL_ID} .cz-header h5 {
            color: ${textHeader} !important;
            text-shadow: ${settings.themeMode === "dark" ? "0 1px 2px rgba(0,0,0,0.5)" : "none"} !important;
            font-weight: 800 !important;
        }
        #${PANEL_ID} .panel-footer, #${CUSTOMIZE_PANEL_ID} .cz-footer {
            background: transparent !important;
            border-top: 1px solid ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
        }

        /* 预设列表当前项 */
        #${PANEL_ID} .current-preset {
            background: ${settings.themeMode === "dark" ? toRgba(accentCol, 0.3) : toRgba(accentCol, 0.25)} !important;
            border: 1px solid ${toRgba(accentCol, 0.4)} !important;
            border-left: 5px solid ${toRgb(accentCol)} !important;
            color: ${textStrong} !important;
            box-shadow: 0 4px 12px ${toRgba(accentCol, 0.15)} !important;
            font-weight: 600;
        }
        
        /* 普通列表项 */
        .prompt-item, #${PANEL_ID} .list-group-item {
            color: ${textMain} !important;
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.3)"} !important;
            border: 1px solid ${itemBorder} !important;
            backdrop-filter: blur(4px);
            transition: all 0.2s ease !important;
        }
        .prompt-item:hover, #${PANEL_ID} .list-group-item:not(.current-preset):hover {
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"} !important;
            border-color: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"} !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        /* 选中状态 */
        .prompt-item.is-selected {
            background: ${settings.themeMode === "dark" ? toRgba(accentCol, 0.3) : toRgba(accentCol, 0.25)} !important;
            border: 1px solid ${toRgba(accentCol, 0.5)} !important;
            color: ${textStrong} !important;
            font-weight: 600;
        }

        /* 按钮 */
        #${PANEL_ID} .back-button, 
        #${PANEL_ID} .panel-footer .customize-button, 
        #${PANEL_ID} .theme-toggle,
        #${PANEL_ID} .import-button, /* 新增 */
        #${PANEL_ID} .export-button, /* 新增 */
        #${CUSTOMIZE_PANEL_ID} .btn,
        #${CUSTOMIZE_PANEL_ID} .theme-btn,
        #${PANEL_ID} .sel-toolbar button,
        #${PANEL_ID} .sel-group-add-actions button {
            background: ${toolbarBtnBg} !important;
            border: 1px solid ${toolbarBtnBorder} !important;
            color: ${toolbarBtnColor} !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            backdrop-filter: blur(4px);
            font-weight: 600 !important;
        }
        #${PANEL_ID} .back-button:hover, 
        #${PANEL_ID} .panel-footer .customize-button:hover, 
        #${PANEL_ID} .theme-toggle:hover,
        #${PANEL_ID} .import-button:hover, /* 新增 */
        #${PANEL_ID} .export-button:hover, /* 新增 */
        #${CUSTOMIZE_PANEL_ID} .btn:hover,
        #${CUSTOMIZE_PANEL_ID} .theme-btn:hover,
        #${PANEL_ID} .sel-toolbar button:hover,
        #${PANEL_ID} .sel-group-add-actions button:hover {
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"} !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0,0,0,0.1) !important;
            border-color: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} !important;
        }

        /* 工具栏按钮激活状态 */
         #${PANEL_ID} .sel-toolbar .sel-view-mode-btn.active {
            background: ${toRgba(accentCol, 0.9)} !important;
            color: #ffffff !important;
            border-color: transparent !important;
            box-shadow: 0 2px 6px ${toRgba(accentCol, 0.4)} !important;
         }
        
        /* 输入框 */
        #${PANEL_ID} .prompt-toolbar input, #${CUSTOMIZE_PANEL_ID} .fields input {
            background: ${inputBg} !important;
            color: ${textMain} !important;
            border: 1px solid ${inputBorder} !important;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        #${PANEL_ID} .prompt-toolbar input:focus, #${CUSTOMIZE_PANEL_ID} .fields input:focus {
            background: ${settings.themeMode === "dark" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)"} !important;
            border-color: ${toRgba(accentCol, 0.8)} !important;
            box-shadow: 0 0 0 2px ${toRgba(accentCol, 0.3)} !important;
        }
        #${PANEL_ID} .prompt-toolbar input::placeholder {
             color: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)"} !important;
        }

        /* 标签切换器 */
        #${PANEL_ID} .tab-btn {
            background: transparent !important;
            border: none !important;
            color: ${textMain} !important;
            opacity: 0.6;
            border-radius: 8px !important;
            padding: 6px 12px !important;
        }
        #${PANEL_ID} .tab-btn.active {
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"} !important;
            color: ${textStrong} !important;
            opacity: 1;
            font-weight: 700;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important;
        }

        /* 已选列表项 - 通透 */
        #${PANEL_ID} .sel-row {
            background: ${selRowBg} !important;
            border: 1px solid ${itemBorder} !important;
            backdrop-filter: blur(8px);
        }
        #${PANEL_ID} .sel-row:hover {
            background: ${selRowHover} !important;
            border-color: ${toRgba(accentCol, 0.5)} !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        #${PANEL_ID} .sel-placeholder { 
            border: 2px dashed ${toRgba(accentCol, 0.6)} !important; 
            background: rgba(128,128,128,0.1);
        }
        
        /* 列表内小按钮 */
        #${PANEL_ID} .pill-remove, #${PANEL_ID} .pill-group {
             display: flex !important; align-items: center; justify-content: center;
             color: ${textMain} !important;
             opacity: 0.7;
             background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} !important;
             border-radius: 6px !important;
             transition: all 0.15s !important;
        }
        #${PANEL_ID} .pill-remove:hover, #${PANEL_ID} .pill-group:hover {
             opacity: 1;
             background: ${settings.themeMode === "dark" ? "rgba(255,60,60,0.5)" : "rgba(220,38,38,0.15)"} !important;
             transform: scale(1.1);
             color: ${settings.themeMode === "dark" ? "#fff" : "#b91c1c"} !important;
        }
        #${PANEL_ID} .pill-group:hover {
             background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)"} !important;
             color: ${textStrong} !important;
        }

        /* 分组标题与操作 */
        #${PANEL_ID} .sel-group-header {
            color: ${textHeader} !important;
            background: ${settings.themeMode === "dark" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.5)"};
            padding: 6px 8px !important;
            border-radius: 8px;
            margin-bottom: 4px;
            border: 1px solid ${settings.themeMode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"};
        }
        #${PANEL_ID} .sel-group-header:hover {
             background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)"};
        }
        #${PANEL_ID} .sel-group-actions button {
            opacity: 0.7;
            border-radius: 4px;
            padding: 2px;
            color: ${textMain} !important;
        }
        #${PANEL_ID} .sel-group-actions button:hover {
            opacity: 1;
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"};
        }

        /* 分组添加面板 */
        #${PANEL_ID} .sel-group-add-panel {
            background: ${settings.themeMode === "dark" ? "rgba(30,30,35,0.9)" : "rgba(255,255,255,0.95)"} !important;
            border: 1px solid ${toRgba(accentCol, 0.5)} !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
            color: ${textMain} !important;
            backdrop-filter: blur(16px);
        }
        #${PANEL_ID} .sel-group-add-title {
            color: ${textStrong} !important;
            border-bottom: 1px solid ${itemBorder};
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        #${PANEL_ID} .sel-group-add-item {
            padding: 6px 8px !important;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            color: ${textMain} !important;
        }
        #${PANEL_ID} .sel-group-add-item:hover {
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
        }
        #${PANEL_ID} .sel-group-add-item input[type="checkbox"] {
            flex-shrink: 0 !important;
            margin-right: 8px !important;
            transform: scale(1.1);
            accent-color: ${toRgb(accentCol)};
        }

        /* 计数器 */
        #${QUICK_MENU_ID} .quick-group-counter {
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
            color: ${textMain} !important;
            padding: 1px 6px;
            border-radius: 10px;
            font-weight: 600;
        }

        /* 快速菜单 */
        #${QUICK_MENU_ID} .quick-group-header {
            color: ${textHeader} !important;
        }
        #${QUICK_MENU_ID} .quick-item {
            border-bottom: 1px solid ${settings.themeMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
            color: ${textMain} !important;
        }
        #${QUICK_MENU_ID} .quick-item:last-child { border-bottom: none; }
        
        /* 浅色模式下增强快捷菜单文字可见性 */
        #${QUICK_MENU_ID} .quick-item span,
        #${QUICK_MENU_ID} .quick-group-toggle-label,
        #${QUICK_MENU_ID} .quick-group-title,
        #${QUICK_MENU_ID} .quick-section-divider span {
            color: ${settings.themeMode === "dark" ? "#f0f0f0" : "#111111"} !important;
            font-weight: ${settings.themeMode === "dark" ? "400" : "500"} !important;
        }
        
        /* 功能切换标签增强可见性 */
        #${PANEL_ID} .func-tab-btn {
            color: ${settings.themeMode === "dark" ? "#e0e0e0" : "#222222"} !important;
        }
        #${PANEL_ID} .func-tab-btn.active {
            color: ${settings.themeMode === "dark" ? "#ffffff" : "#000000"} !important;
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} !important;
        }
        
        /* 定制面板 */
        #${CUSTOMIZE_PANEL_ID} .sv-wrap, #${CUSTOMIZE_PANEL_ID} .bar { 
            border: 1px solid ${settings.themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"} !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        /* 滚动条美化 - 仅在脚本面板内生效 */
        #${PANEL_ID} ::-webkit-scrollbar, #${QUICK_MENU_ID} ::-webkit-scrollbar, #${CUSTOMIZE_PANEL_ID} ::-webkit-scrollbar { width: 6px; height: 6px; }
        #${PANEL_ID} ::-webkit-scrollbar-track, #${QUICK_MENU_ID} ::-webkit-scrollbar-track, #${CUSTOMIZE_PANEL_ID} ::-webkit-scrollbar-track { background: transparent; }
        #${PANEL_ID} ::-webkit-scrollbar-thumb, #${QUICK_MENU_ID} ::-webkit-scrollbar-thumb, #${CUSTOMIZE_PANEL_ID} ::-webkit-scrollbar-thumb { 
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}; 
            border-radius: 3px; 
        }
        #${PANEL_ID} ::-webkit-scrollbar-thumb:hover, #${QUICK_MENU_ID} ::-webkit-scrollbar-thumb:hover, #${CUSTOMIZE_PANEL_ID} ::-webkit-scrollbar-thumb:hover { 
            background: ${settings.themeMode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}; 
        }
    `;
      doc.getElementById(THEME_STYLE_ID).textContent = css;
    }

    // 悬浮球外观 - 玻璃球 (增强透明度)
    function applyBallAppearance() {
      const doc = window.parent.document;
      const ball = doc.getElementById(FLOATING_BALL_ID);
      if (!ball) return;

      const c = settings.ballColor || { r: 240, g: 240, b: 240, a: 0.6 };
      const mode = settings.themeMode || "light";
      const accent = { r: c.r, g: c.g, b: c.b };

      // 玻璃球特效 - 极大的通透感
      if (mode === "dark") {
        // 深色玻璃球
        ball.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 50%),
                                 radial-gradient(circle at 70% 80%, ${toRgba(accent, 0.5)}, transparent 50%),
                                 rgba(40, 45, 60, 0.5)`; // 0.85 -> 0.5
        ball.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3),
                                inset 0 0 0 1px rgba(255,255,255,0.1),
                                inset 0 1px 1px rgba(255,255,255,0.3),
                                0 0 15px ${toRgba(accent, 0.3)}`;
        ball.style.border = "1px solid rgba(255,255,255,0.1)";
      } else {
        // 浅色玻璃球
        ball.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 50%),
                                 radial-gradient(circle at 70% 80%, ${toRgba(accent, 0.4)}, transparent 50%),
                                 rgba(255, 255, 255, 0.4)`; // 0.85 -> 0.4
        ball.style.boxShadow = `0 8px 24px rgba(0,0,0,0.1),
                                inset 0 0 0 1px rgba(255,255,255,0.6),
                                inset 0 1px 4px rgba(255,255,255,0.8),
                                0 0 10px ${toRgba(accent, 0.2)}`;
        ball.style.border = "1px solid rgba(255,255,255,0.4)";
      }

      ball.style.backdropFilter = "blur(8px) saturate(140%)";
      ball.style.webkitBackdropFilter = "blur(8px) saturate(140%)";
      ball.style.borderRadius = "50%";
      ball.style.zIndex = "2147483646";
      const icon = ball.querySelector("i");
      if (icon) {
        icon.style.color = mode === "dark" ? "#ffffff" : "#111111";
        icon.style.textShadow =
          mode === "dark" ? "0 2px 4px rgba(0,0,0,0.5)" : "none";
        icon.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.1))";
      }
    }

    // iOS 兼容：防止点击输入框自动放大
    // 不修改 viewport meta（会影响酒馆页面原生功能），而是通过 CSS 确保输入框 font-size >= 16px
    function ensureZoomEnabled() {
      try {
        const doc = window.parent.document;
        const ZOOM_FIX_ID = "pt-ios-zoom-fix";
        if (doc.getElementById(ZOOM_FIX_ID)) return;

        // 检测 iOS 设备（iPhone/iPad/iPod）
        const ua = window.parent.navigator.userAgent || "";
        const isIOS =
          /iPad|iPhone|iPod/.test(ua) ||
          (ua.includes("Mac") && "ontouchend" in doc);
        if (!isIOS) return; // 非 iOS 不需要处理

        // iOS 上 input font-size < 16px 会触发页面自动放大
        // 只为脚本自己的面板元素设置 font-size，不影响酒馆其他部分
        const style = doc.createElement("style");
        style.id = ZOOM_FIX_ID;
        style.textContent = `
                #${PANEL_ID} input,
                #${PANEL_ID} textarea,
                #${PANEL_ID} select,
                #${QUICK_MENU_ID} input,
                #${QUICK_MENU_ID} textarea,
                #${QUICK_MENU_ID} select,
                #${CUSTOMIZE_PANEL_ID} input,
                #${CUSTOMIZE_PANEL_ID} textarea,
                #${CUSTOMIZE_PANEL_ID} select {
                    font-size: 16px !important;
                }
            `;
        doc.head.appendChild(style);
      } catch (e) {
        log("iOS 缩放适配失败:", e);
      }
    }
    function fitQuickMenu() {
      try {
        const vv = window.parent.visualViewport;
        const vh = vv ? vv.height : window.parent.innerHeight;
        const menu = window.parent.document.getElementById(QUICK_MENU_ID);
        if (!menu) return;
        const maxH = Math.round(vh * 0.86);
        menu.style.maxHeight = `${maxH}px`;
        menu.style.boxSizing = "border-box";
      } catch (e) {}
    }
    function fitMainPanel() {
      try {
        const vv = window.parent.visualViewport;
        const vh = vv ? vv.height : window.parent.innerHeight;
        const vw = vv ? vv.width : window.parent.innerWidth;
        const panel = window.parent.document.getElementById(PANEL_ID);
        if (!panel) return;
        panel.style.height = "auto";
        panel.style.maxHeight = Math.round(vh * 0.86) + "px";
        panel.style.maxWidth = Math.round(vw * 0.94) + "px";
      } catch (e) {}
    }
    function alignVisibleOverlays() {
      const vv = window.parent.visualViewport;
      if (!vv) return;
      const doc = window.parent.document;
      const overlays = [
        doc.querySelector(`.${MAIN_OVERLAY_CLS}`),
        doc.querySelector(`.${QUICK_OVERLAY_CLS}`),
        doc.querySelector(`.${CUSTOMIZE_OVERLAY_CLS}`),
      ];
      overlays.forEach((el) => {
        if (!el || el.style.display === "none") return;
        const s = el.style;
        s.position = "fixed";
        s.left = vv.offsetLeft + "px";
        s.top = vv.offsetTop + "px";
        s.width = vv.width + "px";
        s.height = vv.height + "px";
      });
    }
    function lockScroll(parentDoc) {
      // 优化：使用 overflow: hidden 替代 position: fixed
      // 这样 body 仍然保留在文档流中，侧边栏的高度计算不会出错
      if (parentDoc.body.style.overflow !== "hidden") {
        // 记录修改前的 overflow 状态，以便恢复
        parentDoc.body.dataset.ptOriginalOverflow =
          parentDoc.body.style.overflow || "";
        parentDoc.body.style.overflow = "hidden";
      }
    }

    function unlockScroll(parentDoc) {
      // 恢复之前的 overflow 状态
      if (parentDoc.body.dataset.ptOriginalOverflow !== undefined) {
        parentDoc.body.style.overflow =
          parentDoc.body.dataset.ptOriginalOverflow;
        delete parentDoc.body.dataset.ptOriginalOverflow;
      } else {
        // 兜底清理
        parentDoc.body.style.overflow = "";
      }
    }
    function anyOverlayVisible() {
      const d = window.parent.document;
      const sel = (e) => !!e && e.style.display !== "none";
      return (
        sel(d.querySelector(`.${MAIN_OVERLAY_CLS}`)) ||
        sel(d.querySelector(`.${QUICK_OVERLAY_CLS}`)) ||
        sel(d.querySelector(`.${CUSTOMIZE_OVERLAY_CLS}`))
      );
    }

    async function togglePromptEnabled(target, enabled) {
      try {
        await window.parent.TavernHelper.updatePresetWith(
          "in_use",
          (preset) => {
            let changed = false;
            if (target.id) {
              const p = preset.prompts.find((x) => x.id === target.id);
              if (p) {
                p.enabled = enabled;
                changed = true;
              }
            }
            if (!changed && target.name) {
              const list = preset.prompts.filter(
                (x) => (x.name || "") === target.name,
              );
              if (list.length) {
                const i = clamp(target.idx || 1, 1, list.length) - 1;
                list[i].enabled = enabled;
                changed = true;
              }
            }
            return preset;
          },
        );
      } catch (error) {
        log("更新实时预设出错:", error);
        toastr?.error?.("切换条目状态失败！");
      }
    }

    // --- UI 渲染 ---
    function renderCurrentFunctionView() {
      const tab = settings.currentFunctionTab || "preset";
      if (tab === "worldbook") {
        populateWorldbookMainMenu();
      } else {
        populatePresetMainMenu();
      }
    }

    function populateMainMenu() {
      renderCurrentFunctionView();
    }

    function populatePresetMainMenu() {
      const all = getAllSillyTavernPresets();
      const loadedPresetName = window.parent.TavernHelper.getLoadedPresetName();
      const parent$ = window.parent.$;
      const $panel = parent$(`#${PANEL_ID}`);
      const $content = $panel.find(".panel-content");
      $panel.find(".footer-back-button").hide();
      $content.empty();

      // 功能切换标签
      const $funcTabs =
        parent$(`<div class="function-tabs" role="tablist" aria-label="功能切换">
            <button class="func-tab-btn active" data-func="preset" role="tab" aria-selected="true"><i class="fa-solid fa-list"></i> 预设条目</button>
            <button class="func-tab-btn" data-func="worldbook" role="tab" aria-selected="false"><i class="fa-solid fa-book"></i> 世界书</button>
        </div>`);
      $content.append($funcTabs);

      if (Object.keys(all).length === 0) {
        $content.append("<p>未能加载任何有效的预设。</p>");
        return;
      }

      const $list = parent$('<div class="preset-list"></div>');
      const $cur = parent$(
        '<div class="list-group-item interactable preset-list-item current-preset" role="button" tabindex="0" aria-label="当前使用的预设"></div>',
      ).attr("data-preset-name", loadedPresetName);
      $cur.append("<b>当前使用:</b> ");
      $cur.append(
        parent$('<span class="preset-name-bold"></span>').text(
          loadedPresetName,
        ),
      );
      $list.append($cur);

      for (const name in all) {
        if (name === loadedPresetName || name === "in_use") continue;
        const $item = parent$(
          '<div class="list-group-item interactable preset-list-item" role="button" tabindex="0"></div>',
        )
          .attr("data-preset-name", name)
          .text(name);
        $list.append($item);
      }
      $content.append($list);
      $content.scrollTop(lastScrollPosition);

      // 绑定功能切换事件
      $funcTabs.on("click", ".func-tab-btn", function () {
        const func = parent$(this).data("func");
        if (func === settings.currentFunctionTab) return;
        settings.currentFunctionTab = func;
        saveSettings();
        renderCurrentFunctionView();
      });
    }

    function populateWorldbookMainMenu() {
      const parent$ = window.parent.$;
      const $panel = parent$(`#${PANEL_ID}`);
      const $content = $panel.find(".panel-content");
      $panel.find(".footer-back-button").hide();
      $content.empty();

      // 自动清理不存在的世界书
      cleanupInvalidWorldbooks();

      // 功能切换标签
      const $funcTabs =
        parent$(`<div class="function-tabs" role="tablist" aria-label="功能切换">
            <button class="func-tab-btn" data-func="preset" role="tab" aria-selected="false"><i class="fa-solid fa-list"></i> 预设条目</button>
            <button class="func-tab-btn active" data-func="worldbook" role="tab" aria-selected="true"><i class="fa-solid fa-book"></i> 世界书</button>
        </div>`);
      $content.append($funcTabs);

      // 获取世界书列表
      let worldbookNames = [];
      try {
        worldbookNames = window.parent.TavernHelper.getWorldbookNames() || [];
      } catch (e) {
        log("获取世界书列表失败:", e);
        $content.append("<p>无法加载世界书列表。</p>");
        return;
      }

      let globalEnabled = [];
      try {
        globalEnabled =
          window.parent.TavernHelper.getGlobalWorldbookNames() || [];
      } catch (e) {
        log("获取全局世界书失败:", e);
      }

      ensureWorldbookOrderArray();
      ensureWorldbookGroupsCleanup();
      let selectedViewMode = "grouped";

      const $header = parent$('<div class="view-header"></div>').append(
        parent$("<h5></h5>").text("世界书管理"),
      );
      const $tabs = parent$(
        `<div class="tabs" role="tablist" aria-label="世界书视图切换"><button class="tab-btn active" data-tab="all" role="tab" aria-selected="true">全部世界书</button><button class="tab-btn" data-tab="selected" role="tab" aria-selected="false">已选择</button></div>`,
      );
      const $toolbar = parent$(
        `<div class="prompt-toolbar"><input id="pt-wb-search" type="text" placeholder="搜索世界书（名称关键字）" aria-label="搜索世界书" /></div>`,
      );
      const $topbarRow = parent$('<div class="prompt-view-topbar-row"></div>')
        .append($header)
        .append($tabs);
      const $topbar = parent$('<div class="prompt-view-topbar"></div>')
        .append($topbarRow)
        .append($toolbar);
      const $panels = parent$(
        `<div class="tabs-panels" data-type="worldbook"><div class="tab-panel tab-all"></div><div class="tab-panel tab-selected" style="display:none;"></div></div>`,
      );
      const $allWrap = $panels.find(".tab-all");
      const $selWrap = $panels.find(".tab-selected");

      // 渲染全部世界书列表
      const $all = parent$('<div class="prompts-all wb-all"></div>');
      $allWrap.append($all);

      worldbookNames.forEach((wbName) => {
        const checked = isWorldbookSelected(wbName);
        const isGlobal = globalEnabled.includes(wbName);

        const $label = parent$('<label class="prompt-item wb-item"></label>')
          .attr("data-name", wbName.toLowerCase())
          .attr("data-wb-name", wbName)
          .attr("title", wbName);

        if (checked) $label.addClass("is-selected");
        if (isGlobal) $label.addClass("is-global");

        const $cb = parent$('<input type="checkbox" class="pt-wb-check"/>')
          .prop("checked", checked)
          .attr("data-wb-name", wbName);

        const $span = parent$("<span></span>").text(wbName);
        const $globalBadge = isGlobal
          ? parent$(
              '<span class="wb-global-badge" title="已全局启用">🌐</span>',
            )
          : parent$("<span></span>");

        $label.append($cb).append($span).append($globalBadge);
        $all.append($label);
      });

      // 已选择视图工具栏
      const $selToolbar = parent$(
        `<div class="sel-toolbar"><div class="sel-toolbar-left"><button type="button" class="sel-add-group-btn">新建分组</button><button type="button" class="sel-expand-groups-btn">展开全部</button><button type="button" class="sel-collapse-groups-btn">折叠全部</button></div><div class="sel-toolbar-right"><button type="button" class="sel-view-mode-btn active" data-mode="grouped">按分组</button><button type="button" class="sel-view-mode-btn" data-mode="flat">全部列表</button></div></div>`,
      );
      const $selList = parent$(
        '<div class="sel-list wb-sel-list" aria-label="已选择世界书，可拖动排序"></div>',
      );
      $selWrap.append($selToolbar).append($selList);

      // 渲染已选择列表
      function renderSelectedFlat() {
        const m = getSelectedWorldbooks();
        const order = getWorldbookOrder();
        const globalEnabled =
          window.parent.TavernHelper.getGlobalWorldbookNames() || [];
        $selList.empty();
        order.forEach((wbName) => {
          if (!m[wbName]) return;
          const isGlobal = globalEnabled.includes(wbName);
          const row = parent$(
            `<div class="sel-row wb-sel-row" data-wb-name="${wbName}"><span class="drag-handle" title="拖动排序" aria-hidden="true">☰</span><span class="pill-text" title="${wbName}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${wbName}</span>${isGlobal ? '<span class="wb-global-indicator">🌐</span>' : ""}<button class="pill-group" title="设置分组" aria-label="设置分组"><i class="fa-solid fa-list-ul"></i></button><button class="pill-remove" title="取消该世界书" aria-label="取消"><i class="fa-solid fa-times"></i></button></div>`,
          );
          $selList.append(row);
        });
      }

      function renderSelectedGrouped() {
        const m = getSelectedWorldbooks();
        const order = getWorldbookOrder();
        const groups = getWorldbookGroups();
        const globalEnabled =
          window.parent.TavernHelper.getGlobalWorldbookNames() || [];
        ensureWorldbookGroupsCleanup();
        const groupedSet = new Set();
        const groupDisplay = new Map();
        groups.forEach((g) => {
          const list = (g.members || []).filter((name) => !!m[name]);
          if (list.length) {
            groupDisplay.set(g.id, list);
            list.forEach((name) => groupedSet.add(name));
          }
        });
        const ungrouped = [];
        order.forEach((name) => {
          if (!m[name]) return;
          if (!groupedSet.has(name)) ungrouped.push(name);
        });

        $selList.empty();
        const makeRow = (wbName) => {
          if (!m[wbName]) return null;
          const isGlobal = globalEnabled.includes(wbName);
          return parent$(
            `<div class="sel-row wb-sel-row" data-wb-name="${wbName}"><span class="drag-handle" title="拖动排序" aria-hidden="true">☰</span><span class="pill-text" title="${wbName}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${wbName}</span>${isGlobal ? '<span class="wb-global-indicator">🌐</span>' : ""}<button class="pill-group" title="设置分组" aria-label="设置分组"><i class="fa-solid fa-list-ul"></i></button><button class="pill-remove" title="取消该世界书" aria-label="取消"><i class="fa-solid fa-times"></i></button></div>`,
          );
        };

        groups.forEach((g) => {
          const names = groupDisplay.get(g.id) || [];
          const $group = parent$(
            '<div class="sel-group wb-sel-group"></div>',
          ).attr("data-gid", g.id);
          if (g.collapsed) $group.addClass("collapsed");
          const $gh = parent$(
            `<div class="sel-group-header"><span class="sel-group-arrow" aria-hidden="true">▾</span><span class="sel-group-title"></span><div class="sel-group-actions"><button class="sel-group-drag" title="拖动分组排序" aria-label="拖动分组排序"><i class="fa-solid fa-bars"></i></button><button class="sel-group-add" title="向此分组添加世界书" aria-label="添加世界书"><i class="fa-solid fa-plus"></i></button><button class="sel-group-rename" title="重命名分组" aria-label="重命名"><i class="fa-solid fa-pen"></i></button><button class="sel-group-delete" title="删除分组（不取消世界书选择）" aria-label="删除分组"><i class="fa-solid fa-trash"></i></button></div></div>`,
          );
          $gh.find(".sel-group-title").text(g.name);
          const $body = parent$('<div class="sel-group-body"></div>');
          names.forEach((name) => {
            const $row = makeRow(name);
            if ($row) $body.append($row);
          });
          $group.append($gh).append($body);
          $selList.append($group);
        });

        if (ungrouped.length) {
          const $group = parent$(
            '<div class="sel-group sel-group-ungrouped wb-sel-group" data-gid=""></div>',
          );
          const $gh = parent$(
            `<div class="sel-group-header"><span class="sel-group-arrow" style="visibility:hidden;">▾</span><span class="sel-group-title">未分组</span><div class="sel-group-actions"></div></div>`,
          );
          const $body = parent$('<div class="sel-group-body"></div>');
          ungrouped.forEach((name) => {
            const $row = makeRow(name);
            if ($row) $body.append($row);
          });
          $group.append($gh).append($body);
          $selList.append($group);
        }
      }

      const renderSelectedList = () => {
        if (selectedViewMode === "flat") renderSelectedFlat();
        else renderSelectedGrouped();
      };

      $content.append($topbar).append($panels);
      renderSelectedList();

      // 事件绑定: 标签切换
      $tabs.on("click", ".tab-btn", function () {
        const tab = parent$(this).data("tab");
        $tabs
          .find(".tab-btn")
          .removeClass("active")
          .attr("aria-selected", "false");
        parent$(this).addClass("active").attr("aria-selected", "true");
        if (tab === "all") {
          $allWrap.show();
          $selWrap.hide();
        } else {
          $allWrap.hide();
          $selWrap.show();
        }
        $content.scrollTop(0);
      });

      // 搜索过滤
      const applyFilter = () => {
        const kw = ($toolbar.find("#pt-wb-search").val() || "")
          .trim()
          .toLowerCase();
        $all.children(".wb-item").each((_, el) => {
          const name = el.getAttribute("data-name") || "";
          el.style.display = !kw || name.includes(kw) ? "" : "none";
        });
      };
      $toolbar.on("input", "#pt-wb-search", applyFilter);

      // 勾选世界书
      $all.on("change", ".pt-wb-check", function () {
        const $lb = parent$(this).closest(".wb-item");
        const wbName = parent$(this).attr("data-wb-name");
        const checked = parent$(this).is(":checked");
        setWorldbookSelected(wbName, checked);
        $lb.toggleClass("is-selected", checked);
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      // 取消世界书
      $selList.on("click", ".pill-remove", function () {
        const wbName = parent$(this)
          .closest(".wb-sel-row")
          .attr("data-wb-name");
        setWorldbookSelected(wbName, false);
        $all
          .find(`.wb-item[data-wb-name="${wbName}"]`)
          .removeClass("is-selected")
          .find(".pt-wb-check")
          .prop("checked", false);
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      // 设置分组
      $selList.on("click", ".pill-group", function (e) {
        e.stopPropagation();
        const wbName = parent$(this)
          .closest(".wb-sel-row")
          .attr("data-wb-name");
        const groups = getWorldbookGroups();
        const inNames =
          groups
            .filter((g) => (g.members || []).includes(wbName))
            .map((g) => g.name)
            .join("、") || "无";
        const input = window.parent.prompt(
          `给这世界书添加/移除一个分组（当前所在分组：${inNames}）\n规则：\n  - 直接点"确定"留空：移出所有分组\n  - 输入已有分组名：在该分组中开关\n  - 输入新名字：创建分组并加入`,
          "",
        );
        if (input === null) return;
        const name = (input || "").trim();
        if (!name) {
          groups.forEach((g) => {
            g.members = (g.members || []).filter((x) => x !== wbName);
          });
        } else {
          let g = groups.find((x) => x.name === name);
          if (!g) {
            g = {
              id:
                "wbg_" +
                Date.now().toString(36) +
                "_" +
                Math.floor(Math.random() * 9999),
              name,
              collapsed: false,
              members: [],
            };
            groups.push(g);
          }
          g.members = g.members || [];
          if (g.members.includes(wbName))
            g.members = g.members.filter((x) => x !== wbName);
          else g.members.push(wbName);
        }
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      // 折叠/展开分组
      $selList.on("click", ".sel-group-arrow, .sel-group-title", function () {
        const $group = parent$(this).closest(".sel-group");
        const gid = $group.attr("data-gid") || "";
        if (!gid) return;
        const g = findWorldbookGroupById(gid);
        if (!g) return;
        g.collapsed = !g.collapsed;
        saveSettings();
        renderSelectedList();
      });

      // 重命名分组
      $selList.on("click", ".sel-group-rename", function (e) {
        e.stopPropagation();
        const gid = parent$(this).closest(".sel-group").attr("data-gid");
        const g = findWorldbookGroupById(gid);
        if (!g) return;
        const input = window.parent.prompt("修改分组名称", g.name || "");
        if (input === null) return;
        const name = (input || "").trim();
        if (!name) return;
        g.name = name;
        saveSettings();
        renderSelectedList();
      });

      // 删除分组
      $selList.on("click", ".sel-group-delete", function (e) {
        e.stopPropagation();
        const gid = parent$(this).closest(".sel-group").attr("data-gid");
        settings.worldbookGroups = getWorldbookGroups().filter(
          (g) => g.id !== gid,
        );
        saveSettings();
        renderSelectedList();
      });

      // 新建分组
      $selWrap.on("click", ".sel-add-group-btn", function () {
        const input = window.parent.prompt("新建分组名称");
        if (!input) return;
        const name = input.trim();
        if (!name) return;
        const groups = getWorldbookGroups();
        if (groups.some((g) => g.name === name)) return;
        groups.push({
          id:
            "wbg_" +
            Date.now().toString(36) +
            "_" +
            Math.floor(Math.random() * 9999),
          name,
          collapsed: false,
          members: [],
        });
        saveSettings();
        renderSelectedList();
      });

      // 展开/折叠全部
      $selWrap.on("click", ".sel-expand-groups-btn", function () {
        getWorldbookGroups().forEach((g) => (g.collapsed = false));
        saveSettings();
        renderSelectedList();
      });
      $selWrap.on("click", ".sel-collapse-groups-btn", function () {
        getWorldbookGroups().forEach((g) => (g.collapsed = true));
        saveSettings();
        renderSelectedList();
      });

      // 视图模式切换
      $selToolbar.on("click", ".sel-view-mode-btn", function () {
        const $btn = parent$(this);
        const mode = $btn.data("mode");
        if (!mode || mode === selectedViewMode) return;
        selectedViewMode = mode;
        $selToolbar.find(".sel-view-mode-btn").removeClass("active");
        $btn.addClass("active");
        renderSelectedList();
      });

      // 功能切换事件
      $funcTabs.on("click", ".func-tab-btn", function () {
        const func = parent$(this).data("func");
        if (func === settings.currentFunctionTab) return;
        settings.currentFunctionTab = func;
        saveSettings();
        renderCurrentFunctionView();
      });
    }

    function populatePromptView(presetName) {
      const preset = getAllSillyTavernPresets()[presetName];
      const parent$ = window.parent.$;
      const $panel = parent$(`#${PANEL_ID}`);
      const $content = $panel.find(".panel-content");
      $panel.find(".footer-back-button").show();
      $content.empty();

      // 功能切换标签
      const $funcTabs =
        parent$(`<div class="function-tabs" role="tablist" aria-label="功能切换">
            <button class="func-tab-btn active" data-func="preset" role="tab" aria-selected="true"><i class="fa-solid fa-list"></i> 预设条目</button>
            <button class="func-tab-btn" data-func="worldbook" role="tab" aria-selected="false"><i class="fa-solid fa-book"></i> 世界书</button>
        </div>`);

      if (!preset) {
        $content.append("<p>预设未找到。</p>");
        return;
      }
      const idxMap = buildNameIndexMap(preset.prompts || []);
      ensureOrderArray(presetName);
      ensureGroupsCleanupForPreset(presetName);
      let selectedViewMode = "grouped";

      const $header = parent$('<div class="view-header"></div>').append(
        parent$("<h5></h5>").text(presetName),
      );
      const $tabs = parent$(
        `<div class="tabs" role="tablist" aria-label="条目视图切换"><button class="tab-btn active" data-tab="all" role="tab" aria-selected="true">全部条目</button><button class="tab-btn" data-tab="selected" role="tab" aria-selected="false">已选择</button></div>`,
      );
      const $toolbar = parent$(
        `<div class="prompt-toolbar"><input id="pt-search" type="text" placeholder="搜索条目（名称关键字）" aria-label="搜索条目" /></div>`,
      );
      const $topbarRow = parent$('<div class="prompt-view-topbar-row"></div>')
        .append($header)
        .append($tabs);
      const $topbar = parent$('<div class="prompt-view-topbar"></div>')
        .append($topbarRow)
        .append($toolbar);
      const $panels = parent$(
        `<div class="tabs-panels" data-preset="${presetName}"><div class="tab-panel tab-all"></div><div class="tab-panel tab-selected" style="display:none;"></div></div>`,
      );
      const $allWrap = $panels.find(".tab-all");
      const $selWrap = $panels.find(".tab-selected");

      const allItems = (preset.prompts || []).filter(
        (p) => p.name && !PLACEHOLDER_PROMPT_IDS.includes(p.id),
      );
      const $all = parent$('<div class="prompts-all"></div>');
      $allWrap.append($all);

      let iChunk = 0;
      const chunkSize = 20; // 保持较小数值，确保手机流畅

      function renderAllChunk() {
        // 【修正1】只检查容器是否存在，去掉了 document.contains，防止弹窗初始化时被误杀
        if (!$all || $all.length === 0) return;

        const end = Math.min(iChunk + chunkSize, allItems.length);

        for (; iChunk < end; iChunk++) {
          const p = allItems[iChunk];
          const uid = makeUid(p, idxMap);
          const checked = isSelected(presetName, p, idxMap);

          const $label = parent$('<label class="prompt-item"></label>')
            .attr("data-name", (p.name || "").toLowerCase())
            .attr("data-uid", uid)
            .attr("data-pid", p.id || "")
            .attr("title", p.name);

          if (checked) $label.addClass("is-selected");

          const $cb = parent$('<input type="checkbox" class="pt-check"/>')
            .prop("checked", checked)
            .attr("data-prompt-id", p.id || "")
            .attr("data-prompt-name", p.name || "")
            .attr("data-prompt-idx", parseNameUid(uid)?.idx || 1);

          const $span = parent$("<span></span>").text(p.name);

          $label.append($cb).append($span);

          // 【修正2】直接 append，兼容性最好。每次只做20个，不会卡。
          $all.append($label);
        }

        if (iChunk < allItems.length) {
          // 保持 setTimeout 这里的延迟，给手机处理触摸/滚动事件的时间
          setTimeout(renderAllChunk, 20);
        }
      }

      renderAllChunk();

      const $selToolbar = parent$(
        `<div class="sel-toolbar"><div class="sel-toolbar-left"><button type="button" class="sel-add-group-btn">新建分组</button><button type="button" class="sel-expand-groups-btn">展开全部</button><button type="button" class="sel-collapse-groups-btn">折叠全部</button></div><div class="sel-toolbar-right"><button type="button" class="sel-view-mode-btn active" data-mode="grouped">按分组</button><button type="button" class="sel-view-mode-btn" data-mode="flat">全部列表</button></div></div>`,
      );
      const $selList = parent$(
        '<div class="sel-list" aria-label="已选择条目，可拖动排序"></div>',
      );
      $selWrap.append($selToolbar).append($selList);

      $selToolbar.on("click", ".sel-view-mode-btn", function () {
        const $btn = parent$(this);
        const mode = $btn.data("mode");
        if (!mode || mode === selectedViewMode) return;
        selectedViewMode = mode;
        $selToolbar.find(".sel-view-mode-btn").removeClass("active");
        $btn.addClass("active");
        renderSelectedList();
      });

      function renderSelectedFlat() {
        const m = getSelectedMap(presetName);
        const order = getSelectedOrder(presetName);
        $selList.empty();
        order.forEach((uid) => {
          const sel = m[uid];
          if (!sel) return;
          const labelText = sel.name || sel.id || uid;
          const idx = sel.idx;
          const display = sel.id
            ? labelText
            : idx
              ? `${labelText} #${idx}`
              : labelText;
          const row = parent$(
            `<div class="sel-row" data-uid="${uid}"><span class="drag-handle" title="拖动排序" aria-hidden="true">☰</span><span class="pill-text" title="${display}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${display}</span><button class="pill-group" title="设置分组" aria-label="设置分组"><i class="fa-solid fa-list-ul"></i></button><button class="pill-remove" title="取消该条目" aria-label="取消"><i class="fa-solid fa-times"></i></button></div>`,
          );
          $selList.append(row);
        });
      }

      function renderSelectedGrouped() {
        const m = getSelectedMap(presetName);
        const order = getSelectedOrder(presetName);
        const groups = getGroups(presetName);
        ensureGroupsCleanupForPreset(presetName);
        const groupedSet = new Set();
        const groupDisplay = new Map();
        groups.forEach((g) => {
          const list = (g.members || []).filter((uid) => !!m[uid]);
          if (list.length) {
            groupDisplay.set(g.id, list);
            list.forEach((uid) => groupedSet.add(uid));
          }
        });
        const ungrouped = [];
        order.forEach((uid) => {
          if (!m[uid]) return;
          if (!groupedSet.has(uid)) ungrouped.push(uid);
        });

        $selList.empty();
        const makeRow = (uid) => {
          const sel = m[uid];
          if (!sel) return null;
          const labelText = sel.name || sel.id || uid;
          const idx = sel.idx;
          const display = sel.id
            ? labelText
            : idx
              ? `${labelText} #${idx}`
              : labelText;
          return parent$(
            `<div class="sel-row" data-uid="${uid}"><span class="drag-handle" title="拖动排序" aria-hidden="true">☰</span><span class="pill-text" title="${display}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${display}</span><button class="pill-group" title="设置分组" aria-label="设置分组"><i class="fa-solid fa-list-ul"></i></button><button class="pill-remove" title="取消该条目" aria-label="取消"><i class="fa-solid fa-times"></i></button></div>`,
          );
        };

        groups.forEach((g) => {
          const uids = groupDisplay.get(g.id) || [];
          const $group = parent$('<div class="sel-group"></div>').attr(
            "data-gid",
            g.id,
          );
          if (g.collapsed) $group.addClass("collapsed");
          const $gh = parent$(
            `<div class="sel-group-header"><span class="sel-group-arrow" aria-hidden="true">▾</span><span class="sel-group-title"></span><div class="sel-group-actions"><button class="sel-group-drag" title="拖动分组排序" aria-label="拖动分组排序"><i class="fa-solid fa-bars"></i></button><button class="sel-group-add" title="向此分组添加条目" aria-label="添加条目"><i class="fa-solid fa-plus"></i></button><button class="sel-group-rename" title="重命名分组" aria-label="重命名"><i class="fa-solid fa-pen"></i></button><button class="sel-group-delete" title="删除分组（不取消条目选择）" aria-label="删除分组"><i class="fa-solid fa-trash"></i></button></div></div>`,
          );
          $gh.find(".sel-group-title").text(g.name);
          const $body = parent$('<div class="sel-group-body"></div>');
          uids.forEach((uid) => {
            const $row = makeRow(uid);
            if ($row) $body.append($row);
          });
          $group.append($gh).append($body);
          $selList.append($group);
        });

        if (ungrouped.length) {
          const $group = parent$(
            '<div class="sel-group sel-group-ungrouped" data-gid=""></div>',
          );
          const $gh = parent$(
            `<div class="sel-group-header"><span class="sel-group-arrow" style="visibility:hidden;">▾</span><span class="sel-group-title">未分组</span><div class="sel-group-actions"></div></div>`,
          );
          const $body = parent$('<div class="sel-group-body"></div>');
          ungrouped.forEach((uid) => {
            const $row = makeRow(uid);
            if ($row) $body.append($row);
          });
          $group.append($gh).append($body);
          $selList.append($group);
        }
      }

      const renderSelectedList = () => {
        if (selectedViewMode === "flat") renderSelectedFlat();
        else renderSelectedGrouped();
      };

      $tabs.on("click", ".tab-btn", function () {
        const tab = parent$(this).data("tab");
        $tabs
          .find(".tab-btn")
          .removeClass("active")
          .attr("aria-selected", "false");
        parent$(this).addClass("active").attr("aria-selected", "true");
        if (tab === "all") {
          $allWrap.show();
          $selWrap.hide();
        } else {
          $allWrap.hide();
          $selWrap.show();
        }
        $content.scrollTop(0);
      });

      const applyFilter = () => {
        const kw = ($toolbar.find("#pt-search").val() || "")
          .trim()
          .toLowerCase();
        $all.children(".prompt-item").each((_, el) => {
          const name = el.getAttribute("data-name") || "";
          el.style.display = !kw || name.includes(kw) ? "" : "none";
        });
      };
      $content.html("").append($funcTabs).append($topbar).append($panels);

      // 功能切换事件 (在 DOM 插入后绑定)
      $funcTabs.on("click", ".func-tab-btn", function () {
        const func = parent$(this).data("func");
        if (func === "worldbook") {
          settings.currentFunctionTab = "worldbook";
          saveSettings();
          populateWorldbookMainMenu();
        }
      });
      $toolbar.on("input", "#pt-search", applyFilter);
      applyFilter();

      $all.on("change", ".pt-check", function () {
        const $lb = parent$(this).closest(".prompt-item");
        const p = {
          id: parent$(this).attr("data-prompt-id") || undefined,
          name: parent$(this).attr("data-prompt-name") || "",
        };
        const idx = parseInt(parent$(this).attr("data-prompt-idx"), 10) || 1;
        const fakeP = { id: p.id, name: p.name };
        const checked = parent$(this).is(":checked");
        setSelected(presetName, fakeP, idxMap, checked);
        $lb.toggleClass("is-selected", checked);
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".pill-remove", function () {
        const uid = parent$(this).closest(".sel-row").attr("data-uid");
        const m = getSelectedMap(presetName);
        const order = getSelectedOrder(presetName);
        delete m[uid];
        const i = order.indexOf(uid);
        if (i >= 0) order.splice(i, 1);
        const groups = getGroups(presetName);
        groups.forEach((g) => {
          g.members = (g.members || []).filter((x) => x !== uid);
        });
        saveSettings();
        $all
          .find(`.prompt-item[data-uid="${uid}"]`)
          .removeClass("is-selected")
          .find(".pt-check")
          .prop("checked", false);
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".pill-group", function (e) {
        e.stopPropagation();
        const uid = parent$(this).closest(".sel-row").attr("data-uid");
        const groups = getGroups(presetName);
        const inNames =
          groups
            .filter((g) => (g.members || []).includes(uid))
            .map((g) => g.name)
            .join("、") || "无";
        const input = window.parent.prompt(
          `给这条目添加/移除一个分组（当前所在分组：${inNames}）\n规则：\n  - 直接点“确定”留空：移出所有分组\n  - 输入已有分组名：在该分组中开关\n  - 输入新名字：创建分组并加入`,
          "",
        );
        if (input === null) return;
        const name = (input || "").trim();
        if (!name) {
          groups.forEach((g) => {
            g.members = (g.members || []).filter((x) => x !== uid);
          });
        } else {
          let g = groups.find((x) => x.name === name);
          if (!g) {
            g = {
              id:
                "g_" +
                Date.now().toString(36) +
                "_" +
                Math.floor(Math.random() * 9999),
              name,
              collapsed: false,
              members: [],
            };
            groups.push(g);
          }
          g.members = g.members || [];
          if (g.members.includes(uid))
            g.members = g.members.filter((x) => x !== uid);
          else g.members.push(uid);
        }
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".sel-group-arrow, .sel-group-title", function () {
        const $group = parent$(this).closest(".sel-group");
        const gid = $group.attr("data-gid") || "";
        if (!gid) return;
        const g = findGroupById(presetName, gid);
        if (!g) return;
        g.collapsed = !g.collapsed;
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".sel-group-rename", function (e) {
        e.stopPropagation();
        const gid = parent$(this).closest(".sel-group").attr("data-gid");
        const g = findGroupById(presetName, gid);
        if (!g) return;
        const input = window.parent.prompt("修改分组名称", g.name || "");
        if (input === null) return;
        const name = (input || "").trim();
        if (!name) return;
        g.name = name;
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".sel-group-delete", function (e) {
        e.stopPropagation();
        const gid = parent$(this).closest(".sel-group").attr("data-gid");
        let groups = getGroups(presetName);
        groups = groups.filter((g) => g.id !== gid);
        settings.groupsByPreset[presetName] = groups;
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selWrap.on("click", ".sel-add-group-btn", function () {
        const input = window.parent.prompt("新建分组名称");
        if (!input) return;
        const name = input.trim();
        if (!name) return;
        const groups = getGroups(presetName);
        if (groups.some((g) => g.name === name)) return;
        groups.push({
          id:
            "g_" +
            Date.now().toString(36) +
            "_" +
            Math.floor(Math.random() * 9999),
          name,
          collapsed: false,
          members: [],
        });
        saveSettings();
        renderSelectedList();
      });

      $selWrap.on("click", ".sel-expand-groups-btn", function () {
        const groups = getGroups(presetName);
        groups.forEach((g) => (g.collapsed = false));
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selList.on("click", ".sel-group-add", function (e) {
        e.stopPropagation();
        const gid = parent$(this).closest(".sel-group").attr("data-gid");
        if (!gid) return;
        const groups = getGroups(presetName);
        const g = groups.find((x) => x.id === gid);
        if (!g) return;
        const m = getSelectedMap(presetName);
        const order = getSelectedOrder(presetName);
        const membersSet = new Set(g.members || []);
        const candidates = [];
        order.forEach((uid) => {
          if (!m[uid]) return;
          if (membersSet.has(uid)) return;
          candidates.push({ uid, sel: m[uid] });
        });
        if (!candidates.length) {
          window.parent.toastr?.info?.(
            "没有可加入本分组的条目（已全部在组内）。",
          );
          return;
        }
        $selList.find(".sel-group-add-panel").remove();
        const $group = parent$(this).closest(".sel-group");
        const $body = $group.children(".sel-group-body").first();
        const $panel = parent$(
          `<div class="sel-group-add-panel"><div class="sel-group-add-title"></div><div class="sel-group-add-list"></div><div class="sel-group-add-actions"><button type="button" class="sel-group-add-confirm">确定</button><button type="button" class="sel-group-add-cancel">取消</button></div></div>`,
        );
        $panel.find(".sel-group-add-title").text(`选择要加入“${g.name}”的条目`);
        const $list = $panel.find(".sel-group-add-list");
        candidates.forEach(({ uid, sel }) => {
          const labelText = sel.name || sel.id || uid;
          const idx = sel.idx;
          const display = sel.id
            ? labelText
            : idx
              ? `${labelText} #${idx}`
              : labelText;
          const $item = parent$(
            `<label class="sel-group-add-item"><input type="checkbox" data-uid="${uid}"><span></span></label>`,
          );
          $item.find("span").text(display).attr("title", display);
          $list.append($item);
        });
        $panel.insertBefore($body);
      });

      $selList.on("click", ".sel-group-add-cancel", function (e) {
        e.stopPropagation();
        parent$(this).closest(".sel-group-add-panel").remove();
      });
      $selList.on("click", ".sel-group-add-confirm", function (e) {
        e.stopPropagation();
        const $panel = parent$(this).closest(".sel-group-add-panel");
        const $group = $panel.closest(".sel-group");
        const gid = $group.attr("data-gid");
        if (!gid) {
          $panel.remove();
          return;
        }
        const groups = getGroups(presetName);
        const g = groups.find((x) => x.id === gid);
        if (!g) {
          $panel.remove();
          return;
        }
        const members = new Set(g.members || []);
        $panel.find('input[type="checkbox"][data-uid]').each((_, el) => {
          const uid = parent$(el).attr("data-uid");
          if (!uid) return;
          if (el.checked) members.add(uid);
        });
        g.members = Array.from(members);
        saveSettings();
        $panel.remove();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      $selWrap.on("click", ".sel-collapse-groups-btn", function () {
        const groups = getGroups(presetName);
        groups.forEach((g) => (g.collapsed = true));
        saveSettings();
        renderSelectedList();
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      });

      (function enableSortable() {
        const root = $selList[0];
        if (!root) return;
        let dragging = null,
          startY = 0,
          placeholder = null,
          container = null,
          startRect = null;
        function onPointerDown(e) {
          const handle = e.target.closest(".drag-handle");
          const row = e.target.closest(".sel-row");
          if (!row || !handle) return;
          e.preventDefault();
          dragging = row;
          container = row.parentNode;
          startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
          startRect = row.getBoundingClientRect();
          placeholder = document.createElement("div");
          placeholder.className = "sel-placeholder";
          placeholder.style.height = `${startRect.height}px`;
          container.insertBefore(placeholder, row);
          row.classList.add("dragging");
          row.style.width = `${startRect.width}px`;
          row.style.pointerEvents = "none";
          row.style.transform = "translateY(0px)";
          row.style.willChange = "transform";
          root.setPointerCapture?.(e.pointerId || 1);
        }
        function onPointerMove(e) {
          if (!dragging) return;
          e.preventDefault();
          const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
          const dy = y - startY;
          dragging.style.transform = `translateY(${dy}px)`;
          const siblings = Array.from(container.children).filter(
            (n) => n !== dragging,
          );
          const mid = y;
          let inserted = false;
          for (const s of siblings) {
            if (s === placeholder) continue;
            const r = s.getBoundingClientRect();
            if (mid < r.top + r.height / 2) {
              container.insertBefore(placeholder, s);
              inserted = true;
              break;
            }
          }
          if (!inserted) container.appendChild(placeholder);
        }
        function onPointerUp() {
          if (!dragging) return;
          dragging.classList.remove("dragging");
          dragging.style.transform = "";
          dragging.style.width = "";
          dragging.style.pointerEvents = "";
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(dragging, placeholder);
            placeholder.remove();
          }
          placeholder = null;
          const m = getSelectedMap(presetName);
          if (selectedViewMode === "grouped") {
            let groupEl = container.closest
              ? container.closest(".sel-group")
              : null;
            if (
              !groupEl &&
              container.parentNode &&
              container.parentNode.closest
            ) {
              groupEl = container.parentNode.closest(".sel-group");
            }
            const gid = groupEl ? groupEl.getAttribute("data-gid") || "" : "";
            if (gid) {
              const groups = getGroups(presetName);
              const g = groups.find((x) => x.id === gid);
              if (g) {
                const newMembers = [];
                container.querySelectorAll(".sel-row").forEach((node) => {
                  const uid = node.getAttribute("data-uid");
                  if (
                    uid &&
                    m[uid] &&
                    g.members?.includes(uid) &&
                    !newMembers.includes(uid)
                  ) {
                    newMembers.push(uid);
                  }
                });
                (g.members || []).forEach((uid) => {
                  if (m[uid] && !newMembers.includes(uid)) {
                    newMembers.push(uid);
                  }
                });
                g.members = newMembers;
                saveSettings();
              }
            } else {
              const groups = getGroups(presetName);
              const groupedUids = new Set();
              groups.forEach((g) =>
                (g.members || []).forEach((uid) => groupedUids.add(uid)),
              );
              const oldOrder = getSelectedOrder(presetName);
              const newUngroupOrder = [];
              container.querySelectorAll(".sel-row").forEach((node) => {
                const uid = node.getAttribute("data-uid");
                if (
                  uid &&
                  m[uid] &&
                  !groupedUids.has(uid) &&
                  !newUngroupOrder.includes(uid)
                ) {
                  newUngroupOrder.push(uid);
                }
              });
              const seen = new Set();
              const newOrder = [];
              oldOrder.forEach((uid) => {
                if (!m[uid] || seen.has(uid)) return;
                if (groupedUids.has(uid)) {
                  seen.add(uid);
                  newOrder.push(uid);
                }
              });
              newUngroupOrder.forEach((uid) => {
                if (m[uid] && !seen.has(uid)) {
                  seen.add(uid);
                  newOrder.push(uid);
                }
              });
              oldOrder.forEach((uid) => {
                if (m[uid] && !seen.has(uid)) {
                  seen.add(uid);
                  newOrder.push(uid);
                }
              });
              Object.keys(m).forEach((uid) => {
                if (m[uid] && !seen.has(uid)) newOrder.push(uid);
              });
              settings.selectedOrderByPreset[presetName] = newOrder;
              saveSettings();
            }
          } else {
            const seen = new Set();
            const newOrder = [];
            root.querySelectorAll(".sel-row").forEach((node) => {
              const uid = node.getAttribute("data-uid");
              if (uid && m[uid] && !seen.has(uid)) {
                seen.add(uid);
                newOrder.push(uid);
              }
            });
            const oldOrder = getSelectedOrder(presetName);
            oldOrder.forEach((uid) => {
              if (m[uid] && !seen.has(uid)) {
                seen.add(uid);
                newOrder.push(uid);
              }
            });
            Object.keys(m).forEach((uid) => {
              if (m[uid] && !seen.has(uid)) newOrder.push(uid);
            });
            settings.selectedOrderByPreset[presetName] = newOrder;
            saveSettings();
          }
          if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
            populateQuickMenu();
            fitQuickMenu();
            alignVisibleOverlays();
          }
          dragging = null;
          container = null;
        }
        root.addEventListener("pointerdown", onPointerDown, { passive: false });
        root.addEventListener("pointermove", onPointerMove, { passive: false });
        root.addEventListener("pointerup", onPointerUp, { passive: false });
        root.addEventListener("pointercancel", onPointerUp, { passive: false });
        root.addEventListener("touchstart", onPointerDown, { passive: false });
        root.addEventListener("touchmove", onPointerMove, { passive: false });
        root.addEventListener("touchend", onPointerUp, { passive: false });
      })();

      (function enableGroupSortable() {
        const root = $selList[0];
        if (!root) return;
        let draggingGroup = null,
          startY = 0,
          placeholder = null,
          startRect = null;
        function onPointerDown(e) {
          const handle = e.target.closest(".sel-group-drag");
          if (!handle) return;
          const group = handle.closest(".sel-group");
          if (!group) return;
          const gid = group.getAttribute("data-gid") || "";
          if (!gid) return;
          e.preventDefault();
          draggingGroup = group;
          startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
          startRect = group.getBoundingClientRect();
          placeholder = document.createElement("div");
          placeholder.className = "sel-group-placeholder";
          placeholder.style.height = `${startRect.height}px`;
          root.insertBefore(placeholder, group);
          group.classList.add("dragging");
          group.style.width = `${startRect.width}px`;
          group.style.pointerEvents = "none";
          group.style.transform = "translateY(0px)";
          group.style.willChange = "transform";
          root.setPointerCapture?.(e.pointerId || 1);
        }
        function onPointerMove(e) {
          if (!draggingGroup) return;
          e.preventDefault();
          const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
          const dy = y - startY;
          draggingGroup.style.transform = `translateY(${dy}px)`;
          const siblings = Array.from(root.children).filter(
            (n) => n !== draggingGroup,
          );
          const mid = y;
          let inserted = false;
          for (const s of siblings) {
            if (s === placeholder) continue;
            const r = s.getBoundingClientRect();
            if (mid < r.top + r.height / 2) {
              root.insertBefore(placeholder, s);
              inserted = true;
              break;
            }
          }
          if (!inserted) root.appendChild(placeholder);
        }
        function onPointerUp() {
          if (!draggingGroup) return;
          draggingGroup.classList.remove("dragging");
          draggingGroup.style.transform = "";
          draggingGroup.style.width = "";
          draggingGroup.style.pointerEvents = "";
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(draggingGroup, placeholder);
            placeholder.remove();
          }
          placeholder = null;
          if (selectedViewMode === "grouped") {
            const groups = getGroups(presetName);
            const mapById = new Map(groups.map((g) => [g.id, g]));
            const newGroups = [];
            root.querySelectorAll(".sel-group").forEach((el) => {
              const gid = el.getAttribute("data-gid") || "";
              if (!gid) return;
              const g = mapById.get(gid);
              if (g && !newGroups.includes(g)) newGroups.push(g);
            });
            groups.forEach((g) => {
              if (!newGroups.includes(g)) newGroups.push(g);
            });
            settings.groupsByPreset[presetName] = newGroups;
            saveSettings();
            if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
              populateQuickMenu();
              fitQuickMenu();
              alignVisibleOverlays();
            }
          }
          draggingGroup = null;
        }
        root.addEventListener("pointerdown", onPointerDown, { passive: false });
        root.addEventListener("pointermove", onPointerMove, { passive: false });
        root.addEventListener("pointerup", onPointerUp, { passive: false });
        root.addEventListener("pointercancel", onPointerUp, { passive: false });
        root.addEventListener("touchstart", onPointerDown, { passive: false });
        root.addEventListener("touchmove", onPointerMove, { passive: false });
        root.addEventListener("touchend", onPointerUp, { passive: false });
      })();

      renderSelectedList();
    }

    // --- 快捷菜单 (已更新计数器逻辑) ---
    function populateQuickMenu() {
      const parent$ = window.parent.$;
      const $menu = parent$(`#${QUICK_MENU_ID}`);
      $menu.empty();

      // 自动清理不存在的世界书
      cleanupInvalidWorldbooks();

      const active = window.parent.TavernHelper.getPreset("in_use");
      const loadedName = window.parent.TavernHelper.getLoadedPresetName();
      const map = getSelectedMap(loadedName);
      const order = getSelectedOrder(loadedName);
      const groups = getGroups(loadedName);
      ensureGroupsCleanupForPreset(loadedName);

      const m = map;
      const groupDisplay = new Map();
      const groupedUids = new Set();
      const ungrouped = [];

      const makeItem = (uid) => {
        const sel = m[uid];
        if (!sel) return null;
        const p = findPromptByUidInPreset(active, uid, sel);
        if (!p) return null;
        return { uid, sel, p };
      };

      groups.forEach((g) => {
        const items = (g.members || [])
          .map((uid) => makeItem(uid))
          .filter(Boolean);
        if (items.length) {
          groupDisplay.set(g.id, items);
          items.forEach((it) => groupedUids.add(it.uid));
        }
      });

      order.forEach((uid) => {
        if (!m[uid]) return;
        if (groupedUids.has(uid)) return;
        const item = makeItem(uid);
        if (item) ungrouped.push(item);
      });

      let hasVisible = false;

      const makeItemRow = (item) => {
        const idx = parseNameUid(item.uid)?.idx;
        const $row = parent$('<div class="quick-item"></div>');
        $row.append(
          parent$("<span></span>").text(
            item.p.name + (idx && !item.p.id ? ` #${idx}` : ""),
          ),
        );
        $row.append(
          parent$(
            '<input type="checkbox" class="quick-toggle" aria-label="切换条目">',
          )
            .attr("data-prompt-id", item.p.id || "")
            .attr("data-prompt-name", item.p.name || "")
            .attr("data-prompt-idx", idx || 1)
            .attr("data-uid", item.uid)
            .prop("checked", !!item.p.enabled),
        );
        return $row;
      };

      // 自定义分组
      groups.forEach((g) => {
        const items = groupDisplay.get(g.id) || [];
        // ⭐ 提前计算计数器
        const totalCount = items.length;
        const enabledCount = items.filter((it) => it.p.enabled).length;

        const $group = parent$('<div class="quick-group"></div>').attr(
          "data-gid",
          g.id,
        );
        if (g.collapsed) $group.addClass("collapsed");

        const $gh = parent$(`
    <div class="quick-group-header">
      <span class="quick-group-arrow">▾</span>
      <span class="quick-group-title"></span>
      <span class="quick-group-counter" style="font-size:12px; margin-right:4px; opacity:0.7;">${enabledCount}/${totalCount}</span>
      <label class="quick-group-toggle" title="切换本分组全部条目">
        <input type="checkbox" class="quick-group-checkbox" aria-label="本组全部条目">
        <span class="quick-group-toggle-label">全部</span>
      </label>
    </div>
  `);
        $gh.find(".quick-group-title").text(g.name);

        const $groupChk = $gh.find(".quick-group-checkbox");
        if (!items.length) {
          $groupChk
            .prop("checked", false)
            .prop("indeterminate", false)
            .prop("disabled", true);
        } else if (enabledCount === items.length) {
          $groupChk
            .prop("checked", true)
            .prop("indeterminate", false)
            .prop("disabled", false);
        } else if (enabledCount === 0) {
          $groupChk
            .prop("checked", false)
            .prop("indeterminate", false)
            .prop("disabled", false);
        } else {
          $groupChk
            .prop("checked", false)
            .prop("indeterminate", true)
            .prop("disabled", false);
        }

        const $body = parent$('<div class="quick-group-body"></div>');
        if (g.collapsed) $body.hide();
        items.forEach((item) => $body.append(makeItemRow(item)));

        $group.append($gh).append($body);
        $menu.append($group);
        if (items.length) hasVisible = true;
      });

      // 未分组
      if (ungrouped.length) {
        // ⭐ 未分组计数器
        const totalCount = ungrouped.length;
        const enabledCount = ungrouped.filter((it) => it.p.enabled).length;

        const $group = parent$(
          '<div class="quick-group quick-group-ungrouped" data-gid=""></div>',
        );
        const $gh = parent$(`
    <div class="quick-group-header">
      <span class="quick-group-arrow" style="visibility:hidden;">▾</span>
      <span class="quick-group-title">未分组</span>
      <span class="quick-group-counter" style="font-size:12px; margin-right:4px; opacity:0.7;">${enabledCount}/${totalCount}</span>
    </div>
  `);
        $group.append($gh);
        const $body = parent$('<div class="quick-group-body"></div>');
        ungrouped.forEach((item) => $body.append(makeItemRow(item)));
        $group.append($body);
        $menu.append($group);
        hasVisible = true;
      }

      if (!hasVisible) {
        $menu.html("<span>当前预设暂无已勾选条目</span>");
      }

      // --- 世界书部分 ---
      const wbSelected = getSelectedWorldbooks();
      const wbOrder = getWorldbookOrder();
      const wbGroups = getWorldbookGroups();
      let globalEnabled = [];
      try {
        globalEnabled =
          window.parent.TavernHelper.getGlobalWorldbookNames() || [];
      } catch (e) {
        log("获取全局世界书失败:", e);
      }

      ensureWorldbookGroupsCleanup();
      const wbGroupDisplay = new Map();
      const wbGroupedSet = new Set();
      const wbUngrouped = [];

      wbGroups.forEach((g) => {
        const list = (g.members || []).filter((name) => !!wbSelected[name]);
        if (list.length) {
          wbGroupDisplay.set(g.id, list);
          list.forEach((name) => wbGroupedSet.add(name));
        }
      });

      wbOrder.forEach((name) => {
        if (!wbSelected[name]) return;
        if (!wbGroupedSet.has(name)) wbUngrouped.push(name);
      });

      const hasWorldbooks = wbGroupDisplay.size > 0 || wbUngrouped.length > 0;

      if (hasWorldbooks) {
        // 分隔线
        $menu.append(
          parent$(
            '<div class="quick-section-divider"><span>📚 世界书</span></div>',
          ),
        );

        const makeWbRow = (wbName) => {
          const isGlobal = globalEnabled.includes(wbName);
          const $row = parent$('<div class="quick-item wb-quick-item"></div>');
          $row.append(parent$("<span></span>").text(wbName));
          $row.append(
            parent$(
              '<input type="checkbox" class="quick-wb-toggle" aria-label="切换世界书全局状态">',
            )
              .attr("data-wb-name", wbName)
              .prop("checked", isGlobal),
          );
          return $row;
        };

        // 世界书分组
        wbGroups.forEach((g) => {
          const names = wbGroupDisplay.get(g.id) || [];
          if (!names.length) return;
          const enabledCount = names.filter((n) =>
            globalEnabled.includes(n),
          ).length;
          const totalCount = names.length;

          const $group = parent$(
            '<div class="quick-group wb-quick-group"></div>',
          ).attr("data-wbgid", g.id);
          if (g.collapsed) $group.addClass("collapsed");

          const $gh = parent$(`
    <div class="quick-group-header">
      <span class="quick-group-arrow">▾</span>
      <span class="quick-group-title"></span>
      <span class="quick-group-counter" style="font-size:12px; margin-right:4px; opacity:0.7;">${enabledCount}/${totalCount}</span>
      <label class="quick-group-toggle" title="切换本分组全部世界书全局状态">
        <input type="checkbox" class="quick-wb-group-checkbox" aria-label="本组全部世界书">
        <span class="quick-group-toggle-label">全部</span>
      </label>
    </div>
  `);
          $gh.find(".quick-group-title").text(g.name);

          const $groupChk = $gh.find(".quick-wb-group-checkbox");
          if (enabledCount === totalCount) {
            $groupChk.prop("checked", true).prop("indeterminate", false);
          } else if (enabledCount === 0) {
            $groupChk.prop("checked", false).prop("indeterminate", false);
          } else {
            $groupChk.prop("checked", false).prop("indeterminate", true);
          }

          const $body = parent$('<div class="quick-group-body"></div>');
          if (g.collapsed) $body.hide();
          names.forEach((name) => $body.append(makeWbRow(name)));

          $group.append($gh).append($body);
          $menu.append($group);
        });

        // 未分组世界书
        if (wbUngrouped.length) {
          const enabledCount = wbUngrouped.filter((n) =>
            globalEnabled.includes(n),
          ).length;
          const totalCount = wbUngrouped.length;

          const $group = parent$(
            '<div class="quick-group wb-quick-group quick-group-ungrouped" data-wbgid=""></div>',
          );
          const $gh = parent$(`
    <div class="quick-group-header">
      <span class="quick-group-arrow" style="visibility:hidden;">▾</span>
      <span class="quick-group-title">未分组</span>
      <span class="quick-group-counter" style="font-size:12px; margin-right:4px; opacity:0.7;">${enabledCount}/${totalCount}</span>
    </div>
  `);
          $group.append($gh);
          const $body = parent$('<div class="quick-group-body"></div>');
          wbUngrouped.forEach((name) => $body.append(makeWbRow(name)));
          $group.append($body);
          $menu.append($group);
        }
      }
    }

    // --- 初始化 ---
    function masterInitialize() {
      if (isInitialized) return;
      log("初始化 v7.467...");
      const parent$ = window.parent.$;
      const parentDoc = window.parent.document;
      loadSettings();
      ensureZoomEnabled();

      if (!parentDoc.getElementById(STYLE_ID)) {
        const styles = `
  <style id="${STYLE_ID}">
    :root { --pt-minTouch: 44px; }
    @media (prefers-reduced-motion: reduce){ * { transition: none !important; animation: none !important; } }
    .${MAIN_OVERLAY_CLS}, .${QUICK_OVERLAY_CLS}, .${CUSTOMIZE_OVERLAY_CLS} {
      display:none; position:fixed; inset:0; 
      /* 遮罩背景色加深，但保持一定通透 */
      background-color: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index:10001; align-items:center; justify-content:center;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
      overscroll-behavior: contain;
    }
    .${MAIN_OVERLAY_CLS}, .${QUICK_OVERLAY_CLS}, .${CUSTOMIZE_OVERLAY_CLS} { -webkit-overflow-scrolling: touch; }
    .${MAIN_OVERLAY_CLS}, .${QUICK_OVERLAY_CLS}, .${CUSTOMIZE_OVERLAY_CLS} { overscroll-behavior-y: none; }

    #${PANEL_ID}, #${QUICK_MENU_ID}, #${CUSTOMIZE_PANEL_ID} {
      /* 基础样式，将被 theme 样式覆盖 */
      background-color: #ffffff; 
      color:#111;
      z-index:10002;
      font-size: clamp(13px, 1.2vw + 0.25rem, 16px); line-height: 1.55;
      -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s;
    }
    #${PANEL_ID}{ width: min(560px, 92vw); height: auto; max-height: 86vh; display:flex; flex-direction:column; }
    @supports (height: 1svh){ #${PANEL_ID}{ max-height: 86svh; } }
    @media (max-width: 480px){ #${PANEL_ID}{ width: 94vw; } }

    #${PANEL_ID} .panel-header{
      padding: clamp(10px, 1.6vw, 14px) clamp(12px, 2vw, 16px);
      user-select:none; display:flex; justify-content:space-between; align-items:center; gap:8px;
    }
    #${PANEL_ID} .panel-header h4{ margin:0; font-size: clamp(15px, 1.2vw + .5rem, 18px); }
    #${PANEL_ID} .close-btn{
      background:none; border:none; color:inherit; font-size: clamp(22px, 2.6vw, 26px);
      cursor:pointer; padding:0 6px; line-height:1; min-width: var(--pt-minTouch); min-height: var(--pt-minTouch);
      opacity: 0.7; transition: opacity 0.2s;
    }
    #${PANEL_ID} .close-btn:hover { opacity: 1; }
    
    #${PANEL_ID} .left-controls{ display:flex; align-items:center; gap:10px; }
    #${PANEL_ID} .theme-toggle{
      display:inline-flex; align-items:center; justify-content:center; gap:6px;
      padding: 8px 10px; border-radius:10px; cursor:pointer; font-weight:600; min-height: var(--pt-minTouch);
    }
    #${PANEL_ID} .theme-toggle i{ font-size: 16px; }
    #${PANEL_ID} .theme-toggle .icon-sun{ display: none; }
    #${PANEL_ID} .theme-toggle[data-mode="light"] .icon-sun{ display: inline-block; }
    #${PANEL_ID} .theme-toggle[data-mode="light"] .icon-moon{ display: none; }
    #${PANEL_ID} .theme-toggle[data-mode="dark"] .icon-sun{ display: none; }
    #${PANEL_ID} .theme-toggle[data-mode="dark"] .icon-moon{ display: inline-block; }

    #${PANEL_ID} .panel-content{
      padding: clamp(10px, 2vw, 16px);
      overflow-y:auto; flex-grow:1; -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain; scrollbar-gutter: stable both-edges;
    }

    #${PANEL_ID} .panel-footer{
      padding: clamp(8px, 1.6vw, 12px) clamp(12px,2vw,16px);
      display:flex; justify-content:space-between; align-items:center; gap: 10px;
    }
    #${PANEL_ID} .panel-footer .left{ display:flex; align-items:center; gap: clamp(8px, 1.6vw, 12px); flex-wrap: wrap; }
    #${PANEL_ID} input[type="checkbox"]{ width: 18px; height: 18px; transform: scale(1.2); }
    #${PANEL_ID} .panel-footer .customize-button, #${PANEL_ID} .back-button{
      padding: clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px);
      border-radius:12px; cursor:pointer; font-weight:600; min-height: var(--pt-minTouch);
    }
    #${PANEL_ID} .prompt-view-topbar{ position: sticky; top: 0; z-index: 5; background: inherit; padding-bottom: 8px; margin-bottom: 8px; border-radius: 0 0 12px 12px; }
    #${PANEL_ID} .prompt-view-topbar-row{ display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px; }
    #${PANEL_ID} .view-header{ display:flex; align-items:center; margin:0; }
    #${PANEL_ID} .view-header h5{ margin:0; font-size:13px; font-weight:700; letter-spacing:0.01em; }
    .prompt-toolbar{ display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .prompt-toolbar input{ flex:1; padding:8px 10px; border-radius:12px; font-size:13px; }
    .prompt-item{ display:flex; align-items:center; margin-bottom:8px; cursor:pointer; padding: clamp(8px, 2vw, 12px); border-radius:12px; }
    .prompt-item input[type="checkbox"]{ margin-right:10px; transform: scale(1.2); }
    .prompt-item span{ flex: 1 1 auto; }

    #${QUICK_MENU_ID}{
      width: min(320px, 92vw); max-height: 86vh; overflow-y:auto; padding: clamp(10px, 2vw, 16px);
      font-size: clamp(13px, 1.2vw + 0.25rem, 16px); box-sizing: border-box; margin: 12px;
      -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain;
    }
    @supports (height: 1svh){ #${QUICK_MENU_ID}{ max-height: 86svh; } }
    #${QUICK_MENU_ID} .quick-item{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; min-height: var(--pt-minTouch); }
    #${QUICK_MENU_ID} .quick-item input[type="checkbox"]{ width: 20px; height: 20px; transform: scale(1.2); }

    #${PANEL_ID} .sel-toolbar{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px; margin-bottom:6px; }
    #${PANEL_ID} .sel-toolbar .sel-toolbar-left{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    #${PANEL_ID} .sel-toolbar button{ padding:4px 8px; border-radius:999px; cursor:pointer; font-size:11px; min-height:28px; }
    #${PANEL_ID} .sel-toolbar-right{ display:flex; gap:6px; align-items:center; }
    #${PANEL_ID} .sel-view-mode-btn{ padding:4px 10px; border-radius:999px; cursor:pointer; font-size:11px; min-height:28px; }
    
    #${PANEL_ID} .sel-group{ margin-bottom:8px; }
    #${PANEL_ID} .sel-group-header{ display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; padding:2px 2px 2px 0; }
    #${PANEL_ID} .sel-group-header .sel-group-arrow{ flex:0 0 auto; width:16px; text-align:center; transition:transform .15s; }
    #${PANEL_ID} .sel-group.collapsed .sel-group-arrow{ transform:rotate(-90deg); }
    #${PANEL_ID} .sel-group-title{ flex:1 1 auto; min-width:0; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }
    #${PANEL_ID} .sel-group-actions{ display:flex; gap:4px; flex:0 0 auto; }
    #${PANEL_ID} .sel-group-actions button{ border:none; background:transparent; cursor:pointer; font-size:14px; min-width:22px; min-height:22px; opacity: 0.7; }
    #${PANEL_ID} .sel-group-actions button:hover{ opacity: 1; }
    #${PANEL_ID} .sel-group-actions .sel-group-drag{ cursor:grab; touch-action:none; }
    #${PANEL_ID} .sel-group.dragging{ opacity:.9; }
    #${PANEL_ID} .sel-group-placeholder{ border-radius:10px; }
    #${PANEL_ID} .sel-group-body{ display:flex; flex-direction:column; gap:6px; margin-left:12px; }
    #${PANEL_ID} .sel-group.collapsed .sel-group-body{ display:none; }
    #${PANEL_ID} .sel-group-add-panel{ margin:4px 0 6px 12px; border-radius:10px; padding:6px 8px; font-size:12px; background: rgba(128,128,128,0.1); }
    #${PANEL_ID} .sel-group-add-title{ margin-bottom:4px; font-weight:600; }
    #${PANEL_ID} .sel-group-add-list{ max-height:160px; overflow-y:auto; -webkit-overflow-scrolling:touch; padding: 4px; }
    #${PANEL_ID} .sel-group-add-item{ display:flex; align-items:center; gap:6px; margin-bottom:4px; }
    #${PANEL_ID} .sel-group-add-item input[type="checkbox"]{ flex:0 0 auto; }
    #${PANEL_ID} .sel-group-add-item span{ flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #${PANEL_ID} .sel-group-add-actions{ display:flex; justify-content:flex-end; gap:6px; margin-top:4px; }
    #${PANEL_ID} .sel-group-add-actions button{ padding:4px 8px; border-radius:999px; cursor:pointer; font-size:11px; min-height:26px; }
    
    #${PANEL_ID} .sel-row { 
        display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:12px;
        touch-action: pan-y; transition: transform 0.1s;
    }
    #${PANEL_ID} .sel-row .drag-handle { cursor:grab; font-size:18px; line-height:1; min-width:24px; text-align:center; touch-action: none; opacity: 0.6; }
    #${PANEL_ID} .sel-row.dragging { opacity:.9; box-shadow:0 8px 24px rgba(0,0,0,.2); cursor:grabbing; }
    #${PANEL_ID} .sel-row .pill-group{ border:none; background:transparent; cursor:pointer; font-size:14px; width:28px; height:28px; border-radius:50%; }

    #${QUICK_MENU_ID} .quick-group{ margin-bottom:10px; }
    #${QUICK_MENU_ID} .quick-group-header{ display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; padding:4px 0; }
    #${QUICK_MENU_ID} .quick-group-header .quick-group-arrow{ flex:0 0 auto; width:16px; text-align:center; transition:transform .15s; }
    #${QUICK_MENU_ID} .quick-group.collapsed .quick-group-arrow{ transform:rotate(-90deg); }
    #${QUICK_MENU_ID} .quick-group-title{ flex:1 1 auto; min-width:0; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }
    #${QUICK_MENU_ID} .quick-group-body{ margin-left:12px; padding-top:4px; }
    #${QUICK_MENU_ID} .quick-group-ungrouped .quick-group-body{ border-left:none; margin-left:0; }
    #${QUICK_MENU_ID} .quick-group-toggle{ display:flex; align-items:center; gap:4px; flex:0 0 auto; cursor:pointer; }
    #${QUICK_MENU_ID} .quick-group-toggle input[type="checkbox"]{ width:16px; height:16px; }
    #${QUICK_MENU_ID} .quick-group-toggle-label{ font-size:11px; }
    /* ⭐ 计数器样式 */
    #${QUICK_MENU_ID} .quick-group-counter { margin-right: 8px; opacity: 0.7; font-size: 11px; font-variant-numeric: tabular-nums; }

    /* 功能切换标签 */
    #${PANEL_ID} .function-tabs {
      display: flex; gap: 8px; margin-bottom: 12px; padding: 4px;
      border-radius: 12px; background: rgba(128,128,128,0.1);
    }
    #${PANEL_ID} .func-tab-btn {
      flex: 1; padding: 8px 12px; border: none; border-radius: 10px;
      cursor: pointer; font-weight: 600; font-size: 13px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.2s ease;
      background: transparent; opacity: 0.7;
    }
    #${PANEL_ID} .func-tab-btn:hover { opacity: 1; }
    #${PANEL_ID} .func-tab-btn.active {
      background: rgba(255,255,255,0.6); opacity: 1;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    #${PANEL_ID} .func-tab-btn i { font-size: 14px; }

    /* 世界书列表项 */
    #${PANEL_ID} .wb-item { position: relative; }
    #${PANEL_ID} .wb-item.is-global { border-left: 3px solid #10b981; }
    #${PANEL_ID} .wb-global-badge { margin-left: auto; font-size: 14px; }
    #${PANEL_ID} .wb-global-indicator { font-size: 12px; margin-right: 4px; opacity: 0.8; }

    /* 快捷菜单分隔线 */
    #${QUICK_MENU_ID} .quick-section-divider {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0; margin: 12px 0 8px 0;
      font-size: 12px; font-weight: 700; opacity: 0.8;
      border-top: 1px solid rgba(128,128,128,0.2);
    }
    #${QUICK_MENU_ID} .quick-section-divider span {
      white-space: nowrap;
    }


    #${FLOATING_BALL_ID}{
      position:fixed; width: clamp(44px, 13vw, 56px); height: clamp(44px, 13vw, 56px);
      display:none; align-items:center; justify-content:center;
      font-size: clamp(18px, 5vw, 22px); cursor:pointer; z-index:9997; user-select:none;
      transition: transform .18s ease, background-color .18s, box-shadow .18s; touch-action: none;
    }
    #${FLOATING_BALL_ID}:hover{ transform: scale(1.1); }
    #${FLOATING_BALL_ID}:active{ transform: scale(0.95); }

    #${CUSTOMIZE_PANEL_ID}{ width: min(380px, 94vw); max-width: 94vw; max-height: 86vh; display:flex; flex-direction:column; font-size: clamp(13px, 1.2vw + 0.25rem, 16px); }
    @supports (height: 1svh){ #${CUSTOMIZE_PANEL_ID}{ max-height: 86svh; } }
    #${CUSTOMIZE_PANEL_ID} .cz-header{ padding: clamp(10px, 1.6vw, 14px) clamp(12px,2vw,16px); display:flex; align-items:center; justify-content:space-between; }
    #${CUSTOMIZE_PANEL_ID} .cz-header h5{ margin:0; font-size: clamp(15px, 1.2vw + .5rem, 18px); font-weight:800; }
    #${CUSTOMIZE_PANEL_ID} .cz-close{ background:none; border:none; color: inherit; font-size: clamp(22px, 2.6vw, 26px); cursor:pointer; min-width: var(--pt-minTouch); min-height: var(--pt-minTouch); opacity:0.7; }
    #${CUSTOMIZE_PANEL_ID} .cz-close:hover{ opacity:1; }
    #${CUSTOMIZE_PANEL_ID} .cz-body{ padding: clamp(10px, 2vw, 16px); display:flex; flex-direction:column; gap:14px; overflow-y:auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain; }
    #${CUSTOMIZE_PANEL_ID} .row{ display:flex; align-items:center; gap: 10px; flex-wrap:wrap; }
    #${CUSTOMIZE_PANEL_ID} .picker{ display:flex; flex-direction:column; gap:10px; }
    #${CUSTOMIZE_PANEL_ID} .sv-wrap{ position:relative; border-radius: 12px; overflow:hidden; }
    #${CUSTOMIZE_PANEL_ID} canvas{ display:block; width:100%; height:auto; touch-action:none; }
    #${CUSTOMIZE_PANEL_ID} .bar{ height: 18px; border-radius: 12px; overflow:hidden; }
    #${CUSTOMIZE_PANEL_ID} .bar-wrap{ position:relative; }
    #${CUSTOMIZE_PANEL_ID} .cursor{ position:absolute; width:12px; height:12px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.6); transform: translate(-6px, -6px); pointer-events:none; }
    #${CUSTOMIZE_PANEL_ID} .cursor-bar{ position:absolute; top:50%; width:12px; height:12px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.6); transform: translate(-6px, -50%); pointer-events:none; background: rgba(0,0,0,.15); }
    #${CUSTOMIZE_PANEL_ID} .fields{ display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:8px; }
    #${CUSTOMIZE_PANEL_ID} .fields .field{ display:flex; flex-direction:column; gap:4px; }
    #${CUSTOMIZE_PANEL_ID} .fields input{ padding:8px 10px; border-radius:8px; font-variant-numeric: tabular-nums; width:100%; font-size:16px; }
    #${CUSTOMIZE_PANEL_ID} .act-row{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    #${CUSTOMIZE_PANEL_ID} .btn{ padding:8px 12px; border-radius:12px; cursor:pointer; font-weight:600; min-height: var(--pt-minTouch); }
    #${CUSTOMIZE_PANEL_ID} .palette{ display:flex; gap:8px; flex-wrap:wrap; }
    #${CUSTOMIZE_PANEL_ID} .theme-btn{ display:flex; align-items:center; gap:6px; padding: 8px 10px; border-radius:12px; cursor:pointer; font-size: .95em; min-height: var(--pt-minTouch); }
    #${CUSTOMIZE_PANEL_ID} .swatch{ width:18px; height:18px; border-radius:50%; border:1px solid rgba(0,0,0,0.25); }
    #${CUSTOMIZE_PANEL_ID} .cz-footer{ padding: clamp(10px, 1.6vw, 14px) clamp(12px,2vw,16px); display:flex; justify-content:flex-end; gap:8px; }
    button:focus-visible, input:focus-visible{ outline:3px solid #60a5fa; outline-offset:2px; }
  </style>`;
        parentDoc.head.insertAdjacentHTML("beforeend", styles);
      }

      if (!parentDoc.getElementById(PANEL_ID)) {
        const panelHtml = `
    <div class="panel-header">
      <div class="left-controls">
        <button class="theme-toggle" title="浅/深色切换" data-mode="light" aria-label="切换浅色/深色模式">
          <i class="fa-solid fa-sun icon-sun"></i>
          <i class="fa-solid fa-moon icon-moon"></i>
        </button>
        <h4>预设快捷标签配置</h4>
      </div>
      <button class="close-btn" title="关闭" aria-label="关闭主面板">&times;</button>
    </div>
    <div class="panel-content"></div>
    <div class="panel-footer">
      <div class="left">
        <label><input type="checkbox" id="preset-tagger-show-ball"> 显示悬浮球</label>
        <button class="customize-button" aria-label="打开定制面板">定制</button>
        <button class="export-button" aria-label="导出配置">导出</button>
        <button class="import-button" aria-label="导入配置">导入</button>
        <input type="file" id="pt-import-file" style="display:none" accept=".json">
      </div>
      <button class="back-button footer-back-button" style="display:none;" aria-label="返回上一级">返回</button>
    </div>`;

        window.parent.$("body", parentDoc).append(`
    <div class="${MAIN_OVERLAY_CLS}"><div id="${PANEL_ID}">${panelHtml}</div></div>
    <div class="${QUICK_OVERLAY_CLS}"><div id="${QUICK_MENU_ID}"></div></div>
    <div class="${CUSTOMIZE_OVERLAY_CLS}">
      <div id="${CUSTOMIZE_PANEL_ID}">
        <div class="cz-header"><h5>悬浮球外观定制</h5><button class="cz-close" title="关闭" aria-label="关闭定制面板">&times;</button></div>
        <div class="cz-body">
          <div class="picker">
            <div class="sv-wrap"><canvas id="cz-sv"></canvas><div id="cz-sv-cursor" class="cursor"></div></div>
            <div class="bar-wrap"><canvas id="cz-hue" class="bar"></canvas><div id="cz-hue-cursor" class="cursor-bar"></div></div>
            <div class="bar-wrap"><canvas id="cz-alpha-bar" class="bar"></canvas><div id="cz-alpha-cursor" class="cursor-bar"></div></div>
          </div>
          <div class="fields">
            <div class="field"><label>Hex</label><input id="cz-hex" placeholder="#FFFFFF" /></div>
            <div class="field"><label>R</label><input id="cz-r" type="number" min="0" max="255" /></div>
            <div class="field"><label>G</label><input id="cz-g" type="number" min="0" max="255" /></div>
            <div class="field"><label>B</label><input id="cz-b" type="number" min="0" max="255" /></div>
          </div>
          <div class="act-row">
            <button class="btn" id="cz-eyedrop">吸取屏幕颜色</button>
            <button class="btn" id="cz-reset">重置默认</button>
          </div>
          <div class="row">
            <label>色彩主题</label>
            <div class="palette" id="cz-themes"></div>
          </div>
        </div>
        <div class="cz-footer"><button class="btn" id="cz-close">完成</button></div>
      </div>
    </div>
    <div id="${FLOATING_BALL_ID}" role="button" aria-label="打开快捷菜单"><i class="fa-solid fa-tags"></i></div>
  `);
      }

      const $body = window.parent.$("body", parentDoc);
      const $panel = window.parent.$(`#${PANEL_ID}`);
      const $panelContent = $panel.find(".panel-content");
      const $mainOverlay = window.parent.$(`.${MAIN_OVERLAY_CLS}`);
      const $quickOverlay = window.parent.$(`.${QUICK_OVERLAY_CLS}`);
      const $quickMenu = window.parent.$(`#${QUICK_MENU_ID}`);
      const $czOverlay = window.parent.$(`.${CUSTOMIZE_OVERLAY_CLS}`);
      const $czPanel = window.parent.$(`#${CUSTOMIZE_PANEL_ID}`);
      const ball = parentDoc.getElementById(FLOATING_BALL_ID);

      migrateSelectionsIfNeeded();
      $panel.find(".theme-toggle").attr("data-mode", settings.themeMode);
      applyBallAppearance();
      applyThemeFromBallColor();

      const preventTouchThrough = (overlayEl) => {
        if (!overlayEl) return;
        overlayEl.addEventListener(
          "touchmove",
          (e) => {
            const scroller = e.target.closest(
              `#${PANEL_ID}, #${QUICK_MENU_ID}, #${CUSTOMIZE_PANEL_ID}`,
            );
            if (!scroller) e.preventDefault();
          },
          { passive: false },
        );
      };
      preventTouchThrough($mainOverlay[0]);
      preventTouchThrough($quickOverlay[0]);
      preventTouchThrough($czOverlay[0]);

      const closeQuickMenu = (e) => {
        if (e) {
          e.preventDefault();
        }
        saveSettings();
        $quickOverlay.hide();
        if (!anyOverlayVisible()) unlockScroll(parentDoc);
        alignVisibleOverlays();
      };
      const closeMainMenu = (e) => {
        if (e) {
          e.preventDefault();
        }
        saveSettings();
        lastScrollPosition = 0;
        $mainOverlay.hide();
        if (!anyOverlayVisible()) unlockScroll(parentDoc);
        alignVisibleOverlays();
      };

      $panelContent.on("click.taggerNav", ".preset-list-item", function () {
        lastScrollPosition = $panelContent.scrollTop();
        populatePromptView(window.parent.$(this).data("preset-name"));
      });
      $panel.on("click.tagger", ".footer-back-button", function () {
        populateMainMenu();
      });
      $panel.on("click.tagger", ".close-btn", closeMainMenu);
      $mainOverlay.on("click.tagger touchend.tagger", closeMainMenu);
      $panel.on("click.tagger touchend.tagger", (e) => e.stopPropagation());
      $panelContent.on("keydown", ".preset-list-item", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.parent.$(this).trigger("click");
        }
      });
      $panel.on("click", ".theme-toggle", function () {
        settings.themeMode = settings.themeMode === "dark" ? "light" : "dark";
        window.parent.$(this).attr("data-mode", settings.themeMode);
        applyThemeFromBallColor();
        applyBallAppearance();
        saveSettings();
      });

      $body.on("change.tagger", "#preset-tagger-show-ball", function () {
        settings.showBall = window.parent.$(this).is(":checked");
        const $b = window.parent.$(`#${FLOATING_BALL_ID}`);
        if (settings.showBall) {
          applyBallAppearance();
          $b.css("display", "flex");
          ensureBallInViewport();
        } else {
          $b.css("display", "none");
          closeQuickMenu();
        }
        saveSettings();
      });

      // --- 导出逻辑 ---
      $panel.on("click.tagger", ".export-button", function () {
        try {
          const dataStr = JSON.stringify(settings, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `preset_tagger_backup_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          window.parent.toastr?.success?.("配置导出成功");
        } catch (e) {
          log("导出失败:", e);
          window.parent.toastr?.error?.("配置导出失败");
        }
      });

      // --- 导入逻辑 ---
      $panel.on("click.tagger", ".import-button", function () {
        $panel.find("#pt-import-file").click();
      });

      $panel.on("change.tagger", "#pt-import-file", function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          try {
            const imported = JSON.parse(ev.target.result);
            if (typeof imported === "object" && imported !== null) {
              settings = { ...settings, ...imported };
              saveSettings();
              applyBallAppearance();
              applyThemeFromBallColor();
              window.parent
                .$(`#preset-tagger-show-ball`)
                .prop("checked", settings.showBall);
              window.parent
                .$(`#${PANEL_ID} .theme-toggle`)
                .attr("data-mode", settings.themeMode);
              if (settings.showBall) {
                window.parent.$(`#${FLOATING_BALL_ID}`).css("display", "flex");
                ensureBallInViewport();
              } else {
                window.parent.$(`#${FLOATING_BALL_ID}`).css("display", "none");
              }
              populateMainMenu();
              window.parent.toastr?.success?.("配置导入成功，界面已刷新");
            } else {
              throw new Error("Invalid JSON structure");
            }
          } catch (err) {
            log("导入失败:", err);
            window.parent.toastr?.error?.("配置导入失败：文件格式错误");
          }
          // 清空 input 以允许重复导入同一文件
          e.target.value = "";
        };
        reader.readAsText(file);
      });

      $quickOverlay.on("click.tagger touchend.tagger", closeQuickMenu);
      $quickMenu.on("click.tagger touchend.tagger", (e) => e.stopPropagation());

      async function batchToggleQuickGroup($group, enabled) {
        const $items = $group.find(".quick-item .quick-toggle");
        if (!$items.length) return;
        const targets = [];
        $items.each(function () {
          const $chk = window.parent.$(this);
          const current = $chk.is(":checked");
          if (current === enabled) return;
          const id = $chk.attr("data-prompt-id") || undefined;
          const name = $chk.attr("data-prompt-name") || undefined;
          const idx = parseInt($chk.attr("data-prompt-idx"), 10) || 1;
          $chk.prop("checked", enabled);
          targets.push({ id, name, idx });
        });
        if (!targets.length) return;
        try {
          await window.parent.TavernHelper.updatePresetWith(
            "in_use",
            (preset) => {
              for (const t of targets) {
                let changed = false;
                if (t.id) {
                  const p = preset.prompts.find((x) => x.id === t.id);
                  if (p) {
                    p.enabled = enabled;
                    changed = true;
                  }
                }
                if (!changed && t.name) {
                  const list = preset.prompts.filter(
                    (x) => (x.name || "") === t.name,
                  );
                  if (list.length) {
                    const i = clamp(t.idx || 1, 1, list.length) - 1;
                    list[i].enabled = enabled;
                  }
                }
              }
              return preset;
            },
          );
        } catch (err) {
          log("批量切换分组出错:", err);
          window.parent.toastr?.error?.("批量切换条目状态失败！");
        }
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      }

      $body.on(
        "change.tagger",
        `#${QUICK_MENU_ID} .quick-toggle`,
        async function () {
          const $chk = window.parent.$(this);
          const id = $chk.attr("data-prompt-id") || undefined;
          const name = $chk.attr("data-prompt-name") || undefined;
          const idx = parseInt($chk.attr("data-prompt-idx"), 10) || 1;
          const enabled = $chk.is(":checked");
          await togglePromptEnabled({ id, name, idx }, enabled);
          if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
            populateQuickMenu();
            fitQuickMenu();
            alignVisibleOverlays();
          }
        },
      );

      $quickMenu.on(
        "change.tagger",
        ".quick-group-checkbox",
        async function (e) {
          e.stopPropagation();
          const $chk = window.parent.$(this);
          const enabled = $chk.is(":checked");
          const $group = $chk.closest(".quick-group");
          await batchToggleQuickGroup($group, enabled);
        },
      );
      $quickMenu.on("click.tagger", ".quick-group-header", function (e) {
        if (window.parent.$(e.target).closest(".quick-group-toggle").length) {
          return;
        }
        e.stopPropagation();
        const $group = window.parent.$(this).closest(".quick-group");
        const gid = $group.attr("data-gid") || "";
        const wbgid = $group.attr("data-wbgid");

        // 世界书分组折叠
        if (wbgid !== undefined) {
          if (!wbgid) return;
          const g = findWorldbookGroupById(wbgid);
          if (!g) return;
          g.collapsed = !g.collapsed;
          saveSettings();
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
          return;
        }

        // 预设条目分组折叠
        if (!gid) return;
        const loadedName = window.parent.TavernHelper.getLoadedPresetName();
        const g = findGroupById(loadedName, gid);
        if (!g) return;
        g.collapsed = !g.collapsed;
        saveSettings();
        populateQuickMenu();
        fitQuickMenu();
        alignVisibleOverlays();
      });

      // --- 世界书快捷菜单事件处理 ---
      $body.on(
        "change.tagger",
        `#${QUICK_MENU_ID} .quick-wb-toggle`,
        async function () {
          const $chk = window.parent.$(this);
          const wbName = $chk.attr("data-wb-name");
          const enabled = $chk.is(":checked");
          await toggleWorldbookGlobal(wbName, enabled);
          if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
            populateQuickMenu();
            fitQuickMenu();
            alignVisibleOverlays();
          }
        },
      );

      // 世界书分组批量切换
      async function batchToggleWorldbookGroup($group, enabled) {
        const $items = $group.find(".quick-wb-toggle");
        if (!$items.length) return;
        const names = [];
        $items.each(function () {
          const $chk = window.parent.$(this);
          const wbName = $chk.attr("data-wb-name");
          if (wbName) names.push(wbName);
        });
        if (!names.length) return;

        try {
          const current =
            window.parent.TavernHelper.getGlobalWorldbookNames() || [];
          let newList = [...current];
          if (enabled) {
            names.forEach((n) => {
              if (!newList.includes(n)) newList.push(n);
            });
          } else {
            newList = newList.filter((n) => !names.includes(n));
          }
          await window.parent.TavernHelper.rebindGlobalWorldbooks(newList);
        } catch (err) {
          log("批量切换世界书分组出错:", err);
          window.parent.toastr?.error?.("批量切换世界书状态失败！");
        }
        if (window.parent.$(`.${QUICK_OVERLAY_CLS}`).is(":visible")) {
          populateQuickMenu();
          fitQuickMenu();
          alignVisibleOverlays();
        }
      }

      $quickMenu.on(
        "change.tagger",
        ".quick-wb-group-checkbox",
        async function (e) {
          e.stopPropagation();
          const $chk = window.parent.$(this);
          const enabled = $chk.is(":checked");
          const $group = $chk.closest(".wb-quick-group");
          await batchToggleWorldbookGroup($group, enabled);
        },
      );

      const dragStart = (e) => {
        e.preventDefault();
        isBallDragging = false;
        const startX =
          e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        const startY =
          e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
        const pos = ball.getBoundingClientRect();
        const dragMove = (me) => {
          const moveX =
            me.type === "touchmove" ? me.touches[0].clientX : me.clientX;
          const moveY =
            me.type === "touchmove" ? me.touches[0].clientY : me.clientY;
          if (Math.abs(moveX - startX) > 5 || Math.abs(moveY - startY) > 5) {
            isBallDragging = true;
            ball.style.transition = "none";
            ball.style.left = `${pos.left + (moveX - startX)}px`;
            ball.style.top = `${pos.top + (moveY - startY)}px`;
            ball.style.right = "auto";
            ball.style.bottom = "auto";
          }
        };
        const dragEnd = () => {
          parentDoc.removeEventListener("mousemove", dragMove);
          parentDoc.removeEventListener("mouseup", dragEnd);
          parentDoc.removeEventListener("touchmove", dragMove);
          parentDoc.removeEventListener("touchend", dragEnd);
          ball.style.transition = "transform 0.2s ease, background-color 0.2s";
          if (!isBallDragging) {
            if ($quickOverlay.is(":visible")) {
              closeQuickMenu();
            } else {
              populateQuickMenu();
              $quickOverlay.css("display", "flex");
              lockScroll(parentDoc);
              fitQuickMenu();
              alignVisibleOverlays();
              setTimeout(populateQuickMenu, 50);
            }
          } else {
            settings.ballPosition.left = ball.style.left;
            settings.ballPosition.top = ball.style.top;
            ensureBallInViewport();
            saveSettings();
          }
        };
        parentDoc.addEventListener("mousemove", dragMove, { passive: true });
        parentDoc.addEventListener("mouseup", dragEnd);
        parentDoc.addEventListener("touchmove", dragMove, { passive: false });
        parentDoc.addEventListener("touchend", dragEnd);
      };
      ball.addEventListener("mousedown", dragStart);
      ball.addEventListener("touchstart", dragStart, { passive: false });

      const ensureBallInViewport = () => {
        if (ball.style.display === "none") return;
        const rect = ball.getBoundingClientRect();
        const vw = window.parent.innerWidth,
          vh = window.parent.innerHeight,
          m = 6;
        if (rect.right > vw - m) ball.style.left = `${vw - m - rect.width}px`;
        if (rect.bottom > vh - m) ball.style.top = `${vh - m - rect.height}px`;
        if (rect.left < m) ball.style.left = `${m}px`;
        if (rect.top < m) ball.style.top = `${m}px`;
        settings.ballPosition.left = ball.style.left;
        settings.ballPosition.top = ball.style.top;
        saveSettings();
      };

      const vv = window.parent.visualViewport;
      const onVVChange = () => {
        fitMainPanel();
        fitQuickMenu();
        fitCustomizePanel();
        alignVisibleOverlays();
      };
      if (vv) {
        vv.addEventListener("resize", onVVChange);
        vv.addEventListener("scroll", onVVChange);
      }
      const redrawPickers = () => {
        try {
          drawHue();
          drawAlpha();
          drawSV();
        } catch (_) {}
      };
      window.parent.addEventListener("resize", () => {
        ensureBallInViewport();
        onVVChange();
      });
      window.parent.addEventListener("orientationchange", () => {
        setTimeout(() => {
          ensureBallInViewport();
          fitMainPanel();
          fitQuickMenu();
          fitCustomizePanel();
          redrawPickers();
        }, 100);
      });

      const THEMES = [
        { name: "玻璃白", rgb: [255, 255, 255] },
        { name: "酷黑", rgb: [0, 0, 0] },
        { name: "雾灰", rgb: [136, 136, 136] },
        { name: "樱桃红", rgb: [255, 59, 48] },
        { name: "日落橙", rgb: [255, 149, 0] },
        { name: "翡翠绿", rgb: [52, 199, 89] },
        { name: "靛蓝", rgb: [0, 122, 255] },
        { name: "魅紫", rgb: [175, 82, 222] },
      ];
      const $sv = $czPanel.find("#cz-sv"),
        $hue = $czPanel.find("#cz-hue"),
        $svCursor = $czPanel.find("#cz-sv-cursor"),
        $hueCursor = $czPanel.find("#cz-hue-cursor"),
        $alphaBar = $czPanel.find("#cz-alpha-bar"),
        $alphaBarCursor = $czPanel.find("#cz-alpha-cursor"),
        $hex = $czPanel.find("#cz-hex"),
        $r = $czPanel.find("#cz-r"),
        $g = $czPanel.find("#cz-g"),
        $b = $czPanel.find("#cz-b");
      let hsv = (() => {
        const c = settings.ballColor;
        return rgbToHsv(c.r, c.g, c.b);
      })();

      function resizeCanvasToDisplaySize(canvas, hPrefer) {
        const dpr = window.parent.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(220, Math.round(rect.width));
        const h = hPrefer || Math.round(w * 0.62);
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { w, h, ctx };
      }
      function drawHue() {
        const { w, ctx } = resizeCanvasToDisplaySize($hue[0], 18);
        const grd = ctx.createLinearGradient(0, 0, w, 0);
        grd.addColorStop(0 / 6, "#ff0000");
        grd.addColorStop(1 / 6, "#ffff00");
        grd.addColorStop(2 / 6, "#00ff00");
        grd.addColorStop(3 / 6, "#00ffff");
        grd.addColorStop(4 / 6, "#0000ff");
        grd.addColorStop(5 / 6, "#ff00ff");
        grd.addColorStop(1, "#ff0000");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, 18);
        const x = (hsv.h / 360) * w;
        $hueCursor.css({ left: `${x}px` });
      }
      function drawAlpha() {
        const { w, ctx } = resizeCanvasToDisplaySize($alphaBar[0], 18);
        const cell = 8;
        for (let y = 0; y < 18; y += cell) {
          for (let x = 0; x < w; x += cell) {
            ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? "#ddd" : "#fff";
            ctx.fillRect(x, y, cell, cell);
          }
        }
        const c = settings.ballColor || { r: 240, g: 240, b: 240, a: 0.6 };
        const grd = ctx.createLinearGradient(0, 0, w, 0);
        grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0)`);
        grd.addColorStop(1, `rgba(${c.r},${c.g},${c.b},1)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, 18);
        const x = clamp((settings.ballColor?.a ?? 1) * w, 0, w);
        $alphaBarCursor.css({ left: `${x}px` });
      }
      function drawSV() {
        const { w, h, ctx } = resizeCanvasToDisplaySize($sv[0]);
        const hueRgb = hsvToRgb(hsv.h, 1, 1);
        ctx.fillStyle = `rgb(${hueRgb.r},${hueRgb.g},${hueRgb.b})`;
        ctx.fillRect(0, 0, w, h);
        const grdWhite = ctx.createLinearGradient(0, 0, w, 0);
        grdWhite.addColorStop(0, "#ffffff");
        grdWhite.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grdWhite;
        ctx.fillRect(0, 0, w, h);
        const grdBlack = ctx.createLinearGradient(0, 0, 0, h);
        grdBlack.addColorStop(0, "rgba(0,0,0,0)");
        grdBlack.addColorStop(1, "#000000");
        ctx.fillStyle = grdBlack;
        ctx.fillRect(0, 0, w, h);
        const x = hsv.s * w;
        const y = (1 - hsv.v) * h;
        $svCursor.css({ left: `${x}px`, top: `${y}px` });
      }
      function updateFieldsFromColor() {
        const c = settings.ballColor;
        $hex.val(rgbToHex(c.r, c.g, c.b).toUpperCase());
        $r.val(c.r);
        $g.val(c.g);
        $b.val(c.b);
      }
      function applyColorChangeFromHSV() {
        const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
        settings.ballColor = {
          ...settings.ballColor,
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
        };
        drawSV();
        drawHue();
        drawAlpha();
        updateFieldsFromColor();
        applyBallAppearance();
        applyThemeFromBallColor();
        saveSettings();
      }
      function applyAlpha(a01) {
        const a = clamp(a01, 0, 1);
        settings.ballColor = { ...settings.ballColor, a };
        applyBallAppearance();
        saveSettings();
        drawAlpha();
      }
      function bindDrag(canvas, onPos) {
        let dragging = false;
        const handle = (e) => {
          const rect = canvas.getBoundingClientRect();
          const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
          const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
          onPos(clamp(cx, 0, rect.width), clamp(cy, 0, rect.height), rect);
        };
        const down = (e) => {
          dragging = true;
          e.preventDefault();
          handle(e);
        };
        const move = (e) => {
          if (dragging) handle(e);
        };
        const up = () => {
          dragging = false;
        };
        canvas.addEventListener("mousedown", down);
        canvas.addEventListener("mousemove", move);
        window.parent.addEventListener("mouseup", up);
        canvas.addEventListener("touchstart", down, { passive: false });
        canvas.addEventListener("touchmove", move, { passive: false });
        window.parent.addEventListener("touchend", up);
      }
      bindDrag($sv[0], (x, y, rect) => {
        hsv.s = x / rect.width;
        hsv.v = 1 - y / rect.height;
        applyColorChangeFromHSV();
      });
      bindDrag($hue[0], (x, _y, rect) => {
        hsv.h = (x / rect.width) * 360;
        drawHue();
        applyColorChangeFromHSV();
      });
      bindDrag($alphaBar[0], (x, _y, rect) => {
        const t = x / rect.width;
        applyAlpha(t);
      });

      $hex.on("input change", function () {
        const v = window.parent.$(this).val().trim();
        if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v)) return;
        const { r, g, b } = hexToRgb(v[0] === "#" ? v : "#" + v);
        settings.ballColor = { ...settings.ballColor, r, g, b };
        hsv = rgbToHsv(r, g, b);
        drawSV();
        drawHue();
        drawAlpha();
        updateFieldsFromColor();
        applyBallAppearance();
        applyThemeFromBallColor();
        saveSettings();
      });
      const onRGB = () => {
        const r = clamp(parseInt($r.val(), 10) || 0, 0, 255);
        const g = clamp(parseInt($g.val(), 10) || 0, 0, 255);
        const b = clamp(parseInt($b.val(), 10) || 0, 0, 255);
        settings.ballColor = { ...settings.ballColor, r, g, b };
        hsv = rgbToHsv(r, g, b);
        drawSV();
        drawHue();
        drawAlpha();
        $hex.val(rgbToHex(r, g, b).toUpperCase());
        applyBallAppearance();
        applyThemeFromBallColor();
        saveSettings();
      };
      $r.on("input change", onRGB);
      $g.on("input change", onRGB);
      $b.on("input change", onRGB);

      const buildThemeButtons = () => {
        const $pal = $czPanel.find("#cz-themes");
        $pal.empty();
        THEMES.forEach((t) => {
          const [r, g, b] = t.rgb;
          const hex = rgbToHex(r, g, b);
          const $btn = window.parent.$(
            `<button class="theme-btn" data-r="${r}" data-g="${g}" data-b="${b}"><span class="swatch" style="background:${hex}"></span><span>${t.name}</span></button>`,
          );
          $pal.append($btn);
        });
      };
      $czPanel.on("click.tagger", ".theme-btn", function () {
        const r = parseInt(window.parent.$(this).data("r"), 10);
        const g = parseInt(window.parent.$(this).data("g"), 10);
        const b = parseInt(window.parent.$(this).data("b"), 10);
        settings.ballColor = { ...settings.ballColor, r, g, b };
        hsv = rgbToHsv(r, g, b);
        drawSV();
        drawHue();
        drawAlpha();
        updateFieldsFromColor();
        applyBallAppearance();
        applyThemeFromBallColor();
        saveSettings();
      });

      function openEyeDropper() {
        const TopWin = window.parent || window;
        const Eye = TopWin.EyeDropper || window.EyeDropper;
        if (Eye) {
          const eyedropper = new Eye();
          eyedropper
            .open()
            .then((res) => {
              const { r, g, b } = hexToRgb(res.sRGBHex);
              settings.ballColor = { ...settings.ballColor, r, g, b };
              hsv = rgbToHsv(r, g, b);
              drawSV();
              drawHue();
              drawAlpha();
              updateFieldsFromColor();
              applyBallAppearance();
              applyThemeFromBallColor();
              saveSettings();
            })
            .catch(() => {});
          return;
        }
        const input = document.createElement("input");
        input.type = "color";
        input.style.position = "fixed";
        input.style.left = "-9999px";
        parentDoc.body.appendChild(input);
        input.addEventListener(
          "input",
          () => {
            const { r, g, b } = hexToRgb(input.value);
            settings.ballColor = { ...settings.ballColor, r, g, b };
            hsv = rgbToHsv(r, g, b);
            drawSV();
            drawHue();
            drawAlpha();
            updateFieldsFromColor();
            applyBallAppearance();
            applyThemeFromBallColor();
            saveSettings();
            setTimeout(() => input.remove(), 0);
          },
          { once: true },
        );
        input.click();
      }
      $czPanel.on("click.tagger", "#cz-eyedrop", (e) => {
        e.preventDefault();
        openEyeDropper();
      });

      function fitCustomizePanel() {
        try {
          const vv = window.parent.visualViewport;
          const vh = vv ? vv.height : window.parent.innerHeight;
          const vw = vv ? vv.width : window.parent.innerWidth;
          const cz = window.parent.document.getElementById(CUSTOMIZE_PANEL_ID);
          if (!cz) return;
          const mainMaxW = Math.min(560, Math.round(vw * 0.94));
          const mainMaxH = Math.round(vh * 0.86);
          const desiredW = Math.min(mainMaxW, 380);
          cz.style.maxWidth = `${mainMaxW}px`;
          cz.style.maxHeight = `${mainMaxH}px`;
          cz.style.width = `${desiredW}px`;
          const headerH =
            cz.querySelector(".cz-header")?.getBoundingClientRect().height || 0;
          const footerH =
            cz.querySelector(".cz-footer")?.getBoundingClientRect().height || 0;
          const body = cz.querySelector(".cz-body");
          if (body) {
            const bodyMax = Math.max(120, mainMaxH - headerH - footerH - 6);
            body.style.maxHeight = `${bodyMax}px`;
            body.style.overflowY = "auto";
          }
          requestAnimationFrame(() => {
            drawHue();
            drawAlpha();
            drawSV();
          });
        } catch (e) {}
      }
      function openCustomize() {
        const c = settings.ballColor || { r: 240, g: 240, b: 240, a: 0.6 };
        hsv = rgbToHsv(c.r, c.g, c.b);
        buildThemeButtons();
        drawHue();
        drawAlpha();
        drawSV();
        updateFieldsFromColor();
        $czOverlay.css("display", "flex");
        lockScroll(parentDoc);
        alignVisibleOverlays();
        fitCustomizePanel();
        requestAnimationFrame(() => {
          fitCustomizePanel();
        });
      }
      function closeCustomize() {
        saveSettings();
        $czOverlay.hide();
        if (!anyOverlayVisible()) unlockScroll(parentDoc);
        alignVisibleOverlays();
      }

      $panel.on("click.tagger", ".customize-button", (e) => {
        e.preventDefault();
        openCustomize();
      });
      $czOverlay.on("click.tagger", (e) => {
        if (e.target === $czOverlay[0]) closeCustomize();
      });
      $czPanel.on("click.tagger", (e) => e.stopPropagation());
      $czPanel.on("click.tagger", ".cz-close", closeCustomize);
      $czPanel.on("click.tagger", "#cz-close", closeCustomize);
      $czPanel.on("click.tagger", "#cz-reset", function () {
        settings.ballColor = { r: 240, g: 240, b: 240, a: 0.6 };
        hsv = rgbToHsv(240, 240, 240);
        drawHue();
        drawAlpha();
        drawSV();
        updateFieldsFromColor();
        applyBallAppearance();
        applyThemeFromBallColor();
        saveSettings();
      });

      if (!settings.ballPosition?.left || !settings.ballPosition?.top) {
        const vw = window.parent.innerWidth;
        const vh = window.parent.innerHeight;
        const d = Math.min(Math.max(44, Math.round(vw * 0.13)), 56);
        const left = Math.round(vw * 0.5 + vw * 0.1 - d / 2);
        const top = Math.round(vh * 0.5 + vh * 0.1 - d / 2);
        ball.style.left = `${left}px`;
        ball.style.top = `${top}px`;
        ball.style.right = "auto";
        ball.style.bottom = "auto";
        settings.ballPosition.left = ball.style.left;
        settings.ballPosition.top = ball.style.top;
        saveSettings();
      } else {
        ball.style.left = settings.ballPosition.left;
        ball.style.top = settings.ballPosition.top;
        ball.style.right = "auto";
        ball.style.bottom = "auto";
      }

      isInitialized = true;
      log("初始化完成。");
    }

    // 打开主面板
    function openPanel() {
      if (!isInitialized) masterInitialize();
      setTimeout(() => {
        allPresetsCache = null;
        populateMainMenu();
        const $p = window.parent.$(`#${PANEL_ID}`);
        $p.find(".theme-toggle").attr("data-mode", settings.themeMode);
        window.parent.$(`.${MAIN_OVERLAY_CLS}`).css("display", "flex");
        lockScroll(window.parent.document);
        window.parent
          .$("#preset-tagger-show-ball")
          .prop("checked", settings.showBall);
        fitMainPanel();
        alignVisibleOverlays();
      }, 50);
    }

    // 入口
    function start() {
      loadSettings();

      // 脚本卸载时清理所有资源
      $(window).on("pagehide", () => {
        const parent$ = window.parent.$;
        const parentDoc = window.parent.document;

        // 清理 DOM 元素
        parent$(`#${BUTTON_ID}`).remove();
        parent$(`.${MAIN_OVERLAY_CLS}`).remove();
        parent$(`.${QUICK_OVERLAY_CLS}`).remove();
        parent$(`.${CUSTOMIZE_OVERLAY_CLS}`).remove();
        parent$(`#${FLOATING_BALL_ID}`).remove();
        parent$(`#${STYLE_ID}`).remove();
        parent$(`#${THEME_STYLE_ID}`).remove();

        // 清理事件监听
        parent$("body").off(".tagger");
        parent$(parentDoc).off(".tagger");

        // 重置状态
        isInitialized = false;
        allPresetsCache = null;

        // 清理 iOS 缩放修复样式
        try {
          const zoomFix = parentDoc.getElementById("pt-ios-zoom-fix");
          if (zoomFix) zoomFix.remove();
        } catch (_) {}

        log("脚本已卸载，资源已清理。");
      });

      const createButtonInterval = setInterval(() => {
        const parent$ = window.parent.$;
        if (
          parent$ &&
          parent$(`#extensionsMenu`).length > 0 &&
          window.parent.TavernHelper
        ) {
          clearInterval(createButtonInterval);
          if (parent$(`#${BUTTON_ID}`).length === 0) {
            const $btn = parent$("<div/>", {
              id: BUTTON_ID,
              class: "list-group-item flex-container flexGap5 interactable",
            });
            $btn.append('<i class="fa-solid fa-tags"></i>');
            $btn.append(parent$("<span/>").text("预设快捷标签"));
            $btn.on("click", (ev) => {
              ev.stopPropagation();
              window.parent.$("body").trigger("click");
              openPanel();
            });
            $btn.appendTo(parent$(`#extensionsMenu`));
            log("按钮已创建。等待交互。");

            if (settings.showBall) {
              const readyInterval = setInterval(() => {
                if (window.parent.document.readyState === "complete") {
                  clearInterval(readyInterval);
                  if (!isInitialized) masterInitialize();
                  setTimeout(() => {
                    applyBallAppearance();
                    window.parent
                      .$(`#${FLOATING_BALL_ID}`)
                      .css("display", "flex");
                  }, 100);
                }
              }, 200);
            }
          }
        }
      }, 200);
    }
    start();
  })(),
);
