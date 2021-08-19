
<img src="https://php-prefixer.com/images/logo/php-prefixer-action_100.png" align="right" alt="PHP Prefixer Action for Github" />

Use the PHP Prefixer CLI in your Github Actions
============================================

The **PHP Prefixer Build Action** integrates the [PHP-Prefixer](https://php-prefixer.com/) service with GitHub Actions.

**PHP-Prefixer** is a service to apply PHP prefixes to namespaces, functions, helpers, traits, interfaces, etc. Start with a Composer project and a set of dependencies, and prefix all library files at once to generate a consistent prefixed codebase.

PHP-Prefixer abstracts the complexity of manually applying prefixes to PHP files. The service **automates and streamlines the process of prefixing** with the scalability and simplicity of serverless computing.

PHP-Prefixer is a **rule-based expert system** that processes the project and dependencies iteratively to prefix every project file.

Given this sample class declaration:

```php
namespace ACME\Carbon;

use ACME\Carbon\Exceptions\InvalidDateException;
use DateInterval;
use ACME\Symfony\Component\Translation;

class Carbon extends DateTime
{
    const NO_ZERO_DIFF = 01;
...
```

The associated prefixed class declaration, with a new and distinct namespace `ACME`:

```php
namespace ACME\Carbon;

use ACME\Carbon\Exceptions\InvalidDateException;
use DateInterval;
use ACME\Symfony\Component\Translation;

class Carbon extends DateTime
{
    const NO_ZERO_DIFF = 01;
...
```

An example repository has been created at https://github.com/PHP-Prefixer/hello-wp-world to show how to use this action in a real project. The repository also depends on a private dependency and uses GitHub PAT/Personal Access Tokens for authentication.

## Usage

To use the Action, you must create an account on [PHP-Prefixer](https://php-prefixer.com/) and prepare your projects with the prefix defined in the `composer.json` schema. Before using the Action and the command-line, we recommend checking the documentation and guides here: <https://php-prefixer.com/docs/>. You can also prefix your firsts projects on the service web interface, and in a second step, integrate Action in your repositories.

Create your Github Workflow configuration in `.github/workflows/prefixer.yml` or similar.

```yaml
name: Prefixer

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Run PHP-Prefixer
        uses: PHP-Prefixer/php-prefixer-build-action@v0.0.2
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
          project_id: ${{ secrets.PROJECT_ID }}
    # ... then your own project steps ...
```

### Available Parameters

The Action requires two parameters to function, and it can receive additional parameters for GitHub integration:

Parameter | Description | Required | Example
---------|----------| ---------|----------
PERSONAL_ACCESS_TOKEN | The PHP-Prefixer PAT/Personal Access Token. The token must be configured in the PHP-Prefixer account. | Yes | `789\|123456789...`
PROJECT_ID | The project ID to process the source code. The project must be configured in your account in the PHP-Prefixer account. | Yes | `5432`
SOURCE_DIR_PATH | The relative path to the source project directory. It must contain a .git repository and composer.json file. If not, set the base repository directory will be used as the value. Example: `foo/bar`. | No | `./`
TARGET_BRANCH | The branch in the repository where PHP-Prefixer will store the prefixed files after processing. Default value: `prefixed`. | No |
GH_PERSONAL_ACCESS_TOKEN | The GitHub PAT/Personal Access Token to access private repositories. It is only required if the project, the library or the dependencies are private. | No | `ghp_F4fZ9Cq7QF...`

## Prefixing Private Repositories

To prefix from a private repository, GitHub PAT/Personal Access Tokens must be used. Generate a **Personal Access Token** for this purpose and add it to your private repository's configuration.

Create a [Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) for the Github account you wish to authenticate with.

Add the GitHub PAT/Personal Access Tokens to your project using  [Github Secrets][secrets], and pass them into the `PHP-Prefixer/php-prefixer-build-action` action by using the `gh_personal_access_token` input.

Example yaml, showing how to pass secrets:

```yaml
jobs:
  build:

    ...

      - name: Run PHP-Prefixer
        uses: PHP-Prefixer/php-prefixer-build-action@v0.0.2
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          personal_access_token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
          project_id: ${{ secrets.PROJECT_ID }}
          gh_personal_access_token: ${{ secrets.GH_PERSONAL_ACCESS_TOKEN }}
```

There is an example repository available for reference at https://github.com/PHP-Prefixer/hello-wp-world that uses a private dependency. Check it out for a live working project.

## Version Numbers

This action is released with semantic version numbers and tagged, so the latest major release's tag always points to the latest release within the matching major version.

Please feel free to use `uses: PHP-Prefixer/php-prefixer-build-action@v1` to always run the latest version of v1, or `uses: PHP-Prefixer/php-prefixer-build-action@v1.0.0` to specify the exact release.

***

If you found this repository helpful, please consider [upvoting the product on ProductHunt](https://www.producthunt.com/posts/php-prefixer).

## Additional Links

- PHP-Prefixer: https://php-prefixer.com/
- Documentation: https://php-prefixer.com/docs
- Config Reference: https://php-prefixer.com/docs/config/
- API: https://php-prefixer.com/docs/rest-api-reference/
- Command Line: https://php-prefixer.com/docs/command-line/

[secrets]: https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets