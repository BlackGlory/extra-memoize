import { IStaleIfErrorCache, State } from '@src/types'
import { defaultCreateKey } from '@memoizes/utils/default-create-key'
import { createReturnValue } from '@memoizes/utils/create-return-value'

type VerboseResult<T> = [
  T
, | State.Hit
  | State.Miss
  | State.StaleIfError
  | State.Reuse
]

interface IMemoizeAsyncStaleIfError<Result, Args extends any[]> {
  cache: IStaleIfErrorCache<Result>
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

export function memoizeAsyncStaleIfError<Result, Args extends any[]>(
  options: IMemoizeAsyncStaleIfError<Result, Args> & { verbose: true }
, fn: (...args: Args) => PromiseLike<Result>
): (...args: Args) => Promise<VerboseResult<Result>>
export function memoizeAsyncStaleIfError<Result, Args extends any[]>(
  options: IMemoizeAsyncStaleIfError<Result, Args> & { verbose: false }
, fn: (...args: Args) => PromiseLike<Result>
): (...args: Args) => Promise<Result>
export function memoizeAsyncStaleIfError<Result, Args extends any[]>(
  options: Omit<IMemoizeAsyncStaleIfError<Result, Args>, 'verbose'>
, fn: (...args: Args) => PromiseLike<Result>
): (...args: Args) => Promise<Result>
export function memoizeAsyncStaleIfError<Result, Args extends any[]>(
  options: IMemoizeAsyncStaleIfError<Result, Args>
, fn: (...args: Args) => PromiseLike<Result>
): (...args: Args) => Promise<Result | VerboseResult<Result>>
export function memoizeAsyncStaleIfError<Result, Args extends any[]>(
  {
    cache
  , name
  , createKey = defaultCreateKey
  , executionTimeThreshold = 0
  , verbose = false
  }: IMemoizeAsyncStaleIfError<Result, Args>
, fn: (...args: Args) => PromiseLike<Result>
): (...args: Args) => Promise<Result | VerboseResult<Result>> {
  const pendings = new Map<string, Promise<Result>>()

  return async function (this: unknown, ...args: Args): Promise<
  | Result
  | VerboseResult<Result>
  > {
    const key = createKey(args, name)
    const [state, value] = cache.get(key)
    if (state === State.Hit) {
      return createReturnValue(value, state, verbose)
    } else if (state === State.StaleIfError) {
      if (pendings.has(key)) {
        try {
          return createReturnValue(await pendings.get(key)!, State.Reuse, verbose)
        } catch {
          return createReturnValue(value, state, verbose)
        }
      } else {
        try {
          return createReturnValue(
            await refresh.call(this, key, args)
          , state
          , verbose
          )
        } catch {
          return createReturnValue(value, state, verbose)
        }
      }
    } else {
      if (pendings.has(key)) {
        return createReturnValue(await pendings.get(key)!, State.Reuse, verbose)
      } else {
        return createReturnValue(
          await refresh.call(this, key, args)
        , state
        , verbose
        )
      }
    }
  }

  async function refresh(this: unknown, key: string, args: Args): Promise<Result> {
    const startTime = Date.now()
    const promise = Promise.resolve(fn.apply(this, args))
    pendings.set(key, promise)

    try {
      const result = await promise
      if (isSlowExecution(startTime)) {
        cache.set(key, result)
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
