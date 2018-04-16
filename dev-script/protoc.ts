import path from 'path'
import fs from 'fs-extra'
import glob from 'glob'
import { execFile } from 'child_process'

const BIN = './node_modules/.bin'
const PROTO = './proto'
const OUT = './src/interface/rpc/protobuf'

const protoc = path.resolve(BIN, 'grpc_tools_node_protoc')

const tsPlugin = `--plugin=protoc-gen-ts=${path.resolve(BIN, 'protoc-gen-ts')}`

const jsOut = `--js_out=import_style=commonjs,binary:${OUT}`
const grpcOut = `--grpc_out=${OUT}`
// expect https://github.com/improbable-eng/ts-protoc-gen/pull/42
// const tsOut = `--ts_out=grpc=true:${OUT}`
const tsOut = `--ts_out=${OUT}`
const protoPath = `--proto_path=${PROTO}`

glob(`${PROTO}/*.proto`, (err, matches) => {
  if (err) { throw err }
  fs.ensureDirSync(OUT)
  const childProcess = execFile(protoc, [tsPlugin, jsOut, grpcOut, tsOut, protoPath, matches.join(' ')], function (error, stdout, stderr) {
    if (error) { throw error }
  })

  childProcess.stdout.pipe(process.stdout)
  childProcess.stderr.pipe(process.stderr)
})
