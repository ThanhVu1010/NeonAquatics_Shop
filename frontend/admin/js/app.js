// Keyboard Shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (typeof closeSidebar === 'function') closeSidebar();
        if (typeof closeCategoryModal === 'function') closeCategoryModal();
        if (typeof closeProductModal === 'function') closeProductModal();
        if (typeof closeCustomerModal === 'function') closeCustomerModal();
        if (typeof closeQuoteModal === 'function') closeQuoteModal();
        if (typeof closeQuotePreview === 'function') closeQuotePreview();
    }
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
            if (typeof currentQuoteItems !== 'undefined') {
                currentQuoteItems = [];
            }
        }
    });
});

// Application Init
async function init() {
    if (!(await checkAuth())) return; // Stop if not authenticated

    await loadSettingsData();
    switchTab('dashboard'); // This handles renderDashboard and UI switching
    updateClock();
    setInterval(updateClock, 1000);
}

// Ensure init is run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
