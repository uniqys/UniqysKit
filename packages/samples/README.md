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
