'use strict';

const _ = require('lodash');

/*
 * Returns the number of occurrences of 'val' in array
 */
const numOfOccurrences = (arr, val) => arr.reduce((n, v) => {
  return (v === val) ? n + 1 : n;
}, 0);

/*
 * Input: ['jack', 'jill', 'jill']
 * Output: [{ name: 'jill', count: 2 }, { name: 'jack', count: 1 }]
 */
const sortedCount = arr => {

  const counts = _.uniq(arr).map(val => {
    return {
      name: val,
      count: numOfOccurrences(arr, val)
    };
  });

  return _.orderBy(counts, ['count', 'name'], ['desc', 'asc']);
};

/*
 * Returns unix time from twitter timestamp
 */
const getEpoch = timestamp => (new Date(timestamp)).getTime();

/*
 * Returns number of days since provided epoch time
 */
const daysSince = epoch => {
  return Math.floor(((new Date()).getTime() - epoch) / (1000 * 60 * 60 * 24));
}

module.exports = {
  sortedCount,
  getEpoch,
  daysSince
}
