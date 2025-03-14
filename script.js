import {
    debounce
} from 'lodash';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quill editor with all toolbar options
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: '#toolbar',
                handlers: {
                    link: function(value) {
                        if (value) {
                            // Show custom link modal instead of default prompt
                            showLinkModal(this.quill);
                        } else {
                            this.quill.format('link', false);
                        }
                    },
                    formula: function(value) {
                        if (value) {
                            // Show custom formula modal instead of default prompt
                            showFormulaModal(this.quill);
                        }
                    }
                }
            }
        },
        formats: [
            'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
            'color', 'background', 'list', 'bullet', 'indent', 'align', 'direction',
            'link', 'image', 'video', 'formula', 'code-block'
        ]
    });

    // Register all the fonts
    const Font = Quill.import('formats/font');
    Font.whitelist = [
        'arial', 'helvetica', 'times-new-roman', 'garamond', 'georgia', 'courier-new',
        'verdana', 'roboto', 'open-sans', 'lato', 'montserrat', 'poppins', 'raleway',
        'merriweather', 'nunito', 'playfair-display', 'oswald', 'source-sans-pro',
        'ubuntu', 'pt-sans', 'inter', 'quicksand', 'rubik', 'work-sans', 'karla',
        'josefin-sans', 'comfortaa', 'bitter', 'crimson-text', 'libre-baskerville',
        'source-serif-pro', 'inconsolata', 'fira-code', 'space-mono'
    ];
    Quill.register(Font, true);

    // Load the necessary external libraries for exports
    function loadExternalLibraries() {
        // Check if pdfMake is already loaded
        if (typeof window.pdfMake === 'undefined') {
            // Create script elements for pdfmake
            const pdfScript = document.createElement('script');
            pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
            document.head.appendChild(pdfScript);
            
            const pdfFontsScript = document.createElement('script');
            pdfFontsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js';
            document.head.appendChild(pdfFontsScript);
        }
        
        // Add docx library for DOCX export
        if (typeof window.docx === 'undefined') {
            const docxScript = document.createElement('script');
            docxScript.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
            document.head.appendChild(docxScript);
            
            return new Promise((resolve) => {
                docxScript.onload = () => {
                    resolve();
                };
            });
        }
        
        return Promise.resolve();
    }
    
    // Load libraries when the page loads
    loadExternalLibraries();
    
    // Custom Image Handler
    function imageHandler() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = () => {
            const file = input.files[0];

            if (/^image\//.test(file.type)) {
                saveToServer(file);
            } else {
                console.warn('You could only upload images.');
            }
        }
    }

    /**
     * Step2. save to server
     *
     * @param {File} image
     */
    function saveToServer(image) {
        const fd = new FormData();
        fd.append('image', image);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.imgbb.com/1/upload?key=YOUR_API_KEY', true); // Change to your image upload API endpoint
        xhr.onload = () => {
            if (xhr.status === 200) {
                // this is callback data: url
                const url = JSON.parse(xhr.responseText).data.url;
                insertToEditor(url);
            }
        }
        xhr.send(fd);
    }

    /**
     * Step3. insert image url to rich editor.
     *
     * @param {string} url
     */
    function insertToEditor(url) {
        // push image url to rich editor.
        const range = quill.getSelection();
        quill.insertEmbed(range.index, 'image', url);
    }

    let currentFile = null;
    let files = JSON.parse(localStorage.getItem('files') || '{}');

    const fileList = document.getElementById('fileList');
    const newFileBtn = document.getElementById('newFileBtn');
    const openFileBtn = document.getElementById('openFileBtn');
    const saveFileBtn = document.getElementById('saveFileBtn');
    const exportFileBtn = document.getElementById('exportFileBtn');
    const deleteFileBtn = document.getElementById('deleteFileBtn');
    const renameFileBtn = document.getElementById('renameFileBtn');
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');

    // Get the modal
    const modal = document.createElement('div');
    modal.id = "myModal";
    modal.classList.add("modal");
    modal.innerHTML = `
    <div class="modal-content">
        <span class="close">&times;</span>
        <p>Some text in the Modal..</p>
    </div>
    `;
    document.body.appendChild(modal);

    // Get the <span> element that closes the modal
    const modalSpan = document.querySelector('.close');

    const showModal = (content) => {
        modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            ${content}
        </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = "block";

        // Get the <span> element that closes the modal
        const span = document.querySelector('.close');
        span.onclick = function() {
            modal.style.display = "none";
        }

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    }

    // When the user clicks on <span> (x), close the modal
    modalSpan.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Function to update word and character count
    const updateWordCount = () => {
        const text = quill.getText();
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const characters = text.length;

        wordCount.textContent = `Words: ${words}`;
        charCount.textContent = `Characters: ${characters}`;
    };

    // Autosave
    const saveContent = () => {
        if (currentFile) {
            files[currentFile] = quill.getContents();
            localStorage.setItem('files', JSON.stringify(files));
            console.log(`Saved ${currentFile}`);
        }
    };

    //Debounce saves
    const debouncedSave = debounce(saveContent, 1000);

    quill.on('text-change', function() {
        updateWordCount();
        debouncedSave();
    });

    // File Management Functions
    const createFile = () => {
        let modalContent = `
            <h2>New File</h2>
            <input type="text" id="newFileName" class="modal-input" placeholder="Enter file name" />
            <div class="modal-buttons">
                <button class="confirm" onclick="handleCreateFile()">Create</button>
                <button class="cancel" onclick="closeModal()">Cancel</button>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleCreateFile = () => {
        const fileName = document.getElementById('newFileName').value;
        if (fileName) {
            if (files[fileName]) {
                // Show warning modal if file already exists
                let modalContent = `
                    <div class="flex flex-col items-center justify-center p-6">
                        <svg class="w-12 h-12 text-yellow-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">File Already Exists</h2>
                        <p class="text-gray-600 dark:text-gray-300 mb-4">A file with this name already exists. Please choose a different name.</p>
                        <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                    </div>
                `;
                showModal(modalContent);
                return;
            }
            currentFile = fileName;
            files[currentFile] = {
                ops: [{
                    insert: '\n'
                }]
            }; // Initialize with empty content
            localStorage.setItem('files', JSON.stringify(files));
            loadFiles();
            loadContent(currentFile);
            modal.style.display = "none";
        } else {
            alert('Please enter a file name.');
        }
    };

    window.closeModal = () => {
        modal.style.display = "none";
    };

    const openFile = () => {
        let modalContent = `
            <h2>Open File</h2>
            <input type="text" id="openFileName" class="modal-input" placeholder="Enter file name to open" />
            <div class="modal-buttons">
                <button class="confirm" onclick="handleOpenFile()">Open</button>
                <button class="cancel" onclick="closeModal()">Cancel</button>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleOpenFile = () => {
        const fileName = document.getElementById('openFileName').value;
        if (fileName && files[fileName]) {
            currentFile = fileName;
            loadContent(currentFile);
            modal.style.display = "none";
        } else {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Warning</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">File not found.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    const renameFile = () => {
        if (currentFile) {
            let modalContent = `
                <h2>Rename File</h2>
                <input type="text" id="newFileName" class="modal-input" placeholder="Enter new file name" value="${currentFile}" />
                <div class="modal-buttons">
                    <button class="confirm" onclick="handleRenameFile()">Rename</button>
                    <button class="cancel" onclick="closeModal()">Cancel</button>
                </div>
            `;
            showModal(modalContent);
        } else {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Warning</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">No file selected to rename.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    window.handleRenameFile = () => {
        const newFileName = document.getElementById('newFileName').value;
        if (newFileName && newFileName !== currentFile) {
            // Check if the new filename already exists
            if (files[newFileName]) {
                let modalContent = `
                    <div class="flex flex-col items-center justify-center p-6">
                        <svg class="w-12 h-12 text-yellow-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">File Already Exists</h2>
                        <p class="text-gray-600 dark:text-gray-300 mb-4">A file with this name already exists. Please choose a different name.</p>
                        <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                    </div>
                `;
                showModal(modalContent);
                return;
            }
            
            // Rename file logic
            files[newFileName] = files[currentFile];
            delete files[currentFile];
            localStorage.setItem('files', JSON.stringify(files));
            currentFile = newFileName;
            loadFiles();
            loadContent(currentFile);
            modal.style.display = "none";
        } else {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-yellow-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Invalid File Name</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Please enter a different file name.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    const saveFile = () => {
        let modalContent = `
            <h2>Save File</h2>
            <p>Do you want to save the current file?</p>
            <div class="modal-buttons">
                <button class="confirm" onclick="handleSaveFile()">Yes</button>
                <button class="cancel" onclick="closeModal()">No</button>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleSaveFile = () => {
        if (currentFile) {
            files[currentFile] = quill.getContents();
            localStorage.setItem('files', JSON.stringify(files));
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Success</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">File saved!</p>
                    <button class="confirm bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        } else {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Warning</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">No file currently open.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    const exportFile = () => {
        if (!currentFile) {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Warning</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">No file is open to export.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
            return;
        }

        let modalContent = `
            <h2>Export File</h2>
            <div class="export-grid">
                <div class="export-option" onclick="handleExportFile('txt')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.447 1.54A.75.75 0 003 8.285V15.714A.75.75 0 004.447 22.46l7.26-4.063a.75.75 0 000-6.794l-7.26-4.062zM7.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.74 5.56a.75.75 0 00-1.447.862L18 11.203l-2.707 4.781a.75.75 0 001.447.862l2.707-4.781 2.707-4.781a.75.75 0 00-.75-1.295h-4.667z" />
                    </svg>
                    .txt
                </div>
                <div class="export-option" onclick="handleExportFile('md')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.5 1.5 0 010 2.966l-5.607-.857a.75.75 0 00-.794.65V15a.75.75 0 00.75.75h2.25a.75.75 0 010 1.5h-2.25a2.25 2.25 0 01-2.25-2.25v-1.9c0-.343.262-.629.599-.643l5.607-.857a1.5 1.5 0 011.277-.428zm-7.012-2.4a.75.75 0 01.743.75v3.75a.75.75 0 01-1.5 0V8.667a3.001 3.001 0 013-3h2.25a.75.75 0 010 1.5H9.75a1.5 1.5 0 00-1.5 1.5z" />
                    </svg>
                    .md
                </div>
                <div class="export-option" onclick="handleExportFile('html')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.625 1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V3a.75.75 0 01.75-.75h1.5zm-9 0a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V3a.75.75 0 01.75-.75h1.5zm12.75 7.5a.75.75 0 000-1.5h-9a.75.75 0 000 1.5h9zM7.5 9.75a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75V7.5zm9 4.5a.75.75 0 000-1.5h-9a.75.75 0 000 1.5h9zM7.5 16.5a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-1.5zM6 5.25a3 3 0 013-3h6a3 3 0 013 3v13.5a3 3 0 01-3 3H9a3 3 0 01-3-3V5.25z" />
                    </svg>
                    .html
                </div>
                <div class="export-option" onclick="handleExportFile('json')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.5 2.25a3 3 0 00-3 3v13.5a3 3 0 003 3h15a3 3 0 003-3V5.25a3 3 0 00-3-3H4.5zM6 7.5a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75V7.5zm0 4.5a.75.75 0 01.75-.75h5.25a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V7.5zm0 4.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75V7.5zm0 4.5a.75.75 0 000-1.5h9a.75.75 0 000 1.5h-9zM7.5 9.75a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75V7.5zm9 4.5a.75.75 0 000-1.5h-9a.75.75 0 000 1.5h9zM7.5 16.5a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-1.5zM6 5.25a3 3 0 013-3h6a3 3 0 013 3v13.5a3 3 0 01-3 3H9a3 3 0 01-3-3V5.25z" />
                    </svg>
                    .json
                </div>
                <div class="export-option" onclick="handleExportFile('pdf')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.625 1.5c0-1.036.84-1.875 1.875-1.875s1.875.84 1.875 1.875-1.036 1.875-1.875 1.875-1.875-.84-1.875-1.875zm14.024-.983a1.5 1.5 0 010 2.966l-5.607-.857a.75.75 0 00-.794.65V15a.75.75 0 00.75.75h2.25a.75.75 0 010 1.5h-2.25a2.25 2.25 0 01-2.25-2.25v-1.9c0-.343.262-.629.599-.643l5.607-.857a1.5 1.5 0 011.277-.428zm-7.012-2.4a.75.75 0 01.743.75v3.75a.75.75 0 01-1.5 0V8.667a3.001 3.001 0 013-3h2.25a.75.75 0 010 1.5H9.75a1.5 1.5 0 00-1.5 1.5z" />
                    </svg>
                    .pdf
                </div>
                <div class="export-option" onclick="handleExportFile('docx')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V3a.75.75 0 01.75-.75h1.5zm-9 0a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V3a.75.75 0 01.75-.75h1.5zm12.75 7.5a.75.75 0 000-1.5h-9a.75.75 0 000 1.5h9zM7.5 9.75a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75V7.5zm9 4.5a.75.75 0 000-1.5h-9a.75.75 0 000 1.5h9zM7.5 16.5a.75.75 0 01.75-.75h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-1.5zM6 5.25a3 3 0 013-3h6a3 3 0 013 3v13.5a3 3 0 01-3 3H9a3 3 0 01-3-3V5.25z" />
                    </svg>
                    .docx
                </div>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleExportFile = (exportType) => {
        const content = quill.getText();

        if (exportType === 'txt') {
            downloadFile(currentFile + '.txt', content, 'text/plain');
        } else if (exportType === 'md') {
            //Basic Markdown conversion (you can improve this)
            const markdownContent = content.replace(/^# (.*$)/gim, '# $1\n').replace(/^## (.*$)/gim, '## $1\n').replace(/^### (.*$)/gim, '### $1\n').replace(/\*\*(.*)\*\*/gim, '**$1**').replace(/\*(.*)\*/gim, '*$1*');
            downloadFile(currentFile + '.md', markdownContent, 'text/markdown');
        } else if (exportType === 'html') {
            const htmlContent = `<!DOCTYPE html><html><head><title>${currentFile}</title></head><body><div id="content">${quill.root.innerHTML}</div></body></html>`;
            downloadFile(currentFile + '.html', htmlContent, 'text/html');
        } else if (exportType === 'json') {
            const jsonContent = JSON.stringify(quill.getContents());
            downloadFile(currentFile + '.json', jsonContent, 'application/json');
        } else if (exportType === 'pdf') {
            exportToPDF(currentFile, quill.getContents())
                .catch(err => console.error("PDF export failed:", err));
        } else if (exportType === 'docx') {
            exportToDOCX(currentFile, quill.getContents())
                .catch(err => console.error("DOCX export failed:", err));
        } else {
            alert('Invalid export type.');
        }
        modal.style.display = "none";
    };

    const deleteFile = () => {
        if (currentFile) {
            let modalContent = `
                <h2>Delete File</h2>
                <p>Are you sure you want to delete ${currentFile}?</p>
                <div class="modal-buttons">
                    <button class="confirm" onclick="handleDeleteFile()">Delete</button>
                    <button class="cancel" onclick="closeModal()">Cancel</button>
                </div>
            `;
            showModal(modalContent);
        } else {
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Warning</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">No file selected to delete.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    window.handleDeleteFile = () => {
        if (currentFile) {
            delete files[currentFile];
            localStorage.setItem('files', JSON.stringify(files));
            currentFile = null;
            quill.setContents([{
                insert: '\n'
            }]); // Clear editor
            loadFiles();
            modal.style.display = "none";
        }
    };

    const downloadFile = (filename, content, contentType) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:' + contentType + ';charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const exportToPDF = async (filename, content) => {
        try {
            // Make sure pdfMake is loaded
            if (typeof window.pdfMake === 'undefined') {
                await loadExternalLibraries();
                // Double check if libraries loaded
                if (typeof window.pdfMake === 'undefined') {
                    throw new Error("Failed to load PDF libraries");
                }
            }

            // Create a more sophisticated document definition
            const docDefinition = {
                info: {
                    title: filename,
                    author: 'Online Notepad',
                    subject: 'Document Export',
                    keywords: 'notepad, document'
                },
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                content: [
                    {
                        text: filename,
                        style: 'header',
                        margin: [0, 0, 0, 20]
                    },
                    {
                        text: quill.getText(),
                        style: 'body'
                    }
                ],
                styles: {
                    header: {
                        fontSize: 22,
                        bold: true,
                        color: '#333333'
                    },
                    body: {
                        fontSize: 12,
                        lineHeight: 1.5,
                        alignment: 'justify'
                    }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };

            // Generate and download the PDF
            window.pdfMake.createPdf(docDefinition).download(filename + '.pdf');
        } catch (error) {
            console.error("PDF export error:", error);
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">PDF Export Failed</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">${error.message || 'Could not generate PDF file.'}</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    const exportToDOCX = async (filename, content) => {
        try {
            // Ensure docx is loaded
            if (typeof window.docx === 'undefined') {
                await loadExternalLibraries();
                
                // Wait a moment for the library to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check again if library loaded
                if (typeof window.docx === 'undefined') {
                    throw new Error("Failed to load DOCX library");
                }
            }

            // Create document
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            text: filename,
                            heading: docx.HeadingLevel.HEADING_1
                        }),
                        new docx.Paragraph({
                            text: quill.getText()
                        })
                    ],
                }],
            });

            // Generate and download
            docx.Packer.toBlob(doc).then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = url;
                a.download = filename + ".docx";
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
        } catch (error) {
            console.error("DOCX export error:", error);
            let modalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Error</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">DOCX export failed: ${error.message}</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(modalContent);
        }
    };

    const loadContent = (fileName) => {
        if (files[fileName]) {
            quill.setContents(files[fileName]);
            currentFile = fileName;

             // Update active state in file list
             document.querySelectorAll('#fileList li').forEach(item => item.classList.remove('active'));
             const activeListItem = Array.from(fileList.children).find(item => item.textContent === fileName);
             if (activeListItem) {
                 activeListItem.classList.add('active');
             }
        }
        updateWordCount();
    };

    const loadFiles = () => {
        fileList.innerHTML = '';
        for (const file in files) {
            const listItem = document.createElement('li');
            listItem.textContent = file;
            listItem.addEventListener('click', () => {
                loadContent(file);
                // Remove 'active' class from all list items
                document.querySelectorAll('#fileList li').forEach(item => item.classList.remove('active'));
                // Add 'active' class to the clicked list item
                listItem.classList.add('active');
            });
            fileList.appendChild(listItem);
        }
    };

    // Custom Link Modal
    const showLinkModal = (quill) => {
        const range = quill.getSelection();
        let link = quill.getText(range);
        
        // Check if selection already has a link format
        const format = quill.getFormat(range);
        if (format.link) {
            link = format.link;
        }
        
        let modalContent = `
            <div class="link-modal">
                <h2 class="modal-title">Insert Link</h2>
                <div class="link-form">
                    <div class="form-group">
                        <label for="linkText">Text to display</label>
                        <input type="text" id="linkText" class="modal-input" value="${link}" />
                    </div>
                    <div class="form-group">
                        <label for="linkUrl">URL</label>
                        <input type="url" id="linkUrl" class="modal-input" value="${format.link || ''}" placeholder="https://example.com" />
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="confirm" onclick="handleInsertLink()">Insert</button>
                    <button class="cancel" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleInsertLink = () => {
        const url = document.getElementById('linkUrl').value;
        const text = document.getElementById('linkText').value;
        
        if (url) {
            const range = quill.getSelection();
            
            if (range && range.length > 0) {
                // If text is selected, replace it with the link
                quill.deleteText(range.index, range.length);
                quill.insertText(range.index, text, {link: url});
            } else if (range) {
                // If no text is selected, insert the link at cursor position
                quill.insertText(range.index, text, {link: url});
            }
            
            modal.style.display = "none";
        } else {
            // Validate URL
            let errorModalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Error</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Please enter a valid URL.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(errorModalContent);
        }
    };

    // Custom Formula Modal
    const showFormulaModal = (quill) => {
        let modalContent = `
            <div class="link-modal">
                <h2 class="modal-title">Insert Formula</h2>
                <div class="link-form">
                    <div class="form-group">
                        <label for="formulaText">LaTeX Formula</label>
                        <input type="text" id="formulaText" class="modal-input" placeholder="e.g., e=mc^2" />
                        <p class="text-sm text-gray-500 mt-2">Enter a LaTeX formula. Example: x^2 + y^2 = z^2</p>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="confirm" onclick="handleInsertFormula()">Insert</button>
                    <button class="cancel" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `;
        showModal(modalContent);
    };

    window.handleInsertFormula = () => {
        const formula = document.getElementById('formulaText').value;
        
        if (formula) {
            const range = quill.getSelection();
            if (range) {
                quill.insertEmbed(range.index, 'formula', formula);
                modal.style.display = "none";
            }
        } else {
            let errorModalContent = `
                <div class="flex flex-col items-center justify-center p-6">
                    <svg class="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Error</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Please enter a formula.</p>
                    <button class="confirm bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onclick="closeModal()">OK</button>
                </div>
            `;
            showModal(errorModalContent);
        }
    };

    // Event Listeners
    newFileBtn.addEventListener('click', createFile);
    openFileBtn.addEventListener('click', openFile);
    saveFileBtn.addEventListener('click', saveFile);
    exportFileBtn.addEventListener('click', exportFile);
    deleteFileBtn.addEventListener('click', deleteFile);
    renameFileBtn.addEventListener('click', renameFile);

    // Add fullscreen functionality
    const editorContainer = document.querySelector('.flex-1.pl-4');
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.id = 'fullscreenBtn';
    fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"/></svg>';
    fullscreenBtn.title = 'Toggle Fullscreen';
    
    // Insert the fullscreen button before the export button
    document.querySelector('#toolbar').appendChild(fullscreenBtn);
    
    let isFullscreen = false;
    
    fullscreenBtn.addEventListener('click', () => {
        isFullscreen = !isFullscreen;
        
        if (isFullscreen) {
            // Enter fullscreen
            editorContainer.classList.add('editor-fullscreen');
            fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/></svg>';
        } else {
            // Exit fullscreen
            editorContainer.classList.remove('editor-fullscreen');
            fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"/></svg>';
        }
    });
    
    // Allow escape key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFullscreen) {
            isFullscreen = false;
            editorContainer.classList.remove('editor-fullscreen');
            fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"/></svg>';
        }
    });

    // Initial Load
    loadFiles();
});
