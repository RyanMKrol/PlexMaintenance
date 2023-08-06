/**
 * Pulls the bitrate from a plex media object
 * @param {object} media Plex Media object
 * @returns {string} The bitrate of the video
 */
function getMediaBitrate(media) {
  return Number.parseInt(media['@_bitrate'], 10);
}

/**
 * Pulls the resolution from a plex media object
 * @param {object} media Plex Media object
 * @returns {string} The resolution of the video
 */
function getMediaResolution(media) {
  return media['@_videoResolution'];
}

export { getMediaBitrate, getMediaResolution };
