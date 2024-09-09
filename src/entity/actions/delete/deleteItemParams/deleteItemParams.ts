import type { DeleteCommandInput } from '@aws-sdk/lib-dynamodb'

import { EntityParser } from '~/entity/actions/parse/index.js'
import type { KeyInput } from '~/entity/actions/parse/index.js'
import type { Entity } from '~/entity/index.js'

import type { DeleteItemOptions } from '../options.js'
import { parseDeleteItemOptions } from './parseDeleteItemOptions.js'

type DeleteItemParamsGetter = <ENTITY extends Entity, OPTIONS extends DeleteItemOptions<ENTITY>>(
  entity: ENTITY,
  input: KeyInput<ENTITY>,
  deleteItemOptions?: OPTIONS
) => DeleteCommandInput

export const deleteItemParams: DeleteItemParamsGetter = <
  ENTITY extends Entity,
  OPTIONS extends DeleteItemOptions<ENTITY>
>(
  entity: ENTITY,
  input: KeyInput<ENTITY>,
  options: OPTIONS = {} as OPTIONS
) => {
  const { key } = entity.build(EntityParser).parse(input, { mode: 'key' })
  const awsOptions = parseDeleteItemOptions(entity, options)

  return {
    TableName: options.tableName ?? entity.table.getName(),
    Key: key,
    ...awsOptions
  }
}
