async function inital() {
    //从chrome storage中获取配置
    let updateTime = await new Promise((resolve, reject) => {
        chrome.storage.local.get('search-last-update', function (result) {
            resolve(result);
        });
    });
    if (updateTime['search-last-update']) {
        //处理时间 精确到年月日时分秒
        let date = new Date(Number(updateTime['search-last-update'])).toLocaleString();
        document.getElementById('search-last-update').innerText = "查老师数据更新时间：" + date;
    }
    else {
        document.getElementById('search-last-update').innerText = "查老师数据更新时间：未知";
    }
}

function handleSetting() {
    chrome.runtime.openOptionsPage();
}

inital();
document.addEventListener('DOMContentLoaded', function () {
    //为id是popup-setting的元素添加点击监听
    document.getElementById('popup-setting').addEventListener('click', handleSetting);
});
