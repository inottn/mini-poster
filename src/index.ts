import { isNonEmptyArray, withResolvers } from '@inottn/fp-utils';
import { binarySearch, calculateLeftOffset } from './utils';
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

type Number = number | Number[];

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

  private toPx<T extends Number>(value: T): T {
    const { pixelRatio = 1 } = this.options;

    return <T>(
      (typeof value === 'number'
        ? value * pixelRatio
        : value.map(this.toPx.bind(this)))
    );
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
    const { src, backgroundColor, borderRadius, objectFit = 'fill' } = data;
    const [img, loadPromise] = this.images.get(src);
    let [left, top, width, height] = this.toPx([
      data.left,
      data.top,
      data.width,
      data.height,
    ]);
    await loadPromise;

    context.save();

    if (borderRadius) {
      this.drawRoundRect(left, top, width, height, this.toPx(borderRadius));
      context.clip();
    }

    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(left, top, width, height);
    }

    const imageAspect = img.width / img.height;
    const areaAspect = width / height;

    if (objectFit === 'fill' || imageAspect === areaAspect) {
      // Do nothing
    } else if (objectFit === 'contain' || objectFit === 'cover') {
      if (
        objectFit === 'contain'
          ? imageAspect > areaAspect
          : imageAspect < areaAspect
      ) {
        const ratio = img.width / width;
        const areaHeight = height;
        height = img.height / ratio;
        top += (areaHeight - height) * 0.5;
      } else {
        const ratio = img.height / height;
        const areaWidth = width;
        width = img.width / ratio;
        left += (areaWidth - width) * 0.5;
      }
    }

    context.drawImage(img, left, top, width, height);
    context.restore();
  }

  async renderText(data: TextConfig) {
    const { context } = this;
    const [left, top, width, fontSize] = this.toPx([
      data.left,
      data.top,
      data.width,
      data.fontSize || 16,
    ]);
    const lineHeight = data.lineHeight
      ? this.toPx(data.lineHeight)
      : fontSize * 1.43;
    const {
      color = '#333',
      fontFamily,
      fontWeight = 400,
      fontSrc,
      textAlign = 'left',
      textDecoration,
    } = data;
    const leftOffset = calculateLeftOffset({ left, textAlign, width });

    if (fontSrc) {
      await this.fonts.get(fontSrc);
    }

    context.save();
    context.textAlign = textAlign;
    context.textBaseline = 'top';
    context.fillStyle = color;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const lines = data.width ? this.getAllLines(data) : [data.content];

    lines.forEach((text, index) => {
      const topOffset = top + (lineHeight - fontSize) / 2 + lineHeight * index;
      context.fillText(text, leftOffset, topOffset);
      if (textDecoration === 'line-through') {
        const { width: textWidth } = context.measureText(text);
        const textLeft = calculateLeftOffset({
          left,
          textAlign,
          textWidth,
          width,
        });

        context.fillRect(
          textLeft,
          topOffset + fontSize * 0.46,
          textWidth,
          fontSize / 14,
        );
      }
    });
    context.restore();
  }

  getAllLines(data: TextConfig) {
    const { context } = this;
    const width = this.toPx(data.width);
    const { content, lineClamp = Infinity } = data;
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
