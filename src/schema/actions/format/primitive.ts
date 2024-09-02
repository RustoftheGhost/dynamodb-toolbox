import type {
  PrimitiveAttribute,
  ResolvePrimitiveAttribute,
  ResolvedPrimitiveAttribute,
  Transformer
} from '~/attributes/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'
import type { If } from '~/types/index.js'
import { validatorsByPrimitiveType } from '~/utils/validation/validatorsByPrimitiveType.js'

import type { MustBeDefined } from './attribute.js'

export type PrimitiveAttrFormattedValue<ATTRIBUTE extends PrimitiveAttribute> =
  PrimitiveAttribute extends ATTRIBUTE
    ? ResolvedPrimitiveAttribute
    : If<MustBeDefined<ATTRIBUTE>, never, undefined> | ResolvePrimitiveAttribute<ATTRIBUTE>

type PrimitiveAttrRawValueFormatter = <ATTRIBUTE extends PrimitiveAttribute>(
  attribute: ATTRIBUTE,
  rawValue: unknown
) => PrimitiveAttrFormattedValue<ATTRIBUTE>

export const formatPrimitiveAttrRawValue: PrimitiveAttrRawValueFormatter = <
  ATTRIBUTE extends PrimitiveAttribute
>(
  attribute: ATTRIBUTE,
  rawValue: unknown
) => {
  type Formatted = PrimitiveAttrFormattedValue<ATTRIBUTE>

  const validator = validatorsByPrimitiveType[attribute.type]
  if (!validator(rawValue)) {
    const { path, type } = attribute

    throw new DynamoDBToolboxError('formatter.invalidAttribute', {
      message: `Invalid attribute detected while formatting${
        path !== undefined ? `: '${path}'` : ''
      }. Should be a ${type}.`,
      path,
      payload: {
        received: rawValue,
        expected: type
      }
    })
  }

  /**
   * @debt type "validator should act as type guard"
   */
  const rawPrimitive = rawValue as ResolvedPrimitiveAttribute
  const transformer = attribute.transform as Transformer
  const formattedValue = transformer !== undefined ? transformer.format(rawPrimitive) : rawPrimitive

  if (attribute.enum !== undefined && !attribute.enum.includes(formattedValue)) {
    const { path } = attribute

    throw new DynamoDBToolboxError('formatter.invalidAttribute', {
      message: `Invalid attribute detected while formatting${
        path !== undefined ? `: '${path}'` : ''
      }. Should be one of: ${attribute.enum.map(String).join(', ')}.`,
      path,
      payload: {
        received: formattedValue,
        expected: attribute.enum
      }
    })
  }

  return formattedValue as Formatted
}
