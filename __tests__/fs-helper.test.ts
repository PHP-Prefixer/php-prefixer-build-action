import * as fs from 'fs'
import {expect, test} from '@jest/globals'
import {getExecOutput} from '@actions/exec'
import {
  makeTempPath,
  prepareTargetDirPath,
  copyFilesFromSourceDirToTargetDir,
  copyRepoDotGit
} from '../src/fs-helper'

test('make a tmp path', async () => {
  const result = await makeTempPath()
  expect(fs.existsSync(result)).toBeTruthy()
})

test('prepare target dir path', async () => {
  const tempPath = await makeTempPath()

  const composerFile = `${tempPath}/composer.json`
  await getExecOutput(`touch ${composerFile}`)

  const vendorFolder = `${tempPath}/vendor`
  await getExecOutput(`mkdir ${vendorFolder}`)

  const result = await prepareTargetDirPath(tempPath)
  expect(result).toBeTruthy()
  expect(fs.existsSync(tempPath)).toBeTruthy()
  expect(fs.existsSync(composerFile)).toBeFalsy()
  expect(fs.existsSync(vendorFolder)).toBeFalsy()

  await fs.promises.rm(tempPath, {recursive: true})
})

test('prepare target dir path error', async () => {
  try {
    await prepareTargetDirPath('/does/not/exist')
  } catch (error) {
    expect((error as Error).message).toBe('The /does/not/exist does not exist')
  }
})

test('copy files from source dir to target dir', async () => {
  const tempPath1 = await makeTempPath()
  const tempPath2 = await makeTempPath()

  const composerFile = `${tempPath1}/composer.json`
  await getExecOutput(`touch ${composerFile}`)
  const result = await copyFilesFromSourceDirToTargetDir(tempPath1, tempPath2)

  expect(result).toBeTruthy()
  expect(`${tempPath2}/composer.json`).toBeTruthy()
  await fs.promises.rm(tempPath1, {recursive: true})
  await fs.promises.rm(tempPath2, {recursive: true})
})

test('copy repo dot git', async () => {
  const src = await makeTempPath()
  const target = await makeTempPath()
  const gitFolder = src + '/.git'
  const gitHead = gitFolder + '/HEAD'
  await fs.promises.mkdir(gitFolder)
  await getExecOutput(`touch ${gitHead}`)

  const result = await copyRepoDotGit(src, target)
  expect(result).toBeTruthy()

  expect(fs.existsSync(`${target}/.git/HEAD`)).toBeTruthy()

  await fs.promises.rm(src, {recursive: true})
  await fs.promises.rm(target, {recursive: true})
})
