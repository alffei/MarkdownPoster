/**
 * 模块说明：图床上传服务封装，负责与 imgbb API 的上传交互。
 */

const IMGBB_API_KEY = '6a2f2d51501ecdbf0733c2e13c3b7445';
const API_URL = 'https://api.imgbb.com/1/upload';

export const uploadToImgbb = async (base64Data: string): Promise<string> => {
  // 去掉 data URL 头，只提交纯 base64 内容
  const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
  
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Content);
  // 上传链接设置 10 分钟过期，减少临时图片长期暴露
  formData.append('expiration', '600'); 

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('ImgBB Upload Error:', error);
    throw error;
  }
};
