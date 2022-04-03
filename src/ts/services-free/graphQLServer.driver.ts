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
import type { ServerResponse } from '../utils/server-response/server-response'
import type { Communication } from '../utils/communication'

export interface GraphQLServerDriverOptions extends DriverOptions {
  /**
   * @default 'http://localhost:4000'
   */
  graphQLServerOrigin?: string
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

/**
 * 接收到 Mobius Server 请求之后，将请求转发给 Apollo Server，然后将 Apollo Server 的响应转发到 Mobius Server。
 *
 * @see {@link https://graphql.org/learn/serving-over-http/}
 */
export const makeGraphQLServerDriver =
createGeneralDriver<GraphQLServerDriverOptions, DriverLevelContexts, GraphQLServerDriverSingletonLevelContexts, GraphQLServerDriverInstance>({
  defaultOptions: {
    graphQLServerOrigin: 'http://localhost:4000'
  },
  prepareSingletonLevelContexts: (options, driverLevelContexts) => {
    const { graphQLServerOrigin } = options

    const routeD = Data.empty<Route<Communication>>()
    const responseD = Data.empty<ServerResponse>()

    const getD = filterT(({ payload }) => {
      return payload === undefined ? false : payload.clientRequest.method === 'GET'
    }, routeD)
    const postD = filterT(({ payload }) => {
      return payload === undefined ? false : payload.clientRequest.method === 'POST'
    }, routeD)

    const handleGetRequest = async (route: Route<Communication>): Promise<void> => {
      console.group('[GraphQLServerDriver][GET]:')

      const { record, payload } = route
      if (payload === undefined) {
        console.log(`invalid request: ${record.partialUrl}`)
        return
      }
      console.log(`valid request: ${record.partialUrl}`)

      const { serverResponse } = payload
      const graphQLRequest = Biutor.of({
        resource: `${graphQLServerOrigin}${record.partialUrl}`,
        method: 'GET'
      })
      const graphQLResponse = await graphQLRequest.sendRequest().response
      serverResponse.setResponseData(graphQLResponse)
      responseD.mutate(() => serverResponse)

      console.log('\r\n')
      console.groupEnd()
    }
    getD.subscribeValue((route) => {
      handleGetRequest(route).catch((error) => {
        console.log(`[GraphQLServerDriver][GET] request: ${route.record.partialUrl}`)
        console.log('[GraphQLServerDriver][GET] Unexpected error occured when handling get request', error, '\r\n')
      })
    })

    const handlePostRequest = async (route: Route<Communication>): Promise<void> => {
      console.group('[GraphQLServerDriver][POST]:')
      const { record, payload } = route
      if (payload === undefined) {
        console.log(`invalid request: ${record.partialUrl}`)
        return
      }
      console.log(`valid request ${record.partialUrl}`)
      const { clientRequest, serverResponse } = payload

      const headers = clientRequest.headers
      const preparedHeaders = {
        'Content-Type': 'application/json'
      }

      const body = await clientRequest.body

      let bodyParams
      try {
        // If the "application/graphql" Content-Type header is present,
        // treat the HTTP POST body contents as the GraphQL query string.
        if (headers['content-type'] === 'application/graphql') {
          bodyParams = { query: body }
        } else {
          bodyParams = JSON.parse(body)
        }
      } catch (e) {
        console.log('Parse request body failed!')
        bodyParams = {}
      }
      const queryParams: Record<string, any> = {}
      queryParams.query = record.queryObj.query
      try {
        queryParams.variables = JSON.parse(record.queryObj.variables)
      } catch (e) {
        queryParams.variables = {}
      }
      // If the "query" query string parameter is present (as in the GET example above),
      // it should be parsed and handled in the same way as the HTTP GET case.
      const preparedParams = { ...queryParams, ...bodyParams }
      const preparedBody: string = JSON.stringify(preparedParams)
      console.log('request body: ', preparedBody)

      const graphqlRequest = Biutor.of({
        resource: `${graphQLServerOrigin}${record.partialUrl}`,
        method: 'POST',
        headers: preparedHeaders,
        body: preparedBody
      })
      const graphQLResponse = await graphqlRequest.sendRequest().response
      serverResponse.setResponseData(graphQLResponse)
      responseD.mutate(() => serverResponse)

      console.log('\r\n')
      console.groupEnd()
    }
    postD.subscribeValue((route) => {
      handlePostRequest(route).catch((error) => {
        console.log(`[GraphQLServerDriver][POST] request: ${route.record.partialUrl}`)
        console.log('[GraphQLServerDriver][POST] Unexpected error occured when handling post request', error, '\r\n')
      })
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
