import { getBodyFromRequest } from './client-request.helper'

import type http from 'http'

export class ClientRequest {
  _id: string
  _isRegistered: boolean
  _rawRequest: http.IncomingMessage

  constructor (request: http.IncomingMessage) {
    this._id = ''
    this._rawRequest = request
    this._isRegistered = false
  }

  /**
   * 元信息
   */

  /**
   *
   */
  get id (): string { return this._id }
  /**
   * @see {@link raw}
   */
  get rawRequest (): http.IncomingMessage { return this._rawRequest }
  /**
   * @see {@link rawRequest}
   */
  get raw (): http.IncomingMessage { return this._rawRequest }

  static of (request: http.IncomingMessage): ClientRequest {
    return new ClientRequest(request)
  }

  isRegistered (): boolean { return this._isRegistered }

  register (id: string): void {
    if (!this._isRegistered) {
      this._id = id
      this._isRegistered = true
    }
  }

  /**
   * 功能性信息
   */

  /**
   * @see {@link http.IncomingMessage.method}
   */
  get method (): string { return this._rawRequest.method! }

  /**
   * @see {@link http.IncomingMessage.url}
   */
  get url (): string { return this._rawRequest.url! }

  get headers (): http.IncomingHttpHeaders { return this._rawRequest.headers }

  get body (): Promise<string> {
    return getBodyFromRequest(this._rawRequest)
  }
}
