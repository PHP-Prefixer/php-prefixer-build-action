import * as fs from 'fs'
import {expect, test, beforeEach} from '@jest/globals'
import {generateDotEnv, rmDotEnv} from '../src/env-helper'
import InputHelper from '../src/input-helper'
import {IPhpPrefixerSettings} from '../src/php-prefixer-settings'

let inputHelper: InputHelper
let mockedTargetPath: string
let config: IPhpPrefixerSettings

beforeEach(async () => {
  inputHelper = new InputHelper()
  mockedTargetPath = inputHelper.baseDirPath + '/__tests__/Mock-Composer'
  config = {
    personalAccessToken: 'INPUT_PERSONAL_ACCESS_TOKEN',
    projectId: 'INPUT_PROJECT_ID',
    sourceDirPath: 'SOURCE_DIR_PATH',
    targetDirPath: mockedTargetPath,
    ghPersonalAccessToken: 'GH_PERSONAL_ACCESS_TOKEN'
  }
})

test('generate dot env', async () => {
  const result = await generateDotEnv(mockedTargetPath, config)
  expect(result).toBeTruthy()

  const envFile = inputHelper.baseDirPath + '/__tests__/Mock-Composer/.env'
  expect(fs.existsSync(envFile)).toBeTruthy()

  rmDotEnv(mockedTargetPath)
})
