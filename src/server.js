const express = require('express');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json({ limit: '32mb' });
const PORT = 5008;
process.env.UPGRADE_SERVICE_URL = `http://cht-upgrade-service:${PORT}`;

const app = express();
const containers = require('./containers');

const updateResponse = (success, install) => {
  if (success) {
    return { ok: true };
  }

  const reason = install ?
    `Existing installation found. Use '/upgrade' API to upgrade.` :
    `Existing installation not found. Use '/install' API to install.`;
  return { ok: false, reason };
};

const update = async (req, res, install = false) => {
  if (!req.body || !req.body.docker_compose || !Object.keys(req.body.docker_compose).length) {
    return res.status(400).json({ error: true, reason: 'Invalid payload.' });
  }

  const payload = Object.entries(req.body.docker_compose);
  const response = {};

  try {
    for (const [fileName, fileContents] of payload) {
      const updated = await containers.update(fileName, fileContents, install);
      response[fileName] = updateResponse(updated, install);
    }
    await containers.startUp();
    res.json(response);
  } catch (err) {
    console.error('Error while upgrading', err);
    res.status(500).json({ error: true, reason: err.message });
  }
};

const start = async (req, res) => {
  try {
    await containers.startUp();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error while starting containers', err);
    res.status(500).json({ error: true, reason: err.message });
  }
};

const status = (req, res) => {
  res.json({ ok: true });
};

app.get('/', status);
app.post('/upgrade', jsonParser, (req, res) => update(req, res, false));
app.post('/install', jsonParser, (req, res) => update(req, res, true));
app.post('/start', start);

const listen = () => {
  app.listen(PORT);
  console.log(`Listening on port ${PORT}`);
};

module.exports = {
  listen,
};
