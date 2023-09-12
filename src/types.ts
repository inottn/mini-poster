export interface Canvas {
  width?: number;
  height?: number;
  getContext: (type: string) => CanvasRenderingContext2D;
  createImage: any;
  toTempFilePath: any;
}

export type Options = {
  width?: number;
  height?: number;
  pixelRatio?: number;
};

export type ExportOptions = {
  width?: number;
  height?: number;
  fileType?: 'jpg' | 'png';
  quality?: number;
};

export type Radius =
  | number
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

export type Config = {
  backgroundColor?: string;
  borderRadius?: Radius;
  overflow?: 'visible' | 'hidden';
  children?: (TextConfig | ImageConfig)[];
};

type PositionConfig = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type TextConfig = PositionConfig & {
  type: 'text';
  content: string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  lineClamp?: number;
  fontSrc?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  textDecoration?: 'none' | 'line-through';
  whiteSpace?: 'normal' | 'nowrap';
};

export type ImageConfig = PositionConfig & {
  type: 'image';
  src: string;
  backgroundColor?: string;
  borderRadius?: Radius;
  objectFit?: 'fill' | 'contain' | 'cover';
};
