<h1 align="center">
  <a href="ttps://uniqys.net/kit"><img width="320" src="UniqysKit-logo.png" alt="Uniqys Kit logo" /></a>
</h1>

# What is Uniqys Kit?

Uniqys Kit is a developer-friendly toolkit to create scalable DApps on [Uniqys Network](https://uniqys.net).
Uniqys Kit has two main components: Chain Core and Easy Framework.

- Chain Core provides fast and scalable blockchain infrastructure by using the sidechain technology.
- Easy Framework enables developers to create DApps without having blockchain in mind.

Both are currently under development.

For details, please visit [our website](https://uniqys.net/kit).

# Current status

This is a beta version of Uniqys Kit, and it is still under development.
It is ready for building a blockchain and is able to take consensus to maintain a sole application state in the network.

We would appreciate if you could give us your feedback via GitHub issue, [Gitter](https://gitter.im/uniqys/UniqysKit-preview), or [Twitter](https://twitter.com/uniqys).

## Chain Core

`chain-core-dev` package is removed, and `chain-core` package is available.
`chain-core` implements Tendermint consensus algorithm and thereby it can construct a secure blockchain network.
It only supports static validator set, and dynamic validator set will be implemented in the future version.
 
## Easy Framework

Easy Framework is ready for developers to use, and it now provides you necessary data for building DApps (i.e. timestamp, block hash).

# Getting started

## Setup for [ndenv](https://github.com/riywo/ndenv)

```sh
$ ndenv install v10.9.0
```

## Installation

:memo: This project is created as monorepo. You must run bootstrap before building Uniqys Kit.

```sh
$ npm install
$ npm run bootstrap
```

## Build

```sh
$ npm run build
```

## Trying samples

After building Uniqys Kit, please see [packages/samples directory.](packages/samples/)

## Tests

```sh
$ npm test
```

## Creating your DApp

We are currently preparing documents for building a DApp with Uniqys Kit.
To see our examples, please refer to [packages/samples](packages/samples/).

Building a DApp with Uniqys Kit is mostly as simple as building a modern web application.

- To implement a server-side API, use Memcached (with permanent data storage) for the database. You can use the existing memcached library.
- To implement a frontend, use Easy Client for accessing your server-side API. Consider Easy Client as an HTTP client library (like Axios) with features to sign a transaction.

# License

License for each package in Uniqys Kit is different.  
Some packages are under the Apache License Version 2.0, and the other packages are under the Mozilla Public License Version 2.0.

Please refer to `LICENSE` under each package.
