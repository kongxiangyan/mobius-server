import {
  Data, replayWithLatest,
  createGeneralDriver, useGeneralDriver_,
  filterT,
  Biutor
} from '../libs/mobius-utils'

import type {
  DriverOptions, DriverLevelContexts, DriverSingletonLevelContexts, DriverInstance
} from '../libs/mobius-utils'
import type {
  Route
} from '../libs/mobius-services'
import type { ServerResponse } from '../utils/server-response'
import type { Communication } from '../utils/communication'

export interface GraphQLServerDriverOptions extends DriverOptions {
  graphqlServerOrigin?: string
}
export interface GraphQLServerDriverSingletonLevelContexts extends DriverSingletonLevelContexts {
  inputs: {
    route: Data<Route<Communication>>
  }
  outputs: {
    response: Data<ServerResponse>
  }
}
export type GraphQLServerDriverInstance = GraphQLServerDriverSingletonLevelContexts

// 接收到 Mobius Server 请求之后，转换回原始请求参数，将原始请求参数转发给 Apollo Server，然后将 Apollo Server 的响应转发到 Mobius Server
export const makeGraphQLServerDriver =
createGeneralDriver<GraphQLServerDriverOptions, DriverLevelContexts, GraphQLServerDriverSingletonLevelContexts, GraphQLServerDriverInstance>({
  defaultOptions: {
    graphqlServerOrigin: 'http://localhost:4000'
  },
  prepareSingletonLevelContexts: (options, driverLevelContexts) => {
    const { graphqlServerOrigin } = options

    const routeD = Data.empty<Route<Communication>>()
    const responseD = Data.empty<ServerResponse>()

    const getD = filterT(({ record, payload }) => {
      console.log(`[GraphQLServerDriver][GET] ${record.partialUrl}`)
      return payload === undefined ? false : payload.clientRequest.method === 'GET'
    }, routeD)
    const postD = filterT(({ record, payload }) => {
      console.log(`[GraphQLServerDriver][POST] ${record.partialUrl}`)
      return payload === undefined ? false : payload.clientRequest.method === 'POST'
    }, routeD)

    const handleGetRequest = async (route: Route<Communication>): Promise<void> => {
      const { record, payload } = route
      if (payload === undefined) return
      console.log(`[GraphQLServerDriver][GET] valid request ${record.partialUrl}`)
      console.log('\r\n')
      const { serverResponse } = payload
      const graphqlRequest = Biutor.of({
        resource: `${graphqlServerOrigin}${record.partialUrl}`,
        method: 'GET'
      })
      const data = await graphqlRequest.sendRequest().data
      serverResponse.setResponseHandler((response) => {
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(data))
        return true
      })
      responseD.mutate(() => serverResponse)
    }
    getD.subscribeValue((route) => {
      handleGetRequest(route).catch(console.error)
    })

    const handlePostRequest = async (route: Route<Communication>): Promise<void> => {
      const { record, payload } = route
      if (payload === undefined) return
      console.log(`[GraphQLServerDriver][POST] valid request ${record.partialUrl}`)
      const { clientRequest, serverResponse } = payload

      const headers = clientRequest.headers
      const preparedHeaders = {
        'Content-Type': 'application/json'
      }
      const body = await clientRequest.body
      console.log(body)
      console.log('\r\n')
      const preparedBody = headers['content-type'] === 'application/graphql' ? JSON.stringify({ query: body }) : body

      const graphqlRequest = Biutor.of({
        resource: `${graphqlServerOrigin}${record.partialUrl}`,
        method: 'POST',
        headers: preparedHeaders,
        body: preparedBody
      })
      const data = await graphqlRequest.sendRequest().data
      serverResponse.setResponseHandler((response) => {
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(data))
        return true
      })
      responseD.mutate(() => serverResponse)
    }
    postD.subscribeValue((route) => {
      handlePostRequest(route).catch(console.error)
    })

    return {
      inputs: {
        route: routeD
      },
      outputs: {
        response: responseD
      }
    }
  }
})

/**
 * @see {@link makeGraphQLServerDriver}
 */
export const useGraphQLServerDriver = useGeneralDriver_(makeGraphQLServerDriver)
