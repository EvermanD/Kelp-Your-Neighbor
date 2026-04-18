(() => {
    const menuElement = document.getElementById("userMenuCanvas");

    if (!menuElement || !window.bootstrap?.Offcanvas) {
        return;
    }

    const cleanupBackdrop = () => {
        if (menuElement.classList.contains("show")) {
            return;
        }

        document.querySelectorAll(".offcanvas-backdrop").forEach((backdrop) => backdrop.remove());
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
    };

    menuElement.addEventListener("hidden.bs.offcanvas", cleanupBackdrop);

    document.addEventListener("click", (event) => {
        const clickedBackdrop = event.target.closest(".offcanvas-backdrop");

        if (!clickedBackdrop || !menuElement.classList.contains("show")) {
            return;
        }

        bootstrap.Offcanvas.getOrCreateInstance(menuElement).hide();
        window.setTimeout(cleanupBackdrop, 350);
    });
})();
