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
   * Personal Access Token: The personal access token, generated on PHP-Prefixer Account Settings.
   */
  personalAccessToken: string

  /**
   * Project ID: The identification of the configured project on PHP-Prefixer Projects.
   */
  projectId: string

  /**
   * GitHub Access Token:  An optional GitHub token to access composer.json dependencies
   *  that are managed in private repositories.
   */
  ghPersonalAccessToken: string

  /**
   * PHP-Prefixer Schema:  The PHP-Prefixer JSON configuration to be applied to the project. By default,
      the prefixer uses the configuration present in composer.json. If there is no extra
      configuration or the extra configuration must be replaced, this parameter overrides
      the composer.json extra configuration to define the PHP-Prefixer schema. Example:
      '{"extra": {"php-prefixer": {"project-name": "Prefixed Project","namespaces-prefix": "PPP","global-scope-prefix": "PPP_"}}}'
   */
  schema: string
}
