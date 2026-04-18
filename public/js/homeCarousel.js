document.addEventListener("DOMContentLoaded", () => {
    const carousels = document.querySelectorAll("[data-business-carousel]");

    carousels.forEach((carousel) => {
        const section = carousel.closest(".local-businesses-section");
        const track = carousel.querySelector("[data-carousel-track]");
        const cards = Array.from(carousel.querySelectorAll("[data-carousel-card]"));
        const prevButton = section?.querySelector("[data-carousel-prev]");
        const nextButton = section?.querySelector("[data-carousel-next]");

        if (!track || cards.length === 0 || !prevButton || !nextButton) {
            return;
        }

        let currentIndex = 0;
        let cardsPerView = getCardsPerView();
        let autoplayTimer = null;
        let isHovered = false;

        function getCardsPerView() {
            if (window.innerWidth < 768) {
                return 1;
            }

            if (window.innerWidth < 992) {
                return 2;
            }

            return 3;
        }

        function getGapSize() {
            const styles = window.getComputedStyle(track);
            return parseFloat(styles.columnGap || styles.gap || "0");
        }

        function getMaxIndex() {
            return Math.max(0, cards.length - cardsPerView);
        }

        function updateControls() {
            const disabled = cards.length <= cardsPerView;
            prevButton.disabled = disabled;
            nextButton.disabled = disabled;
        }

        function updatePosition() {
            cardsPerView = getCardsPerView();
            section?.style.setProperty("--cards-per-view", String(cardsPerView));

            const maxIndex = getMaxIndex();
            currentIndex = Math.min(currentIndex, maxIndex);

            const firstCard = cards[0];
            const step = firstCard ? firstCard.getBoundingClientRect().width + getGapSize() : 0;
            track.style.transform = `translateX(-${currentIndex * step}px)`;

            updateControls();
        }

        function goTo(index, wrap = false) {
            const maxIndex = getMaxIndex();

            if (wrap) {
                if (index > maxIndex) {
                    currentIndex = 0;
                } else if (index < 0) {
                    currentIndex = maxIndex;
                } else {
                    currentIndex = index;
                }
            } else {
                currentIndex = Math.max(0, Math.min(index, maxIndex));
            }

            updatePosition();
        }

        function stopAutoplay() {
            if (autoplayTimer) {
                window.clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        function startAutoplay() {
            stopAutoplay();

            if (cards.length <= cardsPerView) {
                return;
            }

            autoplayTimer = window.setInterval(() => {
                if (!isHovered) {
                    goTo(currentIndex + 1, true);
                }
            }, 6500);
        }

        prevButton.addEventListener("click", () => goTo(currentIndex - 1, true));
        nextButton.addEventListener("click", () => goTo(currentIndex + 1, true));

        section?.addEventListener("mouseenter", () => {
            isHovered = true;
        });

        section?.addEventListener("mouseleave", () => {
            isHovered = false;
        });

        window.addEventListener("resize", () => {
            updatePosition();
            startAutoplay();
        });

        updatePosition();
        startAutoplay();
    });
});
