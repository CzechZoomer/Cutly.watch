export default class Player {
    constructor(videoElementId) {
        this.video = document.getElementById(videoElementId);
        this.playBtn = document.getElementById('play-pause');
        this.timeDisplay = document.getElementById('time-display');

        this.isPlaying = false;

        this.setupControls();
    }

    setupControls() {
        this.playBtn.addEventListener('click', () => this.togglePlay());

        this.video.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            // Dispatch event for timeline to sync
            const event = new CustomEvent('playerTimeUpdate', { detail: this.video.currentTime });
            document.dispatchEvent(event);
        });

        this.video.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayIcon();
        });
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
            this.isPlaying = true;
        } else {
            this.video.pause();
            this.isPlaying = false;
        }
        this.updatePlayIcon();
    }

    updatePlayIcon() {
        const icon = this.playBtn.querySelector('i');
        if (this.isPlaying) {
            icon.classList.remove('ph-play');
            icon.classList.add('ph-pause');
        } else {
            icon.classList.remove('ph-pause');
            icon.classList.add('ph-play');
        }
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.video.currentTime);
        const total = this.formatTime(this.video.duration || 0);
        this.timeDisplay.textContent = `${current} / ${total}`;
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    loadSource(src) {
        this.video.src = src;
        this.video.load();
    }

    seek(time) {
        this.video.currentTime = time;
    }
}
