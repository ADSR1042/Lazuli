// async function inital() {
//     //从chrome storage中获取配置
//     let updateTime = await new Promise((resolve, reject) => {
//         chrome.storage.local.get('search-last-update', function (result) {
//             resolve(result);
//         });
//     });
//     if (updateTime['search-last-update']) {
//         //处理时间 精确到年月日时分秒
//         let date = new Date(Number(updateTime['search-last-update'])).toLocaleString();
//         document.getElementById('search-last-update').innerText = "查老师数据更新时间：" + date;
//     }
//     else {
//         document.getElementById('search-last-update').innerText = "查老师数据更新时间：未知";
//     }
// }
async function inital(){
    const searchLastUpdateDOM = document.getElementById('searchLastUpdate');
    const scoreDataSourceDOM = document.getElementById('scoreDataSource');
    let config = await loadConfig();
    let searchLastUpdate = await loadExtensionStorage('search-last-update');
    if(searchLastUpdate){
        searchLastUpdate = new Date(Number(searchLastUpdate)).toLocaleString();
        searchLastUpdateDOM.innerText = "查老师数据更新时间：" + searchLastUpdate;
    }
    else{
        searchLastUpdateDOM.innerText = "查老师数据更新时间：未知";
    }
    if(config.scoreDataUpdateMethod === 'online'){
        scoreDataSourceDOM.innerText = `查老师数据来源：${config.scoreDateUrl}`;
    }
    else if(config.scoreDataUpdateMethod === 'manual'){
        scoreDataSourceDOM.innerText = "查老师数据来源：手动上传";
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
