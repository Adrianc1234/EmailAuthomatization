document.addEventListener('DOMContentLoaded', () => {
    const csvData = JSON.parse(sessionStorage.getItem('csvData'));
    if (csvData) {
        displayTable(csvData);
    }
});

const rowsPerPage = 10;
let currentPage = 1;
let csvDataArray = [];

function displayTable(data) {
    csvDataArray = data;
    renderTable();
    updatePaginationInfo();
}

function renderTable() {
    const tbody = document.getElementById('csvTableBody');
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentPageData = csvDataArray.slice(startIndex, endIndex);

    currentPageData.forEach((row, index) => {
        const tr = document.createElement('tr');

        Object.keys(row).forEach((key) => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = row[key];
            input.dataset.key = key;
            input.dataset.index = startIndex + index;
            input.addEventListener('change', updateData);
            td.appendChild(input);
            tr.appendChild(td);
        });

        const actionTd = document.createElement('td');
        const button = document.createElement('button');
        button.textContent = 'Details';
        button.onclick = () => alert('Row ' + (startIndex + index + 1) + ' details');
        actionTd.appendChild(button);
        tr.appendChild(actionTd);

        tbody.appendChild(tr);
    });
}

function updateData(event) {
    const input = event.target;
    const key = input.dataset.key;
    const index = input.dataset.index;
    csvDataArray[index][key] = input.value;
}

function updatePaginationInfo() {
    const pageInfo = document.getElementById('pageInfo');
    const totalPages = Math.ceil(csvDataArray.length / rowsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function nextPage() {
    const totalPages = Math.ceil(csvDataArray.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        updatePaginationInfo();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
        updatePaginationInfo();
    }
}

// Funciones para enviar correos electrónicos
function sendEmails() {
    const gmailUser = document.getElementById('gmailUser').value;
    const gmailPassword = document.getElementById('gmailPassword').value;

    showEmailLoader(csvDataArray.length);

    fetch('http://localhost:5001/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            gmail_user: gmailUser,
            gmail_password: gmailPassword,
            emails: csvDataArray
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Emails sent successfully');
        } else {
            alert('Failed to send some emails');
        }
        hideEmailLoader();
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Error sending emails');
        hideEmailLoader();
    });
}

// Funciones para generar PDFs
function generatePDF() {
    showPDFLoader(csvDataArray.length);

    fetch('http://localhost:5001/generate-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(csvDataArray)
    })
    .then(response => response.json())
    .then(data => {
        hidePDFLoader();
        if (data.status === 'success') {
            alert('PDFs generated successfully');
        } else {
            alert('Failed to generate PDFs');
        }
    })
    .catch((error) => {
        hidePDFLoader();
        console.error('Error:', error);
        alert('Error generating PDFs');
    });
}

// Funciones específicas para mostrar, ocultar y actualizar el loader de PDFs
function showPDFLoader(total) {
    const loaderContainer = document.createElement('div');
    loaderContainer.id = 'pdf-loader-container';
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = `
        <div class="loader-content">
            <div class="loader-bar">
                <div class="loader-progress" id="pdf-loader-progress"></div>
            </div>
            <div class="loader-text">Generating PDFs... <span id="pdf-loader-status">0/${total}</span></div>
        </div>
    `;
    document.body.appendChild(loaderContainer);
    updatePDFLoader(0, total);
}

function hidePDFLoader() {
    const loaderContainer = document.getElementById('pdf-loader-container');
    if (loaderContainer) {
        document.body.removeChild(loaderContainer);
    }
}

function updatePDFLoader(current, total) {
    const progress = document.getElementById('pdf-loader-progress');
    const status = document.getElementById('pdf-loader-status');
    const percentage = (current / total) * 100;
    progress.style.width = percentage + '%';
    status.textContent = `${current}/${total}`;
}

// Funciones específicas para mostrar, ocultar y actualizar el loader de envío de emails
function showEmailLoader(total) {
    const loaderContainer = document.createElement('div');
    loaderContainer.id = 'email-loader-container';
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = `
        <div class="loader-content">
            <div class="loader-bar">
                <div class="loader-progress" id="email-loader-progress"></div>
            </div>
            <div class="loader-text">Sending Emails... <span id="email-loader-status">0/${total}</span></div>
        </div>
    `;
    document.body.appendChild(loaderContainer);
    updateEmailLoader(0, total);
}

function hideEmailLoader() {
    const loaderContainer = document.getElementById('email-loader-container');
    if (loaderContainer) {
        document.body.removeChild(loaderContainer);
    }
}

function updateEmailLoader(current, total) {
    const progress = document.getElementById('email-loader-progress');
    const status = document.getElementById('email-loader-status');
    const percentage = (current / total) * 100;
    progress.style.width = percentage + '%';
    status.textContent = `${current}/${total}`;
}

const socket = io.connect('http://localhost:5001');
socket.on('progress', (data) => {
    if (data.task === 'pdf') {
        updatePDFLoader(data.current, data.total);
    } else if (data.task === 'email') {
        updateEmailLoader(data.current, data.total);
    }
});
