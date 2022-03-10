import type http from 'http'

/**
 * @return Whether the response is handled successfully.
 */
export type ResponseHandler = (response: http.ServerResponse) => boolean

export class ServerResponse {
  _id: string
  _isRegistered: boolean
  _rawResponse: http.ServerResponse
  responseHandler: ResponseHandler | null

  constructor (response: http.ServerResponse) {
    this._id = ''
    this._isRegistered = false
    this._rawResponse = response
    this.responseHandler = null
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
    this.responseHandler = responseHandler
  }

  sendResponse (): void {
    if (this.responseHandler !== null) {
      const rawResponse = this._rawResponse
      let responseHandleResult
      try {
        responseHandleResult = this.responseHandler(rawResponse)
      } catch (error) {
        responseHandleResult = false
      }
      if (!responseHandleResult) {
        rawResponse.statusCode = 200
        rawResponse.setHeader('Content-Type', 'text/html')
        rawResponse.end('<h1>Sorry, unexpected error happened, please try again later.</h1>')
      }
    }
  }
}
