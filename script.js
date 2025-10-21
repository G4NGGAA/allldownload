document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const urlInput = document.getElementById('url');
    const downloadBtn = document.getElementById('btn');
    const container = document.querySelector('.container');

    // --- Logika Pengalihan Tema ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        // Perbarui tombol aktif
        if (themeSwitcher) {
            themeSwitcher.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });
        }
    };

    const handleThemeClick = (e) => {
        const theme = e.target.closest('.theme-btn')?.dataset.theme;
        if (theme) {
            applyTheme(theme);
            localStorage.setItem('downloader_theme', theme);
        }
    };
    
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', handleThemeClick);
    }

    // Inisialisasi tema saat memuat
    const savedTheme = localStorage.getItem('downloader_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    // --- Logika Pengunduhan & Validasi ---
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleDownload();
        });
    }

    function handleDownload() {
        const url = urlInput.value.trim();
        const downloaderType = container.dataset.downloader;
        const validation = validateUrl(url, downloaderType);
        if (!validation.isValid) {
            showMessage(validation.message);
            return;
        }
        processDownload(url, downloaderType);
    }

    function validateUrl(url, type) {
        if (!url) {
            return { isValid: false, message: 'Harap masukkan URL terlebih dahulu.' };
        }
        const patterns = {
            tiktok: /(tiktok\.com)/,
            instagram: /(instagram\.com)/,
            youtube: /(youtube\.com|youtu\.be)/
        };
        if (patterns[type] && !patterns[type].test(url)) {
            return { isValid: false, message: `URL tidak valid. Harap masukkan tautan ${type} yang benar.` };
        }
        return { isValid: true };
    }

    async function processDownload(url, type) {
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        downloadBtn.disabled = true;
        loading.style.display = 'block';
        result.style.display = 'none';
        showMessage('', true);

        try {
            const api = `https://api.nvidiabotz.xyz/download/${type}?url=${encodeURIComponent(url)}`;
            const response = await fetch(api);
            const json = await response.json();
            if (!json.status) {
                throw new Error(json.message || `Gagal mengambil data dari ${type}.`);
            }
            displayResults(json, type);
        } catch (error) {
            showMessage(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            downloadBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    function displayResults(data, type) {
        const resultContainer = document.getElementById('result');
        const videoInfo = resultContainer.querySelector('.video-info');
        const optionsWrapper = resultContainer.querySelector('.download-options');
        optionsWrapper.innerHTML = '';

        let title = data.title || (data.result && data.result.title) || 'Media';
        let thumb = data.thumbnail || (data.result && data.result.thumbnail);

        if (videoInfo && thumb) {
            videoInfo.style.display = 'block';
            videoInfo.querySelector('.video-thumb').src = thumb;
            videoInfo.querySelector('.video-title').textContent = title;
        } else if (videoInfo) {
            videoInfo.style.display = 'none';
        }

        switch(type) {
            case 'tiktok':
                // Pastikan data.result ada dan memiliki properti yang diperlukan
                if (data.result) {
                    const { video_hd, video_sd, mp3 } = data.result;
                    createButton(optionsWrapper, video_hd, 'Unduh Video (HD)', 'fa-video');
                    createButton(optionsWrapper, video_sd, 'Unduh Video (SD)', 'fa-video');
                    createButton(optionsWrapper, mp3, 'Unduh Audio (MP3)', 'fa-music');
                }
                break;
            case 'instagram':
                 if (Array.isArray(data.result)) {
                    data.result.forEach((media, index) => { 
                        if (typeof media.url === 'string') {
                            const isVideo = media.url.includes('.mp4');
                            createButton(optionsWrapper, media.url, `Unduh Media ${index + 1}`, isVideo ? 'fa-video' : 'fa-image');
                        }
                    });
                 }
                break;
            case 'youtube':
                // Pastikan data.result ada
                if (data.result) {
                    createButton(optionsWrapper, data.result.video, 'Unduh Video', 'fa-video');
                    createButton(optionsWrapper, data.result.audio, 'Unduh Audio', 'fa-music');
                }
                break;
        }
        resultContainer.style.display = 'block';
    }

    function createButton(wrapper, url, text, icon) {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'option-btn';
        a.setAttribute('download', '');
        a.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        wrapper.appendChild(a);
    }

    function showMessage(msg, hide = false) {
        const messageEl = document.getElementById('message');
        if (hide) {
            messageEl.style.display = 'none';
        } else {
            messageEl.textContent = msg;
            messageEl.style.display = 'block';
        }
    }
});
