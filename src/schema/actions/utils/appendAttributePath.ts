import { AnyAttribute } from '~/attributes/any/index.js'
import type { Attribute } from '~/attributes/index.js'
import { PrimitiveAttribute } from '~/attributes/primitive/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'
import { Parser } from '~/schema/actions/parse/index.js'
import type { Schema } from '~/schema/index.js'

export type AppendAttributePathOptions = { size?: boolean }

export interface ExpressionParser {
  schema: Schema | Attribute
  expressionAttributePrefix: string
  expressionAttributeNames: string[]
  clone: (schema?: Schema | Attribute) => ExpressionParser
  expression: string
  resetExpression: (str?: string) => void
  appendToExpression: (str: string) => void
  appendAttributePath: (path: string, options?: AppendAttributePathOptions) => Attribute
}

const defaultAnyAttribute = new AnyAttribute({
  type: 'any',
  required: 'never',
  hidden: false,
  key: false,
  savedAs: undefined,
  defaults: {
    key: undefined,
    put: undefined,
    update: undefined
  },
  links: {
    key: undefined,
    put: undefined,
    update: undefined
  },
  validators: {
    key: undefined,
    put: undefined,
    update: undefined
  },
  castAs: undefined
})

const defaultNumberAttribute = new PrimitiveAttribute({
  type: 'number',
  required: 'never',
  hidden: false,
  key: false,
  savedAs: undefined,
  enum: undefined,
  transform: undefined,
  defaults: {
    key: undefined,
    put: undefined,
    update: undefined
  },
  links: {
    key: undefined,
    put: undefined,
    update: undefined
  },
  validators: {
    key: undefined,
    put: undefined,
    update: undefined
  }
})

const getInvalidExpressionAttributePathError = (attributePath: string): DynamoDBToolboxError =>
  new DynamoDBToolboxError('actions.invalidExpressionAttributePath', {
    message: `Unable to match expression attribute path with schema: ${attributePath}`,
    payload: { attributePath }
  })

const isListAccessor = (accessor: string): accessor is `[${number}]` => /\[\d+\]/g.test(accessor)

export const appendAttributePath = (
  parser: ExpressionParser,
  attributePath: string,
  options: AppendAttributePathOptions = {}
): Attribute => {
  const { size = false } = options

  const expressionAttributePrefix = parser.expressionAttributePrefix
  let parentAttribute: Schema | Attribute = parser.schema
  let expressionPath = ''
  let attributeMatches = [...attributePath.matchAll(/\[(\d+)\]|[\w#-]+(?=(\.|$|\[))/g)]

  while (attributeMatches.length > 0) {
    const attributeMatch = attributeMatches.shift() as RegExpMatchArray
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const childAttributeAccessor = attributeMatch[0]!

    switch (parentAttribute.type) {
      case 'any': {
        const isChildAttributeInList = isListAccessor(childAttributeAccessor)

        if (isChildAttributeInList) {
          expressionPath += childAttributeAccessor
        } else {
          const expressionAttributeNameIndex =
            parser.expressionAttributeNames.push(childAttributeAccessor)
          expressionPath += `.#${expressionAttributePrefix}${expressionAttributeNameIndex}`
        }

        parentAttribute = new AnyAttribute({
          ...defaultAnyAttribute,
          path: [parentAttribute.path, childAttributeAccessor]
            .filter(Boolean)
            .join(isChildAttributeInList ? '' : '.')
        })
        break
      }
      case 'binary':
      case 'boolean':
      case 'number':
      case 'string':
      case 'set':
        throw getInvalidExpressionAttributePathError(attributePath)

      case 'record': {
        const keyAttribute = parentAttribute.keys
        const keyParser = new Parser(keyAttribute).start(childAttributeAccessor, {
          fill: false,
          transform: true
        })
        keyParser.next() // parsed
        const transformedKey = keyParser.next().value as string

        const expressionAttributeNameIndex = parser.expressionAttributeNames.push(transformedKey)
        expressionPath += `.#${expressionAttributePrefix}${expressionAttributeNameIndex}`

        parentAttribute = parentAttribute.elements
        break
      }
      case 'schema':
      case 'map': {
        const childAttribute = parentAttribute.attributes[childAttributeAccessor]
        if (!childAttribute) {
          throw getInvalidExpressionAttributePathError(attributePath)
        }

        const expressionAttributeNameIndex = parser.expressionAttributeNames.push(
          childAttribute.savedAs ?? childAttributeAccessor
        )
        expressionPath +=
          parentAttribute.type === 'schema'
            ? `#${expressionAttributePrefix}${expressionAttributeNameIndex}`
            : `.#${expressionAttributePrefix}${expressionAttributeNameIndex}`

        parentAttribute = childAttribute
        break
      }
      case 'list': {
        if (!isListAccessor(childAttributeAccessor)) {
          throw getInvalidExpressionAttributePathError(attributePath)
        }

        expressionPath += childAttributeAccessor

        parentAttribute = parentAttribute.elements
        break
      }
      case 'anyOf': {
        let validElementExpressionParser: ExpressionParser | undefined = undefined
        const subPath = attributePath.slice(attributeMatch.index)

        for (const element of parentAttribute.elements) {
          try {
            parentAttribute = element
            const elementExpressionParser = parser.clone(element)
            elementExpressionParser.resetExpression()
            parentAttribute = elementExpressionParser.appendAttributePath(subPath, options)
            validElementExpressionParser = elementExpressionParser
            /* eslint-disable no-empty */
          } catch {}
        }

        if (validElementExpressionParser === undefined) {
          throw getInvalidExpressionAttributePathError(attributePath)
        }

        parser.expressionAttributeNames = validElementExpressionParser.expressionAttributeNames
        expressionPath += validElementExpressionParser.expression
        // No need to go over the rest of the path
        attributeMatches = []

        break
      }
    }
  }

  if (parentAttribute.type === 'schema') {
    throw getInvalidExpressionAttributePathError(attributePath)
  }

  parser.appendToExpression(size ? `size(${expressionPath})` : expressionPath)

  return size
    ? new PrimitiveAttribute({
        ...defaultNumberAttribute,
        path: parentAttribute.path
      })
    : parentAttribute
}
