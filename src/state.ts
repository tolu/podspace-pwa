import {createCache} from "./cache";
import {IiTunesResult} from "./index";
const cache = createCache("user-data");

const podcasts: IiTunesResult[] = cache.get("podcasts") || [];

export const getPods = () => [...podcasts];

export const addPod = (pod?: IiTunesResult) => {
  if (pod) {
    const podId = pod.collectionId.toString();
    // if we already have it, move it to top of list, by removing first
    if (getPod(podId)) {
      removePod(podId);
    }
    podcasts.unshift(pod);
    cache.set("podcasts", podcasts);
  }
};
export const removePod = (podId: string) => {
  const pod = getPod(podId);
  if (pod) {
    podcasts.splice(podcasts.indexOf(pod), 1);
    cache.set("podcasts", podcasts);
  }
};

function getPod(podId: string) {
  return podcasts.find((p) => p.collectionId.toString() === podId);
}
