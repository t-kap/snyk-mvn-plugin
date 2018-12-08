var path = require('path');
var test = require('tap-only');
var plugin = require('../../lib');

test('run inspect()', function (t) {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.xml'))
    .then(function (result) {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.type(result.package.dependencies['junit:junit'], 'undefined',
        'no test deps');
    });
});

test('run inspect() on path with spaces', function (t) {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures/path with spaces', 'pom.xml'))
    .then(function (result) {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.type(result.package.dependencies['junit:junit'], 'undefined',
        'no test deps');
    });
});

test('run inspect() with --dev', function (t) {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.xml'), {dev: true})
    .then(function (result) {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.equal(result.package.dependencies['junit:junit'].version, '4.10',
        'test deps found');
    });
});

test('run inspect() with a bad dependency plugin', function (t) {
  t.plan(1);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.dep-plugin.xml'), {dev: true})
    .then(function () {
      t.fail('bad dependency plugin - we should not be here');
    })
    .catch(function (error) {
      t.match(error.message, 'Cannot find dependency information.',
        'proper error message');
    });
});

test('run inspect() with a bad pom.xml', function (t) {
  t.plan(1);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'bad-pom.xml'), {dev: true})
    .then(function () {
      t.fail('bad pom.xml - should have thrown!');
    })
    .catch(function (error) {
      t.match(error.message, 'executes successfully on this project',
        'proper error message');
    });
});
