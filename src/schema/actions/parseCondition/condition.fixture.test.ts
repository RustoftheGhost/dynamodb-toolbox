import {
  any,
  anyOf,
  binary,
  boolean,
  list,
  map,
  number,
  record,
  set,
  string
} from '~/attributes/index.js'
import { schema } from '~/schema/index.js'

export const mySchema = schema({
  parentId: string().key().savedAs('pk'),
  childId: string().key().savedAs('sk'),
  any: any(),
  const: string().const('const'),
  num: number(),
  bool: boolean(),
  bin: binary(),
  stringSet: set(string()),
  stringList: list(string()),
  mapList: list(map({ num: number() })),
  map: map({
    num: number(),
    stringList: list(string()),
    map: map({ num: number() })
  }),
  record: record(string().enum('foo', 'bar'), map({ num: number() })),
  dict: record(string(), string()),
  union: anyOf(map({ str: string() }), map({ num: number() }))
})
