'use strict';

// Load env variables from .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cache = require('memory-cache');

const twitter = require('./twitter');

const getCacheKey = (tweetUrl, usernames) => `${tweetUrl}${usernames.sort().join('')}`;

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/get-tweets', (req, res) => {
  if (!req.body.tweetUrl || !req.body.tweetUrl.startsWith('https://twitter.com')) {
    return res.sendStatus(400);
  }
  const tweetUrl = req.body.tweetUrl;
  let usernames = [];
  if (req.body.usernames.length) {
    usernames = req.body.usernames.split(' ');
  }

  const cacheKey = getCacheKey(tweetUrl, usernames);
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`Cache hit: ${cacheKey}`);
    return res.json(cached);
  }

  console.log(`Tweet URL: ${tweetUrl}\nUsernames: ${usernames}`);

  twitter.getTweets(tweetUrl, usernames)
    .then(tree => {
      cache.put(cacheKey, tree, 30000);
      return res.json(tree);
    });
});

app.get('/', (req, res) => {
  res.sendfile('public/index.html');
});

app.listen(process.env.APP_PORT, () => {
  console.log('Listening on port 8081!');
});
