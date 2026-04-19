document.addEventListener("DOMContentLoaded", function () {
    var body = document.body;
    var profileUserId = Number(body.dataset.profileUserId || "0");
    var canReview = body.dataset.canReview === "true";
    var isOwnProfile = body.dataset.isOwnProfile === "true";

    initPortfolioShowcase();
    initReviewsSection(profileUserId, canReview, isOwnProfile);
});

function getResponsiveCardsPerView(cardCount, maxDesktopCards) {
    if (window.innerWidth < 768) {
        return Math.min(1, cardCount) || 1;
    }

    if (window.innerWidth < 992) {
        return Math.min(2, cardCount) || 1;
    }

    return Math.min(maxDesktopCards, cardCount) || 1;
}

function createCarousel(section, options) {
    var track = options.track;
    var viewport = options.viewport;
    var prevButton = options.prevButton;
    var nextButton = options.nextButton;
    var currentIndex = 0;
    var touchStartX = 0;
    var touchEndX = 0;

    function getItems() {
        return Array.from(section.querySelectorAll(options.itemSelector));
    }

    function getGapSize() {
        var styles = window.getComputedStyle(track);
        return parseFloat(styles.columnGap || styles.gap || "0");
    }

    function getVisibleCards(itemCount) {
        return Math.max(1, options.getCardsPerView(itemCount));
    }

    function getMaxIndex(itemCount) {
        return Math.max(0, itemCount - getVisibleCards(itemCount));
    }

    function updateControls() {
        var items = getItems();
        var disabled = items.length <= getVisibleCards(items.length);

        prevButton.disabled = disabled;
        nextButton.disabled = disabled;
    }

    function updatePosition() {
        var items = getItems();
        var visibleCards = getVisibleCards(items.length);
        var maxIndex = getMaxIndex(items.length);
        var firstItem = items[0];
        var step = firstItem ? firstItem.getBoundingClientRect().width + getGapSize() : 0;

        currentIndex = Math.min(currentIndex, maxIndex);
        section.style.setProperty(options.cardsPerViewVar, String(visibleCards));
        track.style.transform = "translateX(-" + (currentIndex * step) + "px)";
        updateControls();
    }

    function goTo(index, wrap) {
        var items = getItems();
        var maxIndex = getMaxIndex(items.length);

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

    prevButton.addEventListener("click", function () {
        goTo(currentIndex - 1, true);
    });

    nextButton.addEventListener("click", function () {
        goTo(currentIndex + 1, true);
    });

    if (viewport) {
        viewport.addEventListener("touchstart", function (event) {
            touchStartX = event.changedTouches[0].clientX;
        }, { passive: true });

        viewport.addEventListener("touchend", function (event) {
            touchEndX = event.changedTouches[0].clientX;

            if (Math.abs(touchEndX - touchStartX) < 40) {
                return;
            }

            if (touchEndX < touchStartX) {
                goTo(currentIndex + 1, true);
            } else {
                goTo(currentIndex - 1, true);
            }
        }, { passive: true });
    }

    window.addEventListener("resize", updatePosition);

    return {
        updatePosition: updatePosition,
        reset: function () {
            currentIndex = 0;
            updatePosition();
        }
    };
}

function initPortfolioShowcase() {
    var section = document.querySelector("[data-portfolio-section]");
    var lightbox = document.querySelector("[data-portfolio-lightbox]");

    if (!section) {
        return;
    }

    var track = section.querySelector("[data-portfolio-track]");
    var viewport = section.querySelector(".portfolio-viewport");
    var prevButton = section.querySelector("[data-portfolio-prev]");
    var nextButton = section.querySelector("[data-portfolio-next]");
    var modalItems = Array.from(section.querySelectorAll("[data-portfolio-open]"));

    if (track && prevButton && nextButton && section.querySelectorAll("[data-portfolio-card]").length > 0) {
        var carousel = createCarousel(section, {
            track: track,
            viewport: viewport,
            prevButton: prevButton,
            nextButton: nextButton,
            itemSelector: "[data-portfolio-card]",
            cardsPerViewVar: "--portfolio-cards-per-view",
            getCardsPerView: function (itemCount) {
                return getResponsiveCardsPerView(itemCount, 4);
            }
        });

        carousel.updatePosition();
    }

    if (!lightbox || modalItems.length === 0) {
        return;
    }

    var lightboxDialog = lightbox.querySelector("[data-portfolio-lightbox-dialog]");
    var lightboxImage = lightbox.querySelector("[data-portfolio-lightbox-image]");
    var lightboxTitle = lightbox.querySelector("[data-portfolio-lightbox-title]");
    var lightboxDescription = lightbox.querySelector("[data-portfolio-lightbox-description]");
    var lightboxCounter = lightbox.querySelector("[data-portfolio-lightbox-counter]");
    var closeButtons = Array.from(lightbox.querySelectorAll("[data-portfolio-close]"));
    var prevModalButton = lightbox.querySelector("[data-portfolio-modal-prev]");
    var nextModalButton = lightbox.querySelector("[data-portfolio-modal-next]");
    var previousFocus = null;
    var activeIndex = 0;

    function renderLightbox(index) {
        var item = modalItems[index];

        if (!item) {
            return;
        }

        activeIndex = index;
        lightboxImage.src = item.getAttribute("data-portfolio-image") || "";
        lightboxImage.alt = item.getAttribute("data-portfolio-title") || "Portfolio image";
        lightboxTitle.textContent = item.getAttribute("data-portfolio-title") || "Portfolio";
        lightboxDescription.textContent = item.getAttribute("data-portfolio-description") || "";
        lightboxCounter.textContent = String(index + 1) + " / " + String(modalItems.length);
    }

    function openLightbox(index) {
        previousFocus = document.activeElement;
        renderLightbox(index);
        lightbox.hidden = false;
        document.body.classList.add("portfolio-lightbox-open");

        window.requestAnimationFrame(function () {
            if (lightboxDialog) {
                lightboxDialog.focus();
            }
        });
    }

    function closeLightbox() {
        lightbox.hidden = true;
        document.body.classList.remove("portfolio-lightbox-open");

        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        }
    }

    function showRelativeItem(direction) {
        if (modalItems.length === 0) {
            return;
        }

        var nextIndex = activeIndex + direction;

        if (nextIndex < 0) {
            nextIndex = modalItems.length - 1;
        }

        if (nextIndex >= modalItems.length) {
            nextIndex = 0;
        }

        renderLightbox(nextIndex);
    }

    modalItems.forEach(function (item, index) {
        item.addEventListener("click", function () {
            openLightbox(index);
        });
    });

    closeButtons.forEach(function (button) {
        button.addEventListener("click", closeLightbox);
    });

    if (prevModalButton) {
        prevModalButton.addEventListener("click", function () {
            showRelativeItem(-1);
        });
    }

    if (nextModalButton) {
        nextModalButton.addEventListener("click", function () {
            showRelativeItem(1);
        });
    }

    document.addEventListener("keydown", function (event) {
        if (lightbox.hidden) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        }

        if (event.key === "ArrowLeft") {
            showRelativeItem(-1);
        }

        if (event.key === "ArrowRight") {
            showRelativeItem(1);
        }
    });
}

function initReviewsSection(profileUserId, canReview, isOwnProfile) {
    var section = document.querySelector("[data-reviews-section]");

    if (!section || !profileUserId) {
        return;
    }

    var emptyState = section.querySelector("[data-reviews-empty]");
    var carouselContainer = section.querySelector("[data-reviews-carousel]");
    var track = section.querySelector("[data-reviews-track]");
    var viewport = section.querySelector(".reviews-viewport");
    var prevButton = section.querySelector("[data-reviews-prev]");
    var nextButton = section.querySelector("[data-reviews-next]");
    var form = section.querySelector("[data-review-form]");
    var submitButton = section.querySelector("[data-review-submit]");
    var status = section.querySelector("[data-review-status]");
    var sampleLabel = section.querySelector("[data-sample-reviews-label]");
    var reviewCarousel = createCarousel(section, {
        track: track,
        viewport: viewport,
        prevButton: prevButton,
        nextButton: nextButton,
        itemSelector: ".review-item",
        cardsPerViewVar: "--reviews-cards-per-view",
        getCardsPerView: function (itemCount) {
            return getResponsiveCardsPerView(itemCount, 3);
        }
    });
    var sampleReviews = [
        {
            display_name: "Maya Chen",
            username: "mayacreates",
            profile_image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
            title: "Thoughtful and polished collaborator",
            comment: "Working together felt easy from start to finish. Communication was clear, the creative direction stayed organized, and the final result looked polished and intentional.",
            created_at: "2026-03-18T10:00:00.000Z"
        },
        {
            display_name: "Jordan Ellis",
            username: "jordanel",
            profile_image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
            title: "Reliable and easy to work with",
            comment: "Super dependable throughout the project. Deadlines were respected, feedback was handled gracefully, and the overall experience felt professional without losing any warmth.",
            created_at: "2026-02-27T10:00:00.000Z"
        },
        {
            display_name: "Sofia Ramirez",
            username: "sofiamakes",
            profile_image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
            title: "Strong eye for presentation",
            comment: "There is a clear sense of taste and structure in the work here. Every detail felt considered, and the presentation of the final deliverables made a strong impression.",
            created_at: "2026-01-14T10:00:00.000Z"
        }
    ];

    function showStatus(message, type) {
        if (!status) {
            return;
        }

        status.textContent = message;
        status.classList.remove("is-success", "is-error");
        status.classList.add("is-visible", type === "error" ? "is-error" : "is-success");
    }

    function clearStatus() {
        if (!status) {
            return;
        }

        status.textContent = "";
        status.classList.remove("is-visible", "is-success", "is-error");
    }

    function setSampleLabelVisible(isVisible) {
        if (!sampleLabel) {
            return;
        }

        sampleLabel.hidden = !isVisible;
    }

    function formatReviewDate(value) {
        var date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function getReviewerName(review) {
        var displayName = typeof review.display_name === "string" ? review.display_name.trim() : "";
        var username = typeof review.username === "string" ? review.username.trim() : "";

        return displayName || username || "OtterGigs user";
    }

    function getAvatarUrl(review) {
        if (typeof review.profile_image_url === "string" && review.profile_image_url.trim() !== "") {
            return review.profile_image_url.trim();
        }

        return "https://via.placeholder.com/108x108?text=U";
    }

    function createReviewCard(review) {
        var reviewerName = getReviewerName(review);
        var formattedDate = formatReviewDate(review.created_at);
        var item = document.createElement("article");
        item.className = "review-item";

        var card = document.createElement("div");
        card.className = "review-card";

        var head = document.createElement("div");
        head.className = "review-card-head";

        var avatar = document.createElement("img");
        avatar.className = "review-card-avatar";
        avatar.src = getAvatarUrl(review);
        avatar.alt = reviewerName;

        var reviewerMeta = document.createElement("div");

        var name = document.createElement("div");
        name.className = "review-card-name";
        name.textContent = reviewerName;

        var date = document.createElement("div");
        date.className = "review-card-date";
        date.textContent = formattedDate || "Recently shared";

        reviewerMeta.appendChild(name);
        reviewerMeta.appendChild(date);
        head.appendChild(avatar);
        head.appendChild(reviewerMeta);

        card.appendChild(head);

        if (typeof review.title === "string" && review.title.trim() !== "") {
            var title = document.createElement("h3");
            title.className = "review-card-title";
            title.textContent = review.title.trim();
            card.appendChild(title);
        }

        var comment = document.createElement("p");
        comment.className = "review-card-comment";
        comment.textContent = typeof review.comment === "string" ? review.comment : "";
        card.appendChild(comment);

        var footer = document.createElement("div");
        footer.className = "review-card-footer";
        footer.textContent = formattedDate ? "Shared on " + formattedDate : "Profile review";
        card.appendChild(footer);

        item.appendChild(card);
        return item;
    }

    function renderReviews(reviews, options) {
        var showSampleLabel = Boolean(options && options.showSampleLabel);
        var fragment = document.createDocumentFragment();

        reviews.forEach(function (review) {
            fragment.appendChild(createReviewCard(review));
        });

        track.replaceChildren(fragment);

        if (reviews.length === 0) {
            setSampleLabelVisible(false);
            emptyState.hidden = false;
            carouselContainer.hidden = true;
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        setSampleLabelVisible(showSampleLabel);
        emptyState.hidden = true;
        carouselContainer.hidden = false;
        reviewCarousel.reset();
    }

    async function loadReviews() {
        try {
            var response = await fetch("/api/reviews/" + String(profileUserId), {
                headers: {
                    Accept: "application/json"
                }
            });

            var contentType = response.headers.get("content-type") || "";
            var data;

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                var text = await response.text();
                throw new Error("Expected JSON but got: " + text.slice(0, 120));
            }

            if (!response.ok) {
                throw new Error(data.error || "Unable to load reviews.");
            }

            var reviews = Array.isArray(data.reviews) ? data.reviews : [];

            if (reviews.length === 0 && isOwnProfile) {
                renderReviews(sampleReviews, { showSampleLabel: true });
                return;
            }

            renderReviews(reviews);
        } catch (error) {
            if (isOwnProfile) {
                renderReviews(sampleReviews, { showSampleLabel: true });
                return;
            }

            setSampleLabelVisible(false);
            emptyState.hidden = false;
            emptyState.textContent = error.message || "Unable to load reviews right now.";
            carouselContainer.hidden = true;
            prevButton.disabled = true;
            nextButton.disabled = true;
        }
    }

    if (form && canReview) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearStatus();

            var formData = new FormData(form);
            var title = typeof formData.get("title") === "string" ? formData.get("title").trim() : "";
            var comment = typeof formData.get("comment") === "string" ? formData.get("comment").trim() : "";

            if (!comment) {
                showStatus("Comment is required.", "error");
                return;
            }

            submitButton.disabled = true;

            try {
                var response = await fetch("/api/reviews", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({
                        profile_user_id: profileUserId,
                        title: title,
                        comment: comment
                    })
                });
                var data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Unable to save review.");
                }

                renderReviews(Array.isArray(data.reviews) ? data.reviews : []);
                form.reset();
                showStatus(data.message || "Review submitted successfully.", "success");
            } catch (error) {
                showStatus(error.message || "Unable to save review.", "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    loadReviews();
}
