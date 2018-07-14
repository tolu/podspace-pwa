import { RssItem } from "./rssStringToJson";

const audio = new Audio();
// @ts-ignore
window.audio = audio;

export default {
  play(pod: RssItem) {
    // TODO: HACK
    const offline = localStorage.getItem('offline');
    let src = pod.enclosure.url;
    if(offline && offline.indexOf(pod.enclosure.url) !== -1) {
      console.log('playing offline stuff');
      src = offline;
    }
    if(audio.src === src) {
      audio.paused && audio.play();
    } else {
      audio.src = src;
      audio.play();  
    }
  },
  pause() {
    if(!audio.paused) {
      audio.pause();
    }
  },
  togglePlay() {
    if(!audio.paused) {
      audio.pause();
      return false;
    }
    audio.play();
    return true;
  },
  skip(value: number) {
    if(audio.src) {
      audio.currentTime += value;
    }
  },
  setProgress(percent: number) {
    if(audio.src) {
      const time = Math.min(100, percent) / 100 * audio.duration;
      audio.currentTime = time;
    }
  },
  reset(){
    if(audio) {
      audio.pause();
      audio.src = '';
      audio.currentTime = 0;
    }
  },
  addEventListener(event: keyof HTMLMediaElementEventMap, handler: EventListener){
    audio.addEventListener(event, handler);
    return () => audio.removeEventListener(event, handler);
  }
}