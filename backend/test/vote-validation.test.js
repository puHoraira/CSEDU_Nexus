const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { validate } = require('../src/middleware/validate');
const { castVoteSchema } = require('../src/validators/electionValidators');

test('POST /elections/votes returns 400 when videoRecordingId is missing', async () => {
  const app = express();
  app.use(express.json());

  app.post('/elections/votes', validate(castVoteSchema, 'body'), (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({ message: err.message });
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/elections/votes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      electionId: '507f1f77bcf86cd799439011',
      candidateId: '507f1f77bcf86cd799439012',
    }),
  });

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.match(body.message, /Validation failed/i);

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
