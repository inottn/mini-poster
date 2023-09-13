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

export type TextAlign = 'left' | 'center' | 'right';

export type TextDecoration = 'none' | 'line-through';

export type ObjectFit = 'fill' | 'contain' | 'cover';

export type TextConfig = PositionConfig & {
  type: 'text';
  content: string;
  color?: string;
  fontSize?: number;
  lineClamp?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontSrc?: string;
  fontWeight?: number | string;
  textAlign?: TextAlign;
  textDecoration?: TextDecoration;
};

export type ImageConfig = PositionConfig & {
  type: 'image';
  src: string;
  backgroundColor?: string;
  borderRadius?: Radius;
  objectFit?: ObjectFit;
};
