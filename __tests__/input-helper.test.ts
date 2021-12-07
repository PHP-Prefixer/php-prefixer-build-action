import {InputHelper, getInputs} from '../src/input-helper'
import {expect, test, beforeEach} from '@jest/globals'
import {env} from 'process'

let inputHelper: InputHelper

beforeEach(async () => {
  inputHelper = new InputHelper()
})

test('default input source dir path', async () => {
  const result = inputHelper.sourceDirPath('')
  expect(result.startsWith('/')).toBeTruthy()
})

test('absolute input source dir path', async () => {
  const result = inputHelper.sourceDirPath('/home/etc')
  expect(result).toBe('/home/etc')
})

test('relative input source dir path', async () => {
  const result = inputHelper.sourceDirPath('etc')
  expect(result.endsWith('/etc')).toBeTruthy()
})

test('relative base composer file path', async () => {
  const result = inputHelper.baseComposerFilePath()
  expect(result.endsWith('/composer.json')).toBeTruthy()
})

test('get inputs', async () => {
  env.INPUT_PERSONAL_ACCESS_TOKEN = 'input-personal-access-token'
  env.INPUT_PROJECT_ID = '12345'

  const result = getInputs()
  expect(result.personalAccessToken).toBe('input-personal-access-token')
  expect(result.projectId).toBe('12345')
})
