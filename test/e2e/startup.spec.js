const utils = require('./utils');

describe('start up', () => {
  it('should start fine with no docker compose files in the folder', async () => {
    await utils.up();

    // wait for 5 seconds, to make sure the process doesn't crash
    await new Promise(r => setTimeout(r, 5000));

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });
  });

  it('should start fine with one docker-compose file in the folder', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.up();

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');

    await expect(utils.getServiceVersion('one-two.yml', 'three')).to.be.rejected;
  });

  it('should start fine with two docker-compose files in the folder', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');
    await utils.up();

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('1.0.0');
  });

  it('should start fine with already running containers', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');

    await utils.testComposeCommand('one-two.yml', 'up -d');

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');

    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
  });

  it('should start anyway when images are missing, but recover when fixed', async () => {
    await utils.setVersion('one-two.yml', '10.0.0');

    await utils.up(false);

    // wait for 5 seconds, to make sure the process doesn't crash
    await new Promise(r => setTimeout(r, 5000));

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });

    const result = await expect(utils.startContainers()).to.be.rejected;
    expect(result.error).to.equal(true);
    expect(result.reason).to.include(
      'manifest for localhost:5000/upgrade/one:10.0.0 not found: manifest unknown: manifest unknown'
    );

    await utils.setVersion('one-two.yml', '2.0.0');
    await utils.startContainers();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('2.0.0');
  });

  it('should pass environment variables to containers', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');

    await utils.up(true, { FOO: 'foovalue', BAR: 'barval' });

    expect(await utils.getServiceEnv('one-two.yml', 'one', 'FOO')).to.deep.equal('foovalue');
    expect(await utils.getServiceEnv('one-two.yml', 'one', 'BAR')).to.deep.equal('barval');
  });
});
