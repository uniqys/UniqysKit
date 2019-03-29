// import Web3 from "web3"

export {}
declare global {
  export const web3: any
  export const contract: TruffleTest
  interface TruffleTest {
      (description: string, callback: (this: Mocha.ISuiteCallbackContext, accounts: string[]) => void): Mocha.ISuite
      only(description: string, callback: (this: Mocha.ISuiteCallbackContext, account: string[]) => void): Mocha.ISuite
      skip(description: string, callback: (this: Mocha.ISuiteCallbackContext, account: string[]) => void): void
      timeout(ms: number | string): void
  }

  export const artifacts: Artifacts
  interface Artifacts {
    require(id: string): any
  }

  export const assert: Chai.Assert
}
