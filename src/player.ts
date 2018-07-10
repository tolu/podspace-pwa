import { RssItem } from "./rssStringToJson";

const audio = new Audio();
// @ts-ignore
window.audio = audio;

export default {
  play(pod: RssItem) {
    if(audio.src === pod.enclosure.url) {
      audio.paused && audio.play();
    } else {
      audio.src = pod.enclosure.url;
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
    } else {
      audio.play();
    }
  },
  setProgress(percent: number) {
    if(!audio.paused) {
      const time = Math.min(100, percent) / 100 * audio.duration;
      console.log('setProgress', {percent, time})
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