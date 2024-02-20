chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let data = request.data;
    showDataOnPage(data.title, data.message, data.closeTime, data.url);
    sendResponse('已执行弹窗');

});


//将data数据以桌面通知的方式显示给用户
function showDataOnPage(title, data, closeTime = 3000, url = "") {


    //显示一个桌面通知
    if (chrome.notifications) {
        let opt = {
            type: 'basic',
            title: title,
            message: data,
            iconUrl: chrome.runtime.getURL('icon.png'),
        }
        chrome.notifications.create('', opt, function (id) {

            //点击通知后的回调
            chrome.notifications.onClicked.addListener(function (id) {
                console.log("click notification", url);
                if (url !== '' && url !== null && url !== undefined) {
                    console.log("open url", url);
                    chrome.tabs.create({ url: url });
                }
                //卸载listener
                chrome.notifications.onClicked.removeListener();
                chrome.notifications.clear(id, function () { });
            });

            setTimeout(function () {
                chrome.notifications.clear(id, function () { });
            }, closeTime);
        }
        );

    } else {
        console.error("chrome.notifications is not available");
    }

}