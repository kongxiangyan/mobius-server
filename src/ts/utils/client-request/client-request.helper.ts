import type http from 'http'

export const getBodyFromRequest = async (request: http.IncomingMessage): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const buffers: any[] = []
    request.on('data', (chunk) => {
      buffers.push(chunk)
    })
    request.on('end', () => {
      const body = Buffer.concat(buffers).toString()
      resolve(body)
    })
    request.on('error', (err) => {
      reject(err)
    })
  })
  // return (async (): Promise<string> => {
  //   const request = this._rawRequest

  //   const buffers = []
  //   for await (const chunk of request) {
  //     buffers.push(chunk)
  //   }
  //   const body = Buffer.concat(buffers).toString()

  //   return body
  // })()
}
