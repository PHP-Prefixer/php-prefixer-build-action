import * as core from '@actions/core'
import {env, cwd} from 'process'
import {test, expect} from '@jest/globals'
import {run, cleanup} from '../src/main-helper'
import * as checkoutInputHelper from 'github-checkout/lib/input-helper'
import {makeTempPath} from '../src/fs-helper'
import * as gitSourceProvider from 'github-checkout/lib/git-source-provider'
import * as fs from 'fs'
import {createGitHelper} from '../src/git-helper'

test('main', async () => {
  core.debug('[main-helper.test] test main')

  env.GITHUB_WORKSPACE = cwd()
  env.GITHUB_REPOSITORY = 'anibalsanchez/hello-wp-world'

  // phpPrefixerSettings
  env.INPUT_PERSONAL_ACCESS_TOKEN = env.PHP_PREFIXER_PERSONAL_ACCESS_TOKEN || ''
  env.INPUT_PROJECT_ID = env.PHP_PREFIXER_PROJECT_ID || ''

  // sourceSettings
  env.INPUT_REPOSITORY = 'anibalsanchez/hello-wp-world'
  env.INPUT_REF = ''
  env.INPUT_TOKEN = env.PHP_PREFIXER_GH_TOKEN || ''

  env['INPUT_PERSIST-CREDENTIALS'] = 'true'
  env['INPUT_FETCH-DEPTH'] = '0'

  // Push a last-build update
  const sourceSettings = checkoutInputHelper.getInputs()
  sourceSettings.repositoryPath = await makeTempPath()
  await gitSourceProvider.getSource(sourceSettings)

  const now = new Date()
  const content = `Last build ${now.toISOString()}`
  await fs.promises.writeFile(
    `${sourceSettings.repositoryPath}/last-build`,
    content
  )
  const gitHelper = await createGitHelper(sourceSettings)
  const currentBranch = await gitHelper.currentBranch()
  await gitHelper.commitAll()
  await gitHelper.push('origin', currentBranch)
  await fs.promises.rm(sourceSettings.repositoryPath, {recursive: true})
  sourceSettings.repositoryPath = ''

  core.debug('[main-helper.test] run err code 0 - to be prefixed')
  const errorCode0 = await run()
  expect(errorCode0).toBe(0)
  await cleanup()

  core.debug('[main-helper.test] run err code 0 - already prefixed')
  const errorCode1 = await run()
  expect(errorCode1).toBe(0)
  await cleanup()

  gitSourceProvider.cleanup(sourceSettings.repositoryPath)
})
