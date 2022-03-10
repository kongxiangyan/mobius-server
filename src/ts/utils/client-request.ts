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
}
