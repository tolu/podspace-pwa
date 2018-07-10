import {iTunesResult} from './index';
import {createCache} from './cache';
const cache = createCache('user-data');

const podcasts: iTunesResult[] = cache.get('podcasts') || [];

export const getPods = () => [...podcasts];
export const addPod = (pod?: iTunesResult) => {
  if(pod) {
    podcasts.push(pod);
    cache.set('podcasts', podcasts);
  }
}
export const removePod = (podId: string) => {
  const pod = podcasts.find(p => p.collectionId.toString() === podId);
  if(pod){
    podcasts.splice(podcasts.indexOf(pod), 1);
    cache.set('podcasts', podcasts);
  }
}
