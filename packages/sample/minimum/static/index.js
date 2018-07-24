const easy = new Easy('http://localhost:8080');
const param = document.getElementById('param');
const result = document.getElementById('result');

function hello () {
  easy.get('/hello')
    .then(res => result.innerText = `message: ${res.data}`);
}

function getMessage () {
  const id = parseInt(param.value)
  if (!id) {
    result.innerText = `Parameter is invalid: (param: ${id})`;
    return;
  }
  easy.get(`/messages/${id}`)
    .then(res => result.innerText = `message: ${res.data.contents}`)
    .catch(err => result.innerText = `err: ${err.toString()}`);
}

function postMessage () {
  const msg = param.value
  if (!msg) {
    result.innerText = `Parameter is invalid: (param: '${msg}')`;
    return;
  }
  easy.post('/messages', { contents: msg }, { sign: true })
    .then(res => result.innerText = `post: id ${res.data.id}, data ${res.data.contents}`)
    .catch(err => result.innerText = `err: ${err.toString()}`);
}

function fetchAccountInfo () {
  const account = easy.address.toString();
  easy.api.account(account)
    .then(account => result.innerText = `account: balance ${account.balance}, nonce ${account.nonce}`);
}

function send () {
  const addr = param.value
  if (!addr) {
    result.innerText = `Parameter is invalid: (param: '${addr}')`;
    return;
  }
  easy.post('/send', { to: addr, value: 1 }, { sign: true })
    .then(res => result.innerText = `sent`)
    .catch(err => result.innerText = `err: ${err.toString()}`);
}

