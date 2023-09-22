import { withResolvers } from '@inottn/fp-utils';
import type { Canvas, ExportOptions } from './types';

declare const wx: any; // 微信小程序
declare const my: any; // 支付宝小程序

const isWechat = typeof wx === 'object';
const isAlipay = typeof my === 'object';

/**
 * 获取跨平台的 SDK
 */
const getSDK = () => {
  let currentSdk;

  if (isWechat) {
    currentSdk = wx;
  } else if (isAlipay) {
    currentSdk = my;
  }

  return currentSdk;
};

const sdk = getSDK();

type LoadFontFaceOptions = {
  fontFamily: string;
  fontSrc: string;
};

export const loadFontFace = (options: LoadFontFaceOptions) => {
  const { fontFamily: family, fontSrc } = options;
  const { resolve, reject, promise } = withResolvers();

  if (sdk) {
    sdk.loadFontFace({
      family,
      source: `url('${fontSrc}')`,
      ...(isWechat && {
        scopes: ['native'],
      }),
      success: resolve,
      fail: reject,
    });
  } else {
    reject('platform sdk not found');
  }

  return promise;
};

export const toTempFilePath = (canvas: Canvas, options: ExportOptions) => {
  const { resolve, reject, promise } = withResolvers();
  let toTempFilePathAPI;

  if (isAlipay) {
    toTempFilePathAPI = canvas.toTempFilePath;
  } else if (isWechat) {
    toTempFilePathAPI = sdk.canvasToTempFilePath;
  } else {
    reject('platform sdk not found');
  }

  if (toTempFilePathAPI)
    toTempFilePathAPI({
      ...options,
      ...(isWechat && {
        canvas,
      }),
      success: resolve,
      fail: reject,
    });

  return promise;
};
