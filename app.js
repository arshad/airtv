#! /usr/bin/env node
var program = require('commander');
var airtv = require('./lib/airtv.js');

// Get version from package.json.
var version = require('./package.json').version;

program
   .version(version)

/**
 * Check command.
 * Example: airtv [name].
 */
program
  .command('*')
  .description('Use this command to get air dates for a tv show.')
  .action(function(name, options){
    if (!name) {
      console.log('Error: tv show name missing');
      program.help();
    }

    // Check if show has aired.
    airtv.check(name);
  });

// Examples.
program.on('--help', function(){
  console.log('  Examples:');
  console.log('');
  console.log('    $ tvair suits');
  console.log('    $ tvair "game of thrones"');
  console.log('');
});

program.parse(process.argv);

if (!program.args.length) program.help();