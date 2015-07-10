var fs = require('fs')
  , request = require('request')
  , qs = require('querystring')
  , xml2js = require('xml2js')
  , Table = require('cli-table')
  , moment = require('moment')
  , colors = require('colors')
  ;

var apiKey = '11151C6DF0B2A384';

/**
 * Checks if a tv show has aired.
 *
 * @param name
 *  The name of the tv show.
 *
 */
exports.check = function (name) {
  var name = name.toLowerCase().trim();
  exports.getSeriesByName(name, function(error, response, result) {
    // Handle error.
    if (response.statusCode == 404) {
      return console.log('Error: Series not found.');
    }

    // Write to a file if success.
    if (!error && response.statusCode == 200) {
      if (!result.length) {
        return console.log('Error: Series not found.');
      }
      else {
        // Assume best match for now.
        var serie = result.Series[0];
        exports.getSeriesByID(serie.seriesid, serie.language, function(error, response, result) {
          if (error) {
            console.log('Error: no data for serie: ' + serie.SeriesName);
          }
          else if(!error && response.statusCode == 200) {
            // Show series information.
            console.log(exports.formatSeriesDisplay(result.Series[0]));

            // Get Episodes.
            exports.getLastEpisodeAiredFromResult(result, function(error, episode, position) {
              if (error) {
                return console.log(error);
              }
              else {
                // Show Previous episode.
                var previousEpisode = exports.getEpisodeFromResult(position - 1, result);
                console.log(exports.formatEpisodesTable([previousEpisode], 'Previous episode', 'grey'));

                // Show current episode.
                console.log(exports.formatEpisodesTable([episode], 'Current episode', 'yellow'));

                // Show next episode.
                var nextEpisode = exports.getEpisodeFromResult(position + 1, result);
                console.log(exports.formatEpisodesTable([nextEpisode], 'Next episode', 'grey'));
              }
            });
          }
        });
      }
    }
  });
}

/**
 * Returns an episode from a result object.
 *
 * @param position
 *  The episode position.
 * @param result
 *  The result object.
 * @param callback
 */
exports.getEpisodeFromResult = function(position, result, callback) {
  if (result.Episode.length) {
    if (result.Episode[position]) {
      return result.Episode[position];
    }
  }
  return false;
}

/**
 * Returns the last aired episode from result object.
 *
 * @param result
 *  The result object.
 */
exports.getLastEpisodeAiredFromResult = function (result, callback) {
  var now = moment();
  if (result.Episode.length) {
    var episodes = result.Episode;
    var position = episodes.length - 1;
    while (position > 0) {
      if (episodes[position]) {
        if (moment(episodes[position].FirstAired[0]).isBefore(now)) {
          return callback(null, episodes[position], position);
        }
      }
      position--;
    }
  }
  else {
    callback('Error: no episodes found.');
  }
}

/**
 * Format display for a series.
 *
 * @param series
 *  The series object.
 * @returns {string}
 */
exports.formatSeriesDisplay = function(series) {
  var display = '[SeriesName] ([Rating]/10) airs on [Airs_DayOfWeek] at [Airs_Time] on [Network].';
  display = display.replace(/\[(.*?)\]/gi, function($0, $1) {
    return series[$1];
  });

  var table = new Table({
    colWidths: [90],
    chars: { 'top': '═' , 'top-mid': '' , 'top-left': '╔' , 'top-right': '╗'
      , 'bottom': '═' , 'bottom-mid': '' , 'bottom-left': '╚' , 'bottom-right': '╝'
      , 'left': '║' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
      , 'right': '║' , 'right-mid': '' , 'middle': '' }
  });
  table.push([colors.red(display)]);

  return table.toString();
}

/**
 * Format display for episodes.
 *
 * @param episodes
 *  An array of episode objests.
 * @param heading
 *  The heading for the first column.
 * @param color
 *  The color of the table heading, text and border.
 * @returns {string}
 */
exports.formatEpisodesTable = function(episodes, heading, color) {
  var chars = { 'top-mid': '', 'bottom-mid': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right-mid': '' , 'middle': '' };

  var table = new Table({
    style: { head: [color], border: [color] },
    head: [heading, 'Season', 'Episode', 'Date', 'When'],
    colWidths: [30, 10, 10, 20, 20],
    chars: chars
  });

  for (var index in episodes) {
    var episode = episodes[index];
    if (typeof(episode.EpisodeName) === 'undefined') {
      table.push([colors[color]('No information available.'), '', '', '', '']);
    }
    else {
      table.push([
        colors[color](episode.EpisodeName),
        colors[color](episode.SeasonNumber),
        colors[color](episode.EpisodeNumber),
        colors[color](episode.FirstAired),
        colors[color](moment(episode.FirstAired[0]).fromNow())
      ]);
    }
  }

  return table.toString();
}

/**
 * GetSeries.php endpoint wrapper.
 *
 * @param name
 *  The name of the tv show.
 * @param loadEpisodes
 *  Set true to load and return series episodes.
 * @param callback
 *  Callback.
 */
exports.getSeriesByName = function(name, callback) {
  if (name) {
    var options = {
      seriesname: name
    }
    exports.call('GetSeries.php', options, function(error, response, body) {
      // Handle error.
      if (response.statusCode == 404) {
        callback(error, response, body);
      }
      else if (!error && response.statusCode == 200) {
        xml2js.parseString(body, function(error, result) {
          callback(error, response, result.Data);
        });
      }
    })
  }
}

/**
 * Returns a series by its id.
 *
 * @param seriesId
 *  The id of the series.
 * @param languagge
 *  The language of the series.
 * @param callback
 *  Callback.
 */
exports.getSeriesByID = function(seriesId, language, callback) {
  if (seriesId && language) {
    var endpoint = apiKey + '/series/' + seriesId + '/all/' + language + '.xml';
    exports.call(endpoint, {}, function(error, response, body) {
      // Handle error.
      if (response.statusCode == 404) {
        callback(error, response, body);
      }

      // Parse results to JSON and return it.
      if (!error && response.statusCode == 200) {
        xml2js.parseString(body, function(error, result) {
          callback(error, response, result.Data);
        });
      }
    });
  }
  else {
    callback('Error: parameters missing', null, null);
  }
}

/**
 * Helper function for api calls.
 *
 * @param params
 *  Params to pass to the api url.
 * @param callback
 *
 */
exports.call = function(endpoint, params, callback) {
  var options = {
    url: 'http://thetvdb.com/api/' + endpoint + '?',
    headers: {
      'User-Agent': 'Has-it-Aired/1.0.0 (Has-it-Aired/1.0.0; http://github.com/arshad/has-it-aired)'
    }
  };

  // Add params to url.
  options.url += qs.stringify(params);

  request(options, function(error, response, body) {
    callback(error, response, body);
  });
}
