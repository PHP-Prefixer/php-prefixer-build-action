import {
  IComposerCommandManager,
  createCommandManager
} from './composer-command-manager'

export async function createComposerHelper(
  workingDirectory: string
): Promise<ComposerHelper> {
  return await ComposerHelper.create(workingDirectory)
}

export class ComposerHelper {
  // Private constructor; use createCommandManager()
  private constructor(
    private composerCommandManager: IComposerCommandManager
  ) {}

  async installAndOptimize(): Promise<boolean> {
    await this.composerCommandManager.install()
    await this.composerCommandManager.dumpAutoload()

    return true
  }

  static async create(workingDirectory: string): Promise<ComposerHelper> {
    const composerCommandManager = await createCommandManager(workingDirectory)
    return new ComposerHelper(composerCommandManager)
  }
}
