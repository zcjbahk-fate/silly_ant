// ==========================================
// 1. 初始化设置与默认值
// ==========================================
const { eventSource, event_types, chat, saveChat, updateMessageBlock } = SillyTavern.getContext();

const REGEX_STORAGE_KEY = 'st_script_custom_reasoning_regex';
const DEFAULT_REGEX_STR = '/(?:<(?:ECoT|think(?:ing)?)>)?([\\s\\S]+)</(?:ECoT|think(?:ing)?)>/i';

// ==========================================
// 2. 正则解析工具函数
// ==========================================
function createRegexFromInput(inputStr) {
    const str = inputStr.trim();
    const formatRegex = /^\/([\s\S]+)\/([gimsuy]*)$/i;
    const match = str.match(formatRegex);

    if (match) {
        return new RegExp(match[1], match[2]);
    } else {
        return new RegExp(str);
    }
}

// ==========================================
// 3. 自定义 UI 面板
// ==========================================
function initCustomModal() {
    // 检查面板是否已存在
    if (document.querySelector('.custom-cot-regex-modal')) return;

    const modalHtml = `
    <div class="custom-cot-regex-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; z-index:9998;backdrop-filter: blur(8px);"></div>
    <div class="custom-cot-regex-modal popup" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:9999;">
        <h3>自定义思维链正则</h3>
        <div style="text-align: center; font-size: 0.9em; margin-bottom: 15px;">
            <b>注意：</b>必须有且只有一个<b>捕获组 <code>()</code></b>！
        </div>
        <div>
        <input class="custom-cot-regex-input text_pole textarea_compact" type="text" style="padding:4px">
        <div class="custom-cot-regex-error" style="color:#ff6b6b; font-size:0.85em; margin-bottom:10px; display:none; text-align:center;"></div>
        </div>
        <div class="popup-controls">
            <button class="custom-cot-btn-save menu_button">仅保存</button>
            <button class="custom-cot-btn-scan menu_button">保存并扫描</button>
            <button class="custom-cot-btn-cancel menu_button">取消</button>
        </div>
    </div>
    `;
    $('body').append(modalHtml);

    // 绑定面板事件
    $('.custom-cot-btn-cancel, .custom-cot-regex-overlay').on('click', hideModal);

    $('.custom-cot-btn-save').on('click', () => handleSave(false));
    $('.custom-cot-btn-scan').on('click', () => handleSave(true));
}

function showModal() {
    const currentRegexStr = localStorage.getItem(REGEX_STORAGE_KEY) || DEFAULT_REGEX_STR;
    $('.custom-cot-regex-input').val(currentRegexStr);
    $('.custom-cot-regex-error').hide();
    $('.custom-cot-regex-overlay').fadeIn(200);
    $('.custom-cot-regex-modal').fadeIn(200);
}

function hideModal() {
    $('.custom-cot-regex-overlay').fadeOut(200);
    $('.custom-cot-regex-modal').fadeOut(200);
}

function handleSave(shouldScan) {
    const newVal = $('.custom-cot-regex-input').val();
    if (!newVal) {
        $('.custom-cot-regex-error').text('正则表达式不能为空！').show();
        return;
    }
    try {
        createRegexFromInput(newVal); // 测试语法
    } catch (e) {
        $('.custom-cot-regex-error').text(`语法错误: ${e.message}`).show();
        return;
    }

    localStorage.setItem(REGEX_STORAGE_KEY, newVal);
    hideModal();

    if (shouldScan) {
        processAllMessages();
        if (window.toastr) window.toastr.success('已完成对现有消息的重新扫描！');
    } else {
        if (window.toastr) window.toastr.success('正则已保存！新消息将使用该规则。');
    }
}

// ==========================================
// 4. 按钮注入逻辑
// ==========================================
function injectSettingsButton() {
    // 最新消息的 extraMesButtons 区域
    $('.mes.last_mes .extraMesButtons').each(function () {
        // 防止重复注入
        if (!$(this).find('.cot-regex-settings-btn').length) {
            // 添加一个齿轮图标按钮
            const btnHtml = `<div title="思维链正则" class="mes_button cot-regex-settings-btn fa-solid fa-code interactable" data-i18n="[title]Cot regex" tabindex="0" role="button"></div>`;
            $(this).append(btnHtml);
        }
    });
}

// 使用事件代理绑定点击事件，确保新刷出的消息按钮也能被点击
$('#chat').off('click', '.cot-regex-settings-btn').on('click', '.cot-regex-settings-btn', function () {
    showModal();
});

// 使用 MutationObserver 监听聊天区域变化，自动为新消息注入按钮
const chatObserver = new MutationObserver(() => {
    injectSettingsButton();
});


// ==========================================
// 5. 核心提取逻辑
// ==========================================
function extractAndSaveReasoning(mesId) {
    if (mesId === undefined || mesId === null || mesId < 0) return;

    const message = chat[mesId];
    if (!message || !message.mes) return;

    const originalText = message.mes;
    const currentRegexStr = localStorage.getItem(REGEX_STORAGE_KEY) || DEFAULT_REGEX_STR;

    let regex;
    try {
        regex = createRegexFromInput(currentRegexStr);
    } catch (e) {
        console.error('[思维链提取] 正则错误:', e);
        return;
    }

    let reasoningParts = [];

    // 执行提取与清理
    let cleanText = originalText.replace(regex, (match, content) => {
        if (content) {
            reasoningParts.push(content.trim());
        } else {
            reasoningParts.push(match.trim());
        }
        return '';
    });

    if (originalText === cleanText || reasoningParts.length === 0) return;

    message.extra = message.extra || {};

    // 将旧的 reasoning 用 div 包裹
    let existingReasoning = message.extra.reasoning
        ? `<div style="display: none;">\n${message.extra.reasoning}\n</div>\n`
        : '';

    message.extra.reasoning = existingReasoning + reasoningParts.join('\n\n');
    message.extra.reasoning_type = 'parsed';

    message.mes = cleanText.trim();

    if (typeof saveChat === 'function') saveChat();
    if (typeof updateMessageBlock === 'function') {
        updateMessageBlock(mesId, message);
    } else if (eventSource && event_types) {
        eventSource.emit(event_types.MESSAGE_UPDATED, mesId);
    }
}

// ==========================================
// 6. 事件绑定与遍历
// ==========================================
function processAllMessages() {
    chat.forEach((msg, index) => {
        if (msg.is_user) return;
        extractAndSaveReasoning(index);
    });
}

jQuery(() => {
    // 1. 初始化自定义面板
    initCustomModal();

    // 2. 启动 DOM 监听器注入按钮
    const chatContainer = document.getElementById('chat');
    if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        injectSettingsButton(); // 初始注入一次
    }

    // 3. 初始处理现有消息
    processAllMessages();

    // 4. 绑定提取逻辑事件
    if (eventSource && event_types) {
        eventSource.on(event_types.MESSAGE_RECEIVED, extractAndSaveReasoning);
        eventSource.on(event_types.MESSAGE_UPDATED, extractAndSaveReasoning);
        eventSource.on(event_types.MESSAGE_SWIPED, extractAndSaveReasoning);
        eventSource.on(event_types.CHAT_CHANGED, () => {
            processAllMessages();
            injectSettingsButton();
        });
    }
});