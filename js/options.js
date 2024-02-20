//用于options.html页面的默认插件配置 会在加载后被loadConfig函数覆盖
let globalConfig = {
    enableDataExpirationReminders: true,
    // enablelessonListAutoScroll: true,
};


async function handleDataExpirationReminders(e) {
    console.log('handleDataExpirationReminders', e);
    globalConfig.enableDataExpirationReminders = e.target.checked;
    await new Promise((resolve, reject) => {
        chrome.storage.local.set({ config: globalConfig }, function () {
            console.log('配置已保存', globalConfig);
            resolve();
        });
    });
}

// async function hanndleLessonListAutoScroll(e) {
//     console.log('hanndleLessonListAutoScroll', e);
//     globalConfig.enablelessonListAutoScroll = e.target.checked;
//     await new Promise((resolve, reject) => {
//         chrome.storage.local.set({ config: globalConfig }, function () {
//             console.log('配置已保存', globalConfig);
//             resolve();
//         });
//     });
// }


async function loadConfig() {
    //设置页加载时需要先加载配置
    const config = await new Promise((resolve, reject) => {
        chrome.storage.local.get('config', function (result) {
            // console.log('配置已读取', result);
            resolve(result);
        });
    });
    console.log('配置', config);
    //如果配置中有enableDataExpirationReminders属性且为true，就设置为选中状态
    if (config.config && config.config.enableDataExpirationReminders) {
        globalConfig.enableDataExpirationReminders = config.config.enableDataExpirationReminders;
        document.getElementById('enable-data-expiration-reminders').checked = true;
    }
    // //如果配置中有lessonListAutoScroll属性且为true，就设置为选中状态
    // if (config.config && config.config.enableLessonListAutoScroll) {
    //     globalConfig.lessonListAutoScroll = config.config.enableLessonListAutoScroll;
    //     document.getElementById('enable-lesson-list-auto-scroll').checked = true;
    // }
}









loadConfig();


//为id是enable-data-expiration-reminders的元素添加事件监听
document.getElementById('enable-data-expiration-reminders').addEventListener('change', handleDataExpirationReminders);

//为id是enable-lesson-list-auto-scroll的元素添加事件监听
// document.getElementById('enable-lesson-list-auto-scroll').addEventListener('change', hanndleLessonListAutoScroll);