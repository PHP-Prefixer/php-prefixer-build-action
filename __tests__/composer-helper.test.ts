import * as fs from 'fs'
import {expect, test} from '@jest/globals'
import {createComposerHelper} from '../src/composer-helper'
import InputHelper from '../src/input-helper'

test('composer install & optimize', async () => {
  const inputHelper = new InputHelper()
  const composerLock =
    inputHelper.baseDirPath + '/__tests__/Mock-Composer/composer.lock'
  const composerVendor =
    inputHelper.baseDirPath + '/__tests__/Mock-Composer/vendor'

  !fs.existsSync(composerLock) || (await fs.promises.rm(composerLock))
  !fs.existsSync(composerVendor) ||
    (await fs.promises.rm(composerVendor, {recursive: true}))

  const composerHelper = await createComposerHelper(
    inputHelper.baseDirPath + '/__tests__/Mock-Composer'
  )
  const result = await composerHelper.installAndOptimize()
  expect(result).toBeTruthy()

  expect(fs.existsSync(composerLock)).toBeTruthy()
  expect(fs.existsSync(composerVendor)).toBeTruthy()
  expect(fs.existsSync(composerVendor + '/autoload.php')).toBeTruthy()

  fs.promises.rm(composerLock)
  fs.promises.rm(composerVendor, {recursive: true})
})
