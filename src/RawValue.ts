import { JSPrimitive } from "./index";

/**
 * Used to wrap primitive values, so that they do not get transformed.
 */
export default class RawValue {
  constructor(public value: JSPrimitive) {}
}
