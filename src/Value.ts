import type { RawValue } from './RawValue';
import type { Primitive } from '@umatch/utils';
import type { DateTime } from 'luxon';

export type Value = Primitive | Date | DateTime | RawValue;
