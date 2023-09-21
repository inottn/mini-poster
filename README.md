<p align="center">使用 canvas 轻松绘制小程序海报</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40inottn%2Fminiposter" />
  <img src="https://img.shields.io/bundlejs/size/%40inottn%2Fminiposter" />
  <img src="https://img.shields.io/badge/tree_shaking-supported-4c1" />
  <img src="https://img.shields.io/npm/l/%40inottn%2Fminiposter" />
</p>

## 特性

- 使用 TypeScript 编写，提供完整的类型定义
- 使用 新版 canvas 2d 接口，性能更佳

## 安装

使用 `pnpm` 安装:

```bash
pnpm add @inottn/miniposter
```

使用 `yarn` 或 `npm` 安装:

```bash
# 使用 yarn
yarn add @inottn/miniposter

# 使用 npm
npm i @inottn/miniposter
```

## 快速上手

```js
const miniposter = new MiniPoster(canvas, {
  width: 375,
  height: 600,
  pixelRatio: 2,
});

const renderConfig = {
  backgroundColor: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  children: [
    {
      type: 'image',
      top: 12,
      left: 12,
      width: 32,
      height: 32,
      src: 'xxxxx',
      borderRadius: 16,
      objectFit: 'cover',
    },
    {
      type: 'text',
      top: 18,
      left: 53,
      content: 'hello',
    },
  ],
}; // 渲染配置，参考下方文档

miniposter.render(renderConfig).then(() => {
  const exportConfig = { ... }; // 导出配置，参考下方文档

  miniposter.export(exportConfig).then(({ tempFilePath }) => {
    // tempFilePath 对应图片文件路径
  });
});
```

## 实例化 MiniPoster

使用 canvas 和 config 实例化一个 miniposter 对象

```js
const miniposter = new MiniPoster(canvas, config);
```

### canvas

画布实例

### config

| 字段名     | 类型   | 默认值 | 说明             |
| ---------- | ------ | ------ | ---------------- |
| width      | number | -      | （必填）画布宽度 |
| height     | number | -      | （必填）画布高度 |
| pixelRatio | number | 1      | 像素缩放比       |

## miniposter.render(config)

### config

| 字段名          | 类型     | 默认值 | 说明     |
| --------------- | -------- | ------ | -------- |
| backgroundColor | number   | -      | 背景颜色 |
| borderRadius    | number   | 0      | 边框圆角 |
| children        | object[] | -      | 子元素   |

可绘制的元素类型如下：

### container

```js
const container = {
  type: 'container',
  // 其余属性，如下
};
```

| 字段名          | 类型                   | 默认值    | 说明                                    |
| --------------- | ---------------------- | --------- | --------------------------------------- |
| left            | number \| () => number | -         | （必填）相对父元素x轴的偏移             |
| top             | number \| () => number | -         | （必填）相对父元素y轴的偏移             |
| width           | number                 | -         | （必填）容器宽度                        |
| height          | number                 | -         | （必填）容器高度                        |
| backgroundColor | string                 | -         | 背景颜色                                |
| borderRadius    | number                 | 0         | 边框圆角                                |
| overflow        | 'visible' \| 'hidden'  | 'visible' | 子元素溢出时的行为，可参考对应 CSS 属性 |
| children        | object[]               | -         | 子元素                                  |

### image

```js
const image = {
  type: 'image',
  // 其余属性，如下
};
```

| 字段名          | 类型                           | 默认值 | 说明                                |
| --------------- | ------------------------------ | ------ | ----------------------------------- |
| left            | number \| () => number         | -      | （必填）相对父元素x轴的偏移         |
| top             | number \| () => number         | -      | （必填）相对父元素y轴的偏移         |
| width           | number                         | -      | （必填）图像宽度                    |
| height          | number                         | -      | （必填）图像高度                    |
| backgroundColor | string                         | -      | 背景颜色                            |
| borderRadius    | number                         | 0      | 边框圆角                            |
| objectFit       | 'fill' \| 'contain' \| 'cover' | 'fill' | 图片的展示模式，可参考对应 CSS 属性 |

### text

```js
const text = {
  type: 'text',
  // 其余属性，如下
};
```

| 字段名         | 类型                          | 默认值             | 说明                                                 |
| -------------- | ----------------------------- | ------------------ | ---------------------------------------------------- |
| id             | string                        | -                  | 可以通过 getSize 方法获取对应的宽高信息              |
| left           | number \| () => number        | -                  | （必填）相对父元素x轴的偏移                          |
| top            | number \| () => number        | -                  | （必填）相对父元素y轴的偏移                          |
| width          | number                        | -                  | 文本宽度                                             |
| content        | string                        | -                  | 文本内容                                             |
| fontSize       | number                        | 14                 | 字体大小                                             |
| fontWeight     | string                        | 'normal'           | 字体的粗细程度，一些字体只提供 normal 和 bold 两种值 |
| fontFamily     | string                        | 'sans-serif'       | 字体名称                                             |
| fontSrc        | string                        | -                  | 字体资源地址                                         |
| lineClamp      | number                        | -                  | 文本最大行数，超过即显示省略号，需设置文本宽度       |
| lineHeight     | number                        | 字体大小的 1.43 倍 | 文本行高                                             |
| textAlign      | 'left' \| 'center' \| 'right' | 'left'             | 文本的水平对齐方式，需设置文本宽度                   |
| textDecoration | 'none' \| 'line-through'      | 'none'             | 文本上的装饰性线条的外观，可参考对应 CSS 属性        |

## miniposter.getSize(id)

获取指定元素的宽高信息
