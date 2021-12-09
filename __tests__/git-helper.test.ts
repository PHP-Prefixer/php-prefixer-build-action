import * as fs from 'fs'
import {makeTempPath} from '../src/fs-helper'
import {expect, test, beforeEach} from '@jest/globals'
import InputHelper from '../src/input-helper'
import {IGitHelper, createGitHelper} from '../src/git-helper'
import {getExecOutput} from '@actions/exec'
import {env, cwd} from 'process'
import {createCommandManager} from '../src/git-command-manager'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'

let srcTmpPath: string | undefined
let sourceSettings: IGitSourceSettings

async function createTmpRepo(): Promise<IGitHelper> {
  srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()

  await getExecOutput(`touch ${srcTmpPath}/composer.json`)
  await gitHelper.commitAll()

  return gitHelper
}

async function destroyTmpRepo() {
  if (!srcTmpPath) {
    return
  }

  await fs.promises.rm(srcTmpPath, {recursive: true})
  srcTmpPath = undefined
}

let gitHelper: IGitHelper

beforeEach(async () => {
  sourceSettings = {
    repositoryPath: '',
    repositoryOwner: '',
    repositoryName: '',
    ref: '',
    commit: '',
    clean: true,
    fetchDepth: 1,
    lfs: false,
    submodules: false,
    nestedSubmodules: false,
    authToken: env.PHP_PREFIXER_GH_TOKEN || '',
    sshKey: '',
    sshKnownHosts: '',
    sshStrict: true,
    persistCredentials: true
  }

  const inputHelper = new InputHelper()
  sourceSettings.repositoryPath = inputHelper.baseDirPath
  gitHelper = await createGitHelper(sourceSettings)

  env.GITHUB_REPOSITORY = 'lorem/ipsum'
})

test('branch contains tag', async () => {
  const tmpIGitHelper = await createTmpRepo()

  await tmpIGitHelper.tag('1.0.0')
  const result = await tmpIGitHelper.branchContainsTag('1.0.0')

  expect(result).toBe('master')

  destroyTmpRepo()
})

test('branch contains tag error', async () => {
  try {
    await gitHelper.branchContainsTag('101.102.103')
  } catch (error) {
    expect((error as Error).message).toBe('No branch found')
  }
})

test('branch exists', async () => {
  const result1 = await gitHelper.branchExists(false, '', 'master')
  expect(result1).toBeFalsy()

  const result2 = await gitHelper.branchExists(false, '', 'main')
  expect(result2).toBeTruthy()
})

test('checkout new branch', async () => {
  const tmpIGitHelper = await createTmpRepo()

  let branch = await tmpIGitHelper.currentBranch()
  expect(branch).toBe('master')

  await tmpIGitHelper.checkoutToBranch(false, '', 'prefixed-1.0.0')
  branch = await tmpIGitHelper.currentBranch()
  expect(branch).toBe('prefixed-1.0.0')

  await tmpIGitHelper.checkout('master', '')
  await tmpIGitHelper.checkoutToBranch(false, '', 'prefixed-1.0.0')

  branch = await tmpIGitHelper.currentBranch()
  expect(branch).toBe('prefixed-1.0.0')

  destroyTmpRepo()
})

test('current branch', async () => {
  const result = await gitHelper.currentBranch()
  expect(result).toBe('main')
})

test('current revision', async () => {
  const result = await gitHelper.currentRevision()
  expect(result.length).toBe(40)
})

test('current tag', async () => {
  const tmpIGitHelper = await createTmpRepo()

  await tmpIGitHelper.tag('1.0.0')
  const result = await tmpIGitHelper.currentTag()
  expect(result).toBe('1.0.0')

  destroyTmpRepo()
})

test('current tag error', async () => {
  const tmpIGitHelper = await createTmpRepo()

  const result = await tmpIGitHelper.currentTag()
  expect(result).toBeUndefined()

  destroyTmpRepo()
})

test('last matching tag', async () => {
  const tmpIGitHelper = await createTmpRepo()

  await tmpIGitHelper.tag('1.2.3')
  const result = await tmpIGitHelper.lastMatchingTag('1.*')
  expect(result).toBe('1.2.3')

  destroyTmpRepo()
})

test('last matching tag no tag', async () => {
  const tmpIGitHelper = await createTmpRepo()

  const result = await tmpIGitHelper.lastMatchingTag('1.*')
  expect(result).toBeUndefined()

  destroyTmpRepo()
})

test('push', async () => {
  const srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()
  await getExecOutput(`touch ${srcTmpPath}/composer.json`)
  await gitHelper.commitAll()
  await gitHelper.tag('1.2.3')

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const targetSettings = {...sourceSettings, repositoryPath: targetTmpPath}
  const targetIGitHelper = await createGitHelper(targetSettings)
  const licenseFile = `${targetTmpPath}/license.txt`
  await getExecOutput(`touch ${licenseFile}`)
  await targetIGitHelper.commitAll()
  await targetIGitHelper.tag('1.2.4')
  await targetIGitHelper.push('origin', 'master')

  const upstreamSettings = {...sourceSettings, repositoryPath: upstreamTmpPath}
  const upstreamIGitHelper = await createGitHelper(upstreamSettings)
  const result1 = await upstreamIGitHelper.tagExists('1.2.3')
  expect(result1).toBeTruthy()
  const result2 = await upstreamIGitHelper.tagExists('1.2.4')
  expect(result2).toBeTruthy()

  await fs.promises.rm(srcTmpPath, {recursive: true})
  await fs.promises.rm(upstreamTmpPath, {recursive: true})
  await fs.promises.rm(targetTmpPath, {recursive: true})
})

test('revision date', async () => {
  const tmpIGitHelper = await createTmpRepo()

  const ref = await tmpIGitHelper.currentRevision()
  const result = await tmpIGitHelper.revisionDate(ref)
  expect(result).toBeInstanceOf(Date)

  destroyTmpRepo()
})

test('tag exists', async () => {
  const tmpIGitHelper = await createTmpRepo()

  await tmpIGitHelper.tag('1.2.3')
  const result = await tmpIGitHelper.tagExists('1.*')
  expect(result).toBeTruthy()

  destroyTmpRepo()
})

test('has changes', async () => {
  const srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()

  await fs.promises.mkdir(`${srcTmpPath}/vendor`)
  await fs.promises.mkdir(`${srcTmpPath}/vendor/composer`)
  const fileTmp = `${srcTmpPath}/test.tmp`
  await getExecOutput(`touch ${fileTmp}`)
  await getExecOutput(`touch ${srcTmpPath}/vendor/autoload.php'`)
  await getExecOutput(`touch ${srcTmpPath}/vendor/composer/autoload_real.php'`)
  await getExecOutput(
    `touch ${srcTmpPath}/vendor/composer/autoload_static.php'`
  )
  await getExecOutput(`touch ${srcTmpPath}/vendor/composer/installed.php'`)

  const hasChanges = await gitHelper.hasChanges()
  expect(hasChanges).toBeTruthy()
  await fs.promises.rm(srcTmpPath, {recursive: true})
})

test('remote add', async () => {
  const tmpIGitHelper = await createTmpRepo()

  await tmpIGitHelper.remoteAdd(false, 'prefixed-origin-1')
  const result1 = await tmpIGitHelper.remoteExists('prefixed-origin-1')
  expect(result1).toBeTruthy()

  await tmpIGitHelper.remoteAdd(true, 'prefixed-origin-2')
  const result2 = await tmpIGitHelper.remoteExists('prefixed-origin-2')
  expect(result2).toBeTruthy()

  if (srcTmpPath) {
    const commandManager = await createCommandManager(srcTmpPath, false)
    await commandManager.config(
      'remote.origin.url',
      'git@github.com:PHP-Prefixer/php-prefixer-build-action.git'
    )
    await tmpIGitHelper.remoteAdd(true, 'prefixed-origin-3')
    const result3 = await tmpIGitHelper.remoteExists('prefixed-origin-3')
    expect(result3).toBeTruthy()
  }

  destroyTmpRepo()
})
