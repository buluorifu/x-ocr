// content.js
// 当文档加载完成后尝试自动检测并发送验证码图片
window.onload = function() {
  const captchaImage = document.querySelector('img[src*="captcha"], img[id*="captcha"], img[class*="captcha"]'); // 根据实际情况调整选择器
  if (captchaImage) {
    handleCaptchaClick(captchaImage);
  }
};

function handleCaptchaClick(imgElement) {
  // 创建canvas元素用于绘制图片
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // 设置canvas尺寸与图片相同
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;

  // 在canvas上绘制图片
  context.drawImage(imgElement, 0, 0);

  // 获取图片数据URL
  const dataURL = canvas.toDataURL("image/png");

  // 测试的dataURL到控制台
  // console.log('Generated Data URL:', dataURL);

  // 发送消息到background脚本，包含dataURL而不是srcUrl
  chrome.runtime.sendMessage({action: "captchaClicked", imageData: dataURL});
}

// 监听图片点击事件
document.addEventListener('click', function(event) {
  if (event.target.tagName.toLowerCase() === 'img') {
    const imgElement = event.target;
    // 如果图片还没有加载完成，则等待其加载完成后再处理
    if (imgElement.complete && imgElement.naturalWidth !== 0) {
      handleCaptchaClick(imgElement);
    } else {
      imgElement.onload = () => {
        handleCaptchaClick(imgElement);
      };
    }
  }
});
// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "autoFillCaptcha") {
    try {
      // 查找验证码输入框（保持原有逻辑）
      const captchaInput = findCaptchaInput();

      if (captchaInput) {
        // 自动填充 OCR 识别结果
        captchaInput.value = message.text;
        captchaInput.dispatchEvent(new Event('input', { bubbles: true }));
        sendResponse({ success: true });
      } else {
        console.error('无法找到验证码输入框');
        sendResponse({ success: false });
      }

      return true; // 返回 true 表示异步处理
    } catch (error) {
      console.error('Error auto-filling captcha:', error);
      sendResponse({ success: false });
    }
  }
});

// 原有的验证码输入框查找函数和其他逻辑保持不变

// 查找验证码输入框
function findCaptchaInput() {
  // 尝试通过常见的属性和类名查找验证码输入框
  const potentialInputs = document.querySelectorAll('input[type="text"], input[type="number"]');

  for (const input of potentialInputs) {
    const id = input.id?.toLowerCase() || '';
    const name = input.name?.toLowerCase() || '';
    const placeholder = input.placeholder?.toLowerCase() || '';
    const className = input.className?.toLowerCase() || '';

    // 检查是否包含常见的验证码关键词
    if (id.includes('captcha') || name.includes('captcha') || placeholder.includes('captcha') || className.includes('captcha') ||
        id.includes('verify') || name.includes('verify') || placeholder.includes('verify') || className.includes('verify') ||
        id.includes('code') || name.includes('code') || placeholder.includes('code') || className.includes('code')) {
      return input;
    }
  }

  // 如果没有找到合适的输入框，返回 null
  return null;
}