const utils = require('./utils');

describe('teardown', () => {
  it('should not stop service containers when torn down', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('1.0.0');

    try {
      await utils.serviceComposeCommand('down --remove-orphans -t 1');
      expect.fail('expected to fail because network removal fails');
    } catch (err) {
      expect(err).to.match(utils.networkRemoveFailRe);
    }

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('1.0.0');
  });
});
