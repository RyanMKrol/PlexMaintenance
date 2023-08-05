import { XMLParser } from 'fast-xml-parser';

import { getFromLocalhost, getFromRemoteHost } from '../utils';

import 'dotenv/config';

/**
 * Fetches XML data from a localhost URL
 * @param {string} url Where to find the data
 * @returns {Array<object>} Response
 */
async function fetchLocalXmlData(url) {
  const response = await getFromLocalhost(url);
  const data = await response.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(data);

  return parsed;
}

/**
 * Fetch the raw library data for my "Movies" library
 * @returns {Array<object>} An array of plex library items
 */
async function fetchRawPlexMovieLibraryData() {
  return fetchLocalXmlData(`https://192.168.1.130:32400/library/sections/4/all?X-Plex-Token=${process.env.PLEX_API_TOKEN}`);
}

/**
 * Fetch the raw library data for my "TV" library
 * @returns {Array<object>} An array of plex library items
 */
async function fetchRawPlexTelevisionLibraryData() {
  return fetchLocalXmlData(`https://192.168.1.130:32400/library/sections/5/all?X-Plex-Token=${process.env.PLEX_API_TOKEN}`);
}

/**
 * Fetch raw library data for a given piece of metadata in my "TV" library
 * @param {string} path The path to the metadata we want from the TV library
 * @returns {Array<object>} An array of metadata
 */
async function fetchRawPlexTelevisionMetadata(path) {
  return fetchLocalXmlData(`https://192.168.1.130:32400${path}?X-Plex-Token=${process.env.PLEX_API_TOKEN}`);
}

/**
 * Fetch the library details for my Plex library
 * @returns {Array<object>} An array of plex library items
 */
async function fetchPlexTelevisionLibrarySeasonInformation() {
  const data = await fetchRawPlexTelevisionLibraryData();

  const libData = data.MediaContainer.Directory.map((item) => ({
    title: item['@_title'],
    year: item['@_year'],
    episode_count: item['@_leafCount'],
    season_count: item['@_childCount'],
  }));

  return libData;
}

/**
 * Fetch the ID for a TV show
 * @param {string} title Title of TV show to fetch an ID for
 * @param {string} startYear The year that the show started airing
 * @returns {string} ID of given TV show
 */
async function fetchTvItemId(title, startYear) {
  const response = await getFromRemoteHost(`https://api.themoviedb.org/3/search/tv?query=${title}&first_air_date_year=${startYear}`, process.env.TMDB_API_TOKEN);
  const data = await response.json();

  if (data.total_results === 0) {
    return null;
  }

  return data.results[0].id;
}

/**
 * Fetches details of a TV show
 * @param {string} id The ID of the TV show to fetch details for
 * @returns {object} Data around a TV show
 */
async function fetchTvItemDetails(id) {
  const response = await getFromRemoteHost(`https://api.themoviedb.org/3/tv/${id}`, process.env.TMDB_API_TOKEN);
  const data = await response.json();

  if (typeof data.id === 'undefined') {
    return null;
  }

  return {
    episodes: data.number_of_episodes,
    seasons: data.number_of_seasons,
    status: data.status,
  };
}

export {
  fetchRawPlexMovieLibraryData,
  fetchRawPlexTelevisionLibraryData,
  fetchRawPlexTelevisionMetadata,
  fetchPlexTelevisionLibrarySeasonInformation,
  fetchTvItemId,
  fetchTvItemDetails,
};
