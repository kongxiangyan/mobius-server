import { v1UUID } from '../libs/mobius-utils'

import type { ClientRequest } from './client-request'
import type { ServerResponse } from './server-response'

export type CommunicationStatus = 'unclaimed' | 'claimed' | 'pending' | 'resolved'

export class Communication {
  private readonly _id: string
  private _status: CommunicationStatus
  private readonly _clientRequest: ClientRequest
  private readonly _serverResponse: ServerResponse
  constructor (clientRequest: ClientRequest, serverResponse: ServerResponse) {
    this._id = v1UUID()
    this._status = 'unclaimed'
    this._clientRequest = clientRequest
    this._serverResponse = serverResponse

    clientRequest.register(this._id)
    serverResponse.register(this._id)
  }

  get id (): string { return this._id }
  get status (): CommunicationStatus { return this._status }
  get clientRequest (): ClientRequest { return this._clientRequest }
  get serverResponse (): ServerResponse { return this._serverResponse }

  static of (clientRequest: ClientRequest, serverResponse: ServerResponse): Communication {
    return new Communication(clientRequest, serverResponse)
  }

  isUnclaimed (): boolean { return this._status === 'unclaimed' }
  isClaimed (): boolean { return this._status === 'claimed' }
  isPending (): boolean { return this._status === 'pending' }
  isResolved (): boolean { return this._status === 'resolved' }

  claim (): void {
    switch (this._status) {
      case 'unclaimed':
        this._status = 'claimed'
        break
      case 'claimed':
        // do nothing
        break
      case 'pending':
        throw new Error('Communication is pending.')
      case 'resolved':
        throw new Error('Communication has been resolved.')
      default:
        throw new Error('Communication status is invalid.')
    }
  }

  pending (): void {
    switch (this._status) {
      case 'unclaimed':
        throw new Error('Communication is unclaimed.')
      case 'claimed':
        this._status = 'pending'
        break
      case 'pending':
        // do nothing
        break
      case 'resolved':
        throw new Error('Communication has been resolved.')
      default:
        throw new Error('Communication status is invalid.')
    }
  }

  resolve (): void {
    this._status = 'resolved'
  }
}
