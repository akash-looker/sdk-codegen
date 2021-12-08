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
import type { SpecList } from '@looker/sdk-codegen'
import { call, put, takeLatest, takeEvery, select } from 'typed-redux-saga'
import { fallbackFetch, funFetch } from '@looker/run-it'
import type { PayloadAction } from '@reduxjs/toolkit'

import { getApixAdaptor } from '../../utils'
import type { RootState } from '../store'
import type { SetCurrentSpecAction } from './slice'
import { specActions } from './slice'

function* initSaga() {
  const { initSpecsSuccessAction, initSpecsFailureAction } = specActions
  const adaptor = getApixAdaptor()

  try {
    const specs: SpecList = yield* call([adaptor, 'fetchSpecList'])
    const currentSpecKey = Object.values(specs).find(
      (spec) => spec.status === 'current'
    )!.key

    yield* call([adaptor, 'fetchSpec'], specs[currentSpecKey])
    yield* put(initSpecsSuccessAction({ specs, currentSpecKey }))
  } catch {
    yield* put(initSpecsFailureAction(new Error('boom')))
  }
}

export function* setCurrentSpecSaga(
  action: PayloadAction<SetCurrentSpecAction>
) {
  const { setCurrentSpecSuccessAction } = specActions
  const spec = yield* select(
    (state: RootState) => state.specs[action.payload.currentSpecKey]
  )
  const api = yield* call(() => fallbackFetch(spec, funFetch))
  if (api) {
    yield* put(setCurrentSpecSuccessAction({ api }))
  }
}

export function* saga() {
  const { initSpecsAction, setCurrentSpecAction } = specActions

  yield* takeLatest(initSpecsAction, initSaga)
  yield* takeEvery(setCurrentSpecAction, setCurrentSpecSaga)
}
