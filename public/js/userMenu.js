(() => {
    const trigger = document.getElementById("profileMenuTrigger");
    const menu = document.getElementById("profileMenuDropdown");

    if (!trigger || !menu) {
        return;
    }

    let isOpen = false;

    function positionMenu() {
        const rect = trigger.getBoundingClientRect();
        const gap = 10;
        const menuWidth = Math.min(340, window.innerWidth - 16);
        let left = rect.left;
        let top = rect.bottom + gap;

        if (left + menuWidth > window.innerWidth - 8) {
            left = window.innerWidth - menuWidth - 8;
        }

        if (left < 8) {
            left = 8;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }

    function openMenu() {
        positionMenu();
        menu.hidden = false;

        requestAnimationFrame(() => {
            menu.classList.add("is-open");
        });

        trigger.setAttribute("aria-expanded", "true");
        isOpen = true;
    }

    function closeMenu() {
        menu.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        isOpen = false;

        window.setTimeout(() => {
            if (!isOpen) {
                menu.hidden = true;
            }
        }, 180);
    }

    function toggleMenu() {
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMenu();
    });

    menu.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        if (isOpen) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen) {
            closeMenu();
            trigger.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (isOpen) {
            positionMenu();
        }
    });

    window.addEventListener("scroll", () => {
        if (isOpen) {
            positionMenu();
        }
    }, true);
})();