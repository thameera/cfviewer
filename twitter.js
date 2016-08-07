'use strict';

const Twit = require('twit');
const Promise = require('bluebird');

const MAX_SEARCH_ROUNDS = 5;

const T = new Twit({
  consumer_key: process.env.CON_KEY,
  consumer_secret: process.env.CON_SEC,
  access_token: process.env.ACC_KEY,
  access_token_secret: process.env.ACC_SEC,
  timeout_ms: 60*1000
});

const searchTweets = screennames => {

  let tweets = [];
  let round = 0;

  const search = max_id => {
    const opts = { q: screennames.join(' OR '), count: 100, include_entities: false };
    if (max_id) opts.max_id = max_id;
    return T.get('search/tweets', opts);
  }

  const doARound = max_id => {
    round++;
    return search(max_id)
      .then(result => {
        if (!result.data || !result.data.statuses) {
          return Promise.resolve(tweets);
        }

        tweets = tweets.concat(result.data.statuses);

        if (round === MAX_SEARCH_ROUNDS) {
          return Promise.resolve(tweets);
        }

        // Calculate max_id for next search call
        const nextMaxId = Math.min.apply(null, result.data.statuses.map(t => t.id_str));

        return doARound(nextMaxId);
      });
  };

  return doARound();
};

const getTweets = (start_id, screennames) => {
  return searchTweets(screennames)
    .then(tweets => {
      tweets.forEach(t => {
        //console.log(`${t.user.screen_name} : ${t.text}`);
      });
      return tweets;
    });
};

module.exports = {
  getTweets
};
