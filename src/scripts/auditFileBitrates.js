#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData } from '../fetch';

import 'dotenv/config';

const SPECIFIED_BITRATE = 3000;

const plexMovieLibrary = await fetchRawPlexMovieLibraryData();

const moviesNotMeetingBitrateThreshold = parseMoviesWithBitrateThreshold(
  plexMovieLibrary,
  SPECIFIED_BITRATE,
);

console.log('These movies do not meet the specified bitrate:');
console.log(JSON.stringify(moviesNotMeetingBitrateThreshold, null, 2));

/**
 * Audits movies that are below the specified bitrate
 * @param {Array<object>} movieLibrary Every movie item
 * @param requiredBitrate
 * @returns {Array<string>} The titles of movies that don't hit the bitrate target
 */
function parseMoviesWithBitrateThreshold(movieLibrary, requiredBitrate) {
  return movieLibrary.MediaContainer.Video
    .filter((videoMetadata) => Number.parseInt(videoMetadata.Media['@_bitrate'], 10) < requiredBitrate)
    .map((videoMetadata) => videoMetadata['@_title']);
}
