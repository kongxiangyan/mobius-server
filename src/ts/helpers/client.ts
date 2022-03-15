import {
  Data,
  replayWithLatest,
  createGeneralDriver, useGeneralDriver_
} from '../libs/mobius-utils'
import { Route } from '../libs/mobius-services'
import { ClientRequest } from '../utils/client-request/client-request'
import { ServerResponse } from '../utils/server-response/server-response'
import { Communication } from '../utils/communication'
import { CommunicationManager } from '../utils/communication-manager'
import http from 'http'

import type {
  ReplayDataMediator,
  DriverOptions, DriverLevelContexts, DriverSingletonLevelContexts, DriverInstance
} from '../libs/mobius-utils'
import type { AppRouteDriverInstance } from '../libs/mobius-services'

export interface ClientDriverOptions extends DriverOptions {
  /**
   * @default 3000
   */
  port?: number
  /**
   * @default false
   */
  isAutoStart?: boolean
  appRouteDriver: AppRouteDriverInstance
}
export interface ClientDriverSingletonLevelContexts extends DriverSingletonLevelContexts {
  inputs: {
    start: Data<any>
    response: Data<ServerResponse>
    claimRequest: Data<string>
  }
  outputs: {
    server: ReplayDataMediator<http.Server>
    request: ReplayDataMediator<ClientRequest>
    currentRoute: Data<Route<Communication>>
  }
}
export type ClientDriverInstance = ClientDriverSingletonLevelContexts

/**
 * Client 一方面可以将路由信息输送到全局的路由驱动中，另一方面维护有自己的路由分支。
 * 全局的路由驱动只有路由地址信息，Client 自己维护的路由分支还带有 ClientRequest 作为 Payload。
 */
export const makeClientDriver =
createGeneralDriver<ClientDriverOptions, DriverLevelContexts, ClientDriverSingletonLevelContexts, ClientDriverInstance>({
  defaultOptions: {
    port: 3000,
    isAutoStart: false
  },
  prepareSingletonLevelContexts: (options, driverLevelContexts) => {
    const startSignalD = Data.empty<any>()
    const serverD = Data.empty<http.Server>()
    const clientRequestD = Data.empty<ClientRequest>()
    const serverResponseD = Data.empty<ServerResponse>()
    const currentRouteD = Data.empty<Route<Communication>>()
    const claimRequestD = Data.empty<string>()

    const serverRD = replayWithLatest(1, serverD)
    const requestRD = replayWithLatest(1, clientRequestD)

    const { appRouteDriver: { inputs: { redirect } } } = options
    const communicationManager = CommunicationManager.empty()

    const server = http.createServer((request, response) => {
      const clientRequest = ClientRequest.of(request)
      const serverResponse = ServerResponse.of(response)
      const communication = Communication.of(clientRequest, serverResponse)
      communicationManager.push(communication)

      clientRequestD.mutate(() => clientRequest)
      const { url } = request
      if (url === undefined) {
        // 没有 url 的请求将被视作非法请求，不进行任何处理
      } else {
        redirect.mutate(() => url)
        currentRouteD.mutate(() => Route.of(url).setPayload(communication))
      }
    })
    serverD.mutate(() => server)

    claimRequestD.subscribeValue(communicationID => {
      const communication = communicationManager.getCommunicationByID(communicationID)
      if (communication !== undefined) {
        communication.claim()
        communication.pending()
      }
    })
    serverResponseD.subscribeValue(serverResponse => {
      const communication = communicationManager.getCommunicationByID(serverResponse.id)
      if (communication === undefined || communication.isResolved()) {
        // 如果相应的请求已经被处理过了，那么就不再处理了。
        // 即相同 id 的请求，如果被多个分支认领，则只会接收第一个处理完的回应，后续回应都会被丢弃。
      } else {
        serverResponse.sendResponse()
        communication.resolve()
        communicationManager.remove(communication)
      }
    })

    interface DriverStates {
      started: boolean
    }
    const driverStates: DriverStates = {
      started: false
    }

    const { port, isAutoStart } = options
    const startServer = (): void => {
      server.listen(port, () => {
        console.log(`Server running at port ${port}`)
      })
    }
    if (isAutoStart && !driverStates.started) {
      startServer()
      driverStates.started = true
    }
    startSignalD.subscribeValue(() => {
      if (!driverStates.started) {
        startServer()
        driverStates.started = true
      }
    })

    return {
      inputs: {
        start: startSignalD,
        response: serverResponseD,
        claimRequest: claimRequestD
      },
      outputs: {
        server: serverRD,
        request: requestRD,
        currentRoute: currentRouteD
      }
    }
  }
})

/**
 * @see {@link makeClientDriver}
 */
export const useClientDriver = useGeneralDriver_(makeClientDriver)
