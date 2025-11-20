document.addEventListener('DOMContentLoaded', () => {
    // Scroll Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.gallery-item').forEach(item => {
        observer.observe(item);
    });

    // Lightbox Functionality
    const lightbox = document.querySelector('.lightbox');
    const lightboxImg = lightbox.querySelector('img');
    const closeBtn = document.querySelector('.lightbox-close');

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const img = item.querySelector('img');
            if (img) {
                lightboxImg.src = img.src;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden'; // Disable scrolling
            }
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
    };

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', closeLightbox);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
});
