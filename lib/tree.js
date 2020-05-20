'use strict';

const BigNumber = require('bignumber.js');
const _ = require('lodash');
const logger = require('winston');

const twitter = require('./twitter');
const archive = require('./archive');
const utils = require('./utils');

const getUrlEntities = tweet => {
  if (!tweet.entities.urls) return [];
  return tweet.entities.urls.map(e => {
    return {
      url: e.url,
      display_url: e.display_url,
      expanded_url: e.expanded_url
    };
  });
};

const getMediaEntities = tweet => {
  if (!tweet.entities.media) return [];
  return tweet.entities.media.map(e => {
    return {
      url: e.url,
      display_url: e.display_url,
      media_url: e.media_url
    };
  });
};

const buildTree = (root_id, tweets) => {
  logger.debug(`Building tree from ${tweets.length} tweets...`);

  const tree = [];

  // Determine the tweet ID start next search from (this is an optimization)
  const max_tweet_id = BigNumber.max(tweets.map(t => t.id_str)).toString();
  const start_from_id = (new BigNumber(max_tweet_id)).plus(1).toString();
  const meta = {
    start_from_id: start_from_id
  };

  const add = (tweet, parent) => {
    const range = tweet.display_text_range;
    const text = tweet.full_text.substr(range[0], range[1])
    tree.push({
      id: tweet.id_str,
      parent: parent,
      user: tweet.user.screen_name,
      text: text,
      icon: tweet.user.profile_image_url,
      epoch: utils.getEpoch(tweet.created_at),
      url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
      url_entities: getUrlEntities(tweet),
      media_entities: getMediaEntities(tweet),
      raw_tweet: tweet
    });
  };

  // Find all tweets which quote given tweet id
  const findQuoted = id => _.filter(tweets, { quoted_status_id_str: id});

  // Find tweets that quote current tweet and add to the tree
  const iterateForQuotingTweets = (id) => {
    findQuoted(id).forEach(t => {
      add(t, id);
      iterateForReplies(t.id_str);
    });
  };

  const iterateForReplies = id => {
    // Get all replies to the tweet with given ID
    const replies = _.remove(tweets, { in_reply_to_status_id_str: id });

    if (!replies || !replies.length) return;

    replies.forEach(r => {
      add(r, id);
      iterateForReplies(r.id_str);
      iterateForQuotingTweets(r.id_str);
    });
  };

  const iterateRoot = root_id => {
    logger.debug(`Iterating for root tweet: ${root_id}`);
    // Find root tweet
    const root = _.find(tweets, { id_str: root_id });

    if (!root) return {error: true, message: "Root tweet not found"};

    add(root, '#');

    iterateForReplies(root.id_str);
    iterateForQuotingTweets(root.id_str);
  };

  const root_status = iterateRoot(root_id);
  logger.debug(`Final tree length: ${tree.length}`);
  if (tree.length === 0) return root_status;

  const participants = utils.sortedCount(tree.map(t => t.user));
  meta.last_tweet_time = BigNumber.max(tree.map(t => t.epoch)).toString();

  return {
    tree,
    participants,
    meta
  };
};

const getTweets = (start_url, screennames) => {
  let root_id = start_url.substring(start_url.lastIndexOf('/')+1);

  // Make sure originating tweep is included in screennames array
  const username = start_url.substring(20, start_url.indexOf('/status'))
  if (!screennames.includes(username)) screennames.push(username);

  const ar = new archive.FileArchive(root_id, username);
  let start_id;
  return ar.read('tree').then(convoCache => {
    let convo = {};
    let cachedTree = [];
    let cachedTweets = [];

    const strip_raw_tweets = convObj => {
      return {
        tree: convObj.tree.map(t => { delete t.raw_tweet; return t; }),
        participants: convObj.participants
      };
    };

    if (convoCache.tree && convoCache.tree.length > 0) {
      cachedTree = convoCache.tree;
      cachedTweets = cachedTree.map(t => t.raw_tweet);
      logger.debug('Archived tweets: ', cachedTree.length);
      start_id = convoCache.meta.start_from_id;
      convo = convoCache;

      // For conversations last tweet is older than a week, don't even bother
      // searching
      if (convo.meta.last_tweet_time
          && utils.daysSince(convo.meta.last_tweet_time) > 7) {
        return strip_raw_tweets(convo);
      }
    } else {
      start_id = root_id;
    }

    return twitter.searchTweets(screennames, start_id)
      .then(tweets => {
        // If we have new tweets build new conversation with
        // archived tweets and new tweets
        if (tweets.length > 0) {
          logger.debug('New tweets: ', tweets.length);
          tweets = tweets.concat(cachedTweets);
          const uniqTweets = _.uniqBy(tweets, 'id_str');
          uniqTweets.reverse(); // sort by time ascending
          convo = buildTree(root_id, uniqTweets);

          if (convo.error) {
            return {
              error: true,
              message: "Sorry, I couldn't find that conversation :("+
                       "<br/>This could happen if the tweet is a bit old "+
                       "or from someone very popular"
            };
          }

          // Archive only the conversations with minimum 5 tweets
          if(convo.tree.length > 5) ar.write(convo, 'tree');
        }

        // All is well. Present the glorious conversation!
        return strip_raw_tweets(convo);
      });
    });
};

module.exports = {
  getTweets
};
