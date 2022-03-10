import {
  Data, replayWithLatest,
  createGeneralDriver, useGeneralDriver_
} from '../libs/mobius-utils'

import type {
  ReplayDataMediator,
  DriverOptions, DriverLevelContexts, DriverSingletonLevelContexts, DriverInstance
} from '../libs/mobius-utils'
import type { ApolloServer } from 'apollo-server'

export interface ApolloServerDriverOptions extends DriverOptions {
  /**
   * @default 4000
   */
  port?: number
  /**
   * @default false
   */
  isAutoStart?: boolean
  apolloServer: ApolloServer
}
export interface ApolloServerDriverSingletonLevelContexts extends DriverSingletonLevelContexts {
  inputs: {
    start: Data<any>
  }
  outputs: {
    server: ReplayDataMediator<ApolloServer>
  }
}
export type ApolloServerDriverInstance = ApolloServerDriverSingletonLevelContexts

export const makeApolloServerDriver =
createGeneralDriver<ApolloServerDriverOptions, DriverLevelContexts, ApolloServerDriverSingletonLevelContexts, ApolloServerDriverInstance>({
  defaultOptions: {
    port: 4000,
    isAutoStart: false
  },
  prepareSingletonLevelContexts: (options, driverLevelContexts) => {
    const startSignalD = Data.empty<any>()
    const serverD = Data.empty<ApolloServer>()

    const serverRD = replayWithLatest(1, serverD)

    interface DriverStates {
      started: boolean
    }
    const driverStates: DriverStates = {
      started: false
    }
    const { port, isAutoStart, apolloServer } = options
    const startApolloServer = async (): Promise<void> => {
      const { url } = await apolloServer.listen()
      console.log(`
        🚀  ApolloServer is running as ${url}
        🔉  Listening on port ${port}
        📭  Query at https://studio.apollographql.com/dev
        📭  Or Query at https://studio.apollographql.com/sandbox/explorer
      `)
    }
    if (isAutoStart && !driverStates.started) {
      void startApolloServer()
      driverStates.started = true
    }
    startSignalD.subscribeValue(() => {
      if (!driverStates.started) {
        void startApolloServer()
        driverStates.started = true
      }
    })

    return {
      inputs: {
        start: startSignalD
      },
      outputs: {
        server: serverRD
      }
    }
  }
})

/**
 * @see {@link makeApolloServerDriver}
 */
export const useApolloServerDriver = useGeneralDriver_(makeApolloServerDriver)
