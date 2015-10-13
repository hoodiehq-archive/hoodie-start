#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var url = require('url')

var _ = require('lodash')
var emoji = require('node-emoji')
var log = require('npmlog')
var nopt = require('nopt')
var rc = require('rc')
var relative = require('require-relative')
var semver = require('semver')

log.style = {
  silly: {inverse: true, bold: true},
  verbose: {fg: 'brightBlue', bold: true},
  info: {fg: 'brightGreen', bold: true},
  http: {fg: 'brightGreen', bold: true},
  warn: {fg: 'brightYellow', bold: true},
  error: {fg: 'brightRed', bold: true},
  silent: undefined
}
log.prefixStyle = {fg: 'magenta'}
log.headingStyle = {}
log.disp = {
  silly: 'Sill' + emoji.get('mega') + ' ',
  verbose: 'Verb' + emoji.get('speech_balloon') + ' ',
  info: 'Info' + emoji.get('mag') + ' ',
  http: 'HTTP' + emoji.get('link') + ' ',
  warn: 'Warn' + emoji.get('zap') + ' ',
  error: 'Err!' + emoji.get('anger') + ' ',
  silent: 'silent'
}
log.heading = emoji.get('dog') + ' Hoodie'

if (semver.lt(process.versions.node, '4.0.0')) {
  log.error('env', 'A node version >=4 is required to run Hoodie')
  process.exit(1)
}

var knownOpts = {
  'admin-password': String,
  'admin-port': Number,
  port: Number,
  'bind-address': String,
  'in-memory': Boolean,
  path: path,
  data: path,
  www: path,
  'db-password': String,
  'db-port': Number,
  'db-url': String,
  loglevel: [
    'silly',
    'verbose',
    'info',
    'http',
    'warn',
    'error',
    'silent'
  ],
  help: Boolean,
  version: Boolean
}

var shortHands = {
  h: '--help',
  usage: '--help',
  v: '--version',
  m: '--in-memory',
  s: ['--loglevel', 'silent'],
  d: ['--loglevel', 'info'],
  dd: ['--loglevel', 'verbose'],
  ddd: ['--loglevel', 'silly'],
  silent: ['--loglevel', 'silent'],
  verbose: ['--loglevel', 'verbose'],
  quiet: ['--loglevel', 'warn']
}

var argv = nopt(knownOpts, shortHands)

if (argv.help) {
  process.stdout.write(fs.readFileSync(path.join(__dirname, 'readme.txt'), 'utf8'))
  process.exit(0)
}

if (argv.version) {
  var pkg = require('../package.json')
  console.log(pkg.version, '\n')
  _.forEach(pkg.dependencies, function (value, key) {
    if (!/^hoodie/.test(key)) return

    console.log(key + ': ' + value)
  })
  process.exit(0)
}

var options = rc('hoodie', {}, _.mapKeys(_.omit(argv, ['argv']), function (value, key) {
  return _.camelCase(key)
}))

log.level = options.loglevel || 'warn'

log.verbose('app', 'Initializing')

var hoodieServer

try {
  // with a flat npm@3 install,
  // or when run from inside `hoodie`
  hoodieServer = relative('hoodie-server')
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e

  var appPkg = relative('./package.json')

  if (appPkg.name === 'hoodie-server') {
   // run from inside `hoodie-server`
    hoodieServer = relative('./')
  } else {
    // with a nested npm@2 install
    hoodieServer = relative('hoodie/node_modules/hoodie-server')
  }
}

hoodieServer(options, function (err, server, env_config) {
  if (err) return log.error('app', 'Failed to initialize', err)

  log.verbose('app', 'Starting')

  server.start(function () {
    console.log(emoji.get('dog') + ' Your Hoodie app has started on ' + url.format(env_config.app))
    log.verbose('app', 'Serving admin-dashboard at ' + url.format(env_config.admin))
    log.verbose('app', 'Database running at ' + url.format(_.omit(env_config.db, 'auth')))
  })
})
