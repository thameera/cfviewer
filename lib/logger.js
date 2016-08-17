'use strict';

const logger = require('winston');
const path = require('path');

// Console transport
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true,
  handleExceptions: true,
  json: false,
  level: 'debug'
});

// File transport - debug
logger.add(logger.transports.File, {
  name: 'file-debug-log',
  filename: path.join(process.cwd(), 'logs', 'debug.log'),
  handleExceptions: true,
  json: false,
  level: 'debug'
});

// File transport - info
logger.add(logger.transports.File, {
  name: 'file-info-log',
  filename: path.join(process.cwd(), 'logs', 'info.log'),
  json: false,
  level: 'info'
});

module.exports = logger;
