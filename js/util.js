const defaultConfig = {
    enableDataExpirationReminders: true,
    scoreDataExpirationTime: 1000 * 60 * 60 * 24 * 7, //7天
    scoreDateUrl: 'https://cha-lao-shi.2467656.xyz/',
    scoreDataUpdateMethod: 'online',
    chaLaoShiUrl: 'https://chalaoshi.click',
};



/**
 * 插件配置相关
 */
async function loadConfig() {

    //设置页加载时需要先加载配置
    let config = await loadExtensionStorage('config');
    console.log('配置', config);
    //校验config是否为空对象
    if (!config || Object.keys(config).length === 0) {
        //如果为空对象 使用默认配置 并丢出警告
        console.warn('配置为空对象 使用默认配置');
        //并写入
        await saveExtensionStorage('config', defaultConfig);
        return defaultConfig;
    }

    let configValid = true;
    //校验config是否有缺失属性
    for (let key in defaultConfig) {
        if (!(key in config)) {
            console.warn('配置缺失属性', key);
            config[key] = defaultConfig[key];
            configValid = false;
        }
    }
    if (!configValid) {
        await saveExtensionStorage('config', config);
    }
    return config;

}


/**
 * 插件缓存读写相关
 */
async function loadExtensionStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => {
            //如果result是空对象
            if (Object.keys(result).length === 0) {
                resolve(null);
                return;
            }
            resolve(result[key]);
        });
    });
}

async function saveExtensionStorage(key, data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: data }, () => {
            resolve();
        });
    });
}

/**
 * 数据获取与校验相关
 */

function checkScoreData(data) {
    //data是一个对象 必须要有colleges和teachers两个属性
    if (!data || !data.colleges || !data.teachers) {
        return false;
    }
    //检查colleges是否是数组 
    if (!Array.isArray(data.colleges)) {
        return false;
    }
    //遍历colleges 检查每一个元素是否是对象 且对象包含id和name两个属性
    for (let college of data.colleges) {
        if (!college || !('id' in college) || !('name' in college)) {
            return false;
        }
    }
    //检查teachers是否是数组
    if (!Array.isArray(data.teachers)) {
        return false;
    }
    //遍历teachers 检查每一个元素是否是对象 且对象包含hot id name rate py sx xy
    for (let teacher of data.teachers) {
        if (!teacher || !('hot' in teacher) || !('id' in teacher) || !('name' in teacher) || !('rate' in teacher) || !('py' in teacher) || !('sx' in teacher) || !('xy' in teacher)) {
            return false;
        }
    }
    return true;
}

async function fetchScoreData(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching score data:', error);
        return null;
    }
}

/**
 * 初始化
 */

/**
 * 初始化函数
 */

//插件初始化函数
async function initalExtension() {
    //检查缓存中 isinit 是否为true
    let isinit = await loadExtensionStorage('isinit');
    if (isinit) {
        console.log("插件已初始化")
        return;
    }
    //执行初始化逻辑

    //先检查一下有没有数据
    let dataAlready = await loadExtensionStorage('search-data')

    if (!dataAlready) {
        //加载json文件至chrome缓存 位置 /data/default.json
        // 使用fetch加载json文件
        const response = await fetch(chrome.runtime.getURL('/data/default.json'));
        const data = await response.json();
        //这里没做错误处理 请求自己本地的json如果还能出错那是真的🐂🍺

        //将json文件写入chrome缓存
        console.log('加载默认数据至chrome缓存', data);
        await saveExtensionStorage('search-data', data);
        await saveExtensionStorage('search-last-update', 0);
    }

    let configAlready = await loadExtensionStorage('config')
    if (!configAlready) {
        //然后写入插件配置项
        await saveExtensionStorage('config', defaultConfig);
    }
    await saveExtensionStorage('isinit', true);

}



/**
 * 其他函数
 */
function validateURL(url) {
    // const pattern = new RegExp('(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]');
    // return pattern.test(url);
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}