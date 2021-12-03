/*

 MIT License

 Copyright (c) 2021 Looker Data Sciences, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */
import ReduxSagaTester from 'redux-saga-tester'
import { registerTestEnvAdaptor } from '@looker/extension-utils'
import { initRunItSdk } from '@looker/run-it'

import { specActions, specsSlice } from './slice'
import * as sagas from './sagas'
import { ApixAdaptor } from '@looker/api-explorer'

describe('Specs Sagas', () => {
  let sagaTester: ReduxSagaTester<any>
  const adaptor = new ApixAdaptor(initRunItSdk(), '')
  registerTestEnvAdaptor(adaptor)

  beforeEach(() => {
    jest.resetAllMocks()
    sagaTester = new ReduxSagaTester({
      reducers: {
        specs: specsSlice.reducer,
      },
    })
    sagaTester.start(sagas.saga)
  })

  describe('initSaga', () => {
    const { initSpecsAction, initSpecsFailureAction, initSpecsSuccessAction } =
      specActions
    it('sends initSpecsFailureAction on error', async () => {
      const error = new Error('kaboom')
      jest.spyOn(adaptor, 'fetchSpecList').mockResolvedValueOnce({
        url: 'https://api-server.com:19999',
        response: {
          error,
        },
      })
      jest.spyOn(adaptor, 'login').mockResolvedValueOnce()

      sagaTester.dispatch(initSpecsAction())
      await sagaTester.waitFor('specs/initSpecsFailureAction')
      const calledActions = sagaTester.getCalledActions()
      expect(calledActions).toHaveLength(2)
      expect(calledActions[0]).toEqual(initSpecsAction())
      expect(calledActions[1]).toEqual(initSpecsFailureAction(error))
    })

    it('sends initSpecsSuccessAction on success', async () => {
      const error = new Error('kaboom')
      jest.spyOn(adaptor, 'fetchSpecList').mockResolvedValueOnce({
        url: 'https://api-server.com:19999',
        response: {
          error,
        },
      })
      jest.spyOn(adaptor, 'login').mockResolvedValueOnce()

      sagaTester.dispatch(initSpecsAction())
      await sagaTester.waitFor('specs/initSpecsSuccessAction')
      const calledActions = sagaTester.getCalledActions()
      expect(calledActions).toHaveLength(2)
      expect(calledActions[0]).toEqual(initSpecsAction())
      expect(calledActions[1]).toEqual(initSpecsSuccessAction())
    })
  })
})
