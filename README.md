<h1 align="center">
  <a href="ttps://uniqys.net/kit"><img width="320" src="UniqysKit-logo.png" alt="Uniqys Kit logo" /></a>
</h1>

[![CircleCI](https://circleci.com/gh/mfac/BPP.svg?style=svg&circle-token=81f42507830be7217929a9baf8d326395758abc7)](https://circleci.com/gh/mfac/BPP)

# What is Uniqys Kit?
Uniqys Kit is a developer-friendly toolkit to create scalable DApps on [Uniqys Network](https://uniqys.net).
It consists of two components, Chain Core and Easy Framework.
Chain Core provides fast and scalable blockchain infrastructure by using sidechain, while Easy Framework allows developers to create DApps without being conscious of the blockchain beneath.
Both are currently under development.

For details, please visit [our website](https://uniqys.net/kit).

# Current status
This is a preview version of Uniqys Kit, and it is still under development.
It has many features that are not implemented yet, but you can try playing our sample DApp or creating your own DApp.

We would appreciate if you could give us your feedback via GitHub issue or [Twitter](https://twitter.com/uniqys).
Then, we will discuss your feedback, and later release an improved version of Uniqys Kit under an OSS license.
We hope you will be looking forward to it!

## Chain Core
Chain Core is currently experimental.
It can synchronize blockchain, but the consensus algorithm is not implemented yet.

However, `chain-core-dev` is included in this repository, and is only for developing DApps.
It can only be run locally, and you can not synchronize blockchain via p2p network.

## Easy Framework
Easy Framework in this repository implements only minimal features for building DApps as with conventional web applications.
It surely does not have enough features yet; we will implement more convenient APIs, secure client, etc.
However, current version is enough to experience building DApps on Uniqys Core.


# Get started

## Setup for [ndenv](https://github.com/riywo/ndenv)

```
$ ndenv install v10.1.0
```

## Install

:memo: It use lerna for monorepo, so you should run bootstrap.

```
$ npm install
$ npm run bootstrap
```

## Build

```
$ npm run build
```

## Try sample
:memo: You need to build first.

```
$ cd packages/sample
$ npm start
```

and open `http://localhost:8080` in your browser.

## Tests

```
$ npm test
```

## Create your DApp
Sorry, documentation is not ready yet.
Basically, you can create DApps just like creating a backend using Memcached as a database, and a frontend using Axios as an HTTP client.
Please refer to the sample application.
