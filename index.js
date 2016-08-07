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
  if (!req.body.tweetId || !req.body.usernames) {
    return res.sendStatus(400);
  }
  const tweetId = req.body.tweetId;
  const usernames = req.body.usernames.split(' ');

  console.log(`Tweet ID: ${tweetId}\nUsernames: ${usernames}`);

  twitter.getTweets(tweetId, usernames)
    .then(tree => {
      return res.json(tree);
    });
});

app.get('/', (req, res) => {
  res.sendfile('public/index.html');
});

app.listen(8080, () => {
  console.log('Listening on port 8080!');
});
