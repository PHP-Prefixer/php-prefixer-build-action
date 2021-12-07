import * as fs from 'fs'
import {makeTempPath} from '../src/fs-helper'
import {expect, test, beforeEach} from '@jest/globals'
import InputHelper from '../src/input-helper'
import {IGitHelper, createGitHelper} from '../src/git-helper'
import {getExecOutput} from '@actions/exec'

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

  await fs.promises.rm(srcTmpPath, {recursive: true})
  srcTmpPath = undefined
}

let gitHelper: IGitHelper

beforeEach(async () => {
  const inputHelper = new InputHelper()
  gitHelper = await createGitHelper(inputHelper.baseDirPath, false)
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
  const result1 = await gitHelper.branchExists(false, 'master')
  expect(result1).toBeFalsy()

  const result2 = await gitHelper.branchExists(false, 'main')
  expect(result2).toBeTruthy()
})

test('checkout new branch', async () => {
  const tmpIGitHelper = await createTmpRepo()

  let branch = await tmpIGitHelper.currentBranch()
  expect(branch).toBe('master')

  await tmpIGitHelper.checkoutToBranch(false, 'prefixed-1.0.0')
  branch = await tmpIGitHelper.currentBranch()
  expect(branch).toBe('prefixed-1.0.0')

  await tmpIGitHelper.checkout('master', '')
  await tmpIGitHelper.checkoutToBranch(false, 'prefixed-1.0.0')

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
  const gitHelper = await createGitHelper(srcTmpPath, false)
  await gitHelper.init()
  await getExecOutput(`touch ${srcTmpPath}/composer.json`)
  await gitHelper.commitAll()
  await gitHelper.tag('1.2.3')

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const targetIGitHelper = await createGitHelper(targetTmpPath, false)
  const licenseFile = `${targetTmpPath}/license.txt`
  await getExecOutput(`touch ${licenseFile}`)
  await targetIGitHelper.commitAll()
  await targetIGitHelper.tag('1.2.4')
  await targetIGitHelper.push('master')

  const upstreamIGitHelper = await createGitHelper(upstreamTmpPath, false)
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
  const gitHelper = await createGitHelper(srcTmpPath, false)
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
