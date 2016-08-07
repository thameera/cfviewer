'use strict';

// Load env variables from .env
require('dotenv').config();

const express = require('express');
const twitter = require('./twitter');

const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendfile('public/index.html');
});

app.listen(8080, () => {
  console.log('Listening on port 8080!');
});
