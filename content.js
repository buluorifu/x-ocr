// content.js
// 当文档加载完成后尝试自动检测并发送验证码图片
window.onload = function () {
  // 初始检测验证码图片
  const captchaImage = document.querySelector('img[src*="aptcha"], img[id*="captcha"], img[class*="captcha"], img[id="checkCodeImg"]');
  if (captchaImage) {
    handleCaptchaClick(captchaImage);
  }

  // 监听 DOM 变化，动态检测新加载的图片
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName && node.tagName.toLowerCase() === 'img') {
          const imgElement = node;
          if (imgElement.complete && imgElement.naturalWidth !== 0) {
            handleCaptchaClick(imgElement);
          } else {
            imgElement.onload = () => {
              handleCaptchaClick(imgElement);
            };
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
};


function handleCaptchaClick(imgElement) {
  const maxRetries = 5; // 最大重试次数
  const retryInterval = 200; // 每次重试的间隔时间（毫秒）

  let retryCount = 0;

  const checkImageLoaded = () => {
    if (imgElement.complete && imgElement.naturalWidth !== 0) {
      processImage(imgElement);
    } else if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(checkImageLoaded, retryInterval);
    } else {
      console.error("图片加载超时");
    }
  };

  checkImageLoaded();
}

// 处理图片数据
function processImage(imgElement) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  context.drawImage(imgElement, 0, 0);
  const dataURL = canvas.toDataURL("image/png");
  chrome.runtime.sendMessage({ action: "captchaClicked", imageData: dataURL });
}

// 监听 DOM 变化，动态检测新加载的图片
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName && node.tagName.toLowerCase() === 'img') {
        const imgElement = node;
        handleCaptchaClick(imgElement);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

// 监听 src 属性变化
const captchaImage = document.querySelector('img[id="checkCodeImg"]');
if (captchaImage) {
  const srcObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "src") {
        handleCaptchaClick(captchaImage);
      }
    });
  });

  srcObserver.observe(captchaImage, { attributes: true });
  handleCaptchaClick(captchaImage);
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
        id.includes('code') || name.includes('code') || placeholder.includes('code') || className.includes('code')||placeholder.includes('验证码')) {
      return input;
    }
  }

  // 如果没有找到合适的输入框，返回 null
  return null;
}
