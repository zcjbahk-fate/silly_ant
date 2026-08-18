(function () {
  var EVENT_NAME = 'MvuFloatingBgRequest';
  var ROOT_ID = 'mvu-floating-bg-receiver-root';

  function getTopWindow() {
    try {
      return window.top;
    } catch (e) {
      return window;
    }
  }

  function getTopDocument() {
    try {
      return getTopWindow().document;
    } catch (e) {
      return document;
    }
  }

  function removeLayer() {
    var el = getTopDocument().getElementById(ROOT_ID);
    if (el) el.remove();
  }

  function showLayer(src) {
    removeLayer();
    var doc = getTopDocument();
    var host = doc.querySelector('#sheld') || doc.body;

    var root = doc.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-mvu-floating-bg-receiver', '1');

    var isBody = host === doc.body;
    root.style.cssText = [
      isBody ? 'position:fixed' : 'position:absolute',
      'inset:0',
      'z-index:0',
      'pointer-events:none',
      'overflow:hidden',
      'margin:0',
      'padding:0',
      'box-sizing:border-box',
    ].join(';');

    // 1. 底层虚化铺满背景图
    var bgImg = doc.createElement('img');
    bgImg.src = src;
    bgImg.alt = '';
    bgImg.draggable = false;
    bgImg.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'object-fit:cover', // 填充模式出框放大填满
      'object-position:center',
      'filter:brightness(0.8) blur(4px)', // 减暗20%，轻微虚化
      '-webkit-filter:brightness(0.8) blur(4px)',
      'transform:scale(1.02)', // 略微放大防止虚化的边缘漏出白边
      'user-select:none',
      'pointer-events:none',
      'display:block',
      'z-index:0'
    ].join(';');

    // 2. 上层容器与清晰内切本体图
    var inner = doc.createElement('div');
    inner.style.cssText = [
      'position:absolute',
      'inset:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-sizing:border-box',
      'pointer-events:none',
      'z-index:1' // 保证在底层虚化图的上方
    ].join(';');

    var fgImg = doc.createElement('img');
    fgImg.src = src;
    fgImg.alt = '';
    fgImg.draggable = false;
    fgImg.style.cssText = [
      'max-width:100%',
      'max-height:100%',
      'width:auto',
      'height:auto',
      'object-fit:contain', // 保持内切无出框无变动
      'object-position:center',
      'filter:brightness(1)',
      '-webkit-filter:brightness(1)',
      'user-select:none',
      'pointer-events:none',
      'display:block',
    ].join(';');

    // 将图片装载进DOM
    inner.appendChild(fgImg);
    root.appendChild(bgImg);
    root.appendChild(inner);
    host.insertBefore(root, host.firstChild);
  }

  function onMvuFloatingBgRequest(ev) {
    var d = ev && ev.detail;
    if (!d || typeof d !== 'object') return;
    if (d.action === 'hide') {
      removeLayer();
      return;
    }
    if (d.action === 'show' && typeof d.src === 'string' && d.src.length > 0) {
      showLayer(d.src);
    }
  }

  var topWin = getTopWindow();
  topWin.addEventListener(EVENT_NAME, onMvuFloatingBgRequest);

  window.addEventListener('pagehide', function onPageHide() {
    window.removeEventListener('pagehide', onPageHide);
    topWin.removeEventListener(EVENT_NAME, onMvuFloatingBgRequest);
    removeLayer();
  });

  if (typeof console !== 'undefined' && console.info) {
    console.info('[MvuFloatingBgReceiver] 已监听', EVENT_NAME);
  }
})();
