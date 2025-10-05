document.addEventListener('DOMContentLoaded', function () {
    // Load data from localStorage if available
    loadFromStorage();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Set valid until to 7 days from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('validUntil').value = nextWeek.toISOString().split('T')[0];

    // Toggle valid until field based on isQuotation checkbox
    document.getElementById('isQuotation').addEventListener('change', function () {
        document.getElementById('validUntilContainer').style.display = this.checked ? 'block' : 'none';
    });

    // Add new line item
    document.getElementById('addLineItem').addEventListener('click', function () {
        addLineItem();
        autoSaveAndUpdate();
    });

    // Remove line item
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('remove-line')) {
            e.target.closest('.line-item-row').remove();
            calculateTotals();
            autoSaveAndUpdate();
        }
    });

    // Calculate line totals and invoice totals when inputs change
    document.addEventListener('input', function (e) {
        if (e.target && (e.target.name === 'quantity' || e.target.name === 'rate')) {
            calculateLineTotal(e.target);
            calculateTotals();
        }

        if (e.target && (e.target.id === 'taxPercent' || e.target.id === 'discount')) {
            calculateTotals();
        }

        // Auto-save and auto-update preview on any input change
        autoSaveAndUpdate();
    });

    // Auto-save and auto-update on checkbox and select changes
    document.addEventListener('change', function (e) {
        if (e.target && (e.target.type === 'checkbox' || e.target.type === 'select-one')) {
            autoSaveAndUpdate();
        }
    });


    // Generate PDF
    document.getElementById('generatePDF').addEventListener('click', function () {
        generatePDF();
    });

    // Format selection
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', function () {
            updatePreviewFormat();
        });
    });

    // Initialize with sample data
    calculateLineTotals();
    calculateTotals();
    generatePreview();
});

// Auto-save and auto-update function
function autoSaveAndUpdate() {
    // Add a small delay to avoid excessive saves during rapid typing
    clearTimeout(window.autoSaveTimer);
    window.autoSaveTimer = setTimeout(function () {
        saveToStorage(true); // Pass true to indicate auto-save (no alert)
        generatePreview();
    }, 300); // 300ms delay
}

function addLineItem() {
    const lineItems = document.getElementById('lineItems');
    const newItem = document.createElement('div');
    newItem.className = 'line-item-row row g-2';
    newItem.innerHTML = `
                <div class="col-md-5">
                    <input type="text" class="form-control" placeholder="Description" name="description">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Qty" name="quantity" min="1" value="1">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Rate" name="rate" min="0" step="0.01" value="0">
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control line-total" placeholder="Total" readonly>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-danger btn-sm remove-line">×</button>
                </div>
            `;
    lineItems.appendChild(newItem);
}

function calculateLineTotals() {
    document.querySelectorAll('.line-item-row').forEach(row => {
        calculateLineTotal(row.querySelector('input[name="quantity"]'));
    });
}

function calculateLineTotal(input) {
    const row = input.closest('.line-item-row');
    const quantity = parseFloat(row.querySelector('input[name="quantity"]').value) || 0;
    const rate = parseFloat(row.querySelector('input[name="rate"]').value) || 0;
    const total = quantity * rate;
    row.querySelector('.line-total').value = total.toFixed(2);
}

function calculateTotals() {
    let subtotal = 0;

    document.querySelectorAll('.line-item-row').forEach(row => {
        const total = parseFloat(row.querySelector('.line-total').value) || 0;
        subtotal += total;
    });

    const taxPercent = parseFloat(document.getElementById('taxPercent').value) || 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const grandTotal = subtotal + taxAmount - discount;

    document.getElementById('subtotal').value = subtotal.toFixed(2);
    document.getElementById('taxAmount').value = taxAmount.toFixed(2);
    document.getElementById('grandTotal').value = grandTotal.toFixed(2);
}

function generatePreview() {
    const preview = document.getElementById('invoicePreview');
    const isQuotation = document.getElementById('isQuotation').checked;
    const documentType = isQuotation ? 'QUOTATION' : 'INVOICE';

    // Get business details
    const businessName = document.getElementById('businessName').value || 'ABDULLAH SURGICAL';
    const businessAddress = document.getElementById('businessAddress').value || 'Munir Chowk, asad markeet, shop #1, Gujranwala';
    const businessPhone = document.getElementById('businessPhone').value || '03076830789';

    // Get customer details
    const customerName = document.getElementById('customerName').value || 'Customer Name';
    const customerAddress = document.getElementById('customerAddress').value || '';

    // Get invoice details
    const invoiceNumber = document.getElementById('invoiceNumber').value || 'INV-001';
    const invoiceDate = document.getElementById('invoiceDate').value;
    const validUntil = document.getElementById('validUntil').value;

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
    };

    // Get currency
    const currency = document.getElementById('currency').value || 'PKR';

    // Generate line items HTML
    let lineItemsHTML = '';
    document.querySelectorAll('.line-item-row').forEach(row => {
        const description = row.querySelector('input[name="description"]').value || '';
        const quantity = row.querySelector('input[name="quantity"]').value || '0';
        const rate = parseFloat(row.querySelector('input[name="rate"]').value || 0).toFixed(2);
        const total = parseFloat(row.querySelector('.line-total').value || 0).toFixed(2);

        if (description) {
            lineItemsHTML += `
                        <tr>
                            <td>${description}</td>
                            <td>${quantity}</td>
                            <td>${currency} ${rate}</td>
                            <td>${currency} ${total}</td>
                        </tr>
                    `;
        }
    });

    // Get totals
    const subtotal = document.getElementById('subtotal').value || '0.00';
    const taxAmount = document.getElementById('taxAmount').value || '0.00';
    const discount = document.getElementById('discount').value || '0.00';
    const grandTotal = document.getElementById('grandTotal').value || '0.00';

    // Get comments and terms
    const comments = document.getElementById('comments').value || '';
    const termsConditions = document.getElementById('termsConditions').value || '';

    preview.innerHTML = `
                <div class="invoice-header">
                    <div class="row">
                        <div class="col-6">
                            <div class="invoice-title">${documentType}</div>
                            <div><strong>${businessName}</strong></div>
                            <div>${businessAddress.replace(/\n/g, '<br>')}</div>
                            <div>Phone: ${businessPhone}</div>
                        </div>
                        <div class="col-6 text-end">
                            <div><strong>${documentType} #:</strong> ${invoiceNumber}</div>
                            <div><strong>Date:</strong> ${formatDate(invoiceDate)}</div>
                            ${isQuotation && validUntil ? `<div><strong>Valid Until:</strong> ${formatDate(validUntil)}</div>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4">
                    <div class="col-12">
                        <strong>TO:</strong><br>
                        ${customerName}<br>
                        ${customerAddress.replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            <th>QTY</th>
                            <th>RATE</th>
                            <th>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lineItemsHTML || '<tr><td colspan="4" class="text-center">No items added</td></tr>'}
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <table>
                        <tr>
                            <td>Sub Total</td>
                            <td>${currency} ${subtotal}</td>
                        </tr>
                        <tr>
                            <td>Tax</td>
                            <td>${currency} ${taxAmount}</td>
                        </tr>
                        <tr>
                            <td>Discount</td>
                            <td>${currency} ${discount}</td>
                        </tr>
                        <tr>
                            <td><strong>TOTAL</strong></td>
                            <td><strong>${currency} ${grandTotal}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="invoice-footer">
                    ${comments ? `<p><strong></strong><br>${comments.replace(/\n/g, '<br>')}</p>` : ''}
                    
                    ${termsConditions ? `<p class="mt-4"><em>${termsConditions.replace(/\n/g, '<br>')}</em></p>` : ''}
                </div>
            `;

    updatePreviewFormat();
}

function updatePreviewFormat() {
    const preview = document.getElementById('invoicePreview');
    const format = document.querySelector('input[name="format"]:checked').id;

    // Remove all format classes
    preview.classList.remove('a4-format', 'thermal-format');

    // Add the selected format class
    if (format === 'formatA4') {
        preview.classList.add('a4-format');
    } else if (format === 'formatThermal') {
        preview.classList.add('thermal-format');
    }
}

function saveToStorage(isAutoSave = false) {
    const formData = {
        businessName: document.getElementById('businessName').value,
        businessAddress: document.getElementById('businessAddress').value,
        businessPhone: document.getElementById('businessPhone').value,
        customerName: document.getElementById('customerName').value,
        customerAddress: document.getElementById('customerAddress').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        isQuotation: document.getElementById('isQuotation').checked,
        validUntil: document.getElementById('validUntil').value,
        taxPercent: document.getElementById('taxPercent').value,
        discount: document.getElementById('discount').value,
        comments: document.getElementById('comments').value,
        termsConditions: document.getElementById('termsConditions').value,
        currency: document.getElementById('currency').value,
        lineItems: []
    };

    document.querySelectorAll('.line-item-row').forEach(row => {
        formData.lineItems.push({
            description: row.querySelector('input[name="description"]').value,
            quantity: row.querySelector('input[name="quantity"]').value,
            rate: row.querySelector('input[name="rate"]').value
        });
    });

    localStorage.setItem('invoiceData', JSON.stringify(formData));
    if (!isAutoSave) {
        alert('Invoice data saved to local storage!');
    }
}

function loadFromStorage() {
    const savedData = localStorage.getItem('invoiceData');
    if (savedData) {
        const formData = JSON.parse(savedData);

        document.getElementById('businessName').value = formData.businessName || '';
        document.getElementById('businessAddress').value = formData.businessAddress || '';
        document.getElementById('businessPhone').value = formData.businessPhone || '';
        document.getElementById('customerName').value = formData.customerName || '';
        document.getElementById('customerAddress').value = formData.customerAddress || '';
        document.getElementById('invoiceNumber').value = formData.invoiceNumber || '';
        document.getElementById('invoiceDate').value = formData.invoiceDate || '';
        document.getElementById('isQuotation').checked = formData.isQuotation || false;
        document.getElementById('validUntil').value = formData.validUntil || '';
        document.getElementById('taxPercent').value = formData.taxPercent || '0';
        document.getElementById('discount').value = formData.discount || '0';
        document.getElementById('comments').value = formData.comments || '';
        document.getElementById('termsConditions').value = formData.termsConditions || '';
        document.getElementById('currency').value = formData.currency || 'PKR';

        // Show/hide valid until based on isQuotation
        document.getElementById('validUntilContainer').style.display =
            formData.isQuotation ? 'block' : 'none';

        // Clear existing line items
        document.getElementById('lineItems').innerHTML = '';

        // Add saved line items
        if (formData.lineItems && formData.lineItems.length > 0) {
            formData.lineItems.forEach(item => {
                addLineItem();
                const lastRow = document.querySelector('.line-item-row:last-child');
                lastRow.querySelector('input[name="description"]').value = item.description || '';
                lastRow.querySelector('input[name="quantity"]').value = item.quantity || '1';
                lastRow.querySelector('input[name="rate"]').value = item.rate || '0';
                calculateLineTotal(lastRow.querySelector('input[name="quantity"]'));
            });
        } else {
            // Add at least one empty line item
            addLineItem();
        }

        calculateTotals();
        generatePreview();
    }
}

function generatePDF() {
    const element = document.getElementById('invoicePreview');
    const format = document.querySelector('input[name="format"]:checked').id;

    // Use html2canvas to capture the invoice preview as an image
    html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        // Convert canvas to image data
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Create PDF with the correct dimensions
        const {jsPDF} = window.jspdf;
        let pdf;

        if (format === 'formatA4') {
            pdf = new jsPDF('p', 'mm', 'a4');
        } else if (format === 'formatThermal') {
            pdf = new jsPDF('p', 'mm', [80, 200]);
        }

        // Calculate dimensions to fit the image to the PDF page
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Add image to PDF
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        // Save the PDF
        pdf.save('invoice.pdf');
    });
}
