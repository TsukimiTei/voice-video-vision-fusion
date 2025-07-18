/**
 * 图像处理工具函数
 */

// 将 canvas 转换为 blob
export const canvasToBlob = (canvas: HTMLCanvasElement, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to blob conversion failed'));
          }
        },
        'image/jpeg',
        quality
      );
    } catch (error) {
      reject(error);
    }
  });
};

// 将 blob 转换为 base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        resolve(result);
      } else {
        reject(new Error('FileReader returned empty result'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('FileReader error'));
    };
    
    try {
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
};

// 从视频元素捕获图像
export const captureFromVideo = async (video: HTMLVideoElement): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Cannot get canvas context');
  }
  
  // 设置合适的尺寸（限制最大尺寸以减少数据量）
  const maxSize = 800;
  const { videoWidth, videoHeight } = video;
  
  let { width, height } = { width: videoWidth, height: videoHeight };
  
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height * maxSize) / width;
      width = maxSize;
    } else {
      width = (width * maxSize) / height;
      height = maxSize;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // 绘制视频帧
  ctx.drawImage(video, 0, 0, width, height);
  
  // 转换为 blob 然后 base64
  const blob = await canvasToBlob(canvas, 0.7); // 降低质量以减少大小
  const base64 = await blobToBase64(blob);
  
  return base64;
};

// 清理和验证 base64 数据
export const cleanBase64 = (dataUrl: string): string => {
  try {
    // 移除 data URL 前缀
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Invalid data URL format');
    }
    
    let base64 = dataUrl.substring(commaIndex + 1);
    
    // 移除所有空白字符和换行符
    base64 = base64.replace(/[\s\r\n]/g, '');
    
    // 确保正确的填充
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    
    // 测试解码以验证格式
    atob(base64);
    
    return base64;
  } catch (error) {
    console.error('Base64 cleaning error:', error);
    throw new Error('Invalid base64 data format');
  }
};