'use strict';

// Load env variables from .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cache = require('memory-cache');

const logger = require('./lib/logger');
const tree = require('./lib/tree');

const getCacheKey = (tweetUrl, usernames) => `${tweetUrl}${usernames.sort().join('')}`;

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/get-tweets', (req, res) => {
  const valid_tweet = /^https\:\/\/twitter\.com\/[a-zA-Z0-9_]{2,15}\/status\/[0-9]+/;
  if (!req.body.tweetUrl || !valid_tweet.test(req.body.tweetUrl)) {
    return res.json({error:true, message: "We expect a valid twitter status URL"});
  }

  let tweetUrl = req.body.tweetUrl;
  // Drop query params in tweet url if there are any
  if(tweetUrl.indexOf('?') > -1) tweetUrl = tweetUrl.substring(0, tweetUrl.indexOf('?'));

  let usernames = [];
  if (req.body.usernames.length) {
    usernames = req.body.usernames.split(' ');
  }

  const cacheKey = getCacheKey(tweetUrl, usernames);
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache hit: ${cacheKey}`);
    return res.json(cached);
  }

  logger.info(`Tweet URL: ${tweetUrl}\n\tUsernames: ${usernames}`);

  tree.getTweets(tweetUrl, usernames)
    .then(tree => {
      cache.put(cacheKey, tree, 30000);
      return res.json(tree);
    });
});

app.get('/:prot*', (req, res) => {
  const tweetUrl = req.params.prot + req.params[0];
  res.redirect('/?tweeturl=' + tweetUrl);
});

app.listen(process.env.APP_PORT, () => {
  logger.info('Listening on port ' + process.env.APP_PORT + '!');
});
