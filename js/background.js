chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
    let data = request.data;
    showDataOnPage(data.title,data.message,data.closeTime);
    sendResponse('已执行弹窗');

});


//将data数据以桌面通知的方式显示给用户
function showDataOnPage(title,data,closeTime=3000) {


    //显示一个桌面通知
    if (chrome.notifications) {
        var opt = {
            type: 'basic',
            title: title,
            message: data,
            iconUrl: chrome.runtime.getURL('icon.png'),
        }
        chrome.notifications.create('', opt, function (id) {
            setTimeout(function () {
                chrome.notifications.clear(id, function () { });
            }, closeTime);
        });

    } else {
        console.error("chrome.notifications is not available");
    }

}