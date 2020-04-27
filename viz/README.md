# `VIZ` - WebMIDI Playground

<a href="https://midi.maxvogler.de/viz"><img src="https://media.giphy.com/media/lpnF7zdRCMiAZNsaol/giphy.gif"></a>

## Use [midi.maxvogler.de/viz](https://midi.maxvogler.de/viz)
1. Send [MIDI Beat Clock](https://en.wikipedia.org/wiki/MIDI_beat_clock) from your audio software of choice to a MIDI output
   on your computer, e.g. …
   
   1. Start [Traktor Pro](https://www.native-instruments.com/en/products/traktor/dj-software/traktor-pro-3/).
   1. Open *Preferences*.
   1. In *External Sync*, *Enable MIDI clock*.
   1. In *Controller Manager*, if you do not have a *Generic MIDI* device yet, create one by clicking on *Add…*. Then, set
      *Out-Port* to *Traktor Virtual Output*.
   1. Close the *Preferences* window.
   1. Restart Traktor Pro.
1. Play a track of your choice in your audio software.
1. Open [midi.maxvogler.de/viz](https://midi.maxvogler.de/viz) in a browser that
   [supports WebMIDI](https://caniuse.com/#feat=midi), e.g. Chrome.
    1. The website shows the name of your MIDI output device (e.g. *Traktor Virtual Output*). If it does not, try restarting
       your browser.
1. Activate the MIDI beat clock in your music software.
    1. In the *Global Section* on top of the Traktor window, activate the MIDI clock by clicking on ⏯︎.    
       <img src="https://user-images.githubusercontent.com/864168/80423531-7712e400-88e0-11ea-89ed-fce551868511.png" height="70">
1. The website shows the BPM of the track that you are playing. It also increments counters for bars and beats, e.g. `1.4.4`.
    1. If you see `UNSYNCHRONIZED PHASE`, sync the MIDI beat clock, e.g. by pressing *SYNC* (below ⏯︎) in the *Global Section* 
       of the Traktor window.
1. The animation on the website starts pulsating with the beat. Awesome.

## Develop
The code involves no build steps, compilation, or other black magic for now. Forks and Pull Requests are very welcome, go wild!
* [midiclock.js](/viz/midiclock.js) recieves and interprets [MIDI beat clock](https://en.wikipedia.org/wiki/MIDI_beat_clock)
  signals using the [Web MIDI API](https://webaudio.github.io/web-midi-api/).
* [viz.js](/viz/viz.js) renders the animation. The file exports a class `Renderer` with a simple interface:
  * `constructor(canvasEl) {}` is called with a `<canvas>` element when the website loads.
  * `render()` is called exactly once. Start your rendering loop here, e.g. by calling `requestAnimationFrame`.
  * `clockMessage` property is overwritten on every MIDI beat clock signal with an object, e.g.
    ```js
    {
      messageCounter: 97, // 24 pulses per quarter note.
      note: 1.0104166667, // messageCounter / 24 / 4.
      bpm: 84.999, 
      synchronized: true, // true, if `note` is in sync with MIDI source.
    }
    ```
    
## Credit
The mesmerizing circle of triangles is [Stacking Polygons in a Circle](https://observablehq.com/@mootari/exercise-for-the-reader)
by [Fabian Iwand](https://twitter.com/mootari). I've merely adapted the parameters and added the pulsating motion.

[Monica Dinculescu](https://twitter.com/notwaldorf) created awesome [WebMIDI examples](https://webmidi-examples.glitch.me) that
got me started quickly.
