const http = require('node:http');

const [,, payload] = process.argv;

(() => {
  const options = {
    hostname: 'cht-upgrade-service',
    port: 5008,
    path: '/upgrade',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', console.log);
    res.on('error', console.error);
  });

  const body = Buffer.from(payload, 'base64').toString('utf-8');
  req.write(body);
  req.end();
})();
