#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData, fetchRawPlexTelevisionLibraryData, fetchEpisodesVideoMetadata } from '../remote';
import { produceMovieBitrateReport, produceTvBitrateReport } from '../report';
import * as plexMediaUtils from '../utils/plexMediaUtils';
import * as plexVideoUtils from '../utils/plexVideoUtils';

import 'dotenv/config';

const RESOLUTION_TO_REQUIRED_BITRATE_MAPPING = {
  '4k': 40000,
  '2k': 16000,
  // eslint-disable-next-line quote-props
  '1080': 8000,
  // eslint-disable-next-line quote-props
  '720': 5000,
  // eslint-disable-next-line quote-props
  '576': 2500,
};

console.log(RESOLUTION_TO_REQUIRED_BITRATE_MAPPING);

const SPECIFIED_BITRATE = 3000;

(async function main() {
  console.log('Auditing File Bitrates...');

  const plexMovieLibrary = await fetchRawPlexMovieLibraryData();
  const plexTelevisionLibrary = await fetchRawPlexTelevisionLibraryData();

  const moviesNotMeetingBitrateThreshold = parseMoviesWithBitrateThreshold(plexMovieLibrary);

  const episodesNotMeetingBitrateThreshold = await parseEpisodesWithBitrateThreshold(
    plexTelevisionLibrary,
    SPECIFIED_BITRATE,
  );

  console.log('\n====== Flagging these movies for bitrate:');
  const movieReport = produceMovieBitrateReport(moviesNotMeetingBitrateThreshold);
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
function parseMoviesWithBitrateThreshold(movieLibrary) {
  return movieLibrary.MediaContainer.Video
    .filter(doesVideoMeetThreshold)
    .map((videoMetadata) => {
      const title = plexVideoUtils.getTitle(videoMetadata);
      const mediaMetadata = plexVideoUtils.getMedia(videoMetadata);

      const bitrate = plexMediaUtils.getMediaBitrate(mediaMetadata);
      const resolution = plexMediaUtils.getMediaResolution(mediaMetadata);

      const bitrateThreshold = RESOLUTION_TO_REQUIRED_BITRATE_MAPPING[resolution];

      return {
        title,
        bitrate,
        resolution,
        bitrateThreshold,
      };
    });
}

/**
 * Audits tv episodes that are below the specified bitrate
 * @param {Array<object>} showsLibrary Every show item
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
async function parseEpisodesWithBitrateThreshold(showsLibrary) {
  // paths to get information about each show's seasons
  const seasonMetadataPaths = showsLibrary.MediaContainer.Directory
    .map((x) => x['@_key']);

  // metadata for each episode
  const allEpisodesMetadata = await fetchEpisodesVideoMetadata(seasonMetadataPaths);

  const episodesNotMeetingThreshold = allEpisodesMetadata
    .filter(doesVideoMeetThreshold);

  return episodesNotMeetingThreshold
    .reduce((acc, episodeVideoMetadata) => {
      const mediaMetadata = plexVideoUtils.getMedia(episodeVideoMetadata);
      const showName = plexVideoUtils.getGrandparentTitle(episodeVideoMetadata);
      const seasonName = plexVideoUtils.getParentTitle(episodeVideoMetadata);
      const episodeName = plexVideoUtils.getTitle(episodeVideoMetadata);

      const bitrate = plexMediaUtils.getMediaBitrate(mediaMetadata);
      const resolution = plexMediaUtils.getMediaResolution(mediaMetadata);
      const bitrateThreshold = RESOLUTION_TO_REQUIRED_BITRATE_MAPPING[resolution];

      // pop a new entry in for the show
      if (!acc[showName]) {
        return {
          ...acc,
          [showName]: {
            [seasonName]: [{
              title: episodeName, bitrate, bitrateThreshold, resolution,
            }],
          },
        };
      }

      // pop a new entry in for the season, maintaining other seasons that may already be here
      if (!acc[showName][seasonName]) {
        return {
          ...acc,
          [showName]: {
            ...acc[showName],
            [seasonName]: [{
              title: episodeName, bitrate, bitrateThreshold, resolution,
            }],
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
            {
              title: episodeName, bitrate, bitrateThreshold, resolution,
            },
          ],
        },
      };
    }, {});
}

/**
 * Helper to check if a given video object meets the bitrate requirement
 * @param {object} videoMetadata A plex video object
 * @returns {boolean} Whether the threshold is met
 */
function doesVideoMeetThreshold(videoMetadata) {
  const mediaMetadata = plexVideoUtils.getMedia(videoMetadata);

  if (Array.isArray(mediaMetadata)) {
    return false;
  }

  const bitrate = plexMediaUtils.getMediaBitrate(mediaMetadata);
  const resolution = plexMediaUtils.getMediaResolution(mediaMetadata);

  const bitrateThreshold = RESOLUTION_TO_REQUIRED_BITRATE_MAPPING[resolution];

  // if we have a resolution that there's no config for, let's
  // assume the threshold fails, and we can investigate manually
  if (!bitrateThreshold) {
    console.error(`Unrecognised resolution: ${resolution}`);
    return false;
  }

  return bitrate < bitrateThreshold;
}
