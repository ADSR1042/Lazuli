let globalConfig = {
	enableDataExpirationReminders: true,
};



$(document).ready(async function () {

	//设定一个全局变量 数据过期时间
	var expireTime = 1000 * 60 * 60 * 24 * 7; //7天
	console.log('选课插件已启动');
	debugger;

	await inital();

	let config = await loadConfig();
	globalConfig = config.config;

	//如果是查老师的根目录 即url为 chalaoshi.de 或者 http://chalaoshi-de-s.webvpn.zju.edu.cn:8001/ url需要完全匹配
	if (window.location.href == 'http://chalaoshi.de/' || window.location.href == 'http://chalaoshi-de-s.webvpn.zju.edu.cn:8001/') {
		//获取当前时间
		let nowTime = new Date().getTime();
		// //获取本地存储的数据
		let localData = localStorage.getItem('search-data');
		let localTime = localStorage.getItem('search-last-update');
		//localTime 字符串转数字
		localTime = Number(localTime);
		//如果本地存储的数据存在 并且没有过期
		if (localData && nowTime - localTime < expireTime) {
			//直接使用本地存储的数据
			console.log('发现本地存储的数据');
			await updateChromeStorage(localData, localTime);
			await getLocalData('needUpdate').then((result) => {
				if (result && result.needUpdate) {
					//这里提醒主要是为了符合逻辑  用户在打开zdbk的时候提示需要更新 提醒打开查老师后需要告知一次用户数据已经更新 实际上做的时候是次次更新
					desktop_notification('选课插件提示', '检测到打开查老师，评分数据已更新', 10000);
					//更新完毕后将needUpdate设置为false
					chrome.storage.local.set({ 'needUpdate': false }, function () {
						console.log('needUpdate已写入插件储存空间');
					});
				}
			});
		} else {
			//如果过期了或者没有数据 模拟点击查老师搜索框获取数据 并再从本地存储中获取
			try {
				await forgePrepareSearch();
				//获取本地存储的数据
				localData = localStorage.getItem('search-data');
				localTime = localStorage.getItem('search-last-update');

				//如果获取为空  丢出错误
				if (!localData || !localTime) {
					throw new Error('获取数据失败');
				}

				console.log('模拟点击查老师搜索框获取数据');
				console.log(localData);
				console.log(localTime);
				console.log('将页面存储的数据写入插件储存空间');
				await updateChromeStorage(localData, localTime);
				desktop_notification('选课插件提示', '检测到打开查老师，评分数据已更新', 10000);
			}
			catch (e) {
				console.log('模拟点击查老师搜索框获取数据失败', e);
				desktop_notification('选课插件提示', '检测到打开查老师，查老师未响应，请稍后再试', 10000);
			}
		}
	}
	//如果是zdbl选课页面 url包含 http://zdbk.zju.edu.cn/jwglxt/xsxk
	else if (window.location.href.includes('http://zdbk.zju.edu.cn/jwglxt/xsxk')) {

		let localTime = await getLocalData('search-last-update');
		localTime = localTime['search-last-update'];
		//字符串转数字
		localTime = Number(localTime);


		if (!localTime || new Date().getTime() - localTime > expireTime) {

			if (globalConfig.enableDataExpirationReminders) {
				desktop_notification('选课插件提示', '评分数据已过期，点击打开查老师页面更新评分', 20000, 'http://chalaoshi.de/');
				//此处暂时不返回 避免影响后续代码执行
				//全局变量 存一个needUpdate 用于判断是否需要更新数据
				await new Promise((resolve, reject) => {
					chrome.storage.local.set({ 'needUpdate': true }, function () {
						console.log('needUpdate已写入插件储存空间');
						resolve(true);
					});
				});
			}

		}


		let localData = await getLocalData('search-data');
		if (!localData) {
			desktop_notification('选课插件提示', '评分数据异常，点击打开查老师页面更新评分', 20000);
			return;
		}
		startZDBKInject();


	}

});

//封装chrome.storage.local.get 为promise 这玩意很奇怪...包一层得了
function getLocalData(key) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(key, (result) => {
			//如果result是空对象
			if (Object.keys(result).length === 0) {
				resolve(null);
				return;
			}
			resolve(result);
		});
	});
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

async function loadScoreData(element) {

	console.log('开始加载评分数据', element);
	//延迟0.5秒 等待愚蠢的zdbk加载
	await new Promise(r => setTimeout(r, 500));

	//table是panel-heading的兄弟元素的子元素
	let table = $(element).siblings().first().find('table');

	//如果table已经处理过了 直接返回
	if ($(table).attr('data-score') == 'true') {
		return;
	}

	// 获取本地存储的数据
	chrome.storage.local.get('search-data', (localData) => {

		//反序列化 localData原本是JSON字符串
		localData = JSON.parse(localData['search-data']);

		// 对当前table元素下子元素进行处理
		//table下thead的tr元素下面的第一个th元素后面插入一个th
		$(table).find('thead').children('tr').children('th').eq(0).after('<th width="5%" >评分</th>');

		//开始处理table下tbody的tr元素
		let trs = $(table).find('tbody').children('tr');
		//如果trs为空 再次调用loadScoreData
		if (trs.length == 0) {
			console.log('trs为空 zdbk还在记载 再次调用loadScoreData');
			loadScoreData(element);
			return;
		}
		//遍历每一个tr元素
		trs.each(function (index, element) {
			//如果tr没有id属性 则说明是课程错误 无教学班
			if (!$(element).attr('id')) {
				console.log('课程错误 无教学班');
				//把tr下的第一个子元素td的colspan属性改为14 对其
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
				console.log('教师姓名', teacherNames);

				//根据教师姓名在本地存储的数据中查找评分 并插入到tr的第二个td元素后面
				//teacherNames是一个数组 有可能有多个老师 需要放到一个td里面
				let scoreHTML = '';
				teacherNames.forEach((teacherName) => {
					//如果老师名字在本地存储的数据中
					let res = localData.teachers.find((teacher) => teacher.name == teacherName);
					if (res && res.rate) {
						//如果有评分
						//根据评分高低设置颜色 满分十分 但是rate是字符串 

						//如果评分大于8.5 设置为红色
						if (parseFloat(res.rate) > 8.5) {
							scoreHTML += '<a style="color:red;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}
						//如果评分小于2 设置为紫色
						else if (parseFloat(res.rate) < 2) {
							scoreHTML += '<a style="color:#4340ff;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}
						// 正常情况黑色
						else {
							scoreHTML += '<a style="color:black;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}

						// scoreHTML += `<a style={color:} href=https://chalaoshi.de/t/${res.id}>` + res.rate + '</a> <br>';
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
				console.log('选课难度', difficultyHTML);
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


				console.log('余量', rest);
				console.log('本专业待定', majorPending);
				console.log('全部待定', allPending);

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


	});



}

//把上面的函数改为promise
function updateChromeStorage(localData, localTime) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set({
			'search-data': localData,
			'search-last-update': localTime
		}, function () {
			console.log('数据已写入插件储存空间');
			resolve(true);
		});
	});
}

//查老师页面查询函数  照抄了一下查老师的查询函数 因为权限问题注入脚本没办法直接使用页面函数
async function forgePrepareSearch() {
	const search_version = 5;
	const searchDataKey = "search-data";
	const searchVersionKey = "search-version";
	const searchLastUpdateKey = "search-last-update";
	const localVersion = Number(localStorage.getItem(searchVersionKey));
	const lastUpdateTime = Number(localStorage.getItem(searchLastUpdateKey));
	let searchData;

	if (localVersion && localVersion === search_version && (Date.now() - lastUpdateTime) < 7 * 24 * 60 * 60 * 1000) {
		searchData = searchData || JSON.parse(localStorage.getItem(searchDataKey));
		if (searchData && "colleges" in searchData && "teachers" in searchData) {
			return;
		}
	}

	const now = new Date();
	const url = "/static/json/search.json?v=" + search_version + "&date=" + now.getUTCFullYear() + (now.getUTCMonth() + 1).toString().padStart(2, "0") + now.getUTCDate().toString().padStart(2, "0");

	try {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			if ("colleges" in data && "teachers" in data) {
				searchData = data;
				localStorage.setItem(searchDataKey, JSON.stringify(data));
				localStorage.setItem(searchVersionKey, search_version.toString());
				localStorage.setItem(searchLastUpdateKey, Date.now().toString());
			}
		}
	} catch (error) {
		console.error("Error fetching search data:", error);
	}
}

//插件初始化函数
async function inital() {
	//检查缓存中 isinit 是否为true
	let result = await getLocalData('isinit');

	if (result && result.isinit) {
		console.log("插件已初始化")
		return;
	}
	//执行初始化逻辑

	//加载json文件至chrome缓存 位置 /data/default.json
	// 使用fetch加载json文件
	const response = await fetch(chrome.runtime.getURL('/data/default.json'));
	const data = await response.json();

	//这里没做错误处理 请求自己本地的json如果还能出错那是真的🐂🍺

	//将json文件写入chrome缓存
	console.log('加载json文件至chrome缓存', data);

	await new Promise((resolve, reject) => {
		chrome.storage.local.set({ 'search-data': JSON.stringify(data) }, function () {
			console.log('数据已写入插件储存空间');
			resolve(true);
		});
	});
	await new Promise((resolve, reject) => {
		chrome.storage.local.set({ 'search-last-update': 0 }, function () {
			console.log('数据时间已写入插件储存空间');
			resolve(true);
		});
	});

	//然后写入插件配置项
	//dataExpirationReminders 默认为true 用于判断是否需要提醒数据过期
	//lessonListAutoScroll 默认为true 用于判断是否需要自动下拉
	//打包成一个对象写入插件缓存 key名为config
	await new Promise((resolve, reject) => {
		chrome.storage.local.set({ 'config': { 'enableDataExpirationReminders': false, 'enableLessonListAutoScroll': true } }, function () {
			console.log('配置已写入插件储存空间');
			resolve(true);
		});
	});

	await new Promise((resolve, reject) => {
		chrome.storage.local.set({ 'isinit': true }, function () {
			console.log('初始化成功');
			resolve(true);
		});
	});

}

async function loadConfig() {

	//用于防止爆炸的默认配置 按照正常启动流程应该不会用到 在init函数中必定写入
	const defaultConfig = {
		enableDataExpirationReminders: true,
		lessonListAutoScroll: true,
	};


	//设置页加载时需要先加载配置
	const config = await new Promise((resolve, reject) => {
		chrome.storage.local.get('config', function (result) {
			// console.log('配置已读取', result);
			resolve(result);
		});
	});
	console.log('配置', config);
	//校验config是否为空对象
	if (Object.keys(config).length === 0) {
		//如果为空对象 使用默认配置 并丢出警告
		console.warn('配置为空对象 使用默认配置');
		return defaultConfig;
	}
	return config;

}


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