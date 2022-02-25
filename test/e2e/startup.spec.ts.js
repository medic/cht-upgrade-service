const utils = require('./utils');

const up = async () => {
  await utils.serviceComposeCommand('up -d');
  await utils.waitUntilReady();
};

describe('start up', () => {
  before(async () => {
    await utils.serviceComposeCommand('up --build -d');
    await utils.serviceComposeCommand('down --remove-orphans');
  });

  beforeEach(async () => {
    await utils.cleanFolder();
  });

  afterEach(async () => {
    await utils.serviceComposeCommand('down --remove-orphans -t 1');
  });

  it('should start fine with no docker compose files in the folder', async () => {
    await up();

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });
  });

  it('should start fine with one docker-compose file in the folder', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await up();

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });

    const oneVersion = await utils.testComposeCommand('one-two.yml', 'exec -T one', utils.getPackageVersion);
    expect(oneVersion).to.equal('"1.0.0"\n');

    const twoVersion = await utils.testComposeCommand('one-two.yml', 'exec -T two', utils.getPackageVersion);
    expect(twoVersion).to.equal('"1.0.0"\n');

    await expect(
      utils.testComposeCommand('one-two.yml', 'exec -T three', utils.getPackageVersion)
    ).to.be.rejected;
  });

  it('should start fine with two docker-compose files in the folder', async () => {
    await utils.setVersion('one-two.yml', '1.0.0');
    await utils.setVersion('three.yml', '1.0.0');
    await up();

    const ping = await utils.fetchJson(utils.url);
    expect(ping).to.deep.equal({ ok: true });

    const oneVersion = await utils.testComposeCommand('one-two.yml', 'exec -T one', utils.getPackageVersion);
    expect(oneVersion).to.equal('"1.0.0"\n');

    const twoVersion = await utils.testComposeCommand('one-two.yml', 'exec -T two', utils.getPackageVersion);
    expect(twoVersion).to.equal('"1.0.0"\n');

    const threeVersion = await utils.testComposeCommand('three.yml', 'exec -T three', utils.getPackageVersion);
    expect(threeVersion).to.equal('"1.0.0"\n');
  });
});
