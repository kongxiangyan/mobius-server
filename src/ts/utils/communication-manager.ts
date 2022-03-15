import { isString } from '../libs/mobius-utils'

import type { ClientRequest } from './client-request/client-request'
import type { ServerResponse } from './server-response/server-response'
import type { Communication } from './communication'

export type Communications = Map<string, Communication>

export class CommunicationManager {
  _communications: Communications
  constructor () {
    this._communications = new Map()
  }

  static empty (): CommunicationManager {
    return new CommunicationManager()
  }

  static of (): CommunicationManager {
    return new CommunicationManager()
  }

  getCommunicationByID (id: string): Communication | undefined {
    return this._communications.get(id)
  }

  getCommunication (target: string | ClientRequest | ServerResponse): Communication | undefined {
    return this.getCommunicationByID(isString(target) ? target : target.id)
  }

  push (communication: Communication): this {
    this._communications.set(communication.id, communication)
    return this
  }

  removeCommunicationByID (id: string): boolean {
    return this._communications.delete(id)
  }

  remove (target: string | Communication | ClientRequest | ServerResponse): boolean {
    return this.removeCommunicationByID(isString(target) ? target : target.id)
  }
}
