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

import type { FC } from 'react'
import React from 'react'
import {
  fallbackFetch,
  fullify,
  funFetch,
  initRunItSdk,
  RunItConfigKey,
  RunItNoConfig,
  RunItProvider,
} from '@looker/run-it'
import { Provider } from 'react-redux'
import { BrowserAdaptor } from '@looker/extension-utils'
import type { IAPIMethods } from '@looker/sdk-rtl'
import type { SpecItem, SpecList } from '@looker/sdk-codegen'
import { getSpecsFromVersions } from '@looker/sdk-codegen'

import { ApiExplorer } from './ApiExplorer'
import { store } from './state'
import type { IApixAdaptor } from './utils'

export interface StandaloneApiExplorerProps {
  headless?: boolean
  versionsUrl: string
}

export class ApixAdaptor extends BrowserAdaptor implements IApixAdaptor {
  constructor(sdk: IAPIMethods, private readonly fallbackVersionsUrl: string) {
    super(sdk)
  }

  async fetchSpecList(): Promise<SpecList> {
    // TODO: make this throw on failure
    const data = await this.localStorageGetItem(RunItConfigKey)
    const config = data ? JSON.parse(data) : RunItNoConfig
    const url = config.base_url
      ? `${config.base_url}/versions`
      : `${this.fallbackVersionsUrl}/versions.json`
    const versions = await this.sdk.authSession.transport.rawRequest('GET', url)
    const specs = await getSpecsFromVersions(JSON.parse(versions.body))
    return specs
  }

  async fetchSpec(spec: SpecItem): Promise<SpecItem> {
    spec.specURL = fullify(spec.specURL, origin)
    spec.api = await fallbackFetch(spec, funFetch)
    return spec
  }
}

export const StandaloneApiExplorer: FC<StandaloneApiExplorerProps> = ({
  headless = false,
}) => {
  const browserAdaptor = new ApixAdaptor(initRunItSdk(), window.origin)

  return (
    <Provider store={store}>
      <RunItProvider basePath="/api/4.0">
        <ApiExplorer adaptor={browserAdaptor} headless={headless} />
      </RunItProvider>
    </Provider>
  )
}
