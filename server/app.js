var current_path = process.cwd();
console.log("current_path[%s], dir[%s]", current_path, __dirname);
require('runkoa')(__dirname + '/entry.js')