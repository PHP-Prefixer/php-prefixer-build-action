import * as fs from 'fs'
import * as gitSourceProvider from 'github-checkout/lib/git-source-provider'
import {create as createRsync} from '../src/rsync-command-manager'
import {env} from 'process'
import {expect, test, beforeEach, xtest} from '@jest/globals'
import {getExecOutput} from '@actions/exec'
import {IGitHelper, createGitHelper} from '../src/git-helper'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'
import {IPhpPrefixerSettings} from '../src/php-prefixer-settings'
import {makeTempPath} from '../src/fs-helper'
import {PhpPrefixerHelper} from '../src/php-prefixer-helper'
import InputHelper from '../src/input-helper'

let srcTmpPath: string | undefined

async function createTmpRepo(): Promise<IGitHelper> {
  srcTmpPath = await makeTempPath()
  const gitHelper = await createGitHelper(srcTmpPath, false)
  await gitHelper.init()

  await getExecOutput(`touch ${srcTmpPath}/composer.json`)
  await gitHelper.commitAll()

  return gitHelper
}

async function destroyTmpRepo() {
  if (!srcTmpPath) {
    return
  }

  if (fs.existsSync(srcTmpPath)) {
    await fs.promises.rm(srcTmpPath, {recursive: true})
  }

  srcTmpPath = undefined
}

let sourceSettings: IGitSourceSettings
let phpPrefixerSettings: IPhpPrefixerSettings

beforeEach(() => {
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

  phpPrefixerSettings = {
    sourceDirPath: '',
    targetDirPath: '',
    personalAccessToken: env.PHP_PREFIXER_PERSONAL_ACCESS_TOKEN || '',
    projectId: env.PHP_PREFIXER_PROJECT_ID || '',
    ghPersonalAccessToken: env.PHP_PREFIXER_GH_TOKEN || ''
  }
})

test('waiting job true - guzzle master / prefixed', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'guzzle'
  sourceSettings.repositoryOwner = 'guzzle'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeTruthy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed')
  expect(phpPrefixerHelper.targetPrefixedTag).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job true - guzzle 7.0 / prefixed-7.0', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'guzzle'
  sourceSettings.repositoryOwner = 'guzzle'
  sourceSettings.ref = '7.0'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeTruthy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed-7.0')
  expect(phpPrefixerHelper.targetPrefixedTag).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job true - guzzle master 7.1.1 / prefixed prefixed-7.1.1', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'guzzle'
  sourceSettings.repositoryOwner = 'guzzle'
  sourceSettings.ref = '7.1.1'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeTruthy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed')
  expect(phpPrefixerHelper.targetPrefixedTag).toBe('prefixed-7.1.1')

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job false - local master / prefixed', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.checkoutToBranch(false, 'prefixed')
  await getExecOutput(`touch ${srcTmpPath}/license.txt`)
  await gitHelper.commitAll()
  gitHelper.checkoutToBranch(false, 'master')

  // Download source
  sourceSettings.ref = 'refs/heads/master'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await destroyTmpRepo()
})

test('waiting job false - local 7.0 / prefixed-7.0', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.checkoutToBranch(false, '7.0')
  await getExecOutput(`touch ${srcTmpPath}/license-time1.txt`)
  await gitHelper.commitAll()
  gitHelper.checkoutToBranch(false, 'prefixed-7.0')
  await getExecOutput(`touch ${srcTmpPath}/license-time2.txt`)
  await gitHelper.commitAll()
  gitHelper.checkoutToBranch(false, '7.0')

  // Download source
  sourceSettings.ref = '7.0'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await destroyTmpRepo()
  await phpPrefixerHelper.cleanup()
})

test('waiting job false - local master 7.1.1 / prefixed prefixed-7.1.1', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.tag('7.1.1')

  gitHelper.checkoutToBranch(false, 'prefixed')
  await getExecOutput(`touch ${srcTmpPath}/license.txt`)
  await gitHelper.commitAll()
  gitHelper.tag('prefixed-7.1.1')

  gitHelper.checkoutToBranch(false, 'master')

  // Download source
  sourceSettings.ref = '7.1.1'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await destroyTmpRepo()
  await phpPrefixerHelper.cleanup()
})

test('prefix - local master / prefixed', async () => {
  const inputHelper = new InputHelper()
  const mockedProject = inputHelper.baseDirPath + '/__tests__/Mock-PhpPrefixer'

  const srcTmpPath = await makeTempPath()
  const gitHelper = await createGitHelper(srcTmpPath, false)
  await gitHelper.init()
  const rsync = await createRsync()
  await rsync.copyProjectFiles(mockedProject, srcTmpPath)
  await gitHelper.commitAll()

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  // Download source
  sourceSettings.repositoryPath = srcTmpPath
  sourceSettings.ref = 'refs/heads/master'

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    undefined,
    targetTmpPath
  )
  const resultWaitingJob = await phpPrefixerHelper.waitingJob()
  expect(resultWaitingJob).toBeTruthy()

  const resultPrefix1 = await phpPrefixerHelper.prefix()
  expect(resultPrefix1).toBeTruthy()

  const upstreamIGitHelper = await createGitHelper(upstreamTmpPath, false)
  const branchExists = await upstreamIGitHelper.branchExists(false, 'prefixed')
  expect(branchExists).toBeTruthy()

  // Prefix again, to check that there are "No Changes"
  const resultPrefix2 = await phpPrefixerHelper.prefix({
    prepareRepositories: false
  })
  expect(resultPrefix2).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await fs.promises.rm(srcTmpPath, {recursive: true})
  await fs.promises.rm(upstreamTmpPath, {recursive: true})
})

test('prefix - local master 7.1.1 / prefixed prefixed-7.1.1', async () => {
  const inputHelper = new InputHelper()
  const mockedProject = inputHelper.baseDirPath + '/__tests__/Mock-PhpPrefixer'

  const srcTmpPath = await makeTempPath()
  const gitHelper = await createGitHelper(srcTmpPath, false)
  await gitHelper.init()
  const rsync = await createRsync()
  await rsync.copyProjectFiles(mockedProject, srcTmpPath)
  await gitHelper.commitAll()
  await gitHelper.tag('7.1.1')

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  // Download source
  sourceSettings.repositoryPath = srcTmpPath
  sourceSettings.ref = '7.1.1'

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    undefined,
    targetTmpPath
  )
  const resultWaitingJob1 = await phpPrefixerHelper.waitingJob()
  expect(resultWaitingJob1).toBeTruthy()

  await phpPrefixerHelper.prefix()

  const upstreamIGitHelper = await createGitHelper(upstreamTmpPath, false)
  const branchExists = await upstreamIGitHelper.branchExists(false, 'prefixed')
  expect(branchExists).toBeTruthy()
  const tagExists = await upstreamIGitHelper.tagExists('prefixed-7.1.1')
  expect(tagExists).toBeTruthy()

  await phpPrefixerHelper.cleanup()
  await fs.promises.rm(srcTmpPath, {recursive: true})
  await fs.promises.rm(upstreamTmpPath, {recursive: true})
})
