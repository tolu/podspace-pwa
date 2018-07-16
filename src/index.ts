import { html, render } from "lit-html";
import { header } from "./components/header";
import { playerUi } from "./components/playerUi";
import { podcastListItem } from "./components/podListItem";
import { selectedPodcast } from "./components/selectedPodcast";
import { getFeedItems } from "./feedService";
import { search } from "./iTunesService";
import { getCachedMp3Url } from "./offlineAudioManager";
import player from "./player";
import { IRssItem } from "./rssStringToJson";
import { addPod, getPods, removePod } from "./state";
import "./style.less";
import { durationStringToSec } from "./utils";

const state: IState = {
  title: "Podspace",
  searchResults: [],
  podcasts: getPods(),
  podcast: {
    meta: null,
    items: [],
  },
  player: undefined,
};
// @ts-ignore
window.state = state;

const template = (currentState: IState) => {
  return html`
  <div>
    ${header(currentState)}
    <div class="podcasts-favorites">
      <h3>My Podcasts</h3>
      <ul class="nrk-unset list-container">
        ${podcastListItem(currentState.podcasts, "saved-podcast")}
      </ul>
    </div>
    ${ selectedPodcast(currentState.podcast) }
  </div>
  ${ playerUi(currentState.player) }
  `;
};

const updateState = (newState: any) => {
  Object.assign(state, newState);
  render(template(state), document.body);
};

document.addEventListener("keydown", async ({target, keyCode}) => {
  if (target instanceof HTMLInputElement) {
    if (target.matches(".search-field") && keyCode === 13) {
      const {results} = await search(target.value);
      updateState({searchResults: results});
      console.log(results);
    }
  }
});

document.addEventListener("click", async ({target}) => {
  if (target instanceof HTMLElement) {
    if (target.matches(".podcast-search-result")) {
      const pod = state.searchResults.find((p) => p.collectionId.toString() === target.id);
      console.log("Adding pod", pod);
      addPod(pod);
      state.podcasts = getPods();
      console.log(state.podcasts.length);
      updateState({});
    } else if (target.matches(".remove-podcast")) {
      removePod(target.getAttribute("data-id") || "");
      state.podcasts = getPods();
      updateState({});
    } else if (target.matches(".offline-episode")) {
      const src = target.getAttribute("data-src");
      console.log("offline episode", src);
      target.classList.add("is-busy");
      // TODO: move all of this to offlineManager
      try {
        // request with no-cors since that is what audio-element does
        await fetch(src + "?podspace-offline", { mode: "no-cors" });
        const handle = setInterval(async () => {
          const pod: any = {enclosure: { url: src }};
          if (!!(await getCachedMp3Url(pod))) {
            clearInterval(handle);
            console.log("episode available offline");
            updateState({});
          }
        }, 350);
      } catch (err) {
        console.error("mp3 fetch failed...");
      }
    } else if (target.matches(".saved-podcast")) {
      const pod = state.podcasts.find((p) => p.collectionId.toString() === target.id);
      if (pod) {
        console.log("render feed for", pod.collectionName, pod.feedUrl, pod);
        const {items} = await getFeedItems(pod.feedUrl);
        state.podcast = {
          meta: pod,
          items,
        };
        updateState({});
      }
    } else if (target.matches(".playable")) {
      player.reset();
      const src = target.getAttribute("data-src") || "";
      const pod = state.podcast.items.find((p) => p.enclosure.url === src);
      if (pod) {
        player.play(pod);
        state.player = {
          playing: true,
          progress: 0,
          showTitle: (state.podcast.meta || {} as any).collectionName,
          episodeTitle: pod.title,
          image: (state.podcast.meta || {} as any).artworkUrl100,
          duration: durationStringToSec(pod.duration),
        };
        updateState({});
      } else {
        state.player = undefined;
        console.log("Found no pod with src = ", src);
      }
    } else if (target.matches(".pod-player .play-pause")) {
      const isPlaying = player.togglePlay();
      if (state.player) {
        state.player.playing = isPlaying;
        updateState({});
      }
    } else if (target.matches(".pod-player .skip-back")) {
      player.skip(-10);
    } else if (target.matches(".pod-player .skip-ffw")) {
      player.skip(30);
    }
  }
});
document.addEventListener("change", ({target}) => {
  if (target instanceof HTMLInputElement) {
    if (target.matches(".pod-player input")) {
      console.log("onChange", target.value);
      player.setProgress(parseFloat(target.value));
    }
  }
}, { capture: true, passive: true });
player.addEventListener("timeupdate", (event: Event) => {
  const {target} = event;
  if (state.player && target instanceof HTMLAudioElement) {
    state.player.progress = target.currentTime;
    updateState({});
  }
  // console.log('timeupdate', event);
});

// trigger first render
updateState(state);
// @ts-ignore
document.querySelector("input").focus();

if ("serviceWorker" in navigator) {
  console.log("we got service workers!");
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      // Registration was successful
      console.log("ServiceWorker registration successful with scope: ", registration.scope);
    }, (err) => {
      // registration failed :(
      console.log("ServiceWorker registration failed: ", err);
    });
  });
}

export interface IState {
  title ?: string;
  searchResults: IiTunesResult[];
  podcasts: IiTunesResult[];
  podcast: ISelectedPodcast;
  player?: IPlayerState;
}
export interface ISelectedPodcast {
  meta: IiTunesResult | null;
  items: IRssItem[];
}
export interface IPlayerState {
  showTitle: string;
  episodeTitle: string;
  progress: number;
  playing: boolean;
  duration: number;
  image: string;
}
export interface IiTunesResult {
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
