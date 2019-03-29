# Uniqys Kit samples

:warning: You need to build before running any sample.

```sh
npm install
npm run bootstrap
npm run build
```

This is a sample directory of Uniqys Kit.
The following applications are included.
We will add more later.

## Messages

Messages is a simple application that can post and read messages.
You get a token every time you post a message.
Tokens you received are transferrable to other accounts.

### Start 1 validator node network

```sh
cd packages/samples/messages/uniqys-node
npx uniqys init
npx uniqys start
```

Finally, open `http://localhost:8080` in your browser.

### Start 4 validator nodes network

```sh
cd packages/samples/messages/uniqys-4-node
cd node1
npx uniqys init
npx uniqys start
```

Repeat 4 times `node[1-4]`.

Open `http://localhost:8080`, `8081`, `8082` or `8083` in your browser.

## Ethereum Sidechain

Ethereum Sidechain is a simple application that can transfer a token between Ethereum and Sidechain.

### Start the sample application

First, you start a node of Ethereum blockchain in local.
https://truffleframework.com/ganache

Second, you deploy SampleToken contract to the node.

```bash
cd packages/samples/eth-sidechain
npm run migrate
```

```bash
cd uniqys-node
npx uniqys init
npx uniqys start
```

Open `http://localhost:8080` in your browser.
Then, select `Custom RPC` in the `Networks` in Metamask.
You input `http://localhost:7545` as a new RPC URL, because the JSON-RPC server started by Ganache listens to the 7545 port.
Next, select `Import Account` in the `My Accounts` and input the private key displayed in Ganache.
You can see about 100ETH in your account in Metamask (account A).
In the same manner, set the private key in `validator.json` and get an account (account B).
Then, you send some ETH from the account A to the account B.
Finally, reload the browser, and you can see `Balance` of the Ethereum column become 999.
