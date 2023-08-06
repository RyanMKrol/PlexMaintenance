#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData, fetchRawPlexTelevisionLibraryData, fetchEpisodesVideoMetadata } from '../remote';

import 'dotenv/config';

(async function main() {
  console.log('Auditing Duplicate Files...');

  const plexMovieLibrary = await fetchRawPlexMovieLibraryData();
  const plexTelevisionLibrary = await fetchRawPlexTelevisionLibraryData();

  const dupeMoviesTitles = parseDuplicateMoviesTitles(plexMovieLibrary);
  const dupeTvEpisodesTitles = await parseDuplicateTvEpisodeTitles(plexTelevisionLibrary);

  console.log('Here are your movies that may have duplicated media files:');
  console.log(JSON.stringify(dupeMoviesTitles, null, 2));

  console.log('Here are your tv episodes that may have duplicated media files:');
  console.log(JSON.stringify(dupeTvEpisodesTitles, null, 2));
}());

/**
 * Parses movies that have more than one media entry
 * @param {Array<object>} movieLibrary Every movie item
 * @returns {Array<string>} The titles of movies with more than one underlying file
 */
function parseDuplicateMoviesTitles(movieLibrary) {
  const videoItems = movieLibrary.MediaContainer.Video;
  return videoItems
    .filter((movie) => movie.Media.length > 1)
    .map((movie) => movie['@_title']);
}

/**
 * Parses tv episodes that have more than one media entry
 * @param {Array<object>} televisionLibrary Every television item
 * @returns {Array<object>} The episodes with more than one underlying file
 */
async function parseDuplicateTvEpisodeTitles(televisionLibrary) {
  // paths to get information about each show's seasons
  const seasonMetadataPaths = televisionLibrary.MediaContainer.Directory
    .map((x) => x['@_key']);

  // metadata for each episode
  const allEpisodesMetadata = await fetchEpisodesVideoMetadata(seasonMetadataPaths);

  return allEpisodesMetadata.reduce((acc, episodeData) => {
    if (episodeData.Media.length > 1) {
      const showName = episodeData['@_grandparentTitle'];
      const seasonName = episodeData['@_parentTitle'];
      const episodeName = episodeData['@_title'];

      // pop a new entry in for the show
      if (!acc[showName]) {
        return {
          ...acc,
          [showName]: {
            [seasonName]: [episodeName],
          },
        };
      }

      // pop a new entry in for the season, maintaining other seasons that may already be here
      if (!acc[showName][seasonName]) {
        return {
          ...acc,
          [showName]: {
            ...acc[showName],
            [seasonName]: [episodeName],
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
            episodeName,
          ],
        },
      };
    }
    return acc;
  }, {});
}
