'use strict';

const Promise = require('bluebird');
const fs  = Promise.promisifyAll(require('fs'));

const logger = require('winston');

class FileArchive{
  constructor (tweet_id, username, dir=null) {
    this.tweet_id = tweet_id;
    this.username = username;

    this.dir = (dir !== null) ? dir : process.env.DATA_DIR;
    if (!fs.lstatSync(this.dir).isDirectory()){
      console.log(`${dir} is not a valid directory`);
      this.dir = __dirname;
    }
  }

  write(content, type) {
    const path = `${this.dir}/${type}_${this.username}_${this.tweet_id}.json`

    fs.writeFile(path, JSON.stringify(content), 'utf-8');
  }

  read(type){
    return pickDataFile(this.tweet_id, type, this.dir).then((data_file)=> {
      if (!data_file) return {};
      console.log(`datafile: ${data_file}`);
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
        if (file.indexOf(tweet_id) > -1 && file.indexOf(type) > -1) {
          archive_file = file;
        }
      });
      return dir + '/' + archive_file;
    }).catch((e) => {
      logger.error(e);
      return null;
    });
}

module.exports = {
  FileArchive
}
