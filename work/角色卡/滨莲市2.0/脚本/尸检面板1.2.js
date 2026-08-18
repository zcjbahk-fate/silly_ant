!function(){
    var e='[corpse_data_ui]', r='th-corpse-data-style', a=750, o={}, p={}, U={};

    // ==== [控制阀门] ====
    var MAX_SELECT = 10;

    // v7-stable: 渲染链路修复版

    // ==== [本地特写图数据源] ====
    var localBg = {
        "111": ["https://cdn.imgchest.com/files/81f2834ce55c.jpg", "https://cdn.imgchest.com/files/05be39103a5a.jpg", "https://cdn.imgchest.com/files/045cc1a1a796.jpg"],
        "222": ["https://cdn.imgchest.com/files/28161ddf05f6.jpg", "https://cdn.imgchest.com/files/3938179126ee.jpg", "https://cdn.imgchest.com/files/045cc1a1a796.jpg"],
        "333": ["https://cdn.imgchest.com/files/f1eb85dca294.jpg", "https://cdn.imgchest.com/files/3938179126ee.jpg", "https://cdn.imgchest.com/files/5abb4d64c529.jpg"],
        "444": ["https://cdn.imgchest.com/files/b2f3bd821982.jpg", "https://cdn.imgchest.com/files/69308377e18d.jpg", "https://cdn.imgchest.com/files/5abb4d64c529.jpg"]
    };

    var sp_xiaoxue = ['小穴腺体','阴唇','肚脐','子宫','小穴宫颈','小穴后段','小穴中段','阴蒂','小穴口','卵巢','穴道整体','阴户'];
    var sp_houting = ['臀瓣','后庭腺体','直肠','后庭后段','后庭中段','菊口','肛周','后庭整体'];
    var sp_koubu   = ['嘴角','嘴唇','牙齿','口腔','小舌','喉部','舌头','舌尖','深喉形态','终点设定','口部腺体','神经反射'];
    var s = ['脑部','眼部','声带','颈部','胸部','血管','内脏','骨骼','肌肉','皮肤','气味','淫纹','四肢','伤口','整体','外观','限量改造'];
    var i = ['年龄','身高','身材','罩杯','发色','发型','瞳色','容貌','背景身份','死因'];

    var n = {
        脑部:{left:'55%',top:'11%'},眼部:{left:'38%',top:'16%'},声带:{left:'78%',top:'22%'},颈部:{left:'66%',top:'22%'},
        血管:{left:'55%',top:'34%'},胸部:{left:'32%',top:'41%'},内脏:{left:'55%',top:'48%'},骨骼:{left:'68%',top:'51%'},
        肌肉:{left:'28%',top:'56%'},皮肤:{left:'72%',top:'58%'},气味:{left:'86%',top:'18%'},淫纹:{left:'57%',top:'70%'},
        四肢:{left:'18%',top:'71%'},伤口:{left:'78%',top:'46%'},整体:{left:'12%',top:'14%'},外观:{left:'88%',top:'14%'},
        限量改造:{left:'55%',top:'96%'},
        '小穴腺体':{left:'20%',top:'60%'}, '阴唇':{left:'20%',top:'70%'},'肚脐':{left:'40%',top:'15%'}, '子宫':{left:'40%',top:'24%'}, '小穴宫颈':{left:'40%',top:'33%'}, '小穴后段':{left:'40%',top:'42%'}, '小穴中段':{left:'40%',top:'60%'}, '阴蒂':{left:'40%',top:'69%'}, '小穴口':{left:'40%',top:'78%'},'卵巢':{left:'80%',top:'40%'}, '穴道整体':{left:'80%',top:'60%'}, '阴户':{left:'80%',top:'70%'},
        '臀瓣':{left:'20%',top:'20%'}, '后庭腺体':{left:'20%',top:'40%'},'直肠':{left:'40%',top:'24%'}, '后庭后段':{left:'40%',top:'33%'}, '后庭中段':{left:'40%',top:'42%'}, '菊口':{left:'40%',top:'60%'},'肛周':{left:'80%',top:'50%'}, '后庭整体':{left:'80%',top:'60%'},
        '嘴角':{left:'20%',top:'50%'},'嘴唇':{left:'40%',top:'15%'}, '牙齿':{left:'40%',top:'24%'}, '口腔':{left:'40%',top:'33%'}, '小舌':{left:'40%',top:'42%'}, '喉部':{left:'40%',top:'51%'}, '舌头':{left:'40%',top:'60%'}, '舌尖':{left:'40%',top:'69%'},'深喉形态':{left:'80%',top:'30%'}, '终点设定':{left:'80%',top:'40%'}, '口部腺体':{left:'80%',top:'60%'}, '神经反射':{left:'80%',top:'70%'}
    };

    var c = {
        血管:['红色药剂','白色药剂','青色药剂'],内脏:['硅胶填充','液囊填充','气囊填充','内部加热'],骨骼:['骨折固定件','关节固定件','额外关节件','全身软骨替换','弹性版','塑性版'],肌肉:['基础处理','紧致','松软','半塑化'],皮肤:['光滑','磨砂','乳胶','丝绸','汗腺替换','防水涂层','透明窗口'],气味:['除臭','定制体香'],声带:['被动触发型','智能播放型'],脑部:['脑姦改造','脑震改造','应激低智能性爱反应'],颈部:['可拆卸头颅','永久斩首','超可动颈椎'],眼部:['眼交改造','荧光瞳孔 (形/色)'],胸部:['乳腺改造','穴道改造','丰胸','色素净化'],淫纹:['发热','发光','催情魅惑','凸起','颜色','形态'],四肢:['截肢','可拆卸肢体','义肢','玉足保养','手交反射','触手附肢'],伤口:['无痕缝合','有痕缝合','假体填充','另造穴道'],整体:['内外清洗','全身加热植入','全身散热植入','灭活','体毛去除','腰斩','塑化','家具化','精液背包','其他','懒人套餐'],外观:['兽耳','兽尾','精灵耳','天使翼','恶魔角','恶魔翼','恶魔尾','染发','美瞳','纹身'],限量改造:['S病毒','智械','灵异注入','尸体孕育'],
        '小穴腺体':['性状','口味','功效','自洁酶','尿液定制'], '阴唇':['收紧','扩大','异形','去色素'], '肚脐':['子宫通道','填平','饮品吸管'], '子宫':['孕肚','长丝绒','生物电单元','电击单元','定制'], '小穴宫颈':['马眼肉针','吸盘','开放','单向','生物电单元','电击单元','触手','环路','肉粒','旋纹','定制'], '小穴后段':['电击单元','触手','环路','肉粒','旋纹','龟头契合沟','加紧','放松','定制'], '小穴中段':['电击单元','触手','环路','肉粒','旋纹','网状软沼','加紧','放松','定制','复用处女'], '阴蒂':['常驻勃起','小巧','加大','高潮触发','定制'], '小穴口':['加紧','放松','去色素','真空亲吻箍','尿道扩张','尿道塞'], '卵巢':['液化','卵子保鲜'], '穴道整体':['生物电单元','S形','宽窄波浪','正反运动','潮喷强化'], '阴户':['除毛','馒头','松软'],
        '臀瓣':['填充','弹性','放松','对夹'], '后庭腺体':['性状','口味','功效','人造排泄','自洁酶'], '直肠':['人造肛颈','肛口直通','吸盘','肛阴造瘘','生物电单元','电击单元'], '后庭后段':['电击单元','触手','环路','肉粒','旋纹','龟头契合沟','加紧','放松','定制'], '后庭中段':['电击单元','触手','环路','肉粒','旋纹','加紧','放松','定制'], '菊口':['加紧','放松','去色素'], '肛周':['平滑','褶皱','除毛'], '后庭整体':['S形','生物电单元'],
        '嘴角':['裂口','缝合'], '嘴唇':['湿润','丰唇'], '牙齿':['拔除','磨平','尖牙'], '口腔':['生物电单元','电击单元','触手','肉粒','旋纹'], '小舌':['切除','电击单元'], '喉部':['触手','环路','肉粒','旋纹','加紧','放松','定制'], '舌头':['壁虎式吸盘','触手','延长'], '舌尖':['分叉','电击单元'], '深喉形态':['电击单元','触手','环路','肉粒','旋纹','加紧','放松','定制'], '终点设定':['瓶颈','胃部蓄精囊','肛口直通'], '口部腺体':['性状','口味','功效','自洁酶'], '神经反射':['干呕','流涎','吞咽']
    };

    var N = ['外阴整形','骨折固定件','关节固定件','额外关节件','被动触发型','智能播放型','定制体香','脑姦改造','荧光瞳孔 (形/色)','液腺替换','乳腺改造','丰胸','尿液替换','人造排泄','截肢','可拆卸肢体','义肢','触手附肢','另造穴道','腰斩','兽耳','兽尾','染发','美瞳','纹身','塑化','家具化','其他','颜色','形态', '定制', '性状','口味','功效','饮品吸管','异形','透明窗口','尿液定制','汗腺替换'];

    function l(t,r,a){var o=e+' ['+t+'] '+(r?'OK':'FAIL');void 0!==a&&''!==a&&(o+=' — '+a),r?console.info(o):console.warn(o,void 0!==a?a:'')}
    function d(e){return new Promise(function(t){setTimeout(t,e)})}
    function f(e){for(var t=0,r=0;r<e.length;r++)t=(t<<5)-t+e.charCodeAt(r),t|=0;return String(t)}
    function u(e){return String(e).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
    function m(e){return u(e).replace(/\n/g,' ')}

    function g_sp(list, t, isMain) {
        var arr = [];
        list.forEach(function(name){
            if(n[name]){
                var cls = isMain ? 'corpse-hotspot' : 'corpse-hotspot corpse-sp-hotspot';
                arr.push('<div class="'+cls+'" role="button" tabindex="0" data-corpse-mid="'+t+'" data-corpse-part="'+m(name)+'" data-corpse-slug="'+encodeURIComponent(name)+'" style="left:'+n[name].left+';top:'+n[name].top+'" title="'+m(name)+'">'+u(name)+'</div>');
            }
        });
        return arr.join('');
    }

    function v(e, t){
        var a=(c[e.name]||[]).map(function(r){
            var sel=(U[t]&&U[t][e.name]&&U[t][e.name][r]!==undefined), S=sel?' corpse-action-btn-sel':'';
            var inp=N.indexOf(r)>=0?'<input type="text" class="corpse-tool-input" data-corpse-part="'+m(e.name)+'" data-corpse-option="'+m(r)+'" data-corpse-mid="'+t+'" placeholder="附加细则..." value="'+u(sel&&typeof U[t][e.name][r]==='string'?U[t][e.name][r]:'')+'">':'';
            return'<div class="corpse-tool-item"><div class="corpse-action-btn'+S+'" role="button" tabindex="0" data-corpse-part="'+m(e.name)+'" data-corpse-option="'+m(r)+'" data-corpse-mid="'+t+'">'+u(r)+'</div>'+inp+'</div>'
        }).join('');
        return a||(a='<p class="corpse-no-actions">（该部位暂无预设改造项）</p>'),
        '<div class="corpse-part-detail"><h4 class="corpse-part-title">'+u(e.name)+'</h4><div class="corpse-part-field"><span class="corpse-part-label">现状</span><p class="corpse-part-text">'+u(e.status||'—')+'</p></div><div class="corpse-part-field"><span class="corpse-part-label">已改造</span><p class="corpse-part-text">'+u(e.modified||'—')+'</p></div><div class="corpse-part-actions"><span class="corpse-part-label">改造选项</span>'+a+'</div></div>'
    }

    function h(e, t, r) {
        var n_name = e.profile['姓名']||'未知目标';
        var age = parseInt(e.profile['年龄']) || 20;

        var key = age <= 16 ? '111' : (age <= 26 ? '222' : (age <= 36 ? '333' : '444'));
        var bgArr = localBg[key];
        var bgXX = "background-image:url('"+bgArr[0]+"');";
        var bgHT = "background-image:url('"+bgArr[1]+"');";
        var bgKB = "background-image:url('"+bgArr[2]+"');";

        var charImg = function(nm){
            try{var cache=localStorage.getItem('mvu_char_img_cache')||'{}', d=JSON.parse(cache)[nm]; return d||''}catch(e){return''}
        }(n_name);
        var baseStyle = charImg?'background-image:url(\''+charImg.replace(/'/g,'%27')+'\');':'background:linear-gradient(160deg,#1e2836 0%,#0c1016 100%);';

        var f_main = g_sp(s, t, true);
        var f_xx = g_sp(sp_xiaoxue, t, false);
        var f_ht = g_sp(sp_houting, t, false);
        var f_kb = g_sp(sp_koubu, t, false);

        var profileHtml = i.filter(function(k){return null!=e.profile[k]&&''!==e.profile[k]});
        Object.keys(e.profile).forEach(function(k){'姓名'!==k&&i.indexOf(k)<0&&profileHtml.indexOf(k)<0&&profileHtml.push(k)});
        var vHtml = profileHtml.map(function(k){return'<div class="corpse-profile-row"><span class="corpse-profile-k">'+u(k)+'</span><span class="corpse-profile-v">'+u(e.profile[k]||'')+'</span></div>'}).join('');

        return'<div class="corpse-report collapsed" data-corpse-ui="7" data-corpse-mid="'+t+'" data-corpse-hash="'+m(r)+'" data-age="'+age+'">' +
            '<header class="corpse-report-header" title="点击展开/折叠"><div class="corpse-report-badge">法医尸检报告</div><h2 class="corpse-report-name">'+u(n_name)+'</h2><p class="corpse-report-sub">交互检验 · 医学记录视图</p></header>' +
            '<div class="corpse-tabs"><div class="corpse-tab active" data-target="pane-main">全身</div><div class="corpse-tab" data-target="pane-xiaoxue">小穴</div><div class="corpse-tab" data-target="pane-houting">后庭</div><div class="corpse-tab" data-target="pane-koubu">口部</div></div>' +
            '<div class="corpse-report-body">' +
                '<section class="corpse-visual-wrap">' +
                    '<div class="corpse-view-pane active" id="pane-main"><div class="corpse-visual" style="'+baseStyle+'"><div class="corpse-visual-vignette"></div><div class="corpse-visual-hint">点击光标检视部位情况</div><div class="corpse-hotspots">'+f_main+'</div></div></div>' +
                    '<div class="corpse-view-pane" id="pane-xiaoxue"><div class="corpse-visual corpse-visual-api" style="background-color:#06080d;'+bgXX+'"><div class="corpse-visual-vignette"></div><div class="corpse-hotspots">'+f_xx+'</div></div></div>' +
                    '<div class="corpse-view-pane" id="pane-houting"><div class="corpse-visual corpse-visual-api" style="background-color:#06080d;'+bgHT+'"><div class="corpse-visual-vignette"></div><div class="corpse-hotspots">'+f_ht+'</div></div></div>' +
                    '<div class="corpse-view-pane" id="pane-koubu"><div class="corpse-visual corpse-visual-api" style="background-color:#06080d;'+bgKB+'"><div class="corpse-visual-vignette"></div><div class="corpse-hotspots">'+f_kb+'</div></div></div>' +
                    '<div class="corpse-detail-overlay" data-corpse-detail style="display:none;"><div class="corpse-detail-close" title="关闭详情卡">×</div><div class="corpse-detail-content"></div></div>' +
                '</section>' +
                '<aside class="corpse-sidebar"><div class="corpse-profile-card"><h3 class="corpse-sidebar-title">受检者信息</h3>'+vHtml+'</div></aside>' +
            '</div></div>';
    }

    // [严密判定] 只有真正具有核心词条的文本，才被认为是合格数据
    function isBlockValid(txt) {
        return (/\s*姓名\s*[:：]/.test(txt) || /\s*部位状态\s*[:：]/.test(txt)) && txt.length > 50;
    }

    function x(txt){
        var k = f(txt); if(o[k]) return o[k];
        var parsed = function(e){
            for(var t=e.split(/\r?\n/).map(function(e){return e.trim()}).filter(function(e){return e.length>0}),r={},a=[],o='profile',n=null,s=0;s<t.length;s++){
                var i=t[s];
                if(/^部位状态\s*[:：]?\s*$/.test(i)) o='parts';
                else if('profile'!==o){
                    var c=i.match(/^现状\s*[:：]\s*(.*)$/); if(c&&n) n.status=c[1].trim();
                    else{
                        var p=i.match(/^已改造\s*[:：]\s*(.*)$/); if(p&&n) n.modified=p[1].trim();
                        else{
                            var l=i.match(/^([^:：]+)\s*[:：]\s*$/); if(l) {n={name:l[1].trim(),status:'',modified:''},a.push(n);}
                            else{
                                var d=i.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
                                d&&'现状'!==d[1]&&'已改造'!==d[1]&&(n={name:d[1].trim(),status:'',modified:d[2].trim()},a.push(n))
                            }
                        }
                    }
                }else{
                    var f=i.match(/^([^:：]+)[:：]\s*(.*)$/); f&&(r[f[1].trim()]=f[2].trim())
                }
            }
            return{profile:r,parts:a}
        }(txt);
        return o[k] = parsed, parsed;
    }

    // [DOM安全替换 v7-stable]
    // 核心思路：解析永远来自"原始消息文本"（未渲染，必定有字面标签），
    // 注入靠多级兜底（精确替换 + append），避免只认渲染后可能被转义/拆分的字面标签，
    // 从而跨浏览器稳定渲染。
    function getCorpseBlocks(rawText){
        var out=[];
        var re=/\[\[corpse_data\]\]((?:(?!\[\[corpse_data\]\]|\[\[\/corpse_data\]\])[\s\S])*?)\[\[\/corpse_data\]\]/g;
        var m, idx=0;
        while((m=re.exec(rawText))!==null){
            var pure=$('<div>').html(m[1].trim()).text().trim();
            if(isBlockValid(pure)){ idx++; out.push({pure:pure, hash:f(pure)+'_'+idx}); }
        }
        return out;
    }
    function firstLine(txt){var L=txt.split(/\r?\n/).map(function(l){return l.trim()}).filter(function(l){return l.length>0});return L.length?L[0]:'';}
    function lastLine(txt){var L=txt.split(/\r?\n/).map(function(l){return l.trim()}).filter(function(l){return l.length>0});return L.length?L[L.length-1]:'';}
    function escapeRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

    // 在渲染后的正文容器 $display 里注入尸检 UI。成功与否均以"能把 UI 放上去"为准。
    function w($display, rawText, mid){
        if(!$display||!$display.length) return false;
        var blocks=getCorpseBlocks(rawText);
        if(!blocks.length) return false;

        // 移除旧 UI，避免重复
        $display.find('[data-corpse-ui="7"]').remove();

        var html=$display.html()||'';
        var cursor=0;
        var appendHtml='';
        var replacedAny=false;

        blocks.forEach(function(b){
            var parsed=x(b.pure);
            if(!parsed) return;
            var ui=h(parsed, mid, b.hash);
            var fl=firstLine(b.pure), ll=lastLine(b.pure);
            var did=false;
            if(fl&&ll){
                var re=new RegExp(escapeRe(fl)+'[\\s\\S]*?'+escapeRe(ll));
                var idxAt=html.slice(cursor).search(re);
                if(idxAt>=0){
                    var head=html.slice(0,cursor);
                    var tail=html.slice(cursor);
                    html=head+tail.replace(re, ui);
                    cursor=head.length+idxAt+ui.length;
                    did=true; replacedAny=true;
                }
            }
            if(!did){ appendHtml+=ui; }
        });

        if(replacedAny){
            $display.html(html);
        }
        if(appendHtml){
            $display.append($(appendHtml));
        }
        return true;
    }

    function E(e){
        var t=String(e.attr('data-corpse-part')||''); if(t)return t;
        var r=String(e.attr('data-corpse-slug')||''); if(r)try{return decodeURIComponent(r)}catch(e){return r} return''
    }

    var renderLocks = {};

    function k(e, retryIndex){
        return new Promise(function(r){
            !async function(){
                try{
                    if(renderLocks[e]) return r(!1);
                    renderLocks[e] = true;

                    // 楼层验证安全锁：仅允许在当前楼层减2的范围内渲染
                    var lastId = getLastMessageId();
                    if(e < Math.max(0, lastId - 2)) {
                        renderLocks[e] = false;
                        return r(!1);
                    }

                    var a;
                    try{a=getChatMessages(e,{hide_state:'all'})}catch(err){}
                    var o=a&&a[0];
                    if(!o||!o.message) { renderLocks[e] = false; return r(!1); }

                    // 检查是否存在合规文本再等待
                    var hasValid = false;
                    var txtReg = /\[\[corpse_data\]\]((?:(?!\[\[corpse_data\]\]|\[\[\/corpse_data\]\])[\s\S])*?)\[\[\/corpse_data\]\]/g;
                    var mTxt;
                    while((mTxt = txtReg.exec(o.message)) !== null) {
                        if(isBlockValid(mTxt[1].trim())) { hasValid = true; break; }
                    }
                    if(!hasValid) { renderLocks[e] = false; return r(!1); }

                    var n=await function(e,t){
                        t=t||8e3; var r=Date.now();
                        return new Promise(function(a){
                            !function o(){
                                try{var n=retrieveDisplayedMessage(e); if(n&&n.length) return void a(n)}catch(e){}
                                if(Date.now()-r>=t) try{a(retrieveDisplayedMessage(e))}catch(e){a($())} else setTimeout(o,120)
                            }()
                        })
                    }(e,4000 + 500*retryIndex);

                    if(!n.length) { renderLocks[e] = false; return r(!1); }

                    var a_hash = f(o.message);
                    var ui_els = n.find('[data-corpse-ui="7"]');
                    var needUpdate = true;
                    if(ui_els.length && p[e] === a_hash) {
                        needUpdate = false;
                    }

                    if(!needUpdate) { renderLocks[e] = false; return r(!0); }

                    var applied = w(n, o.message, e);
                    if(!applied) { renderLocks[e] = false; return r(!1); }

                    p[e]=a_hash;

                    renderLocks[e] = false;
                    r(!0);
                }catch(err){
                    renderLocks[e] = false;
                    r(!1);
                }
            }()
        });
    }

    async function C(e){
        for(var t=0; t<6; t++){
            if(await k(e, t)) return !0;
            await d(500 + (t * 300));
        }
        return !1;
    }

    function S(e){
        try{
            var lastId = getLastMessageId();
            if(e < Math.max(0, lastId - 2)) return !1;

            var t=getChatMessages(e,{hide_state:'all'})[0];
            if(!t||!t.message) return !1;
            return /\[\[corpse_data\]\][\s\S]*?\[\[\/corpse_data\]\]/.test(t.message);
        }catch(err){return !1}
    }

    var taskTimer = null;
    var pendingTasks = new Set();

    function queueScan(mid) {
        var lastId = getLastMessageId();
        var stId = Math.max(0, lastId - 2);

        if(mid !== undefined && mid !== null) {
            if(mid >= stId) pendingTasks.add(mid);
        } else {
            for(var x=stId; x<=lastId; x++) pendingTasks.add(x);
        }

        if(taskTimer) clearTimeout(taskTimer);

        taskTimer = setTimeout(function(){
            pendingTasks.forEach(function(id) {
                if (S(id)) C(id);
            });
            pendingTasks.clear();
        }, 1200);
    }

    function G(mid){
        var n_name = $('.corpse-report[data-corpse-mid="'+mid+'"]').find('.corpse-report-name').text() || '';

        var K = Object.keys(U[mid]||{});
        var gObj = {};
        K.forEach(function(k){
            var opts = Object.keys(U[mid][k]);
            if(opts.length === 0) return;
            var parent = k;
            if (sp_xiaoxue.indexOf(k)>=0) parent = '小穴';
            else if (sp_houting.indexOf(k)>=0) parent = '后庭';
            else if (sp_koubu.indexOf(k)>=0) parent = '口部';

            if(!gObj[parent]) gObj[parent] = [];
            opts.forEach(function(opt){
                var val = U[mid][k][opt];
                var optStr = (val===!0||val==='') ? opt : (opt+'['+val+']');
                if(parent !== k) gObj[parent].push(k + '：' + optStr);
                else gObj[parent].push(optStr);
            });
        });
        var partsStrs = Object.keys(gObj).map(function(parent){
            return '（' + parent + '）：（' + gObj[parent].join('、') + '）';
        });

        return partsStrs.length > 0 ? ('进行' + n_name + '的改造+同时把玩的剧情，改造指令：' + partsStrs.join('；')) : '';
    }

    function F(e){
        for(var t=['#send_textarea','#send_text','textarea.send_textarea','#mes_text textarea'],r=0;r<t.length;r++){
            var a=$(t[r]); if(a.length) return a.val(e).trigger('input').trigger('change'), !0
        } return !1
    }

    function A(){
        var e='.thCorpseData.'+getScriptId(), t=$('#chat, #mes_text, body');

        t.on('click'+e, '.corpse-report-header', function(evt){
            evt.preventDefault(); evt.stopPropagation();
            $(this).closest('.corpse-report').toggleClass('expanded').removeClass('collapsed');
        });

        t.on('click'+e, '.corpse-tab', function(evt){
            evt.preventDefault(); evt.stopPropagation();
            var tab = $(this), target = tab.attr('data-target'), wrap = tab.closest('.corpse-report');
            tab.siblings().removeClass('active'); tab.addClass('active');
            wrap.find('.corpse-view-pane').removeClass('active');
            wrap.find('#'+target).addClass('active');
            wrap.find('[data-corpse-detail]').hide();
            wrap.find('.corpse-hotspot').removeClass('corpse-hotspot-active');
        });

        t.on('click'+e, '.corpse-hotspot', function(e){
            e.preventDefault(), e.stopPropagation();
            try {
                var btn = $(e.currentTarget), r = btn.closest('.corpse-report'), a = E(btn);
                if(r.length && a) {
                    var rId = Number(r.attr('data-corpse-mid'));
                    var msgs = getChatMessages(rId, {hide_state:'all'})[0];

                    var hashStr = r.attr('data-corpse-hash').split('_')[0];
                    var n_data = null;

                    var txtReg = /\[\[corpse_data\]\]((?:(?!\[\[corpse_data\]\]|\[\[\/corpse_data\]\])[\s\S])*?)\[\[\/corpse_data\]\]/g;
                    var mTxt;
                    while((mTxt = txtReg.exec(msgs.message)) !== null) {
                        var pure = $('<div>').html(mTxt[1].trim()).text().trim();
                        if(isBlockValid(pure) && f(pure) === hashStr) {
                            var o = x(pure);
                            var parentName = a;
                            if (sp_xiaoxue.indexOf(a)>=0) parentName = '小穴';
                            else if (sp_houting.indexOf(a)>=0) parentName = '后庭';
                            else if (sp_koubu.indexOf(a)>=0) parentName = '口部';

                            if(o && o.parts) {
                                for(var s=0; s<o.parts.length; s++) {
                                    if(o.parts[s].name === parentName) {
                                        n_data = $.extend({}, o.parts[s]);
                                        n_data.name = a;
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                    }

                    var iBox = r.find('[data-corpse-detail]'), pBox = iBox.find('.corpse-detail-content');
                    r.find('.corpse-hotspot').removeClass('corpse-hotspot-active');
                    r.find('.corpse-hotspot').filter(function(){return E($(this))===a}).addClass('corpse-hotspot-active');

                    if(!n_data) n_data = { name: a, status: '', modified: '' };

                    pBox.html(v(n_data, rId));
                    iBox.fadeIn(200);
                }
            } catch(e){}
        });

        t.on('click'+e, '.corpse-detail-close', function(ev){
            ev.preventDefault(); ev.stopPropagation();
            var r = $(this).closest('.corpse-report');
            r.find('[data-corpse-detail]').fadeOut(150);
            r.find('.corpse-hotspot').removeClass('corpse-hotspot-active');
        });

        t.on('click'+e, '.corpse-action-btn', function(e){
            e.preventDefault(), e.stopPropagation();
            try {
                var btn = $(e.currentTarget), ptName = String(btn.attr('data-corpse-part')||''), optName = String(btn.attr('data-corpse-option')||''), mid = String(btn.attr('data-corpse-mid')||'');
                if(!U[mid]) U[mid]={};
                if(!U[mid][ptName]) U[mid][ptName]={};

                if(U[mid][ptName][optName]===undefined) {
                    var currentTotal = 0;
                    Object.keys(U[mid]).forEach(function(k){
                        currentTotal += Object.keys(U[mid][k]).length;
                    });
                    if(currentTotal >= MAX_SELECT) {
                        var warnMsg = '一次少改点，分部位和步骤来，剧情写不过来了喵！(上限: ' + MAX_SELECT + '项)';
                        if (typeof toastr !== 'undefined') toastr.warning(warnMsg);
                        else alert(warnMsg);
                        return;
                    }
                }

                if(U[mid][ptName][optName]!==undefined){
                    delete U[mid][ptName][optName]; btn.removeClass('corpse-action-btn-sel'); btn.next('.corpse-tool-input').val('');
                }else{
                    var inp=btn.next('.corpse-tool-input'); U[mid][ptName][optName] = inp.length?(inp.val()||''):!0; btn.addClass('corpse-action-btn-sel');
                }
                var oStr = G(mid);
                F(oStr)||('undefined'!=typeof toastr&&toastr.warning('未能写入输入框，请检查 Console'));
            } catch(e){}
        });

        t.on('input'+e, '.corpse-tool-input', function(ev){
            try{
                var inp=$(this), ptName = inp.attr('data-corpse-part'), optName = inp.attr('data-corpse-option'), mid = inp.attr('data-corpse-mid');
                if(U[mid]&&U[mid][ptName]&&U[mid][ptName][optName]!==undefined){
                    U[mid][ptName][optName] = inp.val()||''; F(G(mid));
                }
            }catch(err){}
        });

        return function(){ t.off(e); }
    }

    function M(){
        try{
            !function(){
                try{
                    if($('#'+r).length)return;
                    $('<style>').attr('id',r).text('.corpse-report{--ca:#5b8a9a;--cp:#e8e4dc;font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:var(--cp);background:linear-gradient(180deg,#121820,#0f1419);border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;margin:.65em 0;box-shadow:0 12px 36px rgba(0,0,0,.45)}.corpse-report-header{padding:1rem 1.2rem .7rem;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;position:relative;user-select:none;}.corpse-report-header::after{content:"▼";position:absolute;right:1.5rem;top:50%;transform:translateY(-50%);font-size:0.9rem;color:var(--ca);transition:transform 0.2s;}.corpse-report.expanded .corpse-report-header::after{transform:translateY(-50%) rotate(180deg);}.corpse-report-body,.corpse-tabs{display:none;}.corpse-report.expanded .corpse-report-body{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr);min-height:640px}.corpse-report.expanded .corpse-tabs{display:flex;}@media(max-width:720px){.corpse-report.expanded .corpse-report-body{grid-template-columns:1fr}}.corpse-report-badge{font-size:.68rem;letter-spacing:.1em;color:var(--ca);border:1px solid var(--ca);padding:.12em .45em;border-radius:4px;display:inline-block}.corpse-report-name{margin:.3em 0 0;font-size:1.5rem;font-weight:600;color:#f4f0e8}.corpse-report-sub{margin:.15em 0 0;font-size:.8rem;opacity:.5}.corpse-visual-wrap{background:#080c10;min-height:600px;position:relative}.corpse-view-pane{position:relative;min-height:600px;display:none}.corpse-view-pane.active{display:block}.corpse-tabs{gap:8px;padding:0.6em 1.2rem 0;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.06)}.corpse-tab{padding:0.4em 1em;font-size:0.8rem;cursor:pointer;color:rgba(255,255,255,0.4);border-radius:6px 6px 0 0;transition:all 0.2s;user-select:none;font-weight:500}.corpse-tab:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7)}.corpse-tab.active{color:#f4f0e8;background:rgba(91,138,154,0.25);border-bottom:2px solid var(--ca)}.corpse-visual{position:absolute;inset:0;background-size:cover;background-position:center top;background-repeat:no-repeat;pointer-events:none;transition:background-image 0.5s ease;}.corpse-visual-vignette{position:absolute;inset:0;background:radial-gradient(ellipse 75% 90% at 50% 32%,transparent 0%,rgba(6,10,14,.5) 65%,rgba(6,10,14,.9) 100%);pointer-events:none}.corpse-visual-hint{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:.7rem;opacity:.45;pointer-events:none}.corpse-hotspots{position:absolute;inset:0;pointer-events:none}.corpse-hotspot{position:absolute;transform:translate(-50%,-50%);z-index:12;pointer-events:auto;padding:.28em .5em;font-size:.62rem;color:rgba(255,255,255,.8);text-shadow:1px 1px 2px #000,-1px -1px 2px #000,1px -1px 2px #000,-1px 1px 2px #000;background:rgba(0,0,0,.15);border:1px solid rgba(91,138,154,.6);border-radius:999px;cursor:pointer;box-shadow:0 0 10px rgba(0,0,0,.5);white-space:nowrap;max-width:6em;overflow:hidden;text-overflow:ellipsis;user-select:none}.corpse-hotspot:hover,.corpse-hotspot.corpse-hotspot-active{background:rgba(91,138,154,.35);border-color:var(--ca);transform:translate(-50%,-50%) scale(1.06)}.corpse-sp-hotspot{min-width:3.8em;text-align:center}.corpse-sidebar{border-left:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.22);display:flex;flex-direction:column;position:relative;z-index:10;}.corpse-profile-card{padding:.85rem 1rem;height:100%;overflow-y:auto;flex:1}.corpse-sidebar-title{margin:0 0 .45em;font-size:.75rem;color:var(--ca);letter-spacing:.06em}.corpse-profile-row{display:flex;justify-content:space-between;gap:.4em;font-size:.8rem;padding:.18em 0;border-bottom:1px dashed rgba(255,255,255,.05)}.corpse-profile-k{opacity:.6;flex-shrink:0}.corpse-profile-v{text-align:right}.corpse-detail-overlay{position:absolute;inset:0;background:rgba(12,16,22,.75);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:50;padding:1.5rem 2.5rem;overflow-y:auto;display:none;border-radius:0 0 0 14px}.corpse-detail-close{position:absolute;top:1.2rem;right:1.5rem;font-size:2rem;line-height:1;color:var(--ca);cursor:pointer;opacity:.6;transition:all .2s;z-index:60;user-select:none}.corpse-detail-close:hover{opacity:1;transform:scale(1.1)}.corpse-detail-content{display:block;width:100%}.corpse-part-title{margin:0 0 .5em;font-size:1rem;border-left:3px solid var(--ca);padding-left:.45em}.corpse-part-label{display:block;font-size:.7rem;color:var(--ca);margin-bottom:.15em}.corpse-part-text{margin:0 0 .55em;font-size:.84rem;line-height:1.4}.corpse-tool-item{display:flex;flex-direction:column;gap:4px;margin:.3em 0}.corpse-action-btn{display:block;width:100%;padding:.5em .6em;text-align:left;font-size:.78rem;color:#ebe7df;text-shadow:1px 1px 1px #000;background:rgba(120,70,70,.1);border:1px solid rgba(150,90,90,.45);border-radius:7px;cursor:pointer;pointer-events:auto;user-select:none}.corpse-action-btn:hover{background:rgba(150,90,90,.25)}.corpse-action-btn-sel{background:rgba(180,90,90,.35);border-color:#e8e4dc;box-shadow:0 0 6px rgba(255,255,255,.3)}.corpse-tool-input{background:rgba(0,0,0,.4);border:1px solid rgba(173,102,255,.4);color:#fff;padding:6px 8px;font-size:.85rem;border-radius:4px;outline:none;display:none;width:90%;margin-top:4px;box-sizing:border-box}.corpse-action-btn-sel+.corpse-tool-input{display:block}.corpse-no-actions{font-size:.78rem;opacity:.45;margin:0}.corpse-report .corpse-hotspot,.corpse-report .corpse-action-btn{touch-action:manipulation}').appendTo('head');
                }catch(e){}
            }();
            var t=A();

            eventOn(tavern_events.CHAT_CHANGED, function(){
                p={}; o={}; U={};
                queueScan();
            });

            // 渲染完成后触发(最可靠)，见项目内 wow_worldbook 同款用法
            eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, function(message_id){
                queueScan(typeof message_id === 'number' ? message_id : getLastMessageId());
            });
            eventOn(tavern_events.MESSAGE_RECEIVED, function(message_id){ queueScan(message_id); });
            eventOn(tavern_events.MESSAGE_EDITED, function(message_id){ queueScan(message_id); });
            eventOn(tavern_events.MESSAGE_UPDATED, function(message_id){ queueScan(message_id); });
            eventOn(tavern_events.MESSAGE_SWIPED, function(message_id){ queueScan(message_id); });
            eventOn(tavern_events.GENERATION_ENDED, function(message_id){
                queueScan(typeof message_id === 'number' ? message_id : getLastMessageId());
            });

            queueScan();

            // 低频哨兵：兜底"事件漏发/时机不稳"导致完全不渲染。只查最后2楼、命中即停。
            var sentinel = setInterval(function(){
                try{
                    var lastId = getLastMessageId();
                    var stId = Math.max(0, lastId - 2);
                    for(var x=stId; x<=lastId; x++){
                        if(S(x) && !p[x]) queueScan(x);
                    }
                }catch(e){}
            }, 7000);

            $(window).on('pagehide',function(){ if(sentinel) clearInterval(sentinel); t(); $('#'+r).remove() });
        }catch(s){}
    }

    $(function(){'function'==typeof errorCatched?errorCatched(M)():M()});
}();