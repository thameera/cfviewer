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
  const query = screennames.join(' OR ');
  console.log(`Searching for: ${query}`);

  let tweets = [];
  let round = 0;

  const search = max_id => {
    const opts = { q: query, count: 100, include_entities: false };
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
      icon: tweet.user.profile_image_url,
      url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
    });
  };

  const findQuoted = id => _.filter(tweets, { quoted_status_id_str: id }).map(t => t.id_str);

  const iterateForTweet = id => {
    const replies = _.remove(tweets, { in_reply_to_status_id_str: id });

    if (!replies || !replies.length) return;

    replies.forEach(r => {
      add(r, id);
      iterateForTweet(r.id_str);
      findQuoted(r.id_str).forEach(id => iterateRoot(id));
    });
  };

  const iterateRoot = root_id => {
    console.log(`Iterating for root tweet: ${root_id}`);
    // Find root tweet
    const root = _.find(tweets, { id_str: root_id });
    if (!root) return 'Root tweet not found';

    findQuoted(root_id).forEach(id => iterateRoot(id));

    add(root, '#');

    iterateForTweet(root.id_str);
  };

  iterateRoot(start_id);

  console.log(`Final tree length: ${tree.length}`);

  return {
    data: tree
  };
};

const getTweets = (start_url, screennames) => {
  const start_id = start_url.substring(start_url.lastIndexOf('/')+1);

  // Make sure originating tweep is included in screennames array
  const username = start_url.substring(20, start_url.indexOf('/status'))
  if (!screennames.includes(username)) screennames.push(username);

  return searchTweets(screennames)
    .then(tweets => {
      const uniqTweets = _.uniqBy(tweets, 'id_str');
      return buildTree(start_id, uniqTweets);
    });
};

module.exports = {
  getTweets
};
