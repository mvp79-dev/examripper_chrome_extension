import { Sleep } from '../lib/external/Algorithm/Sleep.js';
import { ChildListObserver } from '../lib/external/Platform/Web/DOM/MutationObserver/ChildList.js';
import { ElementAddedObserver } from '../lib/external/Platform/Web/DOM/MutationObserver/ElementAdded.js';

new ElementAddedObserver({ selector: 'video' }).subscribe((video) => {
  if (video instanceof HTMLVideoElement) {
    setupSpeedObserver(async (speed) => {
      video.playbackRate = speed;
      await Sleep(500);
      return video.playbackRate;
    });
  }
});
new ElementAddedObserver({ selector: 'iframe' }).subscribe((iframe) => {
  if (iframe instanceof HTMLIFrameElement) {
    const iframeId = iframe.getAttribute('id');
    setupSpeedObserver(async (speed) => {
      // @ts-ignore
      const { YT, Vimeo } = window;
      if (YT && iframeId) {
        const player = YT.get(iframeId);
        player.setPlaybackRate(speed);
        await Sleep(500);
        return player.getPlaybackRate();
      }
      if (Vimeo) {
        const player = Vimeo.Player(iframe);
        player.setPlaybackRate(speed);
        await Sleep(500);
        return player.getPlaybackRate();
      }
    });
  }
});

function setupSpeedObserver(setVideoSpeed: (speed: number) => Promise<number>) {
  new ElementAddedObserver({ selector: 'button[data-test-id="small-device-speed-control"]' }).subscribe((button) => {
    if (button instanceof HTMLButtonElement) {
      const setSpeedButtonText = (speed: number) => {
        let ref = button.firstElementChild;
        while (ref?.firstElementChild) {
          ref = ref.firstElementChild;
        }
        if (ref instanceof HTMLSpanElement) {
          if (ref.firstChild?.textContent) {
            ref.firstChild.textContent = speed.toString();
          }
        }
      };
      if (button.parentElement) {
        new ChildListObserver({ source: button.parentElement }).subscribe((record) => {
          for (const node of record.addedNodes) {
            if (node instanceof HTMLDivElement) {
              node.style.top = '-346.734px';
              node.style.left = '-48px';
              const speed_buttons = Array.from(node.querySelectorAll('div[role="button"]'));
              const ref_0 = speed_buttons.at(0);
              if (ref_0 instanceof HTMLDivElement) {
                let ref_previous_button = speed_buttons.at(-1) ?? ref_0;
                for (const speed of [1.5, 2, 4]) {
                  const clone = ref_0.cloneNode(true) as HTMLDivElement;
                  if (clone.firstElementChild instanceof HTMLSpanElement) {
                    clone.firstElementChild.innerText = `${speed}x`;
                  }
                  clone.addEventListener('click', () => {
                    setVideoSpeed(speed).then(setSpeedButtonText);
                  });
                  ref_previous_button.after(clone);
                  ref_previous_button = clone;
                }
              }
            }
          }
        });
      }
    }
  });
}
