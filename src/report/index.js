import chalk from 'chalk';

/**
 * Cleans up the data for the bitrate script's movie data, and returns an array of strings
 * that are easier to parse
 * @param {Array<object>} data array of objects with the title and bitrate of a movie
 * @param {number} bitrateThreshold the target bitrate
 * @returns {Array<string>} An array of strings to be printed out
 *
 * Output will look like:
 * Movie with an extra long name that goes all the way out here - 920
 * Movie with a shorter nanem                                   - 2110
 */
function produceMovieBitrateReport(data, bitrateThreshold) {
  // display items in ascending order of bitrates
  data.sort((a, b) => (a.bitrate < b.bitrate ? -1 : a.bitrate === b.bitrate ? 0 : 1));

  // find the length of the longest title in the bunch
  const titlePaddingLength = data.reduce(
    (max, item) => (max > item.title.length ? max : item.title.length),
  );

  // return an array of movie titles, and bitrates with colour applied to the bitrate
  return data.map((item) => `${item.title.padEnd(titlePaddingLength, ' ')} - ${getBitrateStringDecorationFn(item.bitrate, bitrateThreshold)(item.bitrate)}`);
}

/**
 * Cleans up the data for the bitrate script's tv data, and returns an array of strings
 * that are easier to parse
 * @param {Array<object>} data array of objects with the title and bitrate of a movie
 * @param {number} bitrateThreshold the target bitrate
 * @returns {Array<string>} An array of strings to be printed out
 *
 * Output will look like:
 * Adventure Time
 * └── Season 1
 *     └── Tree Trunks                    2855
 *     └── Memories of Boom Boom Mountain 2698
 *     └── City of Thieves                2983
 *     └── The Duke                       2742
 *     └── Freak City                     2596
 */
function produceTvBitrateReport(data, bitrateThreshold) {
  const outputStrings = [];

  const showTitles = Object.keys(data);
  showTitles.forEach((showTitle) => {
    outputStrings.push(`${showTitle}`);

    const seasons = Object.keys(data[showTitle]);
    seasons.forEach((season) => {
      outputStrings.push(`└── ${season}`);

      const episodes = data[showTitle][season];

      const episodeTitlePaddingLength = episodes.reduce(
        (max, item) => (max > item.title.length ? max : item.title.length),
      );

      episodes.forEach((episode) => {
        outputStrings.push(
          `    └── ${episode.title.padEnd(episodeTitlePaddingLength, ' ')} ${getBitrateStringDecorationFn(episode.bitrate, bitrateThreshold)(episode.bitrate)}`,
        );
      });
    });

    outputStrings.push('');
  });

  return outputStrings;
}

/**
 * Determines what colour we want to highlight the bitrate value in
 * @param {number} itemBitrate a movie's bitrate
 * @param {number} bitrateThreshold the threshold we were aiming for
 * @returns {Function} The method to call to wrap the bitrate text in colour
 */
function getBitrateStringDecorationFn(itemBitrate, bitrateThreshold) {
  if (itemBitrate < bitrateThreshold / 2) {
    return chalk.whiteBright.bgRedBright.bold;
  } if (itemBitrate < ((bitrateThreshold * 3) / 4)) {
    return chalk.blackBright.bgYellowBright.bold;
  }
  return chalk.whiteBright.bgBlueBright.bold;
}

export {
  produceMovieBitrateReport,
  produceTvBitrateReport,
};
