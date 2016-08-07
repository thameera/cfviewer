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

app.post('/api/get-tweets', (req, res) => {
  if (!req.body.tweetUrl || !req.body.tweetUrl.startsWith('https://twitter.com')) {
    return res.sendStatus(400);
  }
  const tweetUrl = req.body.tweetUrl;
  let usernames = [];
  if (req.body.usernames.length) {
    usernames = req.body.usernames.split(' ');
  }

  console.log(`Tweet URL: ${tweetUrl}\nUsernames: ${usernames}`);

  twitter.getTweets(tweetUrl, usernames)
    .then(tree => {
      return res.json(tree);
    });
});

app.get('/test', (req, res) => {
    console.log(req.query);
});

app.get('/', (req, res) => {
  console.log('TEST2');
  console.log(req.query);
  if (req.query.tweeturl) {
    return res.send(`You requested ${req.query.tweeturl}`);
  }
  res.sendfile('public/index.html');
});

app.listen(8081, () => {
  console.log('Listening on port 8081!');
});
