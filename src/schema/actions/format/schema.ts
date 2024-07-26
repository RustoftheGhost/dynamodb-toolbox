import type { AnyAttribute, Never } from '~/attributes/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'
import type { Paths } from '~/schema/actions/parsePaths/index.js'
import type { Schema } from '~/schema/index.js'
import type { OptionalizeUndefinableProperties } from '~/types/index.js'
import type { SelectKeys } from '~/types/selectKeys.js'
import { isObject } from '~/utils/validation/isObject.js'

import { formatAttrRawValue } from './attribute.js'
import type { AttrFormattedValue } from './attribute.js'
import type {
  FormatOptions,
  FormattedValueDefaultOptions,
  FormattedValueOptions,
  FromFormatOptions,
  MatchKeys
} from './types.js'
import { matchProjection } from './utils.js'

export type SchemaFormattedValue<
  SCHEMA extends Schema,
  OPTIONS extends FormattedValueOptions<SCHEMA> = FormattedValueDefaultOptions,
  MATCHING_KEYS extends string = MatchKeys<
    Extract<keyof SCHEMA['attributes'], string>,
    '',
    OPTIONS['attributes']
  >
> = Schema extends SCHEMA
  ? { [KEY: string]: unknown }
  : // Possible in case of anyOf subSchema
    [MATCHING_KEYS] extends [never]
    ? never
    : OPTIONS extends { partial: true }
      ? {
          // Keep only non-hidden attributes
          [KEY in SelectKeys<
            // Pick only filtered keys
            Pick<SCHEMA['attributes'], MATCHING_KEYS>,
            { hidden: false }
          >]?: AttrFormattedValue<
            SCHEMA['attributes'][KEY],
            {
              partial: OPTIONS['partial']
              attributes: OPTIONS extends { attributes: string }
                ? KEY extends OPTIONS['attributes']
                  ? undefined
                  : OPTIONS['attributes'] extends `${KEY}${infer CHILDREN_FILTERED_ATTRIBUTES}`
                    ? Extract<CHILDREN_FILTERED_ATTRIBUTES, Paths<SCHEMA['attributes'][KEY]>>
                    : never
                : undefined
            }
          >
        }
      : OptionalizeUndefinableProperties<
          {
            // Keep only non-hidden attributes
            [KEY in SelectKeys<
              // Pick only filtered keys
              Pick<SCHEMA['attributes'], MATCHING_KEYS>,
              { hidden: false }
            >]: AttrFormattedValue<
              SCHEMA['attributes'][KEY],
              {
                partial: OPTIONS['partial']
                attributes: OPTIONS extends { attributes: string }
                  ? KEY extends OPTIONS['attributes']
                    ? undefined
                    : OPTIONS['attributes'] extends `${KEY}${infer CHILDREN_FILTERED_ATTRIBUTES}`
                      ? Extract<CHILDREN_FILTERED_ATTRIBUTES, Paths<SCHEMA['attributes'][KEY]>>
                      : never
                  : undefined
              }
            >
          },
          // Sadly we override optional AnyAttributes as 'unknown | undefined' => 'unknown' (undefined lost in the process)
          SelectKeys<SCHEMA['attributes'], AnyAttribute & { required: Never }>
        >

type SchemaRawValueFormatter = <SCHEMA extends Schema, OPTIONS extends FormatOptions<SCHEMA>>(
  schema: SCHEMA,
  rawValue: unknown,
  options?: OPTIONS
) => SchemaFormattedValue<SCHEMA, FromFormatOptions<SCHEMA, OPTIONS>>

export const formatSchemaRawValue: SchemaRawValueFormatter = <
  SCHEMA extends Schema,
  OPTIONS extends FormatOptions<SCHEMA>
>(
  schema: SCHEMA,
  rawValue: unknown,
  { attributes, partial = false }: OPTIONS = {} as OPTIONS
) => {
  type Formatted = SchemaFormattedValue<SCHEMA, FromFormatOptions<SCHEMA, OPTIONS>>

  if (!isObject(rawValue)) {
    throw new DynamoDBToolboxError('formatter.invalidItem', {
      message: 'Invalid item detected while formatting. Should be an object.',
      payload: {
        received: rawValue,
        expected: 'Object'
      }
    })
  }

  const formattedValue: Record<string, unknown> = {}

  Object.entries(schema.attributes).forEach(([attributeName, attribute]) => {
    if (attribute.hidden) {
      return
    }

    const { isProjected, childrenAttributes } = matchProjection(
      new RegExp('^' + attributeName),
      attributes
    )

    if (!isProjected) {
      return
    }

    const attributeSavedAs = attribute.savedAs ?? attributeName

    const formattedAttribute = formatAttrRawValue(attribute, rawValue[attributeSavedAs], {
      attributes: childrenAttributes,
      partial
    })

    if (formattedAttribute !== undefined) {
      formattedValue[attributeName] = formattedAttribute
    }
  })

  return formattedValue as Formatted
}
