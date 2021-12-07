import * as fs from 'fs'
import {create as createFindCommandManager} from './find-command-manager'
import {create as createRsyncCommandManager} from './rsync-command-manager'
import {mkdtemp} from 'fs/promises'
import os from 'os'
import path from 'path'

export async function makeTempPath(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), 'tmp-'))
}

export async function prepareTargetDirPath(
  targetDirPath: string
): Promise<boolean> {
  if (!fs.existsSync(targetDirPath)) {
    throw new Error(`The ${targetDirPath} does not exist`)
  }

  const findCommandManager = await createFindCommandManager(targetDirPath)

  /*
      Remove the source composer.json, composer.lock, vendor, and vendor_prefixed from target directory
          to avoid collisions when receiving the prefixed results. The prefixed composer.json,
          composer.lock and vendor folders are included in the prefixed results and they must
          replace the files copied from source.
  */
  for (const file of ['composer.json', 'composer.lock']) {
    await findCommandManager.deleteFileRecursively(file)
  }

  for (const folder of ['vendor', 'vendor_prefixed']) {
    await findCommandManager.deleteFolderRecursively(folder)
  }

  return true
}

export async function copyFilesFromSourceDirToTargetDir(
  sourceDirPath: string,
  targetDirPath: string
): Promise<boolean> {
  const rsyncCommandManager = await createRsyncCommandManager()
  await rsyncCommandManager.copyProjectFiles(sourceDirPath, targetDirPath)

  return true
}

export async function copyRepoDotGit(
  sourceDirPath: string,
  targetDirPath: string
): Promise<boolean> {
  const rsyncCommandManager = await createRsyncCommandManager()
  await rsyncCommandManager.copyDotGitFolder(sourceDirPath, targetDirPath)

  return true
}
