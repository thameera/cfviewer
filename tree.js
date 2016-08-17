'use strict';

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

  const add = (tweet, parent) => {
    tree.push({
      id: tweet.id_str,
      parent: parent,
      user: tweet.user.screen_name,
      text: tweet.text,
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

    if (!root) return {is_error: true, message: "Root tweet not found"};

    add(root, '#');

    iterateForReplies(root.id_str);
    iterateForQuotingTweets(root.id_str);
  };

  iterateRoot(root_id);

  logger.debug(`Final tree length: ${tree.length}`);

  const participants = utils.sortedCount(tree.map(t => t.user));

  const meta = {
    start_from_id: Math.max.apply(null, tweets.map(t => t.id))
  };

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
    let cachedTree = [];
    let cachedTweets = [];
    if (convoCache.tree) {
      cachedTree = convoCache['tree'];
      cachedTweets = cachedTree.map(t => t.raw_tweet);
      logger.debug('Archived tweets: ', cachedTree.length);
      start_id = convoCache['meta']['start_from_id'];
    } else {
      start_id = root_id;
    }

    const strip_raw_tweets = convo => {
      return {
        tree: convo['tree'].map(t => { delete t.raw_tweet; return t; }),
        participants: convo['participants']
      };
    };

    return twitter.searchTweets(screennames, start_id)
      .then(tweets => {
        // When there are archived tweets disregard searches that return just
        // one tweet (which is the tweet with start_id itself)
        if (!convoCache.tree || tweets.length > 1){
          logger.debug('New tweets: ', tweets.length);
          tweets = tweets.concat(cachedTweets);
          const uniqTweets = _.uniqBy(tweets, 'id_str');
          uniqTweets.reverse(); // sort by time ascending
          const tree = buildTree(root_id, uniqTweets);
          if (tree['tree'].length === 0) {
            return {
              error: true,
              message: "Oops! I couldn't find that conversation :("
            };
          }
          ar.write(tree, 'tree');
          return strip_raw_tweets(tree);
        } else {
          logger.debug('No new tweets in conversation. Serving from archive');
          return strip_raw_tweets(convoCache);
        }
      });
    });
};

module.exports = {
  getTweets
};
