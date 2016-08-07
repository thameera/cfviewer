'use strict';

const Twit = require('twit');
const Promise = require('bluebird');
const _ = require('lodash');

const MAX_SEARCH_ROUNDS = 5;

const T = new Twit({
  consumer_key: process.env.CON_KEY,
  consumer_secret: process.env.CON_SEC,
  access_token: process.env.ACC_KEY,
  access_token_secret: process.env.ACC_SEC,
  timeout_ms: 60*1000
});

const searchTweets = screennames => {
  console.log(`Searching for tweets...`);

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

const buildTree = (start_id, tweets) => {
  console.log(`Building tree from ${tweets.length} tweets...`);

  const tree = [];

  const add = (tweet, parent) => {
    tree.push({
      id: tweet.id_str,
      parent: parent,
      text: `[${tweet.user.screen_name}]: ${tweet.text}`,
      icon: tweet.user.profile_image_url
    });
  };

  const iterateForTweet = id => {
    const replies = _.remove(tweets, { in_reply_to_status_id_str: id });

    if (!replies || !replies.length) return;

    replies.forEach(r => {
      add(r, id);
      iterateForTweet(r.id_str);
    });
  };

  // Find root tweet
  const root = _.find(tweets, { id_str: start_id });
  if (!root) return 'Root tweet not found';

  add(root, '#');

  iterateForTweet(root.id_str);

  console.log(`Final tree length: ${tree.length}`);

  return {
    data: tree
  };
};

const getTweets = (start_url, screennames) => {
  const start_id = start_url.substr(start_url.lastIndexOf('/')+1);

  return searchTweets(screennames)
    .then(tweets => {
      const uniqTweets = _.uniqBy(tweets, 'id_str');
      return buildTree(start_id, uniqTweets);
    });
};

module.exports = {
  getTweets
};
