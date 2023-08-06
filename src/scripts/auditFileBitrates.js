#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData, fetchRawPlexTelevisionLibraryData, fetchEpisodesVideoMetadata } from '../remote';

import 'dotenv/config';
import { produceMovieBitrateReport, produceTvBitrateReport } from '../report';

const SPECIFIED_BITRATE = 3000;

(async function main() {
  console.log('Auditing File Bitrates...');

  const plexMovieLibrary = await fetchRawPlexMovieLibraryData();
  const plexTelevisionLibrary = await fetchRawPlexTelevisionLibraryData();

  const moviesNotMeetingBitrateThreshold = parseMoviesWithBitrateThreshold(
    plexMovieLibrary,
    SPECIFIED_BITRATE,
  );

  const episodesNotMeetingBitrateThreshold = await parseEpisodesWithBitrateThreshold(
    plexTelevisionLibrary,
    SPECIFIED_BITRATE,
  );

  console.log('\n====== Flagging these movies for bitrate:');
  const movieReport = produceMovieBitrateReport(
    moviesNotMeetingBitrateThreshold,
    SPECIFIED_BITRATE,
  );
  movieReport.forEach((item) => console.log(item));

  console.log('\n====== Flagging these tv episodes for bitrate:');
  const tvReport = produceTvBitrateReport(
    episodesNotMeetingBitrateThreshold,
    SPECIFIED_BITRATE,
  );
  tvReport.forEach((item) => console.log(item));
}());

/**
 * Audits movies that are below the specified bitrate
 * @param {Array<object>} movieLibrary Every movie item
 * @param {number} requiredBitrate The bitrate threshold
 * @returns {Array<object>} The movies that don't meet the bitrate target
 *
 * The output will look something like:
 * [
 *   {
 *     "title": "Blade Runner",
 *     "bitrate": 1234
 *   },
 *   {
 *     "title": "Blade Runner 2049",
 *     "bitrate": 1234
 *   },
 * ]
 */
function parseMoviesWithBitrateThreshold(movieLibrary, requiredBitrate) {
  return movieLibrary.MediaContainer.Video
    .filter((videoMetadata) => Number.parseInt(videoMetadata.Media['@_bitrate'], 10) < requiredBitrate)
    .map((videoMetadata) => ({
      title: videoMetadata['@_title'],
      bitrate: Number.parseInt(videoMetadata.Media['@_bitrate'], 10),
    }));
}

/**
 * Audits tv episodes that are below the specified bitrate
 * @param {Array<object>} showsLibrary Every show item
 * @param {number} requiredBitrate The bitrate threshold
 * @returns {object} The episodes that don't hit the bitrate target
 *
 * The output will look something like:
 * {
 *   Breaking Bad: {
 *     Season 1: [
 *       {title: Episode 1, bitrate: 1234}
 *       {title: Episode 2, bitrate: 1234}
 *     ],
 *     Season 2: [...]
 *   }
 * }
 */
async function parseEpisodesWithBitrateThreshold(showsLibrary, requiredBitrate) {
  // paths to get information about each show's seasons
  const seasonMetadataPaths = showsLibrary.MediaContainer.Directory
    .map((x) => x['@_key']);

  // metadata for each episode
  const allEpisodesMetadata = await fetchEpisodesVideoMetadata(seasonMetadataPaths);

  const episodesNotMeetingThreshold = allEpisodesMetadata
    .filter((episodeData) => !Array.isArray(episodeData.Media) && episodeData.Media['@_bitrate'] < requiredBitrate);

  return episodesNotMeetingThreshold
    .reduce((acc, episodeData) => {
      const showName = episodeData['@_grandparentTitle'];
      const seasonName = episodeData['@_parentTitle'];
      const episodeName = episodeData['@_title'];
      const episodeBitrate = Number.parseInt(episodeData.Media['@_bitrate'], 10);

      // pop a new entry in for the show
      if (!acc[showName]) {
        return {
          ...acc,
          [showName]: {
            [seasonName]: [{ title: episodeName, bitrate: episodeBitrate }],
          },
        };
      }

      // pop a new entry in for the season, maintaining other seasons that may already be here
      if (!acc[showName][seasonName]) {
        return {
          ...acc,
          [showName]: {
            ...acc[showName],
            [seasonName]: [{ title: episodeName, bitrate: episodeBitrate }],
          },
        };
      }

      // pop an entry in for the episode, maintaining both the seasons,
      // and episodes that may already be here
      return {
        ...acc,
        [showName]: {
          ...acc[showName],
          [seasonName]: [
            ...acc[showName][seasonName],
            { title: episodeName, bitrate: episodeBitrate },
          ],
        },
      };
    }, {});
}
