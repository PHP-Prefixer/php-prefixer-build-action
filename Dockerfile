# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

#
# https://github.com/docker-library/php/blob/d2b630dc89b257cb80d6fc99e177caae152830b8/8.0/buster/cli/Dockerfile
# https://hub.docker.com/_/php
#

FROM php:8.0-cli
LABEL maintainer="PHP-Prefixer / Desarrollos Inteligentes Virtuales, SL. <team@php-prefixer.com>"

RUN mkdir -p /github/workspace

RUN curl -sSfL -o /github/workspace/php-prefixer-cli.phar 'https://github.com/PHP-Prefixer/php-prefixer-cli/releases/download/0.0.6/php-prefixer-cli.phar' \
  && chmod +x /github/workspace/php-prefixer-cli.phar \
  && curl -sSfL -o /usr/local/bin/composer 'https://getcomposer.org/composer.phar' \
  && chmod +x /usr/local/bin/composer \
  && apt-get update \
  && apt-get install -y --no-install-recommends git rsync libzip-dev zip unzip \
  && docker-php-ext-configure zip \
  && docker-php-ext-install zip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - \
  && apt-get install -y nodejs

COPY dist /github/workspace/dist

COPY entrypoint.sh /github/workspace/
RUN chmod +x /github/workspace/entrypoint.sh
ENTRYPOINT ["/github/workspace/entrypoint.sh"]
