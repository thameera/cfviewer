'use strict';

const Twit = require('twit');
const BigNumber = require('bignumber.js');
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
      app_only_auth: true,
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
  // Need to deduct 1 to have it included.
  const since_id = (new BigNumber(root_id)).minus(1).toString();

  let tweets = [];
  let round = 0;

  const search = max_id => {
    const opts = { q: query, count: 100, tweet_mode: 'extended' };
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
        const nextMaxId = BigNumber.min(result.data.statuses.map(t => t.id_str)).toString();

        return doARound(nextMaxId);
      });
  };

  return doARound();
};

module.exports = {
  searchTweets
}
