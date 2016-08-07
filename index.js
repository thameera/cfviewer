'use strict';

// Load env variables from .env
require('dotenv').config();

const express = require('express');
const twitter = require('./twitter');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(8080, () => {
  console.log('Listening on port 8080!');
});
