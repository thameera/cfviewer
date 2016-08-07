'use strict';

// Load env variables from .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const twitter = require('./twitter');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/get', (req, res) => {
  if (!req.body.tweetUrl || !req.body.tweetUrl.startsWith('https://twitter.com')) {
    return res.sendStatus(400);
  }
  const tweetUrl = req.body.tweetUrl;
  let usernames = [];
  if (req.body.usernames.length) {
    usernames = req.body.usernames.split(' ');
  }

  console.log(`Tweet ID: ${tweetUrl}\nUsernames: ${usernames}`);

  twitter.getTweets(tweetUrl, usernames)
    .then(tree => {
      return res.json(tree);
    });
});

app.get('/', (req, res) => {
  res.sendfile('public/index.html');
});

app.listen(8081, () => {
  console.log('Listening on port 8081!');
});
