
let fileCache = null;

document.addEventListener('DOMContentLoaded', async function () {
    const onlineDataRadio = document.getElementById('online');
    const manualDataRadio = document.getElementById('manual');
    const onlineOptions = document.getElementById('onlineOptions');
    const manualOptions = document.getElementById('manualOptions');
    const dataSourceInput = document.getElementById('scoreDateUrl');
    const teacherWebsiteInput = document.getElementById('chaLaoShiUrl');
    const saveGeneralButton = document.getElementById('saveSettingsGeneral');
    const saveScoreDataButton = document.getElementById('saveSettingsScoreData');
    const scoreDataExpirationTimeInput = document.getElementById('scoreDataExpirationTime');
    const saveFeedbackGeneral = document.getElementById('saveSettingsGeneralFeedback');
    const saveFeedbackScoreData = document.getElementById('saveSettingsScoreDataFeedback');
    const scoreDataUpload = document.getElementById('scoreDataUpload');
    const resetButton = document.getElementById('resetSettings');
    // const resetSettingConfirmModal = new bootstrap.Modal(document.getElementById('resetSettingsConfirmModal'));
    const resetSettingsConfirmModal = bootstrap.Modal.getOrCreateInstance('#resetSettingsConfirmModal');
    const resetSettingsConfirmModalCancel = document.getElementById("resetSettingsConfirmModalCancel")
    const resetSettingsConfirmModalConfirm = document.getElementById("resetSettingsConfirmModalConfirm")


    //加载配置
    const config = await loadConfig();
    teacherWebsiteInput.value = config.chaLaoShiUrl;
    dataSourceInput.value = config.scoreDateUrl;
    switch (config.scoreDataExpirationTime) {
        case 1000 * 60 * 60 * 24 * 7:
            scoreDataExpirationTimeInput.value = '7';
            break;
        case 1000 * 60 * 60 * 24 * 30:
            scoreDataExpirationTimeInput.value = '30';
            break;
        case 1000 * 60 * 60 * 24 * 365 * 100:
            scoreDataExpirationTimeInput.value = 'never';
            break;
    }
    if (config.scoreDataUpdateMethod === 'online') {
        onlineDataRadio.checked = true;
        toggleOptions();
    }
    else if (config.scoreDataUpdateMethod === 'manual') {
        manualDataRadio.checked = true;
        toggleOptions();
    }

    function validateUIURL(input) {
        if (validateURL(input.value)) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
    }

    function toggleOptions() {
        if (onlineDataRadio.checked) {
            onlineOptions.classList.remove('d-none');
            manualOptions.classList.add('d-none');
        } else if (manualDataRadio.checked) {
            manualOptions.classList.remove('d-none');
            onlineOptions.classList.add('d-none');
        }
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                fileCache = e.target.result;
                console.log(fileCache);
                if (!checkScoreData(JSON.parse(fileCache))) {
                    saveFeedbackScoreData.classList.remove('d-none')
                    saveFeedbackScoreData.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
                    saveFeedbackScoreData.querySelector('.alert').textContent = '文件格式错误！';
                }
            }

            reader.onerror = function () {
                saveFeedbackScoreData.classList.remove('d-none')
                saveFeedbackScoreData.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
                saveFeedbackScoreData.querySelector('.alert').textContent = '文件读取失败！';
            };

            reader.readAsText(file);
        } else {
            {
                saveFeedbackScoreData.classList.remove('d-none')
                saveFeedbackScoreData.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
                saveFeedbackScoreData.querySelector('.alert').textContent = '手动上传文件不能为空！';
            }
        }
    }

    onlineDataRadio.addEventListener('change', toggleOptions);
    manualDataRadio.addEventListener('change', toggleOptions);
    dataSourceInput.addEventListener('input', () => {
        saveFeedbackScoreData.classList.add('d-none')
        validateUIURL(dataSourceInput)
    });
    teacherWebsiteInput.addEventListener('input', () => {
        saveFeedbackGeneral.classList.add('d-none')
        validateUIURL(teacherWebsiteInput)
    });
    saveGeneralButton.addEventListener('click', saveConfigGeneral);
    saveScoreDataButton.addEventListener('click', saveConfigScoreData);
    scoreDataUpload.addEventListener('change', handleFileUpload);
    resetButton.addEventListener('click', () => resetSettingsConfirmModal.show());
    resetSettingsConfirmModalCancel.addEventListener('click', () => resetSettingsConfirmModal.hide());
    resetSettingsConfirmModalConfirm.addEventListener('click', () => {
        chrome.storage.local.clear();
        resetSettingsConfirmModal.hide()
        window.scrollTo(0,0)
        location.reload();
    });
});


async function saveConfigGeneral() {
    const teacherWebsiteInput = document.getElementById('chaLaoShiUrl');
    const saveFeedback = document.getElementById('saveSettingsGeneralFeedback');
    //校验URL是否合法
    if (!validateURL(teacherWebsiteInput.value)) {
        teacherWebsiteInput.classList.remove('is-valid');
        teacherWebsiteInput.classList.add('is-invalid');
        saveFeedback.classList.remove('d-none');
        saveFeedback.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
        saveFeedback.querySelector('.alert').textContent = '请确保所有输入项均有效后再保存！';
        return;
    }
    let config = await loadConfig();
    config.chaLaoShiUrl = teacherWebsiteInput.value;
    console.log("新保存的的", config);
    await saveExtensionStorage('config', config);
    saveFeedback.classList.remove('d-none');
    saveFeedback.querySelector('.alert').textContent = '设置已成功保存！';
}

async function saveConfigScoreData() {
    const onlineDataRadio = document.getElementById('online');
    const dataSourceInput = document.getElementById('scoreDateUrl');
    const manualDataRadio = document.getElementById('manual');
    const scoreDataExpirationTimeInput = document.getElementById('scoreDataExpirationTime');
    const saveFeedback = document.getElementById('saveSettingsScoreDataFeedback');
    const scoreDataUpload = document.getElementById('scoreDataUpload');

    //校验URL是否合法
    if (onlineDataRadio.checked && !validateURL(dataSourceInput.value)) {
        dataSourceInput.classList.remove('is-valid');
        dataSourceInput.classList.add('is-invalid');
        saveFeedback.classList.remove('d-none');
        saveFeedback.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
        saveFeedback.querySelector('.alert').textContent = '请确保所有输入项均有效后再保存！';
        return;
    }

    //校验上传文件是否合法
    if (manualDataRadio.checked && !scoreDataUpload.files.length) {
        saveFeedback.classList.remove('d-none')
        saveFeedback.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
        saveFeedback.querySelector('.alert').textContent = '手动上传文件不能为空！';
        return;
    }
    if (manualDataRadio.checked && !checkScoreData(JSON.parse(fileCache))) {
        saveFeedback.classList.remove('d-none')
        saveFeedback.querySelector('.alert').classList.replace('alert-success', 'alert-danger');
        saveFeedback.querySelector('.alert').textContent = '文件格式错误！';
        return;
    }
    let config = await loadConfig();
    if (onlineDataRadio.checked) {
        config.scoreDataUpdateMethod = 'online';
        config.scoreDateUrl = dataSourceInput.value;
        switch (scoreDataExpirationTimeInput.value) {
            case '7':
                config.scoreDataExpirationTime = 1000 * 60 * 60 * 24 * 7; //7天
                break;
            case '30':
                config.scoreDataExpirationTime = 1000 * 60 * 60 * 24 * 30; //30天
                break;
            case 'never':
                config.scoreDataExpirationTime = 1000 * 60 * 60 * 24 * 365 * 100; //100年 Remind me to update this extension in 100 years lol 
                break;                                                              // whether it still exists or not
        }
        await saveExtensionStorage('updateScoreDataNow', true);
    }
    else if (manualDataRadio.checked) {
        config.scoreDataUpdateMethod = 'manual';
        await saveExtensionStorage('search-data', JSON.parse(fileCache));
        await saveExtensionStorage('search-last-update', new Date().getTime());
    }
    await saveExtensionStorage('config', config);
    saveFeedback.classList.remove('d-none');
    saveFeedback.querySelector('.alert').textContent = '设置已成功保存！';
}

//糊弄一下报错
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener('hide.bs.modal', function (event) {
        if (document.activeElement) {
            document.activeElement.blur();
        }
    });
});