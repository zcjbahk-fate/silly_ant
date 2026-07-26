const config = {
    moduleUrl: 'https://cdn.jsdelivr.net/npm/mermaid@11.12.3/+esm'
};

const {
    eventSource,
    event_types,
} = SillyTavern.getContext();

const events = [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.CHAT_CHANGED,
    event_types.MESSAGE_SWIPED,
    event_types.MESSAGE_UPDATED,
];

async function renderMermaidCharts() {
    const mainWindow = window.parent;

    // 防止编辑消息等瞬间，iframe 悬空导致 TypeError 报错
    if (!mainWindow || !mainWindow.document) return;

    const mainDoc = mainWindow.document;

    // 此时 Mermaid 是运行在主窗口的
    if (typeof mainWindow.mermaid === 'undefined') return;

    const chatElement = mainDoc.getElementById('chat');
    if (!chatElement) return;

    const chatHeight = chatElement.scrollHeight;
    const scrollPosition = chatElement.scrollTop;

    const blocks = Array.from(mainDoc.querySelectorAll('#chat pre code:not([data-processed="true"])'));
    let renderedCount = 0;

    for (const block of blocks) {
        if (block.classList.contains('custom-language-mermaid') || block.classList.contains('language-mermaid')) {
            const $codeBlock = $(block);
            const $preBlock = $codeBlock.parent('pre');

            $codeBlock.find('.code-copy, i').remove();

            let rawText = $codeBlock[0].innerText || $codeBlock.text();
            let graphDefinition = rawText.replace(/\u00A0/g, ' ').trim();

            // 正则净化：防止 AI 废话注释破坏图表语法
            graphDefinition = graphDefinition.replace(/(?<=\s)\((.*?)\)/g, '（$1）');
            graphDefinition = graphDefinition.replace(/(?<=\s)\[(.*?)\]/g, '【$1】');
            graphDefinition = graphDefinition.replace(/(?<=\s)\{(.*?)\}/g, '【$1】');

            if (!graphDefinition) continue;

            if ($preBlock.children('svg').length === 0) {
                try {
                    const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                    // 直接调用主界面的 mermaid 渲染
                    const { svg } = await mainWindow.mermaid.render(uniqueId, graphDefinition);

                    $preBlock.addClass('mermaid');
                    $codeBlock.hide();
                    $codeBlock.attr('data-processed', 'true');

                    // 将纯净 SVG 代码塞进 pre 标签里
                    $preBlock.append(svg);

                    // 如果之前有报错提示，渲染成功后将其清除
                    $preBlock.prev('.mermaid-error-warning').remove();

                    renderedCount++;
                } catch (e) {
                    $codeBlock.show();
                    $preBlock.removeClass('mermaid');
                    $preBlock.children('svg').remove();

                    // 报错时，在原始代码块上方添加文字提醒
                    if ($preBlock.prev('.mermaid-error-warning').length === 0) {
                        $preBlock.before('<div class="mermaid-error-warning" style="color: #ff6b6b; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">⚠️ Mermaid 图表渲染失败，请检查语法错误。</div>');
                    }
                }
            }
        }
    }

    if (renderedCount > 0) {
        const newChatHeight = chatElement.scrollHeight;
        const diff = newChatHeight - chatHeight;
        chatElement.scrollTop = scrollPosition + diff;
    }
}

jQuery(() => {
    const mainWindow = window.parent;
    if (!mainWindow || !mainWindow.document) return;
    const mainDoc = mainWindow.document;

    // 注入自定义 CSS 样式到主界面 head 的第一个 style 标签之后
    if (!mainDoc.getElementById('mermaid-custom-style')) {
        const styleEl = mainDoc.createElement('style');
        styleEl.id = 'mermaid-custom-style';
        styleEl.textContent = `
            .mermaid>svg {
                display: block;
                background: var(--SmartThemeBlurTintColor);
                padding: 10px;
                margin: 0 auto;
                border: 1px var(--SmartThemeBorderColor) solid;
                border-radius: 5px;
            }
        `;

        // 找到 head 里第一个 <style> 标签
        const firstStyle = mainDoc.querySelector('style');
        if (firstStyle) {
            firstStyle.after(styleEl); // 紧跟在其后插入
        } else {
            mainDoc.head.appendChild(styleEl); // 备用方案：如果没有找到就插到最后
        }
    }

    // 检查主窗口是否已经加载了 Mermaid
    if (typeof mainWindow.mermaid === 'undefined') {
        const script = mainDoc.createElement('script');
        script.type = 'module';
        script.textContent = `
            import mermaid from '${config.moduleUrl}';
            window.mermaid = mermaid;
            window.mermaid.initialize({
                theme: 'dark',
                startOnLoad: false,
                securityLevel: 'loose'
            });
            window.dispatchEvent(new Event('mermaid_ready'));
        `;
        mainDoc.head.appendChild(script);

        // 监听主界面发来的加载成功信号
        mainWindow.addEventListener('mermaid_ready', () => {
            for (const event of events) {
                eventSource.on(event, renderMermaidCharts);
            }
            renderMermaidCharts();
        }, { once: true });

    } else {
        for (const event of events) {
            eventSource.on(event, renderMermaidCharts);
        }
        renderMermaidCharts();
    }
});