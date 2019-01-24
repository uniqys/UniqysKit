/*
  Copyright 2018 Bit Factory, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { App } from './app'

// set logger enable
import debug from 'debug'
debug.enable('app*')
const logger = debug('app')

logger(`Application listen: ${process.env['EASY_APP_HOST']}:${process.env['EASY_APP_PORT']}`)

const api = `${process.env['EASY_API_HOST']}:${process.env['EASY_API_PORT']}`

new App(api).listen({ host: process.env['EASY_APP_HOST'], port: process.env['EASY_APP_PORT'] })
logger(`Ready to serve!`)
