import type { Primitive as JSPrimitive } from '@umatch/utils';

/**
 * Used to wrap primitive values, so that they do not get transformed.
 */
export class RawValue {
  constructor(public value: JSPrimitive) {}
}
