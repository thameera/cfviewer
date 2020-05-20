'use strict';

const Promise = require('bluebird');
const path = require('path');
const fs  = Promise.promisifyAll(require('fs'));

const logger = require('winston');

class FileArchive{
  constructor (tweet_id, username, dir=null) {
    this.tweet_id = tweet_id;
    this.username = username;

    const projectPath = path.dirname(require.main.filename);
    this.dir = (dir !== null) ? dir : process.env.DATA_DIR_NAME;
    this.dir = projectPath + '/' + this.dir;
    if (!fs.lstatSync(this.dir).isDirectory()){
      logger.error(`${this.dir} is not a valid directory`);
    }
  }

  write(content, type) {
    const path = `${this.dir}/${type}_${this.username}_${this.tweet_id}.json`

    fs.writeFile(path, JSON.stringify(content), 'utf-8', () => {});
  }

  read(type){
    return pickDataFile(this.tweet_id, type, this.dir).then((data_file)=> {
      if (!data_file) return {};
      logger.debug(`datafile: ${data_file}`);
      return fs.readFileAsync(data_file, 'utf8')
        .then(JSON.parse);
    });
  }
};

const pickDataFile = (tweet_id, type, dir) => {
  //read all data files and pic the most recent for name / tweet_id
  return fs.readdirAsync(dir)
    .then((files) => {
      // determine the file for given tweet & type
      let archive_file;
      files.forEach(file => {
        if (file.indexOf(`_${tweet_id}.json`) > -1 && file.indexOf(`${type}_`) > -1) archive_file = file;
      });

      if (!archive_file) return null;

      return dir + '/' + archive_file;
    }).catch((e) => {
      logger.error(e);
      return null;
    });
}

module.exports = {
  FileArchive
}
