/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {Arg, ICodeFormatter, IMethod, IParameter, IType, IProperty, IMappedType, ApiModel, IntrinsicType } from "./sdkModels"
import {commentBlock} from "./utils"

export const warnEditing = 'NOTE: Do not edit this source code file. It is generated by Looker SDK Codegen.'

export abstract class CodeFormatter implements ICodeFormatter {
    api: ApiModel | undefined
    needsRequestTypes = false
    codePath = './'
    package = 'looker'
    itself = ''
    fileExtension = '.code'
    argDelimiter = ', '
    paramDelimiter = ',\n'
    propDelimiter = ',\n'

    indentStr = '  '
    commentStr = '// '
    nullStr = 'null'
    endTypeStr = ''
    transport = 'rtl'

    constructor (api?: ApiModel) {
      this.api = api
    }

    // abstractions requiring overrides in language-specific formatters
    abstract methodsPrologue(indent: string) : string
    abstract methodsEpilogue(indent: string) : string
    abstract modelsPrologue(indent: string) : string
    abstract modelsEpilogue(indent: string): string
    abstract declareParameter(indent: string, param: IParameter) : string
    abstract declareProperty(indent: string, property: IProperty) : string
    abstract typeSignature(indent: string, type: IType) : string
    abstract methodSignature(indent: string, method: IMethod) : string
    abstract declareMethod(indent: string, method: IMethod) : string
    abstract summary(indent: string, text: string | undefined) : string
    abstract initArg(indent: string, property: IProperty) : string
    abstract construct(indent: string, properties: Record<string, IProperty>) : string
    // abstract createRequester(indent: string, method: IMethod): string

    dump(value: any) {
      return JSON.stringify(value, null, 2)
    }

    debug(tag: string, value: any, indent: string = '') {
      return `${indent}${tag}:${this.dump(value)}`
    }

    bumper(indent: string) {
      return indent + this.indentStr
    }

    fileName(base: string ) {
      return `${this.codePath}${this.package}/${base}${this.fileExtension}`
    }

    comment(indent: string, description: string) {
      return commentBlock(description, indent, this.commentStr)
    }

    commentHeader(indent: string, text: string | undefined) {
      return text ? `${this.comment(indent, text)}\n` : ''
    }

    declareParameters(indent: string, params: IParameter[] | undefined) {
        let items : string[] = []
        if (params) params.forEach(p => items.push(this.declareParameter(indent, p)))
        return items.join(this.paramDelimiter)
    }

    declareConstructorArg(indent: string, property: IProperty) {
      return `${indent}${property.name}${property.nullable  ? " = " + this.nullStr: ''}`
    }

    it(value: string) {
      return this.itself ? `${this.itself}.${value}` : value
    }

    declareType(indent: string, type: IType) {
        const bump = this.bumper(indent)
        let props: string[] = []
        // TODO skip read-only properties when we correctly tag read-only attributes
        Object.values(type.properties)
            .forEach((prop) => props.push(this.declareProperty(bump, prop)))
        return this.typeSignature(indent, type)
            // + this.construct(indent, type.properties)
            + props.join(this.propDelimiter)
            + `${this.endTypeStr? indent : ''}${this.endTypeStr}`
    }

    argGroup(indent: string, args: Arg[], prefix?: string) {
      prefix = prefix || ''
      return args && args.length !== 0 ? `${indent}[${prefix}${args.join(this.argDelimiter+prefix)}]` : this.nullStr
    }

    argList(indent: string, args: Arg[], prefix?: string) {
      prefix = prefix || ''
      return args && args.length !== 0 ? `${indent}${prefix}${args.join(this.argDelimiter+prefix)}` : this.nullStr
    }

    // this is a builder function to produce arguments with optional null place holders but no extra required optional arguments
    argFill(current: string, args: string) {
        if ((!current) && args.trim() === this.nullStr) {
            // Don't append trailing optional arguments if none have been set yet
            return ''
        }
        return `${args}${current ? this.argDelimiter : ''}${current}`
    }

    httpPath(path: string, prefix?: string) {
      prefix = prefix || ''
      return path
    }

    // build the http argument list from back to front, so trailing undefined arguments
    // can be omitted. Path arguments are resolved as part of the path parameter to general
    // purpose API method call
    // e.g.
    //   {queryArgs...}, bodyArg, {headerArgs...}, {cookieArgs...}
    //   {queryArgs...}, null, null, {cookieArgs...}
    //   null, bodyArg
    //   {queryArgs...}
    httpArgs(indent: string, method: IMethod) {
        let result = this.argFill('', this.argGroup(indent, method.cookieArgs))
        result = this.argFill(result, this.argGroup(indent, method.headerArgs))
        result = this.argFill(result, method.bodyArg ? method.bodyArg : this.nullStr)
        result = this.argFill(result, this.argGroup(indent, method.queryArgs))
        return result
    }

    // @ts-ignore
    errorResponses(indent: string, method: IMethod) {
      const results: string[] = method.errorResponses
        .map(r => `${r.type.name}`)
      return results.join(', ')
    }

    httpCall(indent: string, method: IMethod) {
        const bump = indent + this.indentStr
        const args = this.httpArgs(bump, method)
        const errors = `(${this.errorResponses(indent, method)})`
        return `${indent}return ${this.it(this.transport)}.${method.httpMethod.toLowerCase()}(${errors}, "${method.endpoint}"${args ? ", " +args: ""})`
    }

    // Looks up or dynamically creates the request type for this method based
    // on rules for creating request types at the IApiModel implementation level
    // If no request type is required, no request type is created or referenced
    requestTypeName(method: IMethod): string {
      if (!this.needsRequestTypes) return ''
      const request = this.api!.getRequestType(method)
      if (!request) return ''
      request.refCount++
      return request.name
    }

    // Looks up or dynamically creates the writeable type for this method based
    // on rules for creating writable types at the IApiModel implementation level
    // If no writeable type is required, no writeable type is created or referenced
    writeableType(type: IType): IType | undefined {
      if (!type) return undefined
      const writer = this.api!.getWriteableType(type)
      if (!writer) return undefined
      writer.refCount++
      return writer
    }

    typeNames() {
      let items : string[] = []
      if (!this.api) return items
      Object.values(this.api.sortedTypes())
        .filter((type) => (type.refCount > 0) && ! (type instanceof IntrinsicType))
        .forEach((type) => items.push(type.name))
      return items
    }

    typeMap(type: IType): IMappedType {
      type.refCount++ // increment refcount
      return {name: type.name || '', default: this.nullStr || ''}
    }
}
