// ===== State Management =====
const STORAGE_KEY = 'sinkingFunds';

let funds = [];
let editingFundId = null;
let deletingFundId = null;
let depositingFundId = null;
let editingDepositId = null;
let viewingHistoryFundId = null;
let currentSort = localStorage.getItem('sinkingFunds_sort') || 'name-asc';
let showCompleted = localStorage.getItem('sinkingFunds_showCompleted') === 'true';

// ===== DOM Elements =====
const elements = {
    totalSaved: document.getElementById('totalSaved'),
    fundCount: document.getElementById('fundCount'),
    inProgressCount: document.getElementById('inProgressCount'),
    completedCount: document.getElementById('completedCount'),
    monthlyTotal: document.getElementById('monthlyTotal'),
    fundsGrid: document.getElementById('fundsGrid'),
    emptyState: document.getElementById('emptyState'),
    addFundBtn: document.getElementById('addFundBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    // Fund modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    fundForm: document.getElementById('fundForm'),
    fundId: document.getElementById('fundId'),
    fundName: document.getElementById('fundName'),
    targetAmount: document.getElementById('targetAmount'),
    targetDate: document.getElementById('targetDate'),
    initialDeposit: document.getElementById('initialDeposit'),
    initialDepositGroup: document.getElementById('initialDepositGroup'),
    cancelBtn: document.getElementById('cancelBtn'),
    submitBtn: document.getElementById('submitBtn'),
    // Delete modal
    deleteModalOverlay: document.getElementById('deleteModalOverlay'),
    deleteModalClose: document.getElementById('deleteModalClose'),
    deleteFundName: document.getElementById('deleteFundName'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    // Deposit modal
    depositModalOverlay: document.getElementById('depositModalOverlay'),
    depositModalTitle: document.getElementById('depositModalTitle'),
    depositModalClose: document.getElementById('depositModalClose'),
    depositForm: document.getElementById('depositForm'),
    depositFundId: document.getElementById('depositFundId'),
    depositId: document.getElementById('depositId'),
    depositAmount: document.getElementById('depositAmount'),
    depositDate: document.getElementById('depositDate'),
    depositNote: document.getElementById('depositNote'),
    cancelDepositBtn: document.getElementById('cancelDepositBtn'),
    submitDepositBtn: document.getElementById('submitDepositBtn'),
    // History modal
    historyModalOverlay: document.getElementById('historyModalOverlay'),
    historyModalTitle: document.getElementById('historyModalTitle'),
    historyModalClose: document.getElementById('historyModalClose'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    // Export/Import/Help
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    helpBtn: document.getElementById('helpBtn'),
    importFile: document.getElementById('importFile'),
    // Filtering/Sorting
    sortBy: document.getElementById('sortBy'),
    showCompleted: document.getElementById('showCompleted'),
    // Help modal
    helpModal: document.getElementById('helpModal'),
    helpModalOverlay: document.getElementById('helpModalOverlay'),
    helpModalClose: document.getElementById('helpModalClose'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
};

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function getMonthsRemaining(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.max(0, Math.ceil(diffDays / 30.44));
    return diffMonths;
}

function getDaysRemaining(targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

function getSmartTime(days) {
    if (days <= 0) return '0 days';
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;

    if (days < 365) {
        const months = Math.floor(days / 30.44);
        const remainingDays = Math.round(days % 30.44);
        if (remainingDays === 0) return `${months} mon${months !== 1 ? 's' : ''}`;
        return `${months}m ${remainingDays}d`;
    }

    const years = Math.floor(days / 365.25);
    const months = Math.round((days % 365.25) / 30.44);

    if (months === 0) return `${years}y`;
    if (months === 12) return `${years + 1}y`;
    return `${years}y ${months}m`;
}

// Calculate current amount from contributions
function getCurrentAmount(fund) {
    if (!fund.contributions || fund.contributions.length === 0) {
        return 0;
    }
    return fund.contributions.reduce((sum, c) => sum + c.amount, 0);
}

function calculateMonthlyContribution(fund) {
    const currentAmount = getCurrentAmount(fund);
    const remaining = fund.targetAmount - currentAmount;
    const months = getMonthsRemaining(fund.targetDate);
    if (months <= 0) return remaining > 0 ? remaining : 0;
    return remaining / months;
}

function calculateProgress(fund) {
    const currentAmount = getCurrentAmount(fund);
    if (fund.targetAmount <= 0) return 100;
    return Math.min(100, (currentAmount / fund.targetAmount) * 100);
}

function getFundStatus(fund) {
    const progress = calculateProgress(fund);
    const daysRemaining = getDaysRemaining(fund.targetDate);
    const totalDays = Math.ceil((new Date(fund.targetDate) - new Date(fund.createdAt)) / (1000 * 60 * 60 * 24));
    const expectedProgress = totalDays > 0 ? ((totalDays - daysRemaining) / totalDays) * 100 : 100;

    if (progress >= 100) return 'complete';
    if (daysRemaining <= 0) return 'overdue';
    if (progress >= expectedProgress - 5) return 'on-track';
    if (progress >= expectedProgress - 20) return 'behind';
    return 'at-risk';
}

// ===== Storage Functions =====
function loadFunds() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        funds = stored ? JSON.parse(stored) : [];
        // Migrate old format (currentAmount) to new format (contributions)
        migrateFunds();
    } catch (e) {
        console.error('Failed to load funds:', e);
        funds = [];
    }
}

function migrateFunds() {
    let needsSave = false;
    funds.forEach(fund => {
        // If fund has currentAmount but no contributions, migrate it
        if (fund.currentAmount !== undefined && !fund.contributions) {
            fund.contributions = [];
            if (fund.currentAmount > 0) {
                fund.contributions.push({
                    id: generateId(),
                    amount: fund.currentAmount,
                    date: fund.createdAt ? fund.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    note: 'Initial balance (migrated)'
                });
            }
            delete fund.currentAmount;
            needsSave = true;
        }
        // Ensure contributions array exists
        if (!fund.contributions) {
            fund.contributions = [];
            needsSave = true;
        }
    });
    if (needsSave) {
        saveFunds();
    }
}

function saveFunds() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(funds));
    } catch (e) {
        console.error('Failed to save funds:', e);
    }
}

function exportData() {
    if (funds.length === 0) {
        alert('No data to export.');
        return;
    }
    const data = JSON.stringify(funds, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sinking-funds-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleImportClick() {
    elements.importFile.click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading state or feedback
    console.log(`Attempting to import: ${file.name}`);

    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            const result = event.target.result;
            if (!result) throw new Error('File is empty');

            const importedFunds = JSON.parse(result);

            if (!Array.isArray(importedFunds)) {
                throw new Error('Invalid data format: Expected an array of funds.');
            }

            if (confirm(`Import ${importedFunds.length} funds? This will REPLACE all current data on this device.`)) {
                funds = importedFunds;
                migrateFunds();
                saveFunds();
                renderFunds();
                alert('Data imported successfully!');
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert(`Import failed: ${error.message || 'The file might be corrupted or in the wrong format.'}`);
        } finally {
            // Always clear the input so the user can select the same file again
            e.target.value = '';
        }
    };

    reader.onerror = () => {
        alert('Error reading file. Please try again.');
        e.target.value = '';
    };

    reader.readAsText(file);
}

// ===== Fund CRUD Operations =====
function addFund(fundData) {
    const fund = {
        id: generateId(),
        name: fundData.name,
        targetAmount: parseFloat(fundData.targetAmount),
        targetDate: fundData.targetDate,
        color: fundData.color,
        createdAt: new Date().toISOString(),
        contributions: [],
    };

    // Add initial deposit if provided
    const initialDeposit = parseFloat(fundData.initialDeposit) || 0;
    if (initialDeposit > 0) {
        fund.contributions.push({
            id: generateId(),
            amount: initialDeposit,
            date: new Date().toISOString().split('T')[0],
            note: 'Initial deposit'
        });
    }

    funds.push(fund);
    saveFunds();
    renderFunds();
}

function updateFund(id, fundData) {
    const index = funds.findIndex(f => f.id === id);
    if (index !== -1) {
        funds[index] = {
            ...funds[index],
            name: fundData.name,
            targetAmount: parseFloat(fundData.targetAmount),
            targetDate: fundData.targetDate,
            color: fundData.color,
        };
        saveFunds();
        renderFunds();
    }
}

function deleteFund(id) {
    funds = funds.filter(f => f.id !== id);
    saveFunds();
    renderFunds();
}

// ===== Contribution CRUD Operations =====
function addContribution(fundId, contributionData) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    const contribution = {
        id: generateId(),
        amount: parseFloat(contributionData.amount),
        date: contributionData.date,
        note: contributionData.note || ''
    };

    fund.contributions.push(contribution);
    // Sort contributions by date (newest first)
    fund.contributions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveFunds();
    renderFunds();
}

function updateContribution(fundId, contributionId, contributionData) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    const index = fund.contributions.findIndex(c => c.id === contributionId);
    if (index !== -1) {
        fund.contributions[index] = {
            ...fund.contributions[index],
            amount: parseFloat(contributionData.amount),
            date: contributionData.date,
            note: contributionData.note || ''
        };
        // Re-sort by date
        fund.contributions.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveFunds();
        renderFunds();
        // Re-render history if viewing
        if (viewingHistoryFundId === fundId) {
            renderHistory(fundId);
        }
    }
}

function deleteContribution(fundId, contributionId) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    fund.contributions = fund.contributions.filter(c => c.id !== contributionId);
    saveFunds();
    renderFunds();
    // Re-render history if viewing
    if (viewingHistoryFundId === fundId) {
        renderHistory(fundId);
    }
}

// ===== Rendering =====
function renderFunds() {
    // Calculate stats using getCurrentAmount
    const totalSaved = funds.reduce((sum, f) => sum + getCurrentAmount(f), 0);
    const completedFunds = funds.filter(f => f.targetAmount - getCurrentAmount(f) <= 0);
    const inProgressFunds = funds.filter(f => f.targetAmount - getCurrentAmount(f) > 0);
    const monthlyTotal = inProgressFunds.reduce((sum, f) => sum + calculateMonthlyContribution(f), 0);

    elements.totalSaved.textContent = formatCurrency(totalSaved);
    elements.fundCount.textContent = funds.length;
    elements.inProgressCount.textContent = inProgressFunds.length;
    elements.completedCount.textContent = funds.filter(f => f.targetAmount - getCurrentAmount(f) <= 0).length;
    elements.monthlyTotal.textContent = formatCurrency(monthlyTotal);

    // Show/hide empty state
    if (funds.length === 0) {
        elements.fundsGrid.style.display = 'none';
        elements.emptyState.classList.add('visible');
        elements.addFundBtn.style.display = 'none';
    } else {
        elements.fundsGrid.style.display = 'grid';
        elements.emptyState.classList.remove('visible');
        elements.addFundBtn.style.display = 'inline-flex';
    }

    // Filter and Sort Funds
    let displayFunds = funds.filter(fund => {
        if (showCompleted) return true;
        const progress = calculateProgress(fund);
        return progress < 100;
    });

    displayFunds.sort((a, b) => {
        switch (currentSort) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'date-asc':
                return new Date(a.targetDate) - new Date(b.targetDate);
            case 'date-desc':
                return new Date(b.targetDate) - new Date(a.targetDate);
            default: // Default to name-asc
                return a.name.localeCompare(b.name);
        }
    });

    // Render fund cards
    elements.fundsGrid.innerHTML = displayFunds
        .map(fund => renderFundCard(fund))
        .join('');

    // Animate progress rings
    requestAnimationFrame(() => {
        document.querySelectorAll('.progress-ring-fill').forEach(ring => {
            const progress = parseFloat(ring.dataset.progress);
            const circumference = 226;
            const offset = circumference - (progress / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        });
    });
}

function renderFundCard(fund) {
    const currentAmount = getCurrentAmount(fund);
    const progress = calculateProgress(fund);
    const monthlyContribution = calculateMonthlyContribution(fund);
    const daysRemaining = getDaysRemaining(fund.targetDate);
    const status = getFundStatus(fund);
    const contributionCount = fund.contributions ? fund.contributions.length : 0;

    let statusClass = '';
    if (status === 'on-track' || status === 'complete') statusClass = 'on-track';
    else if (status === 'behind') statusClass = 'behind';
    else statusClass = 'at-risk';

    return `
        <div class="fund-card" style="--fund-color: ${fund.color}" data-id="${fund.id}">
            <div class="fund-header">
                <h3 class="fund-name">${escapeHtml(fund.name)}</h3>
                <div class="fund-actions">
                    <button class="fund-action-btn edit" onclick="openEditModal('${fund.id}')" title="Edit">✏️</button>
                    <button class="fund-action-btn delete" onclick="openDeleteModal('${fund.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            
            <div class="fund-progress-container">
                <div class="progress-ring">
                    <svg viewBox="0 0 80 80">
                        <circle class="progress-ring-bg" cx="40" cy="40" r="36"></circle>
                        <circle class="progress-ring-fill" cx="40" cy="40" r="36" 
                            style="stroke: ${fund.color}" data-progress="${progress}"></circle>
                    </svg>
                    <span class="progress-percentage">${Math.round(progress)}%</span>
                </div>
                <div class="fund-amounts">
                    <div class="fund-current">${formatCurrency(currentAmount)}</div>
                    <div class="fund-target">of ${formatCurrency(fund.targetAmount)}</div>
                </div>
            </div>
            
            <div class="fund-details">
                <div class="fund-detail">
                    <span class="fund-detail-label">Monthly Goal</span>
                    <span class="fund-detail-value ${statusClass}">${formatCurrency(monthlyContribution)}</span>
                </div>
                <div class="fund-detail">
                    <span class="fund-detail-label">Time Left</span>
                    <span class="fund-detail-value ${statusClass}" title="${daysRemaining} days left">${getSmartTime(daysRemaining)}</span>
                </div>
                <div class="fund-detail">
                    <span class="fund-detail-label">Target Date</span>
                    <span class="fund-detail-value">${formatDate(fund.targetDate)}</span>
                </div>
                <div class="fund-detail">
                    <span class="fund-detail-label">Remaining</span>
                    <span class="fund-detail-value">${formatCurrency(fund.targetAmount - currentAmount)}</span>
                </div>
            </div>
            
            <button class="fund-add-deposit" onclick="openDepositModal('${fund.id}')">
                <span>+</span> Add Deposit
            </button>
            
            <button class="fund-history-btn" onclick="openHistoryModal('${fund.id}')">
                📋 ${contributionCount} contribution${contributionCount !== 1 ? 's' : ''}
            </button>
        </div>
    `;
}

function renderHistory(fundId) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    const contributions = fund.contributions || [];

    if (contributions.length === 0) {
        elements.historyList.classList.add('hidden');
        elements.historyEmpty.classList.remove('hidden');
    } else {
        elements.historyList.classList.remove('hidden');
        elements.historyEmpty.classList.add('hidden');

        elements.historyList.innerHTML = contributions
            .map(c => `
                <div class="history-item" data-id="${c.id}">
                    <div class="history-item-info">
                        <div class="history-item-amount">${formatCurrency(c.amount)}</div>
                        <div class="history-item-date">${formatDate(c.date)}</div>
                        ${c.note ? `<div class="history-item-note">${escapeHtml(c.note)}</div>` : ''}
                    </div>
                    <div class="history-item-actions">
                        <button class="fund-action-btn edit" onclick="openEditDepositModal('${fundId}', '${c.id}')" title="Edit">✏️</button>
                        <button class="fund-action-btn delete" onclick="handleDeleteContribution('${fundId}', '${c.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            `).join('');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Modal Management =====
function openAddModal() {
    editingFundId = null;
    elements.modalTitle.textContent = 'Add Sinking Fund';
    elements.submitBtn.textContent = 'Add Fund';
    elements.fundForm.reset();
    elements.initialDeposit.value = '0';
    elements.initialDepositGroup.style.display = 'block';

    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    elements.targetDate.value = defaultDate.toISOString().split('T')[0];
    elements.targetDate.min = new Date().toISOString().split('T')[0];

    elements.modalOverlay.classList.add('visible');
    elements.fundName.focus();
}

function openEditModal(id) {
    const fund = funds.find(f => f.id === id);
    if (!fund) return;

    editingFundId = id;
    elements.modalTitle.textContent = 'Edit Sinking Fund';
    elements.submitBtn.textContent = 'Save Changes';
    elements.initialDepositGroup.style.display = 'none'; // Hide initial deposit when editing

    elements.fundName.value = fund.name;
    elements.targetAmount.value = fund.targetAmount;
    elements.targetDate.value = fund.targetDate;
    elements.targetDate.min = new Date().toISOString().split('T')[0];

    const colorInput = document.querySelector(`input[name="fundColor"][value="${fund.color}"]`);
    if (colorInput) colorInput.checked = true;

    elements.modalOverlay.classList.add('visible');
    elements.fundName.focus();
}

function closeModal() {
    elements.modalOverlay.classList.remove('visible');
    editingFundId = null;
}

function openDeleteModal(id) {
    const fund = funds.find(f => f.id === id);
    if (!fund) return;

    deletingFundId = id;
    elements.deleteFundName.textContent = fund.name;
    elements.deleteModalOverlay.classList.add('visible');
}

function closeDeleteModal() {
    elements.deleteModalOverlay.classList.remove('visible');
    deletingFundId = null;
}

// Deposit modal
function openDepositModal(fundId) {
    depositingFundId = fundId;
    editingDepositId = null;
    elements.depositModalTitle.textContent = 'Add Deposit';
    elements.submitDepositBtn.textContent = 'Add Deposit';
    elements.depositForm.reset();
    elements.depositDate.value = new Date().toISOString().split('T')[0];
    elements.depositModalOverlay.classList.add('visible');
    elements.depositAmount.focus();
}

function openEditDepositModal(fundId, contributionId) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    const contribution = fund.contributions.find(c => c.id === contributionId);
    if (!contribution) return;

    depositingFundId = fundId;
    editingDepositId = contributionId;
    elements.depositModalTitle.textContent = 'Edit Deposit';
    elements.submitDepositBtn.textContent = 'Save Changes';

    elements.depositAmount.value = contribution.amount;
    elements.depositDate.value = contribution.date;
    elements.depositNote.value = contribution.note || '';

    elements.depositModalOverlay.classList.add('visible');
    elements.depositAmount.focus();
}

function closeDepositModal() {
    elements.depositModalOverlay.classList.remove('visible');
    depositingFundId = null;
    editingDepositId = null;
}

// History modal
function openHistoryModal(fundId) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    viewingHistoryFundId = fundId;
    elements.historyModalTitle.textContent = `${fund.name} - History`;
    renderHistory(fundId);
    elements.historyModalOverlay.classList.add('visible');
}

function closeHistoryModal() {
    elements.historyModalOverlay.classList.remove('visible');
    viewingHistoryFundId = null;
}

function openHelpModal() {
    elements.helpModalOverlay.classList.add('visible');
}

function closeHelpModal() {
    elements.helpModalOverlay.classList.remove('visible');
}

// ===== Event Handlers =====
function handleFormSubmit(e) {
    e.preventDefault();

    const fundData = {
        name: elements.fundName.value.trim(),
        targetAmount: elements.targetAmount.value,
        targetDate: elements.targetDate.value,
        initialDeposit: elements.initialDeposit.value,
        color: document.querySelector('input[name="fundColor"]:checked').value,
    };

    if (editingFundId) {
        updateFund(editingFundId, fundData);
    } else {
        addFund(fundData);
    }

    closeModal();
}

function handleDepositFormSubmit(e) {
    e.preventDefault();

    const contributionData = {
        amount: elements.depositAmount.value,
        date: elements.depositDate.value,
        note: elements.depositNote.value.trim(),
    };

    if (editingDepositId) {
        updateContribution(depositingFundId, editingDepositId, contributionData);
    } else {
        addContribution(depositingFundId, contributionData);
    }

    closeDepositModal();
}

function handleConfirmDelete() {
    if (deletingFundId) {
        deleteFund(deletingFundId);
        closeDeleteModal();
    }
}

function handleDeleteContribution(fundId, contributionId) {
    if (confirm('Delete this contribution?')) {
        deleteContribution(fundId, contributionId);
    }
}

// ===== Initialize =====
function init() {
    loadFunds();
    renderFunds();

    // Fund modal events
    elements.addFundBtn.addEventListener('click', openAddModal);
    elements.emptyAddBtn.addEventListener('click', openAddModal);
    elements.modalClose.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.fundForm.addEventListener('submit', handleFormSubmit);

    // Delete modal events
    elements.deleteModalClose.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Deposit modal events
    elements.depositModalClose.addEventListener('click', closeDepositModal);
    elements.cancelDepositBtn.addEventListener('click', closeDepositModal);
    elements.depositForm.addEventListener('submit', handleDepositFormSubmit);

    // History modal events
    elements.historyModalClose.addEventListener('click', closeHistoryModal);
    elements.closeHistoryBtn.addEventListener('click', closeHistoryModal);

    // Help modal events
    elements.helpBtn.addEventListener('click', openHelpModal);
    elements.helpModalClose.addEventListener('click', closeHelpModal);
    elements.closeHelpBtn.addEventListener('click', closeHelpModal);

    // Close modals on overlay click
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });
    elements.deleteModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.deleteModalOverlay) closeDeleteModal();
    });
    elements.depositModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.depositModalOverlay) closeDepositModal();
    });
    elements.historyModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.historyModalOverlay) closeHistoryModal();
    });
    elements.helpModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.helpModalOverlay) closeHelpModal();
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
            closeDepositModal();
            closeHistoryModal();
            closeHelpModal();
        }
    });

    // Export/Import events
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', handleImportClick);
    elements.importFile.addEventListener('change', handleFileImport);

    // Initialize controls
    if (elements.sortBy) elements.sortBy.value = currentSort;
    if (elements.showCompleted) elements.showCompleted.checked = showCompleted;

    // Sorting and Filtering events
    elements.sortBy.addEventListener('change', (e) => {
        currentSort = e.target.value;
        localStorage.setItem('sinkingFunds_sort', currentSort);
        renderFunds();
    });

    elements.showCompleted.addEventListener('change', (e) => {
        showCompleted = e.target.checked;
        localStorage.setItem('sinkingFunds_showCompleted', showCompleted);
        renderFunds();
    });

    // Hide help button if running as PWA (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone && elements.helpBtn) {
        elements.helpBtn.style.display = 'none';
    }
}

// Make functions available globally for inline handlers
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.openDepositModal = openDepositModal;
window.openEditDepositModal = openEditDepositModal;
window.openHistoryModal = openHistoryModal;
window.handleDeleteContribution = handleDeleteContribution;

// Start the app
init();
