'use strict';

const Twit = require('twit');
const Promise = require('bluebird');
const logger = require('winston');

const MAX_SEARCH_ROUNDS = Number(process.env.MAX_SEARCH_ROUNDS);

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
    logger.debug(next);
    const prom = apps[next].get('search/tweets', opts);
    next++;
    if (next === numOfApps) next = 0;
    return prom;
  };
})();

const searchTweets = (screennames, root_id) => {
  const query = screennames.join(' OR ');
  logger.debug(`Searching for: ${query}`);

  // Using root_id as since_id leaves out the root tweet from search result
  // Need to deduct 1 to have it included. Since we are operating on
  // numbers > MAX_SAFE_INTEGER, we deduct 1000 to  be safe
  const since_id = Number(root_id)-1000;

  let tweets = [];
  let round = 0;

  const search = max_id => {
    const opts = { q: query, count: 100 };
    if (max_id) opts.max_id = max_id;
    if (since_id) opts.since_id = since_id;
    return callAPI(opts);
  }

  const doARound = max_id => {
    round++;
    logger.debug('Search round No: ', round);
    return search(max_id)
      .then(result => {
        if (!result.data || !result.data.statuses) {
          return Promise.resolve(tweets);
        }

        tweets = tweets.concat(result.data.statuses);

        if (result.data.statuses.length < 100 ||  round === MAX_SEARCH_ROUNDS) {
          return Promise.resolve(tweets);
        }

        // Calculate max_id for next search call
        const nextMaxId = Math.min.apply(null, result.data.statuses.map(t => t.id_str));

        return doARound(nextMaxId);
      });
  };

  return doARound();
};

module.exports = {
  searchTweets
}
