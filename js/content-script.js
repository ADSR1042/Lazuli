let globalConfig = null;
let scoreData = null;

/**
 * 主运行逻辑
 */

$(document).ready(async function () {

    console.log('选课插件已启动');

    await initalExtension();

    globalConfig = await loadConfig();

    scoreData = await loadExtensionStorage('search-data');

    if (window.location.href.includes('http://zdbk.zju.edu.cn/jwglxt/xsxk')) {

        //启用数据自动更新 
        //理论上启用自动更新与手动指定数据互斥 代码实现上启用自动更新时会覆盖手动指定数据
        if (globalConfig.scoreDataUpdateMethod == 'online') {


            //scoeDateUrl 存在且是合法url
            if (globalConfig.scoreDateUrl && validateURL(globalConfig.scoreDateUrl)) {
                //校验时间
                let localTime = await loadExtensionStorage('search-last-update');
                //字符串转数字
                localTime = Number(localTime);
                let updateScoreDataNow = await loadExtensionStorage('updateScoreDataNow');
                //如果时间为空或者时间超过了设定的过期时间或者设置里修改了数据源 需要自动更新数据
                if (!localTime || new Date().getTime() - localTime > globalConfig.scoreDataExpirationTime || updateScoreDataNow) {
                    //尝试获取数据
                    let data = await fetchScoreData(globalConfig.scoreDateUrl);
                    //数据校验
                    if (checkScoreData(data)) {
                        //数据校验通过 写入缓存
                        await saveExtensionStorage('search-data', data);
                        await saveExtensionStorage('search-last-update', new Date().getTime());
                        await saveExtensionStorage('updateScoreDataNow', false);
                        desktop_notification('选课插件提示', '自动数据更新成功', 20000);
                    } else {
                        //数据校验不通过
                        desktop_notification('选课插件提示', '自动数据更新失败，数据源返回错误', 20000);
                    }
                }
            } else {
                //url不合法或不合法
                desktop_notification('选课插件提示', '自动数据更新失败，数据源地址错误', 20000);
            }
        }
        else if (globalConfig.scoreDataUpdateMethod == 'manual') {
            console.log('使用手动指定数据');
        }
        startZDBKInject();
    }

});







/**
 * 插件通知相关
 */

//系统通知接口函数
function desktop_notification(title, data, closeTime = 3000, url = "") {
    //由于content-script.js无法使用chrome.notifications 需要通过background.js来发送消息
    chrome.runtime.sendMessage({
        data: {
            title: title,
            message: data,
            closeTime: closeTime,
            url: url
        }
    }, function (response) {
        console.log('收到来自后台的回复：' + response);
    });

}


/**
 * zdbk注入相关
 */

// 选择要观察变化的目标节点
const targetNode = document.getElementById('contentBox');

// 创建一个MutationObserver实例并传入回调函数
const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        // 检查变化类型是否为子节点的添加
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // 在这里执行你的函数
            console.log('选课系统界面栏目已切换 启动默认下拉');
            autoScroll();
            bindForgeClick();
        }
    });
});

// 配置观察器以监视子节点的变化
const config = { childList: true };

//为页面上所有选课pannel绑定点击事件 使得点击后修改dom
function bindForgeClick() {
    //查找所有class为kched的元素 为他们新绑定点击事件 loadScoreData 函数

    $('.panel-heading').each(function (index, element) {
        // $(element).click(loadScoreData);
        //如果没有绑定过
        if (!$(element).data('events') || !$(element).data('events').bindForgeClick) {
            //绑定点击事件
            $(element).click((event) => loadScoreData(event.currentTarget));
            //绑定完给加上data标签防止重复绑定
            $(element).data('events', { bindForgeClick: true });

            //如果这个panel是默认展开的 直接对他调用一次loadScoreData
            //兄弟元素 的style属性的display属性为block
            if ($(element).siblings().first().attr('style') == 'display: block;') {
                loadScoreData(element);
            }
        }
    });

}

function autoScroll() {
    const distanceToBottom = $(document).height() - $(window).height() - $(window).scrollTop();
    // 如果#nextpage元素存在并且距离页面底部小于100px
    if ($('#nextPage').length > 0 && distanceToBottom < 100) {
        //更改nextPage元素的的innerText 为加载中
        $('#nextPage')[0].innerText = '加载中...';

        //如果#nextpage元素存在href属性 移除href属性
        if ($('#nextPage').attr('href')) {
            $('#nextPage').removeAttr('href');
        }


        // 模拟点击#nextpage元素
        $('#nextPage')[0].click();

        //再改为点此加载更多
        $('#nextPage')[0].innerText = '点此加载更多';
    }
}

function startZDBKInject() {
    // 开始监听 整体选课栏目 发生变化时触发自动下拉滚动与绑定点击事件
    observer.observe(targetNode, config);

    //查找 id为#nextPage 的元素 如果存在 点他一下
    if ($('#nextPage').length > 0) {
        //如果#nextpage元素存在href属性 移除href属性 避免chrome报错
        if ($('#nextPage').attr('href')) {
            $('#nextPage').removeAttr('href');
        }
        $('#nextPage')[0].click();
        bindForgeClick();
    }

    $(window).scroll(function () {
        autoScroll();
        bindForgeClick();
    });
}

async function loadScoreData(element, time = 0) {

    if (time > 10) {
        //此处可能return的情况包括
        //1.zdbk加载超时
        //2.zdbk根本没有返回数据
        return;
    }

    // console.log('开始加载评分数据', element);
    //延迟0.5秒 等待愚蠢的zdbk加载
    await new Promise(r => setTimeout(r, 500));

    //table是panel-heading的兄弟元素的子元素
    let table = $(element).siblings().first().find('table');

    //如果table已经处理过了 直接返回
    if ($(table).attr('data-score') == 'true') {
        return;
    }

    //获取table下的tbody下的tr元素
    let trs = $(table).find('tbody').children('tr');

    if (trs.length == 0) {
        console.log('trs为空 zdbk还在记载 再次调用loadScoreData');
        loadScoreData(element, time + 1);
        return;
    }

    if (!scoreData) {
        console.log('scoreData为空 重新加载');
        scoreData = await loadExtensionStorage('search-data');
    }
    // let localData = await loadExtensionStorage('search-data');

    if (!checkScoreData(scoreData)) {
        //数据校验不通过
        desktop_notification('选课插件提示', '插件运行失败，数据错误，请尝试重置数据', 40000);
        return;
    }


    // 对当前table元素下子元素进行处理
    //table下thead的tr元素下面的第一个th元素后面插入一个th
    $(table).find('thead').children('tr').children('th').eq(0).after('<th width="5%" >评分</th>');


    //遍历每一个tr元素
    trs.each(function (index, element) {
        //如果tr没有id属性 则说明是课程错误 无教学班
        if (!$(element).attr('id')) {
            console.log('课程错误 无教学班');
            //把tr下的第一个子元素td的colspan属性改为14 对齐
            $(element).children('td').eq(0).attr('colspan', '14');
        }
        else {
            //正常课程处理
            //获取教师姓名
            let teacherNames = [];
            //tr下的第二个元素的第一个子元素的html
            let teacherNameHTML = $(element).children('td').eq(1).children('a').html();
            //html处理出 教师姓名 以<br/>作为分隔符
            teacherNames = teacherNameHTML.split('<br>');
            // console.log('教师姓名', teacherNames);

            //根据教师姓名在本地存储的数据中查找评分 并插入到tr的第二个td元素后面
            //teacherNames是一个数组 有可能有多个老师 需要放到一个td里面
            let scoreHTML = '';
            teacherNames.forEach((teacherName) => {
                //如果老师名字在本地存储的数据中
                let res = scoreData.teachers.find((teacher) => teacher.name == teacherName);
                if (res && res.rate) {
                    //如果有评分
                    //根据评分高低设置颜色 满分十分 但是rate是字符串 

                    //如果评分大于8.5 设置为红色
                    if (parseFloat(res.rate) > 8.5) {
                        scoreHTML += '<a style="color:red;" href=' + globalConfig.chaLaoShiUrl + '/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
                    }
                    //如果评分小于2 设置为紫色
                    else if (parseFloat(res.rate) < 2) {
                        scoreHTML += '<a style="color:#4340ff;" href=' + globalConfig.chaLaoShiUrl + '/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
                    }
                    // 正常情况黑色
                    else {
                        scoreHTML += '<a style="color:black;" href=' + globalConfig.chaLaoShiUrl + '/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
                    }

                    // scoreHTML += `<a style={color:} href=https://chalaoshi.click/t/${res.id}>` + res.rate + '</a> <br>';
                }
                //如果没有评分
                else {
                    //如果没有评分 
                    scoreHTML += '<a style="color:black;" href="javascript:void(0);" > N/A </a><br>';
                }
            });
            //如果评分html不为空 插入到tr的第二个td元素后面
            if (scoreHTML) {
                $(element).children('td').eq(1).after('<td>' + scoreHTML + '</td>');
            }

            //计算选课难度
            //获取倒数第六个td元素的html
            let difficultyHTML = $(element).children('td').eq(-6).html();
            // console.log('选课难度', difficultyHTML);
            //获取余量 即difficultyHTML 以/分割后的第一个元素
            let rest = difficultyHTML.split('/')[0];
            //转成数字
            rest = Number(rest);
            //获取本专业待定 倒数第三个td元素的html
            let majorHTML = $(element).children('td').eq(-3).html();
            //处理一下majorHTML 保留< 前面的部分 跟求是潮选课插件兼容
            majorHTML = majorHTML.split('<')[0];
            //转成数字
            let majorPending = Number(majorHTML);
            //获取全部待定 倒数第二个td元素的html
            let allHTML = $(element).children('td').eq(-2).html();
            //类似的处理一下allHTML
            allHTML = allHTML.split('<')[0];
            //转成数字
            let allPending = Number(allHTML);


            // console.log('余量', rest);
            // console.log('本专业待定', majorPending);
            // console.log('全部待定', allPending);

            //按照所有待定的情况下的余量来设置颜色
            //余量小于零的单独处理
            if (rest <= 0) {
                //给倒数第三个跟倒数第二个td元素加上无法选中
                $(element).children('td').eq(-3).append('<br><span style="font-weight:bold; color: darkgray;">无法选中</span>');
                $(element).children('td').eq(-2).append('<br><span style="font-weight:bold; color: darkgray;">无法选中</span>');
            }
            else {
                //先处理本专业待定的一栏 计算比例
                let majorRate = majorPending / rest;
                let majorRateHTMLColor = majorRate < 1 ? 'green' : majorRate < 5 ? 'darkorange' : majorRate < 10 ? '#e60c0c' : 'black';
                let majorRateText = majorRate < 1 ? '容易选中' : majorRate < 5 ? '不易选中' : majorRate < 10 ? '难选中' : '极难选中';
                //构建一个html
                let majorRateHTML = `<br><span style="font-weight: bold; color: ${majorRateHTMLColor};">「${majorRate.toFixed(2)} 进 1」<br>${majorRateText}</span>`
                //插入到倒数第三个td元素内部 需要保留原本的html
                $(element).children('td').eq(-3).append(majorRateHTML);

                //处理全部待定的一栏 计算比例
                let allRate = allPending / rest;
                let allRateHTMLColor = allRate < 1 ? 'green' : allRate < 5 ? 'darkorange' : allRate < 10 ? '#e60c0c' : 'black';
                let allRateText = allRate < 1 ? '容易选中' : allRate < 5 ? '不易选中' : allRate < 10 ? '难选中' : '极难选中';
                //构建一个html
                let allRateHTML = `<br><span style="font-weight: bold; color: ${allRateHTMLColor};">「${allRate.toFixed(2)} 进 1」<br>${allRateText}</span>`
                //插入到倒数第二个td元素内部 需要保留原本的html
                $(element).children('td').eq(-2).append(allRateHTML);
            }
        }
    });

    //给table添加data属性 标志已经处理
    $(table).attr('data-score', 'true');
}



