const utils = require('./utils');

describe('start up', () => {
  beforeEach(async () => {
    await utils.cleanFolder();
  });

  it('should start fine with no docker compose files in the folder', async () => {
    await utils.up();

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
});
