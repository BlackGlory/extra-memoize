import { ICache } from '@src/types'
import stringify from 'fast-json-stable-stringify'
import { isntUndefined } from '@blackglory/prelude'

export function memoize<
  CacheValue
, Result extends CacheValue
, Args extends any[]
>(
  {
    cache
  , name
  , createKey = args => stringify(args)
  , executionTimeThreshold = 0
  }: {
    cache: ICache<CacheValue>
    name?: string
    createKey?: (args: Args, name?: string) => string

    /**
     * Used to judge whether a function execution is too slow.
     * Only when the excution time of function is
     * greater than or equal to the value (in milliseconds),
     * the return value of the function will be cached.
     */
    executionTimeThreshold?: number
  }
, fn: (...args: Args) => Result
): (...args: Args) => Result {
  return function (this: unknown, ...args: Args): Result {
    const key = createKey(args, name)
    const value = cache.get(key)
    if (isntUndefined(value)) return value as any as Result

    const startTime = Date.now()
    const result = fn.apply(this, args)
    if (isSlowExecution()) {
      cache.set(key, result)
    }

    return result

    function isSlowExecution(): boolean {
      return getElapsed() >= executionTimeThreshold

      function getElapsed(): number {
        return Date.now() - startTime
      }
    }
  }
}
