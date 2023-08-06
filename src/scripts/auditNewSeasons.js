#!/usr/bin/env node
import { fetchPlexTelevisionLibrarySeasonInformation, fetchTvItemId, fetchTvItemDetails } from '../remote';
import { sleep } from '../utils';

import 'dotenv/config';

(async function main() {
  console.log('Auditing New Seasons...');

  const plexLibraryDetails = await fetchPlexTelevisionLibrarySeasonInformation();

  const plexAndReferenceData = await plexLibraryDetails
    .filter((item) => !process.env.NOOP_TITLES.includes(item.title))
    .reduce(async (acc, currentLibItem) => acc.then(async (currentAcc) => {
    // wait some time to prevent us overloading the API. do this first in
    // case we need to short-circuit any action later on
      await sleep(1000);
      console.log(`Processing: ${currentLibItem.title}...`);

      const id = await fetchTvItemId(currentLibItem.title, currentLibItem.year);
      if (id === null) {
        console.log('Failed to get data for the following item', currentLibItem.title, currentLibItem.year);
        return currentAcc;
      }

      const showDetails = await fetchTvItemDetails(id);
      if (showDetails === null) {
        console.log('Failed to get data for the following item', currentLibItem.title, currentLibItem.year);
        return currentAcc;
      }

      currentAcc.push({
        plex: currentLibItem,
        reference: showDetails,
      });

      return currentAcc;
    }), Promise.resolve([]));

  const seasonsToInvestigate = plexAndReferenceData.filter((item) => {
    const plexSeasons = Number.parseInt(item.plex.season_count, 10);
    const plexEpisodes = Number.parseInt(item.plex.episode_count, 10);

    const referenceSeasons = item.reference.seasons;
    const referenceEpisodes = item.reference.episodes;

    return plexSeasons !== referenceSeasons || plexEpisodes !== referenceEpisodes;
  });

  console.log(seasonsToInvestigate);
}());
