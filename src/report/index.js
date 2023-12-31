import chalk from 'chalk';

/**
 * Cleans up the data for the bitrate script's movie data, and returns an array of strings
 * that are easier to parse
 * @param {Array<object>} data array of objects with the title and bitrate of a movie
 * @returns {Array<string>} An array of strings to be printed out
 *
 * Output will look like:
 * Movie with an extra long name that goes all the way out here - 920
 * Movie with a shorter nane                                    - 2110
 */
function produceMovieBitrateReport(data) {
  const outputStrings = [];

  // display items in ascending order of bitrates
  data.sort((a, b) => (a.bitrate < b.bitrate ? -1 : a.bitrate === b.bitrate ? 0 : 1));

  // find the length of the longest title in the bunch
  const titlePaddingLength = data.reduce(
    (max, item) => (max > item.title.length ? max : item.title.length),
  );

  const seasonTitleString = 'Title'.padEnd(titlePaddingLength, ' ');
  const resolutionTitleString = 'Resolution ';
  const fileSizeTitleString = 'File Size (Mb) ';
  const bitrateThresholdTitleString = 'Bitrate Threshold ';
  const bitrateTitleString = 'Bitrate ';

  outputStrings.push(`${seasonTitleString}${resolutionTitleString}${fileSizeTitleString}${bitrateThresholdTitleString}${bitrateTitleString}`);

  // return an array of movie titles, and bitrates with colour applied to the bitrate
  data.forEach((item) => {
    const titleString = item.title.padEnd(titlePaddingLength, ' ');
    const resolutionString = item.resolution.padEnd(resolutionTitleString.length, ' ');
    const fileSizeMbString = `${item.fileSizeMb}`.padEnd(fileSizeTitleString.length, ' ');
    const requiredBitrateString = `${item.bitrateThreshold}`.padEnd(bitrateThresholdTitleString.length, ' ');
    const bitrateString = getBitrateStringDecorationFn(item.bitrate, item.bitrateThreshold)(`${item.bitrate}`);

    outputStrings.push(`${titleString}${resolutionString}${fileSizeMbString}${requiredBitrateString}${bitrateString}`);
  });

  return outputStrings;
}

/**
 * Cleans up the data for the bitrate script's tv data, and returns an array of strings
 * that are easier to parse
 * @param {Array<object>} data array of objects with the title and bitrate of a movie
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
function produceTvBitrateReport(data) {
  const outputStrings = [];

  const showTitles = Object.keys(data);
  showTitles.forEach((showTitle) => {
    outputStrings.push(`${showTitle}`);

    const seasons = Object.keys(data[showTitle]);
    seasons.forEach((season) => {
      const episodes = data[showTitle][season];

      const episodeTitlePaddingLength = (episodes.reduce(
        (max, item) => (max > item.title.length ? max : item.title.length),
      )) + 1;

      const seasonTitleString = `${`└── ${season}`.padEnd(episodeTitlePaddingLength + 8, ' ')} `;
      const resolutionTitleString = 'Resolution ';
      const fileSizeTitleString = 'File Size (Mb) ';
      const bitrateThresholdTitleString = 'Bitrate Threshold ';
      const bitrateTitleString = 'Bitrate ';

      outputStrings.push(`${seasonTitleString} | ${resolutionTitleString} | ${fileSizeTitleString} | ${bitrateThresholdTitleString} | ${bitrateTitleString}`);

      episodes.forEach((episode) => {
        const titleString = episode.title.padEnd(episodeTitlePaddingLength, ' ');
        const bitrateString = getBitrateStringDecorationFn(episode.bitrate, episode.bitrateThreshold)(`${episode.bitrate}`);
        const resolutionString = episode.resolution.padEnd(resolutionTitleString.length, ' ');
        const fileSizeMbString = `${episode.fileSizeMb}`.padEnd(fileSizeTitleString.length, ' ');
        const requiredBitrateString = `${episode.bitrateThreshold}`.padEnd(bitrateThresholdTitleString.length, ' ');
        outputStrings.push(
          `    └── ${titleString}  | ${resolutionString} | ${fileSizeMbString} | ${requiredBitrateString} | ${bitrateString}`,
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
  if (itemBitrate < bitrateThreshold / 4) {
    // red
    return chalk.whiteBright.bgRedBright.bold;
  } if (itemBitrate < bitrateThreshold / 2) {
    // orange
    return chalk.blackBright.bgRgb(255, 140, 0).bold;
  } if (itemBitrate < ((bitrateThreshold * 3) / 4)) {
    // yellow
    return chalk.blackBright.bgYellowBright.bold;
  }
  // green
  return chalk.blackBright.bgRgb(46, 139, 87).bold;
}

export {
  produceMovieBitrateReport,
  produceTvBitrateReport,
};
