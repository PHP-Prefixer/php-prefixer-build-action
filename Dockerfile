# https://github.com/docker-library/php/blob/d2b630dc89b257cb80d6fc99e177caae152830b8/8.0/buster/cli/Dockerfile
FROM php:8.0.9-cli
RUN curl -sSfL -o /php-prefixer-cli.phar 'https://github.com/PHP-Prefixer/php-prefixer-cli/releases/download/0.0.6/php-prefixer-cli.phar' \
    && chmod +x php-prefixer-cli.phar \
    && curl -sSfL -o /usr/local/bin/composer 'https://getcomposer.org/composer.phar' \
    && chmod +x /usr/local/bin/composer \
    && apt-get update \
    && apt-get install -y --no-install-recommends git rsync \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
