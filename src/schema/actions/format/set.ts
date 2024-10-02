import type { SetAttribute } from '~/attributes/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'
import type { If } from '~/types/index.js'
import { isSet } from '~/utils/validation/isSet.js'

import type { AttrFormattedValue } from './attribute.js'
import { formatAttrRawValue } from './attribute.js'
import type { MustBeDefined } from './attribute.js'
import type {
  FormatOptions,
  FormattedValueDefaultOptions,
  FormattedValueOptions,
  FromFormatOptions
} from './types.js'

export type SetAttrFormattedValue<
  ATTRIBUTE extends SetAttribute,
  OPTIONS extends FormattedValueOptions<ATTRIBUTE> = FormattedValueDefaultOptions
> = SetAttribute extends ATTRIBUTE
  ? Set<AttrFormattedValue<SetAttribute['elements']>>
  :
      | If<MustBeDefined<ATTRIBUTE>, never, undefined>
      | Set<AttrFormattedValue<ATTRIBUTE['elements'], { partial: OPTIONS['partial'] }>>

type SetAttrRawValueFormatter = <
  ATTRIBUTE extends SetAttribute,
  OPTIONS extends FormatOptions<ATTRIBUTE>
>(
  attribute: ATTRIBUTE,
  rawValue: unknown,
  options?: OPTIONS
) => SetAttrFormattedValue<ATTRIBUTE, FromFormatOptions<ATTRIBUTE, OPTIONS>>

export const formatSavedSetAttribute: SetAttrRawValueFormatter = <
  ATTRIBUTE extends SetAttribute,
  OPTIONS extends FormatOptions<ATTRIBUTE>
>(
  attribute: ATTRIBUTE,
  rawValue: unknown,
  options: OPTIONS = {} as OPTIONS
) => {
  type Formatted = SetAttrFormattedValue<ATTRIBUTE, FromFormatOptions<ATTRIBUTE, OPTIONS>>

  if (!isSet(rawValue)) {
    const { path, type } = attribute

    throw new DynamoDBToolboxError('formatter.invalidAttribute', {
      message: `Invalid attribute detected while formatting${
        path !== undefined ? `: '${path}'` : ''
      }. Should be a ${type}.`,
      path: path,
      payload: { received: rawValue, expected: type }
    })
  }

  const parsedPutItemInput: SetAttrFormattedValue<SetAttribute> = new Set()

  for (const savedElement of rawValue) {
    const parsedElement = formatAttrRawValue(attribute.elements, savedElement, {
      ...options,
      attributes: undefined
    })

    if (parsedElement !== undefined) {
      parsedPutItemInput.add(parsedElement)
    }
  }

  return parsedPutItemInput as Formatted
}
