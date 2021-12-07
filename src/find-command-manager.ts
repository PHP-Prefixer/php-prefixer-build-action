import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as fshelper from 'github-checkout/lib/fs-helper'
import * as io from '@actions/io'

export interface IFindCommandManager {
  deleteFileRecursively(file: string): Promise<void>
  deleteFolderRecursively(folder: string): Promise<void>
}

export async function create(
  workingDirectory: string
): Promise<IFindCommandManager> {
  return await FindCommandManager.create(workingDirectory)
}

class FindCommandManager implements IFindCommandManager {
  private findPath = ''
  private workingDirectory = ''

  // Private constructor; use createCommandManager()
  private constructor() {}

  async deleteFileRecursively(file: string): Promise<void> {
    const args = [this.workingDirectory, '-name', file, '-type', 'f', '-delete']

    await this.execFind(args)
  }

  async deleteFolderRecursively(folder: string): Promise<void> {
    const args = [this.workingDirectory, '-name', folder, '-type', 'd']

    const result = await this.execFind(args)
    const folders = result.stdout
      .trim()
      .split('\n')
      .filter(value => value)

    for (const path of folders) {
      await fs.promises.rm(path, {recursive: true})
    }
  }

  static async create(workingDirectory: string): Promise<FindCommandManager> {
    const result = new FindCommandManager()
    await result.initialize(workingDirectory)
    return result
  }

  private async execFind(
    args: string[],
    allowAllExitCodes = false,
    silent = false
  ): Promise<FindOutput> {
    fshelper.directoryExistsSync(this.workingDirectory, true)

    const result = new FindOutput()

    const env = {}
    for (const key of Object.keys(process.env)) {
      env[key] = process.env[key]
    }

    const stdout: string[] = []

    const options = {
      cwd: this.workingDirectory,
      env,
      silent,
      ignoreReturnCode: allowAllExitCodes,
      listeners: {
        stdout: (data: Buffer) => {
          stdout.push(data.toString())
        }
      }
    }

    result.exitCode = await exec.exec(`"${this.findPath}"`, args, options)
    result.stdout = stdout.join('')
    return result
  }

  private async initialize(workingDirectory: string): Promise<void> {
    this.workingDirectory = workingDirectory
    this.findPath = await io.which('find', true)
  }
}

class FindOutput {
  stdout = ''
  exitCode = 0
}
