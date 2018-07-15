import { html } from 'lit-html';
import { SelectedPodcast } from '../index';
import { podcastEpisode } from './podcastEpisode';
import { getAllCachedMp3Urls, isOffline } from '../offlineAudioManager';

export const selectedPodcast = async (podcast: SelectedPodcast) => {
  if(!podcast.meta) {
    return '';
  }
  const cachedMp3Urls = await getAllCachedMp3Urls();
  return html`
  <div class="podcasts-episodes">
    <h3>${podcast.meta.collectionName}</h3>
    <div>
      <button class="nrk-button remove-podcast" data-id="${podcast.meta.collectionId}" aria-label="Remove podcast">
        Remove
        <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-close-circle" /></svg>
      </button>
    </div>
    <ul class="nrk-unset">
      ${ podcast.items.map((episode) => podcastEpisode(episode, isOffline(episode, cachedMp3Urls))) }
    </ul>
  </div>`
}