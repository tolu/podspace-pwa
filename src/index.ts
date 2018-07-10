import { html, render } from 'lit-html';
import { search } from './itunesService';
import { getPods, addPod, removePod } from './state';
import { RssItem } from './rssStringToJson';
import { getFeedItems } from './feedService';
import player from './player';

const state: State = {
  title: 'Search for podcast',
  searchResults: [],
  podcasts: getPods(),
  podcast: {
    items: []
  },
  player: undefined
}
// @ts-ignore
window.state = state;

const podcastList = (list: iTunesResult[], className: string) => list.map((r) => {
  return html`
  <div>
    <img class="${className}"
          title=${r.collectionName}
          src=${r.artworkUrl100}
          alt="${r.trackName}"
          id="${r.collectionId}" />
  </div>`;
})

const template = (state: State) => {
  return html`
  <h1>§ ${state.title} §</h1>
  <form name="search">
    <input name="searchInput" type="text" placeholder="..." />
  </form>
  <div class="search-results">
    <h3>Results: ${state.searchResults.length}</h3>
    <div class="list-container">
      ${podcastList(state.searchResults, 'podcast-search-result')}
    </div>
  </div>
  <div class="podcasts-favorites">
    <h3>My Podcasts</h3>
    <div class="list-container">
      ${podcastList(state.podcasts, 'saved-podcast')}
    </div>
  </div>
  ${ state.podcast.items.length ? html`
  <div class="podcasts-episodes">
    <h3>Selected Podcast</h3>
    <ol>
      ${ state.podcast.items.map(i => html`<li class="playable" data-src=${i.enclosure.url}>${i.title} - ${i.duration}</li>`) }
    </ol>
  </div>` : '' }
  ${ playerTpl(state.player) }
  `;
}
function playerTpl(playerState?: PlayerState) {
  const {
    title = 'No audio selected',
    duration = 0,
    progress = 0,
  } = playerState || {};
  
  return html`
  <div class="pod-player">
    <div>${title}</div>
    <button> Play/Pause </button>
    <input type="range" value=${progress/duration*100 || 0} min="0" max="100" step="0.01" />
    <span>${durationSecToString(progress)}/${durationSecToString(duration)}</span>
  </div>
  `
}

const updateState = (newState: any) =>{
  Object.assign(state, newState);
  render(template(state), document.body)
}

document.addEventListener('submit', async (event) => {
  console.log('in submit');
  event.preventDefault();
  // @ts-ignore
  const value = document.forms.search.elements.searchInput.value;
  const {results} = await search(value);
  updateState({searchResults:results})
  console.log(results);
})

document.addEventListener('click', async ({target}) => {
  if (target instanceof HTMLElement) {
    if (target.matches('.podcast-search-result')) {
      const pod = state.searchResults.find(p => p.collectionId.toString() === target.id);
      console.log('Adding pod', pod);
      addPod(pod);
      state.podcasts = getPods();
      console.log(state.podcasts.length);
      updateState({});
    }
    if (target.matches('.saved-podcast .remove')) {
      removePod(target.id);
      state.podcasts = getPods();
      updateState({});
    }
    if (target.matches('.saved-podcast')) {
      const pod = state.podcasts.find(p => p.collectionId.toString() === target.id);
      if(pod) {
        console.log('render feed for', pod.collectionName, pod.feedUrl);
        const {items} = await getFeedItems(pod.feedUrl);
        state.podcast = {
          items: items.slice(0,10)
        }
        updateState({});
      }
    }
    if (target.matches('.playable')) {
      player.reset();
      const src = target.getAttribute('data-src') || '';
      const pod = state.podcast.items.find(p => p.enclosure.url === src);
      if(pod) {
        player.play(pod);
        state.player = {
          playing: true,
          progress: 0,
          title: pod.title,
          duration: durationStringToSec(pod.duration)
        }
        updateState({});
      } else {
        state.player = undefined;
        console.log('Found no pod with src = ', src);
      }
    }
    if (target.matches('.pod-player button')) {
      console.log('toggle play');
      player.togglePlay();
    }
  }
});
document.addEventListener('change', ({target}) => {
  if (target instanceof HTMLInputElement) {
    if(target.matches('.pod-player input')) {
      player.setProgress(parseFloat(target.value));
    }
  }
}, { capture: true, passive: true });
player.addEventListener('timeupdate', (event: Event) => {
  const {target} = event;
  if(state.player && target instanceof HTMLAudioElement) {
    state.player.progress = target.currentTime;
    updateState({});
  }
  // console.log('timeupdate', event);
})
function durationStringToSec(duration: string) {
  // 01:59:23 => 23 + (59*60) + (1*60*60)
  return duration.split(':').reverse().reduce((p,n,idx) => p + parseFloat(n) * Math.pow(60, idx), 0);
}
const pad = (value: string | number) => value.toString().padStart(2, '0');
function durationSecToString(duration: number) {
  // 01:59:23 => 23 + (59*60) + (1*60*60)
  const d = new Date(0);
  d.setSeconds(Math.round(duration));
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}


// trigger first render
updateState(state);
// @ts-ignore
document.querySelector('input').focus();

if('serviceWorker' in navigator) {
  console.log('we got service workers!');
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.ts').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

interface State {
  title ?: string,
  searchResults: iTunesResult[],
  podcasts: iTunesResult[],
  podcast: {
    items: RssItem[]
  },
  player?: PlayerState
}
interface PlayerState {
  title: string,
  progress: number,
  playing: boolean,
  duration: number
}
export interface iTunesResult {
  // wrapperType: string;
  // kind: string;
  collectionId: number;
  // trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  // collectionCensoredName: string;
  // trackCensoredName: string;
  // collectionViewUrl: string;
  feedUrl: string;
  trackViewUrl: string;
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  artworkUrl600: string;
  // collectionPrice: number;
  // trackPrice: number;
  // trackRentalPrice: number;
  // collectionHdPrice: number;
  // trackHdPrice: number;
  // trackHdRentalPrice: number;
  releaseDate: string;
  // collectionExplicitness: string;
  // trackExplicitness: string;
  trackCount: number;
  country: string;
  // currency: string;
  // primaryGenreName: string;
  // contentAdvisoryRating: string;
  genreIds: string[];
  genres: string[];
}
