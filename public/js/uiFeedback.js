(() => {
    function ensureToastRoot() {
        let root = document.getElementById("uiToastRoot");

        if (!root) {
            root = document.createElement("div");
            root.id = "uiToastRoot";
            root.className = "ui-toast-root";
            document.body.appendChild(root);
        }

        return root;
    }

    window.showUiToast = function (message, type = "success") {
        const root = ensureToastRoot();
        const toast = document.createElement("div");

        toast.className = `ui-toast ui-toast-${type}`;
        toast.textContent = message;

        root.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("is-visible");
        });

        setTimeout(() => {
            toast.classList.remove("is-visible");
            setTimeout(() => toast.remove(), 220);
        }, 2200);
    };

    document.addEventListener("submit", function (event) {
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');

        if (!submitButton || submitButton.dataset.loadingApplied === "true") {
            return;
        }

        submitButton.dataset.loadingApplied = "true";
        submitButton.dataset.originalText = submitButton.tagName === "BUTTON"
            ? submitButton.textContent
            : submitButton.value;

        if (submitButton.tagName === "BUTTON") {
            submitButton.textContent = "Working...";
        } else {
            submitButton.value = "Working...";
        }

        submitButton.disabled = true;
    }, true);
})();