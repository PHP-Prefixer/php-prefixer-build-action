import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as io from '@actions/io'

export interface IRsyncCommandManager {
  copyProjectFiles(sourceDirPath: string, targetDirPath: string): Promise<void>
  copyDotGitFolder(sourceDirPath: string, targetDirPath: string): Promise<void>
}

export async function create(): Promise<IRsyncCommandManager> {
  return await RsyncCommandManager.create()
}

class RsyncCommandManager implements IRsyncCommandManager {
  private rsyncPath = ''

  // Private constructor; use createCommandManager()
  private constructor() {}

  async copyProjectFiles(
    sourceDirPath: string,
    targetDirPath: string
  ): Promise<void> {
    const args = [
      '-avq',
      '--delete',
      '--exclude=vendor/',
      '--exclude=vendor_prefixed/'
    ]

    if (fs.existsSync(`${targetDirPath}/.git`)) {
      args.push('--exclude=.git/')
    }

    args.push(`${sourceDirPath}/`)
    args.push(`${targetDirPath}/`)

    await this.execRsync(args)
  }

  async copyDotGitFolder(
    sourceDirPath: string,
    targetDirPath: string
  ): Promise<void> {
    const args = [
      '-avq',
      '--delete',
      `${sourceDirPath}/.git`,
      `${targetDirPath}/`
    ]

    await this.execRsync(args)
  }

  static async create(): Promise<RsyncCommandManager> {
    const result = new RsyncCommandManager()
    await result.initialize()
    return result
  }

  private async execRsync(
    args: string[],
    allowAllExitCodes = false,
    silent = false
  ): Promise<RsyncOutput> {
    const result = new RsyncOutput()

    const env = {}
    for (const key of Object.keys(process.env)) {
      env[key] = process.env[key]
    }

    const stdout: string[] = []

    const options = {
      env,
      silent,
      ignoreReturnCode: allowAllExitCodes,
      listeners: {
        stdout: (data: Buffer) => {
          /* istanbul ignore next */
          stdout.push(data.toString())
        }
      }
    }

    result.exitCode = await exec.exec(`"${this.rsyncPath}"`, args, options)
    result.stdout = stdout.join('')
    return result
  }

  private async initialize(): Promise<void> {
    this.rsyncPath = await io.which('rsync', true)
  }
}

class RsyncOutput {
  stdout = ''
  exitCode = 0
}
