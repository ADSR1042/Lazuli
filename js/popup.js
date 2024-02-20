console.log('popup.js loaded');

async function inital() {
}

function handleSetting() {
    console.log('handleSetting');
    chrome.runtime.openOptionsPage();
}


inital();
document.addEventListener('DOMContentLoaded', function () {
    //为id是popup-setting的元素添加点击监听
    document.getElementById('popup-setting').addEventListener('click', handleSetting);
});
