//background.js
// 当扩展安装或更新时创建右键菜单项
chrome.runtime.onInstalled.addListener(() => {
  // 创建顶级菜单项（带图标）
  chrome.contextMenus.create({
    id: "sendToOcr",
    title: "发送验证码到OCR服务器",
    contexts: ["image"]  // 仅在图片上显示
  });
});

// 获取图片数据并发送到服务器
async function fetchImageAndSendToServer(imageData, tab) {
  try {
    // 解析data URL并创建Blob对象
    const response = await fetch(imageData);
    if (!response.ok) {
      throw new Error(`Failed to parse image data: ${response.statusText}`);
    }
    // 假设imageData是base64编码的PNG图片
    const byteString = atob(imageData.split(',')[1]);
    const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const imageDataBlob = new Blob([ab], {type: mimeString});

    // 创建 FormData 并添加图片数据
    const formData = new FormData();
    formData.append('image', imageDataBlob, 'captcha.png');

    // 发送图片到服务器
    const ocrResult = await sendImageToServer(formData, tab);

    // 确保内容脚本已注入到当前标签页
    await injectContentScript(tab.id);

    // 将 OCR 结果发送到内容脚本进行自动填充
    chrome.tabs.sendMessage(tab.id, { action: "autoFillCaptcha", text: ocrResult.text }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to content script:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        console.log('OCR 成功：验证码已自动填充');
      } else {
        console.error('OCR 错误：无法自动填充验证码');
      }
    });

  } catch (error) {
    console.error('Error fetching or sending image:', error);
  }
}

// 修改监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToOcr" && info.mediaType === 'image') {
    // 获取选中的图片数据URL
    const imageData = info.srcUrl;

    // 调用 fetchImageAndSendToServer2 函数，并传入获取到的 imageData 和当前 tab
    fetchImageAndSendToServer2(imageData, tab);
  }
});
// 右击处理url图片识别
async function fetchImageAndSendToServer2(imageUrl, tab) {
  try {
    // 如果 imageUrl 是普通URL，先获取图片数据
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const imageDataBlob = new Blob([blob], { type: blob.type });

    // 创建 FormData 并添加图片数据
    const formData = new FormData();
    formData.append('image', imageDataBlob, 'captcha.png');

    // 发送图片到服务器
    const ocrResult = await sendImageToServer(formData, tab);

    // 确保内容脚本已注入到当前标签页
    await injectContentScript(tab.id);

    // 将 OCR 结果发送到内容脚本进行自动填充
    chrome.tabs.sendMessage(tab.id, { action: "autoFillCaptcha", text: ocrResult.text }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to content script:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        console.log('OCR 成功：验证码已自动填充');
      } else {
        console.error('OCR 错误：无法自动填充验证码');
      }
    });

  } catch (error) {
    console.error('Error fetching or sending image:', error);
  }
}

// 修改chrome.runtime.onMessage监听器以适应新的imageData参数
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captchaClicked") {
    // 使用imageData而不是srcUrl
    fetchImageAndSendToServer(message.imageData, sender.tab);
  }
});

// 发送图片到服务器
async function sendImageToServer(formData, tab) {
  try {
    const response = await fetch('http://111.229.121.188:1999/ocr', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// 动态注入内容脚本
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  } catch (error) {
    console.error('Error injecting content script:', error);
  }
}
