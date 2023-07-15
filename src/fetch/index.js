import { XMLParser } from 'fast-xml-parser';

import { getFromLocalhost, getFromRemoteHost } from '../utils';
import {
  PLEX_TOKEN,
  TMDB_TOKEN,
} from '../credentials';

/**
 * fetch the library details for my Plex library
 *
 * @returns {Array<object>} An array of plex library items
 */
async function fetchPlexLibraryDetails() {
  const URL = `https://192.168.1.130:32400/library/sections/5/all?X-Plex-Token=${PLEX_TOKEN}`;

  const response = await getFromLocalhost(URL);
  const data = await response.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(data);

  const libData = parsed.MediaContainer.Directory.map((item) => ({
    title: item['@_title'],
    year: item['@_year'],
    episode_count: item['@_leafCount'],
    season_count: item['@_childCount'],
  }));

  return libData;
}

/**
 * Fetch the ID for a TV show
 *
 * @param {string} title Title of TV show to fetch an ID for
 * @param {string} startYear The year that the show started airing
 * @returns {string} ID of given TV show
 */
async function fetchTvItemId(title, startYear) {
  const response = await getFromRemoteHost(`https://api.themoviedb.org/3/search/tv?query=${title}&first_air_date_year=${startYear}`, TMDB_TOKEN);
  const data = await response.json();

  if (data.total_results === 0) {
    return null;
  }

  return data.results[0].id;
}

/**
 * Fetches details of a TV show
 *
 * @param {string} id The ID of the TV show to fetch details for
 * @returns {object} Data around a TV show
 */
async function fetchTvItemDetails(id) {
  const response = await getFromRemoteHost(`https://api.themoviedb.org/3/tv/${id}`, TMDB_TOKEN);
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

export { fetchPlexLibraryDetails, fetchTvItemId, fetchTvItemDetails };
