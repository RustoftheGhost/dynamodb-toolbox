import type { Condition } from '~/entity/actions/parseCondition/index.js'
import { EntityConditionParser } from '~/entity/actions/parseCondition/index.js'
import type { Entity } from '~/entity/index.js'
import { rejectExtraOptions } from '~/options/rejectExtraOptions.js'
import type { ReturnValuesOnConditionCheckFailureOption } from '~/options/returnValuesOnConditionCheckFailure.js'
import { parseReturnValuesOnConditionCheckFailureOption } from '~/options/returnValuesOnConditionCheckFailure.js'
import { parseTableNameOption } from '~/options/tableName.js'

import type { TransactWriteItem } from '../transactWrite/transaction.js'

export interface UpdateTransactionOptions<ENTITY extends Entity = Entity> {
  condition?: Condition<ENTITY>
  returnValuesOnConditionCheckFailure?: ReturnValuesOnConditionCheckFailureOption
  tableName?: string
}

type OptionsParser = <ENTITY extends Entity>(
  entity: ENTITY,
  options: UpdateTransactionOptions<ENTITY>
) => Omit<NonNullable<TransactWriteItem['Update']>, 'TableName' | 'Key' | 'UpdateExpression'>

export const parseOptions: OptionsParser = (entity, options) => {
  const transactionOptions: ReturnType<OptionsParser> = {}

  const { condition, returnValuesOnConditionCheckFailure, tableName, ...extraOptions } = options
  rejectExtraOptions(extraOptions)

  if (condition !== undefined) {
    const { ExpressionAttributeNames, ExpressionAttributeValues, ConditionExpression } = entity
      .build(EntityConditionParser)
      .parse(condition)
      .toCommandOptions()

    transactionOptions.ExpressionAttributeNames = ExpressionAttributeNames
    transactionOptions.ExpressionAttributeValues = ExpressionAttributeValues
    transactionOptions.ConditionExpression = ConditionExpression
  }

  if (returnValuesOnConditionCheckFailure !== undefined) {
    transactionOptions.ReturnValuesOnConditionCheckFailure =
      parseReturnValuesOnConditionCheckFailureOption(returnValuesOnConditionCheckFailure)
  }

  if (tableName !== undefined) {
    // tableName is a meta-option, validated but not used here
    parseTableNameOption(tableName)
  }

  return transactionOptions
}
