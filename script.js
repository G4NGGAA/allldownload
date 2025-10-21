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
        
        // Nonaktifkan tombol dan tampilkan loading
        downloadBtn.disabled = true;
        loading.style.display = 'block';
        result.style.display = 'none';
        showMessage('', true);

        try {
            // Memetakan jenis pengunduh ke path API yang benar (jika berbeda)
            const apiPathMap = {
                youtube: 'ytdl' // Contoh: Jika API YouTube menggunakan path 'ytdl'
            };
            const apiPath = apiPathMap[type] || type;

            const api = `https://api.nvidiabotz.xyz/download/${apiPath}?url=${encodeURIComponent(url)}`;
            
            const response = await fetch(api);

            if (!response.ok) {
                throw new Error(`Gagal terhubung ke API. Status: ${response.status}`);
            }
            
            const json = await response.json();
            
            // Periksa status respons JSON
            if (json.status === false || (json.status && json.status !== 200)) { 
                throw new Error(json.message || `Gagal mengambil data dari ${type}.`);
            }
            
            displayResults(json, type);
        } catch (error) {
            showMessage(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            // Aktifkan kembali tombol dan sembunyikan loading
            downloadBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    function displayResults(data, type) {
        const resultContainer = document.getElementById('result');
        const videoInfo = resultContainer.querySelector('.video-info');
        const optionsWrapper = resultContainer.querySelector('.download-options');
        optionsWrapper.innerHTML = '';
        
        // Gunakan 'data.result' jika ada, jika tidak, gunakan 'data' itu sendiri
        const responseData = data.result || data; 

        let title = responseData.title || 'Media';
        let thumb = responseData.thumbnail;

        if (videoInfo && thumb) {
            videoInfo.style.display = 'block';
            videoInfo.querySelector('.video-thumb').src = thumb;
            videoInfo.querySelector('.video-title').textContent = title;
        } else if (videoInfo) {
            videoInfo.style.display = 'none';
        }

        switch(type) {
            case 'tiktok':
                if (responseData) {
                    const { video_hd, video_sd, mp3 } = responseData;
                    createButton(optionsWrapper, video_hd, 'Unduh Video (HD)', 'fa-video');
                    createButton(optionsWrapper, video_sd, 'Unduh Video (SD)', 'fa-video');
                    createButton(optionsWrapper, mp3, 'Unduh Audio (MP3)', 'fa-music');
                }
                break;
                
            case 'instagram':
                // *** PERBAIKAN PENTING DI SINI ***
                if (Array.isArray(responseData)) {
                    responseData.forEach((media, index) => {
                        // Cek apakah media.url ada dan bertipe string, MENCEGAH error '.includes'
                        if (media && typeof media.url === 'string') {
                            const isVideo = media.url.includes('.mp4');
                            createButton(optionsWrapper, media.url, `Unduh Media ${index + 1}`, isVideo ? 'fa-video' : 'fa-image');
                        }
                    });
                } else if (responseData && responseData.url && typeof responseData.url === 'string') {
                    // Kasus jika Instagram hanya mengembalikan satu item dan bukan array
                    const isVideo = responseData.url.includes('.mp4');
                    createButton(optionsWrapper, responseData.url, 'Unduh Media', isVideo ? 'fa-video' : 'fa-image');
                } else {
                    showMessage('Gagal menampilkan opsi unduhan. Tautan mungkin tidak valid.');
                }
                break;
                
            case 'youtube':
                if (responseData) {
                    createButton(optionsWrapper, responseData.video, 'Unduh Video', 'fa-video');
                    createButton(optionsWrapper, responseData.audio, 'Unduh Audio', 'fa-music');
                }
                break;
        }
        resultContainer.style.display = 'block';
    }

    function createButton(wrapper, url, text, icon) {
        // Pengecekan keamanan ganda
        if (!url || typeof url !== 'string' || url.length === 0) return; 
        
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
        if (!messageEl) return; // Pengecekan keamanan
        
        if (hide) {
            messageEl.style.display = 'none';
        } else {
            messageEl.textContent = msg;
            messageEl.style.display = 'block';
        }
    }
});
