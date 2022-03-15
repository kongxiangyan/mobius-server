import { isString, isPlainObject, isResponse, makeSuccessResponse } from '../../libs/mobius-utils'
import { sendDefaultErrorResponse, sendJSONResponse, sendTextResponse } from './server-response.helper'

import type http from 'http'

/**
 * @return Whether the response is handled successfully.
 */
export type ResponseHandler = (response: http.ServerResponse) => boolean

export class ServerResponse {
  _id: string
  _isRegistered: boolean
  _rawResponse: http.ServerResponse
  _responseHandler: ResponseHandler | null
  _responseData: Record<any, any> | null
  _responseBody: string | null

  constructor (response: http.ServerResponse) {
    this._id = ''
    this._isRegistered = false
    this._rawResponse = response
    this._responseHandler = null
    this._responseData = null
    this._responseBody = null
  }

  get id (): string { return this._id }
  /**
   * @see {@link raw}
   */
  get rawResponse (): http.ServerResponse { return this._rawResponse }
  /**
   * @see {@link rawResponse}
   */
  get raw (): http.ServerResponse { return this._rawResponse }

  static of (request: http.ServerResponse): ServerResponse {
    return new ServerResponse(request)
  }

  isRegistered (): boolean { return this._isRegistered }

  register (id: string): void {
    if (!this._isRegistered) {
      this._id = id
      this._isRegistered = true
    }
  }

  /**
   * Set the response handler which will be invoked by `sendResponse` method.
   */
  setResponseHandler (responseHandler: ResponseHandler): void {
    this._responseHandler = responseHandler
  }

  setResponseData (data: Record<any, any>): void {
    if (!isPlainObject(data)) {
      throw new Error('Response data is expected to be type of "PlainObject"!')
    } else {
      this._responseData = data
    }
  }

  setResponseBody (body: string): void {
    if (!isString(body)) {
      throw new Error('Response body is expected to be type of "String"!')
    } else {
      this._responseBody = body
    }
  }

  /**
   * The priority of the response is: `responseHandler` > `responseData` > `responseBody`.
   */
  sendResponse (): void {
    if (this._responseHandler !== null) {
      const rawResponse = this._rawResponse
      let responseHandleResult
      try {
        responseHandleResult = this._responseHandler(rawResponse)
      } catch (error) {
        responseHandleResult = false
      }
      if (!responseHandleResult) {
        sendDefaultErrorResponse(rawResponse)
      }
    } else if (this._responseData !== null) {
      const rawResponse = this._rawResponse
      const preparedResponseData = isResponse(this._responseData) ? this._responseData : makeSuccessResponse(this._responseData)
      sendJSONResponse(rawResponse, preparedResponseData)
    } else if (this._responseBody !== null) {
      const rawResponse = this._rawResponse
      sendTextResponse(rawResponse, this._responseBody)
    } else {
      // do nothing
    }
  }
}
