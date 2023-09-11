import { isNonEmptyArray, withResolvers } from '@inottn/fp-utils';
import { binarySearch } from './utils';
import type {
  Canvas,
  Config,
  ExportOptions,
  ImageConfig,
  Options,
  TextConfig,
} from './types';

declare const my: any;

export class MiniPoster {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  options: Options;

  images = new Map();
  fonts = new Map();

  constructor(canvas: Canvas, options: Options) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.options = options;
  }

  async render(config: Config) {
    const { canvas, options } = this;
    const { width, height, pixelRatio = 1 } = { ...options, ...config };
    const { children } = config;

    if (!width || !height) {
      throw Error('缺少 width 或 height 参数');
    }

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    if (isNonEmptyArray(children)) {
      this.loadAssets(children);

      for (const item of children) {
        if (item.type === 'image') await this.renderImage(item);
        if (item.type === 'text') await this.renderText(item);
      }
    }
  }

  async renderImage(data: ImageConfig) {
    const { context } = this;
    const { width, height, left = 0, top, src, backgroundColor } = data;
    const [img, load] = this.images.get(src);
    await load;
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(left, top, width, height);
    }
    context.drawImage(img, left, top, width, height);
  }

  async renderText(data: TextConfig) {
    const { context } = this;
    const {
      left,
      top,
      color = '#333',
      fontFamily,
      fontSize = 16,
      lineHeight = fontSize * 1.43,
      fontSrc,
      textDecoration,
    } = data;

    if (fontSrc) {
      const load = this.fonts.get(fontSrc);
      await load;
    }

    context.textBaseline = 'top';
    context.fillStyle = color;
    context.font = `${fontSize}px ${fontFamily}`;

    const lines = this.getAllLines(data);

    lines.forEach((text, index) => {
      const topOffset = top + (lineHeight - fontSize) / 2 + lineHeight * index;
      context.fillText(text, left, topOffset);
      if (textDecoration === 'line-through') {
        const { width } = context.measureText(text);
        context.fillRect(
          left,
          topOffset + fontSize * 0.46,
          width,
          fontSize / 14,
        );
      }
    });
  }

  getAllLines(data: TextConfig) {
    const { context } = this;
    const { content, width, lineClamp = Infinity } = data;
    const lines = [];
    let index = 0;

    while (index < content.length && lines.length < lineClamp) {
      const prevIndex = index;
      index =
        binarySearch(
          content,
          (end) =>
            context.measureText(content.slice(index, end + 1)).width > width,
        ) + 1;
      if (index === prevIndex) {
        index = prevIndex + 1;
      }
      if (lineClamp === lines.length + 1) {
        lines.push(content.slice(prevIndex, index - 1) + '...');
      } else {
        lines.push(content.slice(prevIndex, index));
      }
    }

    return lines;
  }

  loadAssets(data: NonNullable<Config['children']>) {
    data.forEach((item) => {
      const { type } = item;

      if (type === 'image') {
        this.loadImage(item);
      }

      if (type === 'text' && item.fontFamily) {
        this.loadFont(item);
      }
    });
  }

  loadImage(data: ImageConfig) {
    const { src } = data;

    if (!this.images.has(src)) {
      const img = this.canvas.createImage();
      img.src = src;
      this.images.set(src, [
        img,
        new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        }),
      ]);
    }
  }

  loadFont(data: TextConfig) {
    const { fontFamily, fontSrc } = data;

    if (!this.fonts.has(fontSrc)) {
      this.fonts.set(
        fontSrc,
        new Promise((resolve, reject) => {
          my.loadFontFace({
            family: fontFamily,
            source: `url('${fontSrc}')`,
            success: resolve,
            fail: reject,
          });
        }),
      );
    }
  }

  export(options: ExportOptions) {
    const { canvas } = this;
    const { width, height } = this.options;
    const { promise, resolve, reject } = withResolvers();

    canvas.toTempFilePath({
      x: 0,
      y: 0,
      width,
      height,
      destWidth: options.width,
      destHeight: options.height,
      success: resolve,
      fail: reject,
    });

    return promise;
  }
}
