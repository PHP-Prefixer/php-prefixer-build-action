export interface IPhpPrefixerSettings {
  /**
   * Source Directory: The project source directory
   */
  sourceDirPath: string

  /**
   * Target Directory: The target directory where the results are stored
   */
  targetDirPath: string

  /**
   * Personal Access Token: The personal access token, generated on PHP-Prefixer Account Settings
   */
  personalAccessToken: string

  /**
   * Project ID: The identification of the configured project on PHP-Prefixer Projects
   */
  projectId: string

  /**
   * GitHub Access Token:  An optional GitHub token to access composer.json dependencies that are managed in private repositories.
   */
  ghPersonalAccessToken: string
}
