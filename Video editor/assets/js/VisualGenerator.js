export default class VisualGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async generateWaveform(audioUrl, canvas, color = '#4a90e2') {
        try {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.drawWaveform(audioBuffer, canvas, color);
        } catch (e) {
            console.error('Error generating waveform:', e);
        }
    }

    drawWaveform(audioBuffer, canvas, color) {
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext('2d');
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    async generateThumbnails(videoUrl, container, duration, count = 10) {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous'; // Important for canvas export if needed
        video.muted = true;

        await new Promise(resolve => {
            video.addEventListener('loadedmetadata', resolve, { once: true });
        });

        const interval = duration / count;
        const width = container.clientWidth / count;
        const height = container.clientHeight;

        for (let i = 0; i < count; i++) {
            const time = i * interval;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = `${width}px`;
            canvas.style.height = '100%';

            container.appendChild(canvas);

            this.captureFrame(video, time, canvas);
        }
    }

    async captureFrame(video, time, canvas) {
        return new Promise(resolve => {
            video.currentTime = time;
            video.addEventListener('seeked', () => {
                const ctx = canvas.getContext('2d');
                // Draw image to cover the canvas area (like object-fit: cover)
                const hRatio = canvas.width / video.videoWidth;
                const vRatio = canvas.height / video.videoHeight;
                const ratio = Math.max(hRatio, vRatio);

                const centerShift_x = (canvas.width - video.videoWidth * ratio) / 2;
                const centerShift_y = (canvas.height - video.videoHeight * ratio) / 2;

                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                    centerShift_x, centerShift_y, video.videoWidth * ratio, video.videoHeight * ratio);
                resolve();
            }, { once: true });
        });
    }
}
