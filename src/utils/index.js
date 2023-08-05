import https from 'https';
import fetch from 'node-fetch';

/**
 * Method to fetch data from localhost, needed to get around invalid SSL certs
 * @param {string} url URL to fetch data from
 * @returns {object} blob of data
 */
async function getFromLocalhost(url) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await fetch(url, {
    method: 'GET',
    agent: httpsAgent,
  });

  return response;
}

/**
 * Fetch data from a remote location using http GET
 * @param {string} url The URL to fetch data from
 * @param {string} authToken The auth bearer token
 * @returns {object} blob of data from remote location
 */
async function getFromRemoteHost(url, authToken) {
  return fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });
}

/**
 * Method to halt execution
 * @param {number} ms Time in ms to wait
 * @returns {Promise<void>} A promise to wait on
 */
// eslint-disable-next-line no-promise-executor-return
async function sleep(ms) { console.log(`Sleeping for ${ms / 1000} seconds`); return new Promise((res) => setTimeout(res, ms)); }

export {
  getFromLocalhost,
  getFromRemoteHost,
  sleep,
};
