'use strict';

const Twit = require('twit');
const Promise = require('bluebird');
const _ = require('lodash');

const MAX_SEARCH_ROUNDS = 5;

/*
 * Returns a function that would call the Twitter API with
 * multiple Twitter apps in a round-robin manner
 */
const callAPI = (() => {
  const numOfApps = Number(process.env.TW_APP_COUNT);
  const apps = [];
  for (let i = 0; i < numOfApps; i++) {
    apps.push(new Twit({
      consumer_key: process.env[`CON_KEY_${i}`],
      consumer_secret: process.env[`CON_SEC_${i}`],
      access_token: process.env[`ACC_KEY_${i}`],
      access_token_secret: process.env[`ACC_SEC_${i}`],
      timeout_ms: 60*1000
    }));
  }

  let next = 0;
  return (opts) => {
    console.log( next);
    const prom = apps[next].get('search/tweets', opts);
    next++;
    if (next === numOfApps) next = 0;
    return prom;
  };
})();

const searchTweets = screennames => {
  const query = screennames.join(' OR ');
  console.log(`Searching for: ${query}`);

  let tweets = [];
  let round = 0;

  const search = max_id => {
    const opts = { q: query, count: 100, include_entities: false };
    if (max_id) opts.max_id = max_id;
    return callAPI(opts);
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

  // Find all tweets which quote given tweet id
  const findQuoted = id => _.filter(tweets, { quoted_status_id_str: id});

  const iterateForReplies = id => {
    // Get all replies to the tweet with given ID
    const replies = _.remove(tweets, { in_reply_to_status_id_str: id });

    if (!replies || !replies.length) return;

    replies.forEach(r => {
      add(r, id);
      iterateForReplies(r.id_str);
      // Find tweets that quote current tweet and add to the tree
      findQuoted(r.id_str).forEach(t => {
        add(t, r.id_str);
        iterateForReplies(t.id_str);
      });
    });
  };

  const iterateRoot = root_id => {
    console.log(`Iterating for root tweet: ${root_id}`);
    // Find root tweet
    const root = _.find(tweets, { id_str: root_id });

    if (!root) return 'Root tweet not found';

    add(root, '#');

    iterateForReplies(root.id_str);
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
