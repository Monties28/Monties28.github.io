// Accessible scroll reveal + polished 3D interactions.
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Scroll reveal: gracefully fall back if IntersectionObserver is unavailable.
    const revealItems = document.querySelectorAll(
        '.section, .project, .skills article, .certs article, .exp, .profile-card, .facts > div'
    );

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, activeObserver) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    activeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });

        revealItems.forEach((element, index) => {
            element.classList.add('fade');
            element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 65}ms`);
            observer.observe(element);
        });
    } else {
        revealItems.forEach((element) => element.classList.add('show'));
    }

    // Mouse-based 3D tilt, disabled for touch devices and reduced-motion preferences.
    if (finePointer && !reduceMotion) {
        const cards = document.querySelectorAll('.profile-card, .project, .skills article, .certs article');
        cards.forEach((card) => {
            let frame = null;
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width;
                const py = (event.clientY - rect.top) / rect.height;
                const maxTilt = card.classList.contains('profile-card') ? 8 : 4;
                const rotateY = (px - 0.5) * maxTilt * 2;
                const rotateX = (0.5 - py) * maxTilt * 2;

                if (frame) cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    card.style.transform = `perspective(1100px) translateY(-3px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    card.style.setProperty('--pointer-x', `${px * 100}%`);
                    card.style.setProperty('--pointer-y', `${py * 100}%`);
                });
            });
            card.addEventListener('pointerleave', () => {
                if (frame) cancelAnimationFrame(frame);
                card.style.transform = '';
            });
        });

        const profilePhoto = document.querySelector('.profile-photo img');
        const profileCard = document.querySelector('.profile-card');
        if (profilePhoto && profileCard) {
            profileCard.addEventListener('pointermove', (event) => {
                const rect = profileCard.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                profilePhoto.style.transform = `translate(${x * 8}px, ${y * 8}px) scale(1.04)`;
            });
            profileCard.addEventListener('pointerleave', () => { profilePhoto.style.transform = ''; });
        }
    }

    // Mobile navigation menu.
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.links');
    if (menuToggle && navLinks) {
        const closeMenu = () => {
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Open navigation menu');
            navLinks.classList.remove('is-open');
        };
        menuToggle.addEventListener('click', () => {
            const open = menuToggle.getAttribute('aria-expanded') !== 'true';
            menuToggle.setAttribute('aria-expanded', String(open));
            menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            navLinks.classList.toggle('is-open', open);
        });
        navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
        window.addEventListener('resize', () => { if (window.innerWidth > 850) closeMenu(); });
    }

    // Thin reading-progress indicator.
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    let ticking = false;
    const updateProgress = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateProgress);
            ticking = true;
        }
    }, { passive: true });
    updateProgress();

    // Dynamic light response for cards: makes the 3D surfaces feel tactile.
    if (finePointer && !reduceMotion) {
        document.querySelectorAll('.project, .skills article, .certs article').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
                card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
            });
        });
    }
})();
