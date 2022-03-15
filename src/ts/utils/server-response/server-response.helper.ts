import { makeErrorResponse } from '../../libs/mobius-utils'

import type http from 'http'

export const sendDefaultErrorResponse = (response: http.ServerResponse): void => {
  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json')
  const responseData = makeErrorResponse({ data: { error: new Error('Response handler excute failed!') } })
  response.end(JSON.stringify(responseData))
}

export const sendJSONResponse = (response: http.ServerResponse, data: Record<any, any>): void => {
  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(data))
}

export const sendTextResponse = (response: http.ServerResponse, body: string): void => {
  response.statusCode = 200
  response.setHeader('Content-Type', 'text/plain')
  response.end(body)
}
