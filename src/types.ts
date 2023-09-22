export type AugmentedRequired<
  T extends object,
  K extends keyof T = keyof T,
> = Omit<T, K> & Required<Pick<T, K>>;

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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  destWidth?: number;
  destHeight?: number;
  fileType?: 'jpg' | 'png';
  quality?: number;
};

export type Radius =
  | number
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

export type ElementConfig = ContainerConfig | ImageConfig | TextConfig;

export type Config = {
  backgroundColor?: string;
  borderRadius?: Radius;
  overflow?: 'visible' | 'hidden';
  children?: ElementConfig[];
};

export type PositionConfig = {
  left: number | (() => number);
  top: number | (() => number);
};

type NormalizedPositionConfig = {
  left: number;
  top: number;
};

type SizeConfig = {
  width: number;
  height: number;
};

export type TextAlign = 'left' | 'center' | 'right';

export type TextDecoration = 'none' | 'line-through';

export type ObjectFit = 'fill' | 'contain' | 'cover';

export type NormalizedConfig<Config> = Omit<Config, 'left' | 'top'> &
  NormalizedPositionConfig;

export type ContainerConfig = PositionConfig &
  SizeConfig & {
    type: 'container';
    backgroundColor?: string;
    borderRadius?: Radius;
    overflow?: 'visible' | 'hidden';
    children?: ElementConfig[];
  };

export type ImageConfig = PositionConfig &
  SizeConfig & {
    type: 'image';
    src: string;
    backgroundColor?: string;
    borderRadius?: Radius;
    objectFit?: ObjectFit;
  };

export type TextConfig = PositionConfig & {
  width?: number;
} & {
  type: 'text';
  id?: string;
  content: string;
  color?: string;
  fontSize?: number;
  lineClamp?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontSrc?: string;
  fontWeight?: string;
  textAlign?: TextAlign;
  textDecoration?: TextDecoration;
};
