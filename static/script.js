document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.video-container').forEach((container) => {
        const video = container.querySelector('.video-3d');
        if (!video) return;

        video.loop = false;
        video.autoplay = false;
        video.removeAttribute('autoplay');
        video.removeAttribute('loop');
        video.muted = false;
        video.removeAttribute('muted');
        video.controls = true;
        video.setAttribute('controls', '');
        video.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
        video.preload = 'none';

        video.addEventListener('play', () => {
            document.querySelectorAll('.video-3d').forEach((otherVideo) => {
                if (otherVideo !== video && !otherVideo.paused) {
                    otherVideo.pause();
                }
            });
        });

        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    const videosWithPosters = Array.from(document.querySelectorAll('video[data-poster]'));
    const setVideoPoster = (video) => {
        if (video.dataset.poster) video.poster = video.dataset.poster;
    };
    const startFooterVideo = (video) => {
        if (video.id !== 'footer-loop-video') return;

        video.play().catch(error => {
            if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
                console.warn('Footer video could not start:', error);
            }
        });
    };

    if ('IntersectionObserver' in window) {
        const lazyVideoObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                setVideoPoster(entry.target);
                startFooterVideo(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '200px' });

        videosWithPosters.forEach(video => lazyVideoObserver.observe(video));
    } else {
        const loadNearbyPosters = () => {
            videosWithPosters.forEach(video => {
                if (video.poster) return;

                const bounds = video.getBoundingClientRect();
                if (bounds.top < window.innerHeight + 200 && bounds.bottom > -200) {
                    setVideoPoster(video);
                    startFooterVideo(video);
                }
            });
        };

        loadNearbyPosters();
        window.addEventListener('scroll', loadNearbyPosters, { passive: true });
        window.addEventListener('resize', loadNearbyPosters, { passive: true });
    }

    // Accordion Dropdowns
    document.querySelectorAll(".category-trigger").forEach((trigger, index) => {
        const submenu = trigger.parentElement.querySelector('.category-submenu');
        if (submenu) {
            submenu.id = submenu.id || `category-submenu-${index + 1}`;
            trigger.setAttribute('aria-controls', submenu.id);
        }
        trigger.setAttribute('aria-expanded', 'false');

        trigger.addEventListener("click", (e) => {
            const parentLi = e.target.parentElement;
            const isOpen = parentLi.classList.toggle("open");
            trigger.setAttribute('aria-expanded', String(isOpen));
            document.querySelectorAll(".category-group").forEach(group => {
                if (group !== parentLi) {
                    group.classList.remove("open");
                    const groupTrigger = group.querySelector('.category-trigger');
                    if (groupTrigger) groupTrigger.setAttribute('aria-expanded', 'false');
                }
            });
        });
    });

    // IMAGE EXPAND GALLERIES (DESKTOP KEYBOARD & MOBILE SWIPE/TAP)
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');

    let currentActiveCard = null;
    let previouslyFocusedElement = null;
    let previousBodyOverflow = '';
    let touchStartX = 0;
    let touchEndX = 0;
    const navHint = document.querySelector('.lightbox-nav-hint');

    function updateGalleryCardAccessibility(card) {
        const image = card.querySelector('img');
        if (!image) return;

        const galleryGrid = card.closest('.project-gallery');
        const hiddenCount = galleryGrid ? galleryGrid.querySelectorAll('.hidden-asset').length : 0;
        const isCollapsedCounter = card.classList.contains('counter-card')
            && galleryGrid
            && !galleryGrid.classList.contains('expanded')
            && hiddenCount > 0;

        card.setAttribute('aria-label', isCollapsedCounter
            ? `Show ${hiddenCount} more images. ${image.alt}`
            : `Open image: ${image.alt}`);

        if (card.classList.contains('counter-card')) {
            card.setAttribute('aria-expanded', String(Boolean(galleryGrid && galleryGrid.classList.contains('expanded'))));
        }
    }

    function addGalleryCollapseButton(grid, counterCard) {
        if (grid.querySelector('.gallery-collapse')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gallery-collapse';
        button.textContent = 'Show fewer images';
        button.addEventListener('click', () => {
            grid.classList.remove('expanded');
            button.remove();
            updateGalleryCardAccessibility(counterCard);
            counterCard.focus();
        });
        grid.appendChild(button);
    }

    document.querySelectorAll('.project-gallery').forEach(grid => {
        const hiddenCount = grid.querySelectorAll('.hidden-asset').length;
        const counterCard = grid.querySelector('.counter-card');
        if (counterCard) {
            if (hiddenCount > 0) counterCard.setAttribute('data-plus-count', `+${hiddenCount}`);
            updateGalleryCardAccessibility(counterCard);
        }

        grid.querySelectorAll('.gallery-card').forEach(card => {
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            updateGalleryCardAccessibility(card);
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    card.click();
                }
            });
        });
    });

    if (lightboxImg) {
        lightboxImg.addEventListener('load', () => {
            if (navHint) {
                navHint.classList.remove('load-failed');
            }
        });
        lightboxImg.addEventListener('error', () => {
            console.error("[Lightbox Engine] Targeted asset failed to load via lazy pipeline.");
            if (navHint) {
                navHint.classList.add('load-failed');
            }
        });
    }

    function changeLightboxImage(cardElement) {
        if (!cardElement || !lightboxImg) return;
        
        const internalImg = cardElement.querySelector('img');
        if (internalImg) {
            currentActiveCard = cardElement;
            
            lightboxImg.removeAttribute('src'); 
            
            lightboxImg.src = internalImg.dataset.fullSrc || internalImg.src;
            lightboxImg.alt = internalImg.alt || 'Enlarged gallery preview';
        }
    }

    function navigateGallery(direction) {
        if (!currentActiveCard) return;
        
        let targetCard = null;
        if (direction === 'prev') {
            targetCard = currentActiveCard.previousElementSibling;
        } else if (direction === 'next') {
            targetCard = currentActiveCard.nextElementSibling;
        }

        if (targetCard && targetCard.classList.contains('gallery-card')) {
            changeLightboxImage(targetCard);
        }
    }

    // Open lightbox via card clicks
    document.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const galleryGrid = card.closest('.project-gallery');
            if (!galleryGrid) return; 
            const actualCounterCard = e.target.closest('.counter-card');

            if (actualCounterCard) {
                if (!galleryGrid.classList.contains('expanded')) {
                    galleryGrid.classList.add('expanded');
                    addGalleryCollapseButton(galleryGrid, actualCounterCard);
                    updateGalleryCardAccessibility(actualCounterCard);
                    return;
                }
            } 
            
            if (lightbox && lightboxImg) {
                changeLightboxImage(card);
                previouslyFocusedElement = card;
                previousBodyOverflow = document.body.style.overflow;
                lightbox.setAttribute('aria-hidden', 'false');
                lightbox.classList.add('is-open');
                document.body.style.overflow = 'hidden';
                if (closeBtn) closeBtn.focus();
            }
        });
    });

    function closeLightbox() {
        if (lightbox) lightbox.classList.remove('is-open');
        if (lightbox) lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = previousBodyOverflow;
        const elementToRestore = previouslyFocusedElement;
        previouslyFocusedElement = null;
        currentActiveCard = null;
        if (navHint) navHint.classList.remove('load-failed');
        if (elementToRestore && elementToRestore.isConnected) elementToRestore.focus();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);


    // --- 1. DESKTOP KEYBOARD TRACKING ---
    document.addEventListener('keydown', (e) => {
        if (!currentActiveCard || !lightbox || !lightbox.classList.contains('is-open')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeLightbox();
        } else if (e.key === 'Tab' && closeBtn) {
            e.preventDefault();
            closeBtn.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateGallery('prev');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigateGallery('next');
        }
    });


    // --- 2. MOBILE SWIPE INTERACTION ENGINE ---
    if (lightbox) {
        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightbox.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        }, { passive: true });
    }

    function handleSwipeGesture() {
        const swipeThreshold = 50; // Minimum drag pixels required to declare a swipe
        const diffX = touchEndX - touchStartX;

        if (Math.abs(diffX) < swipeThreshold) return;

        if (diffX > 0) {
            // Dragged Right -> View Previous Image
            navigateGallery('prev');
        } else {
            // Dragged Left -> View Next Image
            navigateGallery('next');
        }
    }

    // Variant Controls (Day/Night Variant buttons)
    const buttons = document.querySelectorAll('#project-car .variant-btn');
    const panels = document.querySelectorAll('#project-car .variant-panel');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetVariant = button.getAttribute('data-target');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-target') === targetVariant) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${targetVariant}`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');
    const mainSidebarElement = document.querySelector('.sidebar');

    if (mobileToggleBtn && mainSidebarElement) {
        mobileToggleBtn.setAttribute('aria-controls', mainSidebarElement.id);
        mobileToggleBtn.setAttribute('aria-expanded', 'false');

        mobileToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents bubbling mismatches
            
            // Toggle active animation states across classes
            mobileToggleBtn.classList.toggle('active');
            mainSidebarElement.classList.toggle('mobile-open');
            mobileToggleBtn.setAttribute('aria-expanded', String(mainSidebarElement.classList.contains('mobile-open')));
        });

        // Close the drawer automatically if a user hits a link inside it
        mainSidebarElement.querySelectorAll('.category-submenu a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    mobileToggleBtn.classList.remove('active');
                    mainSidebarElement.classList.remove('mobile-open');
                    mobileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Clean close hook: Tapping outside the sidebar anywhere else on screen closes it automatically
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768 && mainSidebarElement.classList.contains('mobile-open')) {
                if (!mainSidebarElement.contains(event.target) && event.target !== mobileToggleBtn) {
                    mobileToggleBtn.classList.remove('active');
                    mainSidebarElement.classList.remove('mobile-open');
                    mobileToggleBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }
});