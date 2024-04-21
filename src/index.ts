import { isNonEmptyArray } from '@inottn/fp-utils';
import { loadFontFace, toTempFilePath } from './adapter';
import {
  binarySearch,
  calculateLeftOffset,
  mergePosition,
  normalizeConfig,
} from './utils';
import type {
  AugmentedRequired,
  Canvas,
  Config,
  ContainerConfig,
  ElementConfig,
  ExportOptions,
  ImageConfig,
  NormalizedConfig,
  Options,
  Radius,
  TextConfig,
} from './types';

export class MiniPoster {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  options: Options;

  images = new Map();
  fonts = new Map();
  sizes = new Map<string, { width: number; height: number }>();

  constructor(canvas: Canvas, options: Options) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.options = options;
  }

  async render(config: Config) {
    const { canvas, context, options } = this;
    const { width, height, pixelRatio = 1 } = { ...options, ...config };

    if (!width || !height) {
      throw Error('缺少 width 或 height 参数');
    }

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.scale(pixelRatio, pixelRatio);

    await this.renderContainer({
      type: 'container',
      ...config,
      left: 0,
      top: 0,
      width,
      height,
    });
  }

  async draw(data: ElementConfig | ElementConfig[]) {
    try {
      if (Array.isArray(data)) {
        for (const item of data) {
          await this.draw(item);
        }
      } else {
        if (data.type === 'container')
          await this.renderContainer(normalizeConfig(data));
        if (data.type === 'image')
          await this.renderImage(normalizeConfig(data));
        if (data.type === 'text') await this.renderText(normalizeConfig(data));
      }
    } catch (error) {
      // failed to load resources
    }
  }

  async renderContainer(data: NormalizedConfig<ContainerConfig>) {
    const { context } = this;
    const {
      left,
      top,
      width,
      height,
      backgroundColor,
      borderRadius = 0,
      overflow,
      children,
    } = data;

    context.save();
    this.drawRoundedRect(left, top, width, height, borderRadius);
    context.clip();

    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(left, top, width, height);
    }

    if (overflow !== 'hidden') {
      context.restore();
    }

    if (isNonEmptyArray(children)) {
      this.loadAssets(children);

      for (const item of children) {
        const _item = mergePosition(item, { left, top });
        await this.draw(_item);
      }
    }

    if (overflow === 'hidden') {
      context.restore();
    }
  }

  async renderImage(data: NormalizedConfig<ImageConfig>) {
    const { context } = this;
    const { src, backgroundColor, borderRadius = 0, objectFit = 'fill' } = data;
    const [img, loadPromise] = this.images.get(src);
    let { left, top, width, height } = data;
    await loadPromise;

    context.save();
    this.drawRoundedRect(left, top, width, height, borderRadius);
    context.clip();

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

  async renderText(data: NormalizedConfig<TextConfig>) {
    const { context } = this;
    const {
      id,
      content,
      left,
      top,
      width,
      fontSize = 14,
      lineHeight = fontSize * 1.43,
      color = '#333',
      fontFamily = 'sans-serif',
      fontWeight = 400,
      fontSrc,
      textAlign = 'left',
      textDecoration,
    } = data;

    if (fontSrc) {
      await this.fonts.get(fontSrc);
    }

    context.save();
    if (width) context.textAlign = textAlign;
    context.textBaseline = 'alphabetic';
    context.fillStyle = color;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const leftOffset = calculateLeftOffset({ left, textAlign, width });
    const lines = width ? this.getAllLines(data) : [content];

    lines.forEach((text, index) => {
      const topOffset = top + (lineHeight - fontSize) / 2 + lineHeight * index;
      context.fillText(text, leftOffset, topOffset + fontSize);

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
          topOffset + fontSize * 0.64,
          textWidth,
          fontSize / 14,
        );
      }
    });

    if (id) {
      this.sizes.set(id, {
        width: width ? width : context.measureText(content).width,
        height: lineHeight * lines.length,
      });
    }

    context.restore();
  }

  getAllLines(data: TextConfig) {
    const { context } = this;
    const { width, content, lineClamp = Infinity } = data;
    const lines = [];
    let index = 0;

    while (index < content.length && lines.length < lineClamp) {
      const prevIndex = index;

      index =
        binarySearch(
          content,
          (end) =>
            context.measureText(content.slice(index, end + 1)).width > width!,
        ) + 1;

      if (index === prevIndex) {
        index = prevIndex + 1;
      }

      if (lineClamp === lines.length + 1 && index < content.length) {
        lines.push(content.slice(prevIndex, index - 1) + '...');
      } else {
        lines.push(content.slice(prevIndex, index));
      }
    }

    return lines;
  }

  getSize(id: string) {
    return this.sizes.get(id);
  }

  drawRoundedRect(
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

    const [tl, tr, br, bl] = radius.map((r) =>
      Math.min(r, width / 2, height / 2),
    );

    context.save();
    context.translate(x, y);
    context.beginPath();
    context.moveTo(tl, 0);
    context.lineTo(width - tr, 0);
    context.arc(width - tr, tr, tr, (Math.PI * 3) / 2, 0, false);
    context.lineTo(width, height - br);
    context.arc(width - br, height - br, br, 0, Math.PI / 2, false);
    context.lineTo(bl, height);
    context.arc(bl, height - bl, bl, Math.PI / 2, Math.PI, false);
    context.lineTo(0, tl);
    context.arc(tl, tl, tl, Math.PI, (Math.PI * 3) / 2, false);
    context.closePath();
    context.restore();
  }

  loadAssets(data: ElementConfig[]) {
    data.forEach((item) => {
      const { type } = item;

      if (type === 'image') {
        this.loadImage(item);
      }

      if (type === 'text' && item.fontFamily && item.fontSrc) {
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
    const { fontFamily, fontSrc } = data as AugmentedRequired<
      TextConfig,
      'fontFamily' | 'fontSrc'
    >;

    if (!this.fonts.has(fontSrc)) {
      this.fonts.set(
        fontSrc,
        loadFontFace({
          fontFamily,
          fontSrc,
        }),
      );
    }
  }

  export(options: ExportOptions) {
    const { canvas } = this;

    return toTempFilePath(canvas, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      destWidth: canvas.width,
      destHeight: canvas.height,
      ...options,
    });
  }
}
