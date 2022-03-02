import {
  Data, ReplayDataMediator,
  replayWithLatest,
  createGeneralDriver, useGeneralDriver_,
  v1UUID
} from '../libs/mobius-utils'
import { Route } from '../libs/mobius-services'
import http from 'http'

import type { DriverOptions, DriverLevelContexts, DriverSingletonLevelContexts, DriverInstance } from '../libs/mobius-utils'
import type { AppRouteDriverInstance } from '../libs/mobius-services'

/**
 * @return Whether the response is handled successfully.
 */
export type ResponseHandler = (response: http.ServerResponse) => boolean
/**
 *
 */
export interface ClientRequest {
  id: string
  request: http.IncomingMessage
}
export interface ServerResponse {
  id: string
  responseHandler: ResponseHandler
}
interface CommunicationRecord {
  status: 'unclaimed' | 'pending' | 'handled'
  request: http.IncomingMessage
  response: http.ServerResponse
}
type Communications = Map<string, CommunicationRecord>

export interface ClientDriverOptions extends DriverOptions {
  port?: number
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
    currentRoute: Data<Route<ClientRequest>>
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
    const currentRouteD = Data.empty<Route<ClientRequest>>()
    const claimRequestD = Data.empty<string>()

    const serverRD = replayWithLatest(1, serverD)
    const requestRD = replayWithLatest(1, clientRequestD)

    interface DriverStates {
      started: boolean
    }
    const driverStates: DriverStates = {
      started: false
    }

    const { appRouteDriver: { inputs: { redirect } } } = options
    const communications: Communications = new Map()

    const server = http.createServer((request, response) => {
      const id = v1UUID()
      const clientRequest = { id, request }
      communications.set(id, { status: 'unclaimed', request, response })

      clientRequestD.mutate(() => clientRequest)
      const { url } = request
      if (url === undefined) {
        //
      } else {
        redirect.mutate(() => url)
        currentRouteD.mutate(() => Route.of(url).setPayload(clientRequest))
      }
    })
    serverD.mutate(() => server)

    claimRequestD.subscribeValue(requestID => {
      const communication = communications.get(requestID)
      if (communication !== undefined && communication.status === 'unclaimed') {
        communication.status = 'pending'
      }
    })
    serverResponseD.subscribeValue(serverResponse => {
      const { id, responseHandler } = serverResponse
      const communicationRecord = communications.get(id)
      if (communicationRecord === undefined || communicationRecord.status === 'handled') {
        // 如果相应的请求已经被处理过了，那么就不再处理了。
        // 即相同 id 的请求，如果被多个分支认领，则只会接收第一个处理完的回应，后续回应都会被丢弃。
      } else {
        const { response } = communicationRecord
        const responseHandleResult = responseHandler(response)
        if (!responseHandleResult) {
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/html')
          response.end('<h1>Sorry, unexpected error happened, please try again later.</h1>')
        }
        communicationRecord.status = 'handled'
        communications.delete(id)
      }
    })

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
export const useClientDriver_ = useGeneralDriver_(makeClientDriver)
