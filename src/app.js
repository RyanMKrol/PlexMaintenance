import { fetchPlexLibraryDetails, fetchTvItemId, fetchTvItemDetails } from './fetch';
import { haltPromise } from './utils';

/**
 * Main
 */
async function main() {
  const plexLibraryDetails = await fetchPlexLibraryDetails();

  const plexAndReferenceData = await plexLibraryDetails
    .reduce(async (acc, currentLibItem) => acc.then(async (currentAcc) => {
      // wait some time to prevent us overloading the API. do this first in
      // case we need to short-circuit any action later on
      await haltPromise(1000);
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
}

main();
