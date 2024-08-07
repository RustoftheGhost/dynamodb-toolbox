import type { AnyAttribute, ExtendedValue } from '~/attributes/index.js'
import type { Schema } from '~/schema/index.js'
import { cloneDeep } from '~/utils/cloneDeep.js'

import type { ParsedValue } from './parser.js'
import type {
  FromParsingOptions,
  ParsedValueDefaultOptions,
  ParsedValueOptions,
  ParsingOptions
} from './types/options.js'
import { runCustomValidation } from './utils.js'

export type AnyAttrParsedValue<
  ATTRIBUTE extends AnyAttribute,
  OPTIONS extends ParsedValueOptions = ParsedValueDefaultOptions
> = AnyAttribute extends ATTRIBUTE
  ? unknown
  : ATTRIBUTE['castAs'] | ExtendedValue<NonNullable<OPTIONS['extension']>, 'any'>

export function* anyAttrParser<
  ATTRIBUTE extends AnyAttribute,
  OPTIONS extends ParsingOptions = ParsingOptions
>(
  attribute: ATTRIBUTE,
  inputValue: unknown,
  options: OPTIONS = {} as OPTIONS
): Generator<
  AnyAttrParsedValue<ATTRIBUTE, FromParsingOptions<OPTIONS>>,
  AnyAttrParsedValue<ATTRIBUTE, FromParsingOptions<OPTIONS>>,
  ParsedValue<Schema, FromParsingOptions<OPTIONS, true>> | undefined
> {
  const { fill = true, transform = true } = options

  let linkedValue = undefined
  if (fill) {
    const defaultedValue = cloneDeep(inputValue)
    yield defaultedValue

    linkedValue = defaultedValue
    yield linkedValue
  }

  const parsedValue = linkedValue ?? cloneDeep(inputValue)
  runCustomValidation(attribute, parsedValue, options)

  if (transform) {
    yield parsedValue
  } else {
    return parsedValue
  }

  const transformedValue = parsedValue
  return transformedValue
}
