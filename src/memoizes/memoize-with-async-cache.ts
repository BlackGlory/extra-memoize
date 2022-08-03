import { IAsyncCache, State } from '@src/types'
import { defaultCreateKey } from '@memoizes/utils/default-create-key'
import { Awaitable } from '@blackglory/prelude'
import { createReturnValue } from '@memoizes/utils/create-return-value'

interface IMemoizeWithAsyncCacheOptions<Result, Args extends any[]> {
  cache: IAsyncCache<Result>
  name?: string
  createKey?: (args: Args, name?: string) => string
  verbose?: boolean

  /**
   * Used to judge whether a function execution is too slow.
   * Only when the excution time of function is
   * greater than or equal to the value (in milliseconds),
   * the return value of the function will be cached.
   */
  executionTimeThreshold?: number
}

export function memoizeWithAsyncCache<Result, Args extends any[]>(
  options: IMemoizeWithAsyncCacheOptions<Result, Args> & { verbose: true }
, fn: (...args: Args) => Awaitable<Result>
): (...args: Args) => Promise<[Result, State.Hit | State.Miss]>
export function memoizeWithAsyncCache<Result, Args extends any[]>(
  options: IMemoizeWithAsyncCacheOptions<Result, Args> & { verbose: false }
, fn: (...args: Args) => Awaitable<Result>
): (...args: Args) => Promise<Result>
export function memoizeWithAsyncCache<Result, Args extends any[]>(
  options: Omit<IMemoizeWithAsyncCacheOptions<Result, Args>, 'verbose'>
, fn: (...args: Args) => Awaitable<Result>
): (...args: Args) => Promise<Result>
export function memoizeWithAsyncCache<Result, Args extends any[]>(
  options: IMemoizeWithAsyncCacheOptions<Result, Args>
, fn: (...args: Args) => Awaitable<Result>
): (...args: Args) => Promise<Result | [Result, State.Hit | State.Miss]>
export function memoizeWithAsyncCache<Result, Args extends any[]>(
  {
    cache
  , name
  , createKey = defaultCreateKey
  , executionTimeThreshold = 0
  , verbose = false
  }: IMemoizeWithAsyncCacheOptions<Result, Args>
, fn: (...args: Args) => Awaitable<Result>
): (...args: Args) => Promise<Result | [Result, State.Hit | State.Miss]> {
  const pendings = new Map<string, Promise<Result>>()

  return async function (
    this: unknown
  , ...args: Args
  ): Promise<Result | [Result, State.Hit | State.Miss]> {
    const key = createKey(args, name)
    const [state, value] = await cache.get(key)
    if (state === State.Hit) {
      return createReturnValue(value, state, verbose)
    } else {
      if (pendings.has(key)) {
        return createReturnValue(await pendings.get(key)!, state, verbose)
      }
      return createReturnValue(await refresh.call(this, key, args), state, verbose)
    }
  }

  async function refresh(this: unknown, key: string, args: Args): Promise<Result> {
    const startTime = Date.now()
    const pending = Promise.resolve(fn.apply(this, args))
    pendings.set(key, pending)

    try {
      const result = await pending
      if (isSlowExecution(startTime)) {
        await cache.set(key, result)
      }

      return result
    } finally {
      pendings.delete(key)
    }
  }

  function isSlowExecution(startTime: number): boolean {
    return getElapsed() >= executionTimeThreshold

    function getElapsed(): number {
      return Date.now() - startTime
    }
  }
}
