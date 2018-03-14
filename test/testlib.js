'use strict';

module.exports = require('..').generateShelf('../package.json', require('./schemas'), { methods: require('./methods') });
