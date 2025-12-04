import VisualGenerator from './VisualGenerator.js';

export default class TimelineManager {
    constructor(containerId, player) {
        this.container = document.getElementById(containerId);
        this.player = player;
        this.ruler = document.getElementById('time-ruler');
        this.playhead = document.getElementById('playhead');
        this.zoomLevel = 1;
        this.pixelsPerSecond = 20; // Base zoom

        this.tracks = [];
        this.duration = 300; // Default 5 mins

        this.visualGenerator = new VisualGenerator();

        // State for interactions
        this.isScrubbing = false;
        this.activeClip = null;
        this.interactionMode = null; // 'move', 'trim-left', 'trim-right'
        this.startX = 0;
        this.initialLeft = 0;
        this.initialWidth = 0;

        // Create Snap Line
        this.snapLine = document.createElement('div');
        this.snapLine.className = 'snap-line';
        this.container.querySelector('.timeline-tracks').appendChild(this.snapLine);

        this.setupEventListeners();
        this.setupToolbarListeners();
        this.initializeTracks();

        // Debug
        window.timeline = this;
    }

    getSnapPosition(x) {
        const SNAP_THRESHOLD = 15;
        let snapX = null;
        let minDiff = Infinity;

        // Snap to Playhead (offset by 20px padding)
        const playheadLeft = parseFloat(this.playhead.style.left);
        // Playhead is visually at left+20px, but our clip coordinates are relative to track start (0)
        // The playhead style.left INCLUDES the 20px padding.
        // Clips are inside .track-content which is arguably aligned. 
        // Let's check: .playhead is child of .timeline-tracks (padding-top 28px).
        // .track-content is child of .track.
        // .playhead left=20px means 0s.
        // Clip left=0px means 0s.
        // So we need to compare clip X (0-based) with playhead X (20-based) - 20.

        const playheadTimeX = playheadLeft - 20;

        if (Math.abs(x - playheadTimeX) < SNAP_THRESHOLD) {
            snapX = playheadTimeX;
            minDiff = Math.abs(x - playheadTimeX);
        }

        // Snap to other clips
        const clips = this.container.querySelectorAll('.clip');
        clips.forEach(clip => {
            if (clip === this.activeClip) return;

            const left = parseFloat(clip.style.left);
            const right = left + parseFloat(clip.style.width);

            if (Math.abs(x - left) < SNAP_THRESHOLD && Math.abs(x - left) < minDiff) {
                snapX = left;
                minDiff = Math.abs(x - left);
            }
            if (Math.abs(x - right) < SNAP_THRESHOLD && Math.abs(x - right) < minDiff) {
                snapX = right;
                minDiff = Math.abs(x - right);
            }
        });

        // Update Visual Indicator
        if (snapX !== null) {
            this.snapLine.style.display = 'block';
            this.snapLine.style.left = `${snapX + 20}px`; // Add 20px padding for visual alignment relative to container
        } else {
            this.snapLine.style.display = 'none';
        }

        return snapX !== null ? snapX : x;
    }

    handleGlobalMouseMove(e) {
        if (this.isScrubbing) {
            this.movePlayheadTo(e);
            return;
        }

        if (!this.activeClip || !this.interactionMode) return;

        const deltaX = e.clientX - this.startX;

        if (this.interactionMode === 'move') {
            let newLeft = Math.max(0, this.initialLeft + deltaX);

            // Apply Snapping
            newLeft = this.getSnapPosition(newLeft);

            this.activeClip.style.left = `${newLeft}px`;
            this.updatePropertiesPanel(this.activeClip);
        }
        else if (this.interactionMode === 'trim-right') {
            let newWidth = Math.max(10, this.initialWidth + deltaX);
            const currentLeft = parseFloat(this.activeClip.style.left);

            // Calculate potential new right edge
            let newRight = currentLeft + newWidth;

            // Snap the right edge
            const snappedRight = this.getSnapPosition(newRight);

            if (snappedRight !== newRight) {
                newWidth = snappedRight - currentLeft;
            }

            this.activeClip.style.width = `${newWidth}px`;
            // Update duration data
            const newDuration = newWidth / (this.pixelsPerSecond * this.zoomLevel);
            this.activeClip.dataset.duration = newDuration;
            this.updatePropertiesPanel(this.activeClip);
        }
        else if (this.interactionMode === 'trim-left') {
            const maxDelta = this.initialWidth - 10;
            const validDelta = Math.min(Math.max(deltaX, -this.initialLeft), maxDelta);

            let newLeft = this.initialLeft + validDelta;

            // Snap the left edge
            const snappedLeft = this.getSnapPosition(newLeft);

            if (snappedLeft !== newLeft) {
                // Recalculate delta based on snap
                const snapDelta = snappedLeft - this.initialLeft;
                // Ensure we don't violate min width
                if (snapDelta <= maxDelta && snappedLeft >= 0) {
                    newLeft = snappedLeft;
                    this.activeClip.style.left = `${newLeft}px`;
                    this.activeClip.style.width = `${this.initialWidth - snapDelta}px`;
                }
            } else {
                this.activeClip.style.left = `${newLeft}px`;
                this.activeClip.style.width = `${this.initialWidth - validDelta}px`;
            }

            const newDuration = parseFloat(this.activeClip.style.width) / (this.pixelsPerSecond * this.zoomLevel);
            this.activeClip.dataset.duration = newDuration;
            this.updatePropertiesPanel(this.activeClip);
        }
    }

    handleGlobalMouseUp() {
        this.isScrubbing = false;
        this.activeClip = null;
        this.interactionMode = null;
    }

    selectClip(clip) {
        document.querySelectorAll('.clip').forEach(c => c.classList.remove('selected'));
        clip.classList.add('selected');
        this.updatePropertiesPanel(clip);
    }

    updatePropertiesPanel(clip) {
        const left = parseFloat(clip.style.left);
        const width = parseFloat(clip.style.width);
        const startTime = left / (this.pixelsPerSecond * this.zoomLevel);
        const duration = width / (this.pixelsPerSecond * this.zoomLevel);

        document.getElementById('properties-panel').innerHTML = `
            <div style="padding: 10px;">
                <h3>${clip.dataset.name}</h3>
                <p>Start: ${startTime.toFixed(2)}s</p>
                <p>Duration: ${duration.toFixed(2)}s</p>
                <p>Type: ${clip.dataset.type}</p>
            </div>
        `;
    }

    deleteSelectedClip() {
        const selected = document.querySelector('.clip.selected');
        if (selected) {
            selected.remove();
            document.getElementById('properties-panel').innerHTML = '<p class="empty-state">Select a clip to edit properties</p>';
        }
    }

    splitSelectedClip() {
        const selected = document.querySelector('.clip.selected');
        if (!selected) return;

        const playheadX = parseFloat(this.playhead.style.left) - 20; // Remove padding
        const clipLeft = parseFloat(selected.style.left);
        const clipWidth = parseFloat(selected.style.width);

        // Check if playhead is inside clip
        if (playheadX > clipLeft && playheadX < clipLeft + clipWidth) {
            const splitPoint = playheadX - clipLeft;
            const firstPartWidth = splitPoint;
            const secondPartWidth = clipWidth - splitPoint;

            // Update first part
            selected.style.width = `${firstPartWidth}px`;
            selected.dataset.duration = firstPartWidth / (this.pixelsPerSecond * this.zoomLevel);

            // Create second part
            const assetData = {
                name: selected.dataset.name,
                type: selected.dataset.type,
                src: selected.dataset.src
            };

            const secondPartDuration = secondPartWidth / (this.pixelsPerSecond * this.zoomLevel);

            // Add to same track
            this.addClipToTrack(selected.parentElement, assetData, clipLeft + firstPartWidth, secondPartDuration);
        }
    }

    movePlayheadTo(e) {
        const trackContent = this.container.querySelector('.track-content');
        const trackRect = trackContent.getBoundingClientRect();
        const relativeX = e.clientX - trackRect.left + this.container.scrollLeft;
        const time = Math.max(0, relativeX / (this.pixelsPerSecond * this.zoomLevel));

        this.updatePlayheadPosition(time);
        this.player.seek(time);
    }

    updatePlayheadPosition(time) {
        const position = time * this.pixelsPerSecond * this.zoomLevel;
        this.playhead.style.left = `${position + 20}px`;
    }

    addClipToTrack(trackContent, assetData, offsetX, duration = null) {
        const clipDuration = parseFloat(duration || assetData.duration || 10);

        const clip = document.createElement('div');
        clip.className = 'clip';

        clip.dataset.name = assetData.name;
        clip.dataset.type = assetData.type;
        clip.dataset.src = assetData.src;
        clip.dataset.duration = clipDuration;

        clip.style.left = `${offsetX}px`;
        clip.style.width = `${clipDuration * this.pixelsPerSecond * this.zoomLevel}px`;

        // New Split Layout Structure
        clip.innerHTML = `
            <div class="clip-visuals">
                <div class="clip-thumbnails" id="thumbs-${Date.now()}"></div>
                <canvas class="clip-waveform" id="wave-${Date.now()}"></canvas>
            </div>
            <div class="clip-info-overlay">
                <span class="clip-name">${assetData.name}</span>
                <span class="clip-time">0:00 / ${this.formatTime(clipDuration)}</span>
            </div>
            <div class="clip-handle left"></div>
            <div class="clip-handle right"></div>
        `;

        const thumbsContainer = clip.querySelector('.clip-thumbnails');
        const waveCanvas = clip.querySelector('.clip-waveform');

        // Set canvas dimensions to match clip size
        const pixelWidth = clipDuration * this.pixelsPerSecond * this.zoomLevel;
        waveCanvas.width = pixelWidth;
        waveCanvas.height = 50; // Set a fixed height for resolution

        // Generate Visuals
        if (assetData.type.startsWith('video')) {
            // Video: Generate Thumbnails AND Waveform (from audio track)
            this.visualGenerator.generateThumbnails(assetData.src, thumbsContainer, clipDuration);
            this.visualGenerator.generateWaveform(assetData.src, waveCanvas);
        } else if (assetData.type.startsWith('audio')) {
            // Audio: Only Waveform, hide thumbnails
            thumbsContainer.style.display = 'none';
            waveCanvas.style.height = '100%'; // Full height for audio clips
            waveCanvas.height = 90; // Higher resolution for full height
            this.visualGenerator.generateWaveform(assetData.src, waveCanvas);
        }

        clip.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.selectClip(clip);

            if (e.target.classList.contains('clip-handle')) {
                this.interactionMode = e.target.classList.contains('left') ? 'trim-left' : 'trim-right';
            } else {
                this.interactionMode = 'move';
            }

            this.activeClip = clip;
            this.startX = e.clientX;
            this.initialLeft = parseFloat(clip.style.left);
            this.initialWidth = parseFloat(clip.style.width);
        });

        trackContent.appendChild(clip);

        if (assetData.type.startsWith('video')) {
            this.player.loadSource(assetData.src);
        }

        this.selectClip(clip);
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}
