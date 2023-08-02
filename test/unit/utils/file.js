'use strict';

const fs = require('fs');

/**
 * Convert a number of strings into array of fs.Dirent of type file
 * @param {...string} files
 * @returns {fs.Dirent[]}
 */
const fileList = (...files) => files.map(filename => new fs.Dirent(filename, fs.constants.UV_DIRENT_FILE));

module.exports = {
  fileList,
};
