const utils = require('./utils');

describe('install', () => {
  it('should add first docker-compose file', async () => {
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.be.undefined;
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.be.undefined;
    expect(await utils.getServiceVersion('three.yml', 'three')).to.be.undefined;

    const response = await utils.installContainers({
      'three.yml': await await utils.setVersion('three.yml', '2.0.0', false),
    });
    expect(response).to.deep.equal({
      'three.yml': { ok: true },
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.be.undefined;
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.be.undefined;
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('2.0.0');
  });

  it('should add additional docker-compose files', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.be.undefined;

    const response = await utils.installContainers({
      'three.yml': await await utils.setVersion('three.yml', '3.0.0', false),
    });
    expect(response).to.deep.equal({
      'three.yml': { ok: true },
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('3.0.0');
  });

  it('should add multiple compose files', async () => {
    await utils.up();

    const response = await utils.installContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '3.0.0', false),
      'three.yml': await utils.setVersion('three.yml', '2.0.0', false),
    });
    expect(response).to.deep.equal({
      'one-two.yml': { ok: true },
      'three.yml': { ok: true },
    });
    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('3.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('3.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('2.0.0');
  });

  it('should not overwrite existent files', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.up();

    const response = await utils.installContainers({
      'one-two.yml': await await utils.setVersion('one-two.yml', '2.0.0', false),
      'three.yml': await await utils.setVersion('three.yml', '3.0.0', false),
    });
    expect(response).to.deep.equal({
      'one-two.yml': { ok: false, reason: `Existing installation found. Use '/upgrade' API to upgrade.` },
      'three.yml': { ok: true },
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('3.0.0');
  });

  it('should return error when docker compose file is invalid', async () => {
    await utils.up();
    const response = await expect(utils.installContainers({
      'one-two.yml': 'this is definitely not valid yml'
    })).to.be.rejected;
    expect(response).to.deep.equal({
      error: true,
      reason: 'Invalid docker-compose yml for file one-two.yml',
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.be.undefined;
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.be.undefined;
    expect(await utils.getServiceVersion('three.yml', 'three')).to.be.undefined;
  });

  it('should return error when payload is incomplete', async () => {
    await utils.up();

    const response = await expect(utils.installContainers()).to.be.rejected;
    expect(response).to.deep.equal({
      error: true,
      reason: 'Invalid payload.',
    });
  });

  it('should return error when image was not found', async () => {
    await utils.up();

    const response = await expect(utils.installContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '13.0.0', false),
    })).to.be.rejected;
    expect(response.error).to.equal(true);
    expect(response.reason).to.include(
      'manifest for localhost:5000/upgrade/one:13.0.0 not found: manifest unknown: manifest unknown'
    );
    expect(response.reason).to.include(
      'manifest for localhost:5000/upgrade/two:13.0.0 not found: manifest unknown: manifest unknown'
    );

    await expect(utils.getServiceVersion('one-two.yml', 'one')).to.be.rejected;
    await expect(utils.getServiceVersion('one-two.yml', 'two')).to.be.rejected;
    expect(await utils.getServiceVersion('three.yml', 'three')).to.be.undefined;
  });

  it('should pass environment variables to containers', async () => {
    await utils.up(true, { FOO: 'this_is_foo', BAR: 'this_is_bar' });

    await utils.installContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '3.0.0', false),
      'three.yml': await utils.setVersion('three.yml', '3.0.0', false),
    });

    expect(await utils.getServiceEnv('one-two.yml', 'one', 'FOO')).to.deep.equal('this_is_foo');
    expect(await utils.getServiceEnv('one-two.yml', 'one', 'BAR')).to.deep.equal('this_is_bar');
  });
});
