/* eslint-disable */
import { fetchPlexLibraryDetails, fetchTvItemId, fetchTvItemDetails } from './fetch';
import { haltPromise } from './utils';

/**
 * Main
 */
async function main() {
  const plexLibraryDetails = await fetchPlexLibraryDetails();

  const data = await plexLibraryDetails.slice(0,2).reduce(async (acc, currentLibItem) => acc.then(async (currentAcc) => {
    const id = await fetchTvItemId(currentLibItem.title, currentLibItem.year);
    const deets = await fetchTvItemDetails(id);

    currentAcc.push({
        plex: currentLibItem,
        reference: deets
    })

    // wait some time to prevent us overloading the API
    await haltPromise(5000);

    return currentAcc
  }), Promise.resolve([]));
}

main();
