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
