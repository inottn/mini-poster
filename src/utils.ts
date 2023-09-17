import { isUndefined } from '@inottn/fp-utils';
import { PositionConfig, TextAlign } from './types';

type BinarySearchValidate = (index: number) => boolean;

export const binarySearch = function (
  value: string,
  validate: BinarySearchValidate,
) {
  let left = 0;
  let right = value.length;

  while (left < right) {
    const mid = left + ((right - left) >> 1);

    if (validate(mid)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return right - 1;
};

export const calculateLeftOffset = function ({
  left,
  textAlign,
  textWidth,
  width,
}: {
  left: number;
  textAlign: TextAlign;
  textWidth?: number;
  width?: number;
}) {
  if (isUndefined(width)) return left;

  const offset = width - (textWidth || 0);

  switch (textAlign) {
    case 'center':
      return left + offset / 2;
    case 'right':
      return left + offset;
    default:
      return left;
  }
};

export const mergePosition = function <T extends PositionConfig>(
  value1: T,
  value2?: PositionConfig,
): T {
  if (isUndefined(value2)) return value1;

  return {
    ...value1,
    left: value1.left + value2.left,
    top: value1.top + value2.top,
  };
};
