module.exports = {
  'allow-uncaught': false,
  'async-only': false,
  color: true,
  delay: false,
  diff: true,
  reporter: 'spec',
  require: ['./test/e2e/mocha-hooks.js'],
  timeout: 90000,
};
