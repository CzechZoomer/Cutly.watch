import Player from './Player.js';
import TimelineManager from './TimelineManager.js';
import RenderEngine from './RenderEngine.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Web Video Editor Initialized');

    // Initialize Components
    const player = new Player('main-player');
    const timeline = new TimelineManager('timeline-tracks', player);

    // Global Event Listeners
    setupUploadHandler(timeline);
    setupExportHandler();
});

function setupUploadHandler(timeline) {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent-color)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        handleFiles(e.dataTransfer.files, timeline);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, timeline);
    });
}

function handleFiles(files, timeline) {
    const assetsList = document.getElementById('assets-list');

    Array.from(files).forEach(file => {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            // Create Asset UI Item
            const assetItem = document.createElement('div');
            assetItem.className = 'asset-item';
            assetItem.draggable = true;

            const icon = file.type.startsWith('video/') ? 'ph-film-strip' : 'ph-speaker-high';
            const objectUrl = URL.createObjectURL(file);

            assetItem.innerHTML = `
                <div class="asset-thumbnail"><i class="ph ${icon}" style="font-size: 24px; color: #fff; display: flex; justify-content: center; align-items: center; height: 100%;"></i></div>
                <div class="asset-info">
                    <div class="asset-name">${file.name}</div>
                    <div class="asset-duration">Loading...</div>
                </div>
            `;

            let duration = 10; // Default

            // Drag Start Event - Attach immediately
            assetItem.addEventListener('dragstart', (e) => {
                console.log('Drag started for:', file.name);
                e.dataTransfer.effectAllowed = 'copy';
                const data = JSON.stringify({
                    name: file.name,
                    type: file.type,
                    src: objectUrl,
                    duration: duration
                });
                e.dataTransfer.setData('application/json', data);
                e.dataTransfer.setData('text/plain', data);
            });

            // Get Duration
            const mediaEl = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
            mediaEl.src = objectUrl;
            mediaEl.addEventListener('loadedmetadata', () => {
                duration = mediaEl.duration; // Update the variable used in dragstart
                const m = Math.floor(duration / 60);
                const s = Math.floor(duration % 60);
                const durationText = `${m}:${s.toString().padStart(2, '0')}`;

                assetItem.querySelector('.asset-duration').textContent = durationText;
            });

            assetsList.appendChild(assetItem);
        }
    });
}

function setupExportHandler() {
    const exportBtn = document.getElementById('export-btn');
    const renderEngine = new RenderEngine();

    exportBtn.addEventListener('click', async () => {
        const btnText = exportBtn.innerText;
        exportBtn.innerText = 'Exporting...';
        exportBtn.disabled = true;

        // Collect project data (mock)
        const projectData = {
            tracks: [] // Would gather from TimelineManager
        };

        try {
            const result = await renderEngine.exportProject(projectData);
            if (result.success) {
                alert('Export Complete! (Mock)');
            }
        } catch (e) {
            console.error(e);
            alert('Export Failed');
        } finally {
            exportBtn.innerText = btnText;
            exportBtn.disabled = false;
        }
    });
}
