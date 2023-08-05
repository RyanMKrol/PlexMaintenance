#!/usr/bin/env node
import { fetchRawPlexMovieLibraryData, fetchRawPlexTelevisionLibraryData, fetchRawPlexTelevisionMetadata } from '../fetch';

import 'dotenv/config';

const plexMovieLibrary = await fetchRawPlexMovieLibraryData();
const plexTelevisionLibrary = await fetchRawPlexTelevisionLibraryData();

const dupeMoviesTitles = parseDuplicateMoviesTitles(plexMovieLibrary);
const dupeTvEpisodesTitles = await parseDuplicateTvEpisodeTitles(plexTelevisionLibrary);

console.log('Here are your movies that may have duplicated media files:');
console.log(JSON.stringify(dupeMoviesTitles, null, 2));

console.log('Here are your tv episodes that may have duplicated media files:');
console.log(JSON.stringify(dupeTvEpisodesTitles, null, 2));

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
 * @returns {Array<string>} The titles of tv episodes with more than one underlying file
 */
async function parseDuplicateTvEpisodeTitles(televisionLibrary) {
  // paths to get information about each show's seasons
  const seasonMetadataPaths = televisionLibrary.MediaContainer.Directory
    .map((x) => x['@_key']);

  // paths to get information about each show's season's episodes
  const allEpisodesMetadataPaths = await fetchAllSeasonsEpisodesMetadataPaths(seasonMetadataPaths);

  // metadata for each episode
  const allEpisodesMetadata = await fetchAllEpisodeMetadata(allEpisodesMetadataPaths);

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

/**
 * For each show, fetches the path to fetch further metadata about each season within the show
 * @param {Array<string>} allShowsMetadataPaths Array of paths to get information about each season
 * @returns {Array<string>} Paths to get metadata for each season
 * Note: Method is laid out with sequential promises because of an early apprehension
 * around overloading the local server. Turns out the load is pretty minimal, so the
 * waits were stripped out, but the sequentail nature of the promise has stayed put
 */
async function fetchAllSeasonsEpisodesMetadataPaths(allShowsMetadataPaths) {
  return allShowsMetadataPaths.reduce((acc, path) => acc
    .then((newAcc) => fetchRawPlexTelevisionMetadata(path)
      .then(async (data) => {
        const title = data.MediaContainer['@_title2'];
        const showSeasonsMetadata = Array.isArray(data.MediaContainer.Directory)
          ? data.MediaContainer.Directory
          : [data.MediaContainer.Directory];

        // when there are a lot of seasons in a show, an artificial season
        // for "all episodes" is plugged into the array, let's remove those
        const showSeasonsMetadataAllSeason = showSeasonsMetadata.filter((metadata) => {
          const maybeSeasonTitle = metadata['@_title'];
          const isSeasonActualSeason = !!metadata['@_type'];

          if (!isSeasonActualSeason && maybeSeasonTitle.toLowerCase() !== 'all episodes') {
            console.error(`We're skipping something we haven't seen before: ${maybeSeasonTitle}, for show with name ${title}`);
          }

          return isSeasonActualSeason;
        });

        return newAcc.concat(showSeasonsMetadataAllSeason.map((x) => x['@_key']));
      })), Promise.resolve([]));
}

/**
 * Fetches a giant array of metadata for every episode of a video,
 * for all of the seasons' metadata paths provided
 * @param {Array<string>} seasonsEpisodeMetadataPaths The paths of every season's metadata link
 * to get information about the episodes within a season
 * @returns {Array<object>} An array of every episode's video metadata
 * Note: Method is laid out with sequential promises because of an early apprehension
 * around overloading the local server. Turns out the load is pretty minimal, so the
 * waits were stripped out, but the sequentail nature of the promise has stayed put
 */
async function fetchAllEpisodeMetadata(seasonsEpisodeMetadataPaths) {
  return seasonsEpisodeMetadataPaths
    .reduce(
      (acc, path) => acc
        .then((newAcc) => fetchRawPlexTelevisionMetadata(path)
          .then(async (data) => newAcc.concat([data.MediaContainer.Video]))),
      Promise.resolve([]),
    )
    .then((data) => data.flat());
}
