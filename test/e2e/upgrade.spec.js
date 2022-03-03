const utils = require('./utils');
const { up } = require('./utils');

describe('upgrade', () => {
  beforeEach(async () => {
    await utils.cleanFolder();
  });

  it('should upgrade one docker-compose file', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');

    const upgradedToTwo = await utils.setVersion('one-two.yml', '2.0.0', false);
    let response = await utils.upgradeContainers({ 'one-two.yml': upgradedToTwo });
    expect(response).to.deep.equal({ 'one-two.yml': { ok: true } });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('2.0.0');

    const upgradedToThree = await utils.setVersion('one-two.yml', '3.0.0', false);
    response = await utils.upgradeContainers({ 'one-two.yml': upgradedToThree });
    expect(response).to.deep.equal({ 'one-two.yml': { ok: true } });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('3.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('3.0.0');
  });

  it('should upgrade multiple docker-compose files', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('1.0.0');

    let response = await utils.upgradeContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '2.0.0', false),
      'three.yml': await utils.setVersion('three.yml', '2.0.0', false),
    });
    expect(response).to.deep.equal({
      'one-two.yml': { ok: true },
      'three.yml': { ok: true },
    });
    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('2.0.0');

    response = await utils.upgradeContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '3.0.0', false),
      'three.yml': await utils.setVersion('three.yml', '3.0.0', false),
    });
    expect(response).to.deep.equal({
      'one-two.yml': { ok: true },
      'three.yml': { ok: true },
    });
    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('3.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('3.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('3.0.0');
  });

  it('should only upgrade one of multiple docker-compose files', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');
    await utils.up();

    let response = await utils.upgradeContainers({
      'one-two.yml': await utils.setVersion('one-two.yml', '2.0.0', false),
    });
    expect(response).to.deep.equal({
      'one-two.yml': { ok: true },
    });
    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('1.0.0');

    response = await utils.upgradeContainers({
      'three.yml': await utils.setVersion('three.yml', '3.0.0', false),
    });
    expect(response).to.deep.equal({
      'three.yml': { ok: true },
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('2.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('3.0.0');
  });

  it('should add additional docker-compose files', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.up();

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    await expect(utils.getServiceVersion('three.yml', 'three')).to.be.rejected;

    let response = await utils.upgradeContainers({
      'three.yml': await await utils.setVersion('three.yml', '3.0.0', false),
    });
    expect(response).to.deep.equal({
      'three.yml': { ok: true },
    });

    expect(await utils.getServiceVersion('one-two.yml', 'one')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('one-two.yml', 'two')).to.equal('1.0.0');
    expect(await utils.getServiceVersion('three.yml', 'three')).to.equal('3.0.0');
  });

  it('should upgrade without previously running containers', async () => {
    await utils.up(false);

    const response = await utils.upgradeContainers({
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

  it('should return error when docker compose file is invalid', () => {

  });

  it('should return error when payload is incomplete', () => {

  });
});
