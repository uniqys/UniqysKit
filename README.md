<p align="center">
  <a href="ttps://uniqys.net/kit"><img width="320" src="UniqysKit-logo.png" alt="Uniqys Kit logo" /></a>
</p>

# Uniqys Kit: A blockchain platform for DApps

[![CircleCI](https://circleci.com/gh/uniqys/UniqysKit.svg?style=svg)](https://circleci.com/gh/uniqys/UniqysKit)

Uniqys Kit is a developer-friendly toolkit to create scalable DApps in [Uniqys Network](https://uniqys.net).
Uniqys Kit has two main components: Chain Core and Easy Framework.

- Chain Core provides fast and scalable blockchain infrastructure by using the sidechain technology.
- Easy Framework enables developers to create DApps without being conscious of the blockchain.

For details, please visit our [website](https://uniqys.net/kit) and [documentation](https://uniqys.github.io/UniqysKitDocs/).

## Current status

This is a beta version of Uniqys Kit, and it is still under development.
It is ready for building a blockchain and is able to take consensus to maintain a sole application state in the network.

We would appreciate if you could give us your feedback via GitHub issue, [Gitter](https://gitter.im/uniqys/UniqysKit-preview), or [Twitter](https://twitter.com/uniqys).

### Chain Core

`chain-core-dev` package is removed, and `chain-core` package is available.
`chain-core` implements Tendermint consensus algorithm and thereby it can construct a secure blockchain network.
It only supports static validator set, and dynamic validator set will be implemented in the future version.

### Easy Framework

Easy Framework is ready for developers to use, and it now provides you necessary data for building DApps (i.e. timestamp, block hash).

## Getting started

### Setup for [nodenv](https://github.com/nodenv/nodenv)

```sh
$ nodenv install
```

### Install

:memo: This project is created as monorepo. You must run bootstrap before building Uniqys Kit.

```sh
$ npm install
$ npm run bootstrap
```

### Build

```sh
$ npm run build
```

### Test

```sh
$ npm test
```

### Try Samples

After building Uniqys Kit, please see [packages/samples directory.](packages/samples/)

### Create Your DApp

Please check our [documentation](https://uniqys.github.io/UniqysKitDocs/) for instruction.
To see our examples, please refer to [packages/samples](packages/samples/).

Building a DApp with Uniqys Kit is mostly as simple as building a modern web application.

- To implement a server-side API, use Memcached (with permanent data storage) for the database. You can use the existing memcached library.
- To implement a frontend, use Easy Client for accessing your server-side API. Consider Easy Client as an HTTP client library (like Axios) with features to sign a transaction.

## License

License for each package in Uniqys Kit is different.
Some packages are under the Apache License Version 2.0, and the other packages are under the Mozilla Public License Version 2.0.

Please refer to `LICENSE` under each package.
