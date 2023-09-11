import { isNonEmptyArray, withResolvers } from '@inottn/fp-utils';
import { binarySearch } from './utils';
import type {
  Canvas,
  Config,
  ExportOptions,
  ImageConfig,
  Options,
  Radius,
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
    const { canvas, context, options } = this;
    const {
      width,
      height,
      pixelRatio = 1,
      backgroundColor,
      borderRadius,
      overflow,
    } = { ...options, ...config };
    const { children } = config;

    if (!width || !height) {
      throw Error('缺少 width 或 height 参数');
    }

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    context.save();

    if (borderRadius) {
      this.drawRoundRect(0, 0, canvas.width, canvas.height, borderRadius);
      context.clip();
    }

    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (overflow !== 'hidden') {
      context.restore();
    }

    if (isNonEmptyArray(children)) {
      this.loadAssets(children);

      for (const item of children) {
        if (item.type === 'image') await this.renderImage(item);
        if (item.type === 'text') await this.renderText(item);
      }
    }

    if (overflow === 'hidden') {
      context.restore();
    }
  }

  async renderImage(data: ImageConfig) {
    const { context } = this;
    const { left, top, width, height, src, backgroundColor, borderRadius } =
      data;
    const [img, loadPromise] = this.images.get(src);
    await loadPromise;

    context.save();

    if (borderRadius) {
      this.drawRoundRect(left, top, width, height, borderRadius);
      context.clip();
    }

    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(left, top, width, height);
    }

    context.drawImage(img, left, top, width, height);
    context.restore();
  }

  async renderText(data: TextConfig) {
    const { context } = this;
    const {
      left,
      top,
      color = '#333',
      fontFamily,
      fontWeight = 400,
      fontSize = 16,
      lineHeight = fontSize * 1.43,
      fontSrc,
      textDecoration,
    } = data;

    if (fontSrc) {
      await this.fonts.get(fontSrc);
    }

    context.textBaseline = 'top';
    context.fillStyle = color;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

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

  drawRoundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: Radius,
  ) {
    const { context } = this;

    // convert to [top-left, top-right, bottom-right, bottom-left]
    if (typeof radius === 'number') {
      radius = [radius, radius, radius, radius];
    } else if (radius.length === 1) {
      radius = [radius[0], radius[0], radius[0], radius[0]];
    } else if (radius.length === 2) {
      radius = [radius[0], radius[1], radius[0], radius[1]];
    } else if (radius.length === 3) {
      radius = [radius[0], radius[1], radius[2], radius[1]];
    }

    context.beginPath();
    context.moveTo(x + radius[0], y);
    context.lineTo(x + width - radius[1], y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius[1]);
    context.lineTo(x + width, y + height - radius[2]);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius[2],
      y + height,
    );
    context.lineTo(x + radius[3], y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius[3]);
    context.lineTo(x, y + radius[0]);
    context.quadraticCurveTo(x, y, x + radius[0], y);
    context.closePath();
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
