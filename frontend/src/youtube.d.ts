// Type definitions for YouTube IFrame API
declare namespace YT {
  interface Player {
    loadVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    destroy(): void;
  }

  interface PlayerOptions {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: PlayerVars;
    events?: Events;
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    enablejsapi?: 0 | 1;
    fs?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    iv_load_policy?: 1 | 3;
    start?: number;
    end?: number;
  }

  interface Events {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
    onPlaybackQualityChange?: (event: PlayerEvent) => void;
    onPlaybackRateChange?: (event: PlayerEvent) => void;
    onError?: (event: PlayerEvent) => void;
    onApiChange?: (event: PlayerEvent) => void;
  }

  interface PlayerEvent {
    target: Player;
    data: number;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
  }
}

declare var YT: {
  Player: typeof YT.Player;
  PlayerState: typeof YT.PlayerState;
};
