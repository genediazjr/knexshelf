'use strict';

module.exports = require('..').generateBarrel('../package.json', require('./schemas'), { methods: require('./methods') });
