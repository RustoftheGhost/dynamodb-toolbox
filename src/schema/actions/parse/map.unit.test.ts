import { map, string } from '~/attributes/index.js'
import { DynamoDBToolboxError } from '~/errors/index.js'

import * as attrParserModule from './attribute.js'
import { mapAttributeParser } from './map.js'

// @ts-ignore
const attrParser = vi.spyOn(attrParserModule, 'attrParser')

const mapAttr = map({ foo: string(), bar: string() }).freeze('path')

describe('mapAttributeParser', () => {
  beforeEach(() => {
    attrParser.mockClear()
  })

  test('throws an error if input is not a map', () => {
    const invalidCall = () => mapAttributeParser(mapAttr, ['foo', 'bar'], { fill: false }).next()

    expect(invalidCall).toThrow(DynamoDBToolboxError)
    expect(invalidCall).toThrow(expect.objectContaining({ code: 'parsing.invalidAttributeInput' }))
  })

  test('applies attrParser on input properties otherwise (and pass options)', () => {
    const options = { some: 'options' }
    const parser = mapAttributeParser(
      mapAttr,
      { foo: 'foo', bar: 'bar' },
      // @ts-expect-error we don't really care about the type here
      options
    )

    const defaultedState = parser.next()
    expect(defaultedState.done).toBe(false)
    expect(defaultedState.value).toStrictEqual({ foo: 'foo', bar: 'bar' })

    expect(attrParser).toHaveBeenCalledTimes(2)
    expect(attrParser).toHaveBeenCalledWith(mapAttr.attributes.foo, 'foo', options)
    expect(attrParser).toHaveBeenCalledWith(mapAttr.attributes.bar, 'bar', options)

    const linkedState = parser.next()
    expect(linkedState.done).toBe(false)
    expect(linkedState.value).toStrictEqual({ foo: 'foo', bar: 'bar' })

    const parsedState = parser.next()
    expect(parsedState.done).toBe(false)
    expect(parsedState.value).toStrictEqual({ foo: 'foo', bar: 'bar' })

    const transformedState = parser.next()
    expect(transformedState.done).toBe(true)
    expect(transformedState.value).toStrictEqual({ foo: 'foo', bar: 'bar' })
  })
})
