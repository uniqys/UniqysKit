# Uniqys Kit

<p align="center">
  <a href="ttps://uniqys.net/kit"><img width="320" src="UniqysKit-logo.png" alt="Uniqys Kit logo" /></a>
</p>

[![CircleCI](https://circleci.com/gh/uniqys/UniqysKit.svg?style=svg)](https://circleci.com/gh/uniqys/UniqysKit)

**WARNING:** Uniqys Kit is still in beta version, and we may still make some breaking changes.

Uniqys Kit is a framework for building Decentralized Applications (or DApps).
It is designed for web developers to easily build DApps: just as you always build your web app.

For details, visit our [project website](https://uniqys.net/kit) and [documentation](https://uniqys.github.io/UniqysKitDocs/).

Also, feedbacks are appreciated via GitHub issues, [Gitter](https://gitter.im/uniqys/UniqysKit), or [Twitter](https://twitter.com/uniqys).

## Introduction

Uniqys Kit has two main components:

- Chain Core: Builds and manages a blockchain on a Tendermint consensus algorithm.
- Easy Framework: A framework for developers to create DApps without being aware of the blockchain.

These two packages were designed to remove some of the current obstacles in creating or using DApps.

### How Does It Work?

Please check our [documentation](https://uniqys.github.io/UniqysKitDocs/).

### TL;DR

- Chain Core establishes an application-friendly blockchain network.
  - **Scalable:** Creates a single blockchain for every single DApp.
  - **Fast:** Instant finality and high transaction throughput are obtained with the Tendermint alogorithm.
  - **Flexible:** Developers can decide the most suitable transaction fees and incentives to the network maintainer.
- Easy Framework achieves "DApp development ≒ Web app development".
  - Building a REST API and a frontend is all you need to do to develop a DApp.
  - No programming language restriction.
  - Data storing on blockchain will be as simple as using a Memcached protocol.
  - Sending a transaction is sending a POST request.
- Track external events (i.e. Ethereum Events) in the blockchain network so that it can become a side chain.

## Getting Started

### Installing via npm

```sh
$ npm install @uniqys/cli
```

### Creating a DApp

Check our [Get Started documentation](https://uniqys.github.io/UniqysKitDocs/introduction/get-started.html) for instruction.

## Building

### Setup for [nodenv](https://github.com/nodenv/nodenv)

```sh
$ nodenv install
```

### Install

```sh
$ npm install
# This project is created as monorepo. Run bootstrap before building.
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

### Trying Samples

After building Uniqys Kit, please see the [packages/samples directory](packages/samples/) to try our samples.

## License

License for each package in Uniqys Kit is different.
Some packages are under the Apache License Version 2.0, and the others are under the Mozilla Public License Version 2.0.

Please refer to `LICENSE` file under each package.
