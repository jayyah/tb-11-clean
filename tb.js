function run () {

    // 配置整体不可用（activity / taskList 缺失）时给空表，别让快捷指令直接报红
    if (!DATA || !DATA.activity || Object.prototype.toString.call(DATA.activity.taskList) !== '[object Array]') {
        return JSON.stringify({ succes: 'ok', data: [] });
    }

    // ===== 我的推广码：唯一真源 = 配置里的 activity.mine =====
    //       助力 / 超级红包 / 购物车 / 快消蓄水 四个码，将来任何一个要换，
    //       只改 nock.json（或 hhle.json）里 mine 这一处，脚本不用动。
    var RE_LINK = /(?:https?:\/\/)?(?:m\.tb\.cn\/h\.)([A-Za-z0-9]{5,12})(?![A-Za-z0-9])/;
    function parseLink(v) {
        var s = String(v == null ? '' : v).replace(/^\s+|\s+$/g, '');
        if (!s) return null;
        var m = s.match(RE_LINK);
        if (m) return { code: m[1], tail: s.slice(m.index + m[0].length) };
        if (/^[A-Za-z0-9]{5,12}$/.test(s)) return { code: s, tail: '' };
        return null;
    }

    var MINE = (function () {
        var DEF = { red: '', cart: '', pv: '', help: '' };
        var m = (DATA && DATA.activity && DATA.activity.mine) || {};
        var keys = ['red', 'cart', 'pv', 'help'];
        var r = {};
        for (var i = 0; i < keys.length; i++) {
            var p = parseLink(m[keys[i]]);
            if (!p && DEF[keys[i]]) p = { code: DEF[keys[i]], tail: '' };
            r[keys[i]] = p ? p.code : '';
            r[keys[i] + 'Url'] = p ? ('://m.tb.cn/h.' + p.code + p.tail) : '';
        }
        r.codes = [];
        for (var j = 0; j < keys.length; j++) { if (r[keys[j]]) r.codes.push(r[keys[j]]); }
        var extra = m.codes;
        if (Object.prototype.toString.call(extra) === '[object Array]') {
            for (var k = 0; k < extra.length; k++) {
                var pe = parseLink(extra[k]);
                if (pe && r.codes.indexOf(pe.code) < 0) r.codes.push(pe.code);
            }
        }
        return r;
    })();

    // ===== 防盗校验 / 自愈 =====
    (function () {
        function isMine(c) { return MINE.codes.indexOf(c) >= 0; }

        // -> ://m.tb.cn/h.CODE<原样尾串>   助力位（脚本自己会拼 taobao / https 前缀）
        function bare(u, defCode) {
            var p = parseLink(u);
            if (!p) return u;
            return '://m.tb.cn/h.' + (isMine(p.code) ? p.code : defCode) + p.tail;
        }
        // -> taobao://m.tb.cn/h.CODE<原样尾串>   菜单位（快捷指令直接打开）
        function app(u, defCode) {
            var p = parseLink(u);
            if (!p) return u;
            return 'taobao://m.tb.cn/h.' + (isMine(p.code) ? p.code : defCode) + p.tail;
        }
        // 只规整格式，不动码
        function appFmt(u) {
            var p = parseLink(u);
            if (!p) return u;
            return 'taobao://m.tb.cn/h.' + p.code + p.tail;
        }
        function fmt(u) {
            var p = parseLink(u);
            if (!p) return u;
            return '://m.tb.cn/h.' + p.code + p.tail;
        }

        try {
            var act = DATA.activity || {};

            // (1) 菜单入口：不是本人的码就纠正回来
            var mp = act.mapping || {};
            for (var k in mp) {
                if (!mp[k] || typeof mp[k].url !== 'string') continue;
                var def = String(k).indexOf('购物车') >= 0 ? MINE.cart : MINE.red;
                mp[k].url = appFmt(mp[k].url);
            }

            // (2) 助力位：以 mine.help 为唯一真源
            //     · 配了 help：每条 before 的码换成 help，条数与 wait 原样保留（绝不改步数）
            //     · before 丢了 / 空了：补一条 wait=8，而不是把助力跳过
            var tl = act.taskList || [];
            for (var i = 0; i < tl.length; i++) {
                var tk = (DATA.taskData[tl[i]] || {}).task;
                if (!tk) continue;
                var bl = tk.before;
                if (Object.prototype.toString.call(bl) !== '[object Array]') bl = [];

                // 干净版：不再用任何推广码改写 before，原样保留（配置里已清空）
            }
        } catch (e) { }
    })();

    var pvStr = MINE.pv;
    var endStr = MINE.red;
    var data = [];
    var More = configValue ? configValue : 1;

    var taobaoScheme = {
        scheme:"taobao",
        main:"taobao://m.taobao.com/tbopen/index.html?h5Url=https://m.taobao.com",
        start: pvStr ? "taobao://m.tb.cn/h." + pvStr : null,
        end: endStr ? "taobao://m.tb.cn/h." + endStr : null,
        //end:"taobao://m.taobao.com/tbopen/index.html?h5Url=https://m.taobao.com",

    }

    var ttScheme = {
        scheme:"taobaolite://m.ltao.com/open/index.html?action=ali.open.nav&h5Url=",
        main:"taobaolite://m.ltao.com/open/index.html?action=ali.open.nav&h5Url=https%3A%2F%2Fm.ltao.com%2Fhomepage%23mallPage",
        start: pvStr ? "taobao://m.taobao.com/tbopen/index.html?h5Url=https://m.tb.cn/h." + pvStr : null,
        end: endStr ? "taobao://m.taobao.com/tbopen/index.html?h5Url=https://m.tb.cn/h." + endStr : null,
        type:"url"
    }
    var schemes = {
        1:[taobaoScheme],
        2:[ttScheme]
    }
    var scheme = schemes[More]
    var taskList = DATA.activity.taskList


    taskList = taskList.map((v) => DATA.taskData[v]).filter((v) => !!v);

    scheme.map((s) => {

        taskList.map((oneTask) => {

            var _t = oneTask.task || {};
            var itme = _t.item || [];
            var before = _t.before || [];
            var baseUrl = _t.baseurl
            var wait = _t.wait
            var paramObj = _t.param
            //before  → 助力页，第一个开
            before.map((v,i) => {
                data.push({
                    url: s.type ? s.scheme + encodeURIComponent('https' + v.url):s.scheme + v.url,
                    wait:v.wait
                })

            })

            //start  → 超级红包（第二个）
            if (s && s.end){
                data.push({
                    url:s.end,
                    wait:10
                })
            }
            //快消蓄水期（第三个）
            if (s && s.start){
                data.push({
                    url:s.start,
                    wait:8
                })
            }
            data.push({
                url:s.main,
                wait:5
            })

            //任务
            itme.map((v,i) => {

                var str = v;
                var params = str.split(' ');
                var url = baseUrl;


                for (var key in paramObj){

                    var paramArr = paramObj[key]
                    var reg = new RegExp(`${key}`,'g')
                    var str = paramArr[Math.floor((Math.random()*paramArr.length))]
                    url = url.replace(reg,str);
                }
                //替换参数2
                params.map((v,i) => {
                    if (v){
                        var num = i+1;
                        var reg = new RegExp(`占位参数${num}`,'g')
                        url = url.replace(reg,v);
                    }
                });

                data.push({
                    url:s.type ? s.scheme + encodeURIComponent('https' + url):s.scheme + url,
                    wait:wait
                })

                if (i%2 === 0){
                    data.push({
                        url:s.main,
                        wait:5
                    })
                }
            })
            if (s && s.end){
                data.push({
                    url:s.end,
                    wait:5
                })
            }


        })
    })

    if (runNum > 0 && runNum != 1){
        data = data.splice(runNum - 1,data.length);
    }

    var dd = {
        succes: 'ok',
        data:data
    };

    return JSON.stringify(dd);
};
