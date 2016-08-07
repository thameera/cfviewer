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
  res.json({
    'data' : [
      'Simple root node',
      {
        'text' : 'Root node 2',
        'state' : {
          'opened' : true,
          'selected' : true
        },
        'children' : [
          { 'text' : 'Child 1' },
          'Child 2'
        ]
      }
    ]
  });
});

app.get('/', (req, res) => {
  res.sendfile('public/index.html');
});

app.listen(8080, () => {
  console.log('Listening on port 8080!');
});
