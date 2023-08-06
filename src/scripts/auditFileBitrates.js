#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData, fetchRawPlexTelevisionLibraryData, fetchEpisodesVideoMetadata } from '../fetch';

import 'dotenv/config';

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

  console.log('These movies do not meet the specified bitrate:');
  console.log(JSON.stringify(moviesNotMeetingBitrateThreshold, null, 2));

  console.log('These episodes do not meet the specified bitrate:');
  console.log(JSON.stringify(episodesNotMeetingBitrateThreshold, null, 2));
}());

/**
 * Audits movies that are below the specified bitrate
 * @param {Array<object>} movieLibrary Every movie item
 * @param {number} requiredBitrate The bitrate threshold
 * @returns {Array<string>} The titles of movies that don't hit the bitrate target
 */
function parseMoviesWithBitrateThreshold(movieLibrary, requiredBitrate) {
  return movieLibrary.MediaContainer.Video
    .filter((videoMetadata) => Number.parseInt(videoMetadata.Media['@_bitrate'], 10) < requiredBitrate)
    .map((videoMetadata) => videoMetadata['@_title']);
}

/**
 * Audits tv episodes that are below the specified bitrate
 * @param {Array<object>} showsLibrary Every show item
 * @param {number} requiredBitrate The bitrate threshold
 * @returns {Array<object>} The episodes that don't hit the bitrate target
 */
async function parseEpisodesWithBitrateThreshold(showsLibrary, requiredBitrate) {
  // paths to get information about each show's seasons
  const seasonMetadataPaths = showsLibrary.MediaContainer.Directory
    .map((x) => x['@_key']);

  // metadata for each episode
  const allEpisodesMetadata = await fetchEpisodesVideoMetadata(seasonMetadataPaths);

  const episodesNotMeetingThreshold = allEpisodesMetadata
    .filter((episodeData) => !Array.isArray(episodeData.Media) && episodeData.Media['@_bitrate'] < requiredBitrate);

  const maxEpisodeTitleLength = episodesNotMeetingThreshold
    .reduce((acc, episode) => (acc > episode['@_title'].length ? acc : episode['@_title'].length), 0);

  return episodesNotMeetingThreshold
    .reduce((acc, episodeData) => {
      const showName = episodeData['@_grandparentTitle'];
      const seasonName = episodeData['@_parentTitle'];
      const episodeName = episodeData['@_title'];
      const episodeBitrate = episodeData.Media['@_bitrate'];

      const paddedEpisodeName = episodeName.padEnd(maxEpisodeTitleLength, ' ');

      // pop a new entry in for the show
      if (!acc[showName]) {
        return {
          ...acc,
          [showName]: {
            [seasonName]: [`${paddedEpisodeName} - ${episodeBitrate}`],
          },
        };
      }

      // pop a new entry in for the season, maintaining other seasons that may already be here
      if (!acc[showName][seasonName]) {
        return {
          ...acc,
          [showName]: {
            ...acc[showName],
            [seasonName]: [`${paddedEpisodeName} - ${episodeBitrate}`],
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
            `${paddedEpisodeName} - ${episodeBitrate}`,
          ],
        },
      };
    }, {});
}
