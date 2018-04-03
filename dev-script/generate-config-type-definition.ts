
import fs from 'fs-extra'
import path from 'path'
import glob from 'glob'
import { compileFromFile } from 'json-schema-to-typescript'

const SCHEMA = './config-schema/*.json'
const OUT_DIR = './src/config/schema-generated'
const BANNER = `
/**
 * This file was automatically generated from JSON schema.
 * DO NOT MODIFY IT BY HAND.
 */
 `

glob(SCHEMA, (err, matches) => {
  if (err) { throw err }
  matches.forEach(schema => {
    const parsed = path.parse(schema)
    const dts = path.format({ dir: OUT_DIR, name: parsed.name, ext: '.d.ts' })
    const copy = path.format({ dir: OUT_DIR, base: parsed.base })
    fs.ensureDirSync(OUT_DIR)
    fs.copyFileSync(schema, copy)
    compileFromFile(schema, { bannerComment: BANNER })
      .then(out => fs.writeFileSync(dts, out))
    console.log(`${schema} => ${dts}`)
  })
})
