import { memoizeWithAsyncCache } from '@memoizes/memoize-with-async-cache'
import { getErrorPromise } from 'return-style'
import { delay } from 'extra-promise'
import { AsyncCache } from '@test/utils'
import '@blackglory/jest-matchers'

describe('memoizeWithAsyncCache', () => {
  describe('sync', () => {
    it('caches the result', async () => {
      const fn = jest.fn((text: string) => text)
      const cache = new AsyncCache()

      const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
      const result1 = memoizedFn('foo')
      const proResult1 = await result1
      const result2 = memoizedFn('foo')
      const proResult2 = await result2

      expect(result1).toBePromise()
      expect(proResult1).toBe('foo')
      expect(result2).toBePromise()
      expect(proResult2).toBe('foo')
    })

    test('fn throws errors', async () => {
      const fn = jest.fn((text: string) => {
        throw new Error('error')
      })
      const cache = new AsyncCache()

      const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
      const result1 = await getErrorPromise(memoizedFn('foo'))
      const result2 = await getErrorPromise(memoizedFn('foo'))

      expect(result1).toBeInstanceOf(Error)
      expect(result2).toBeInstanceOf(Error)
      expect(fn).toBeCalledTimes(2)
    })
  })

  describe('async', () => {
    it('caches the result', async () => {
      const fn = jest.fn(async (text: string) => {
        await delay(100)
        return text
      })
      const cache = new AsyncCache()

      const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
      const result1 = memoizedFn('foo')
      const proResult1 = await result1
      const result2 = memoizedFn('foo')
      const proResult2 = await result2

      expect(result1).toBePromise()
      expect(proResult1).toBe('foo')
      expect(result2).toBePromise()
      expect(proResult2).toBe('foo')
      expect(fn).toBeCalledTimes(1)
    })

    test('fn throws errors', async () => {
      const fn = jest.fn(async (text: string) => {
        await delay(100)
        throw new Error('error')
      })
      const cache = new AsyncCache()

      const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
      const result1 = memoizedFn('foo')
      const err1 = await getErrorPromise(result1)
      const result2 = memoizedFn('foo')
      const err2 = await getErrorPromise(result2)

      expect(result1).toBePromise()
      expect(err1).toBeInstanceOf(Error)
      expect(result2).toBePromise()
      expect(err2).toBeInstanceOf(Error)
      expect(fn).toBeCalledTimes(2)
    })

    describe('concurrent calls', () => {
      test('resolved', async () => {
        const fn = jest.fn(async (text: string) => {
          await delay(100)
          return text
        })
        const cache = new AsyncCache()

        const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
        const result1 = memoizedFn('foo')
        const result2 = memoizedFn('foo')
        const proResult1 = await result1
        const proResult2 = await result2

        expect(result1).toBePromise()
        expect(proResult1).toBe('foo')
        expect(result2).toBePromise()
        expect(proResult2).toBe('foo')
        expect(fn).toBeCalledTimes(1)
      })

      test('rejected', async () => {
        const fn = jest.fn(async (text: string) => {
          await delay(100)
          throw new Error('error')
        })
        const cache = new AsyncCache()

        const memoizedFn = memoizeWithAsyncCache({ cache }, fn)
        const result1 = memoizedFn('foo')
        const result2 = memoizedFn('foo')
        const err1 = await getErrorPromise(result1)
        const err2 = await getErrorPromise(result2)

        expect(result1).toBePromise()
        expect(err1).toBeInstanceOf(Error)
        expect(result2).toBePromise()
        expect(err2).toBeInstanceOf(Error)
        expect(fn).toBeCalledTimes(1)
      })
    })
  })

  describe('executionTimeThreshold', () => {
    beforeEach(() => {
      jest.useFakeTimers('modern')
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    describe('executionTime >= executionTimeThreshold', () => {
      it('caches the result', async () => {
        const fn = jest.fn((text: string) => {
          jest.setSystemTime(jest.getRealSystemTime() + 200)
          return text
        })
        const cache = new AsyncCache()

        const memoizedFn = memoizeWithAsyncCache({
          cache
        , executionTimeThreshold: 200
        }, fn)
        const result1 = await memoizedFn('foo')
        const result2 = await memoizedFn('foo')

        expect(result1).toBe('foo')
        expect(result2).toBe('foo')
        expect(fn).toBeCalledTimes(1)
      })
    })

    describe('executionTime < executionTimeThreshold', () => {
      it('does not cache the result', async () => {
        const fn = jest.fn((text: string) => text)
        const cache = new AsyncCache()

        const memoizedFn = memoizeWithAsyncCache({
          cache
        , executionTimeThreshold: 200
        }, fn)
        const result1 = await memoizedFn('foo')
        const result2 = await memoizedFn('foo')

        expect(result1).toBe('foo')
        expect(result2).toBe('foo')
        expect(fn).toBeCalledTimes(2)
      })
    })
  })
})
