window.addEventListener("pageshow", event => {
    if (event.persisted) window.location.reload();
});
const FORM_COLUMNS = 2;
const PDF_TABLE_COLUMNS = 3;
const ALERT_REQUIRED_FIELDS = "Por favor, responda todas as perguntas antes de enviar o formulário.";
const ALERT_NO_IMAGES = "Adicione pelo menos uma imagem.";
const ALERT_NO_SIGNATURE = "Por favor, assine o documento.";
const baseQuestions = Array.isArray(window.FORM_QUESTIONS) ? window.FORM_QUESTIONS : [];
const formQuestions = baseQuestions.map((question, index) => ({
    ...question,
    number: index + 1
}));

const pdfQuestions = formQuestions.filter(question => question.includeInPdfTable !== false);
const observationQuestion = formQuestions.find(question => question.name === "relato")
    || formQuestions.find(question => question.type === "textarea")
    || { name: "relato", label: "Observação do motorista:", number: formQuestions.length + 1 };
const requiredFieldNames = formQuestions
    .filter(question => question.required !== false)
    .map(question => question.name);
const imagesBlockNumber = formQuestions.length + 1;
const signatureBlockNumber = formQuestions.length + 2;
const submitButton = document.querySelector(".btn-submit-checklist");
const submitButtonText = ensureButtonSpan(submitButton);
const iframe = document.querySelector('iframe[name="invisible_iframe-checklist"]');

const formState = {
    isProcessing: false
};
window.formState = formState;
window.formConfig = {
    formQuestions,
    pdfQuestions,
    observationQuestion,
    requiredFieldNames,
    imagesBlockNumber,
    signatureBlockNumber,
    pdfTableColumns: PDF_TABLE_COLUMNS,
    alerts: {
        requiredFields: ALERT_REQUIRED_FIELDS,
        noImages: ALERT_NO_IMAGES,
        noSignature: ALERT_NO_SIGNATURE
    }
};

renderFormQuestions();
updateFixedLabels();
setupSubmitActions();
 
let arquivos = {};
window.imageQuestions = {};
 
const imageQuestionIds = [
    'img_frente-checklist', 'img_traseira-checklist', 'img_lat_direita-checklist', 'img_lat_esquerda-checklist',
    'img_pneus-checklist', 'img_farois_frente-checklist', 'img_velocimetro-checklist', 'img_farois_traseiros-checklist',
    'img_bagageiro-checklist', 'img_itens-checklist', 'img_lanterna_direita-checklist', 'img_lanterna_esquerda-checklist'
];
 
function setupImageInputs() {
    imageQuestionIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const label = input.previousElementSibling;
            if (label) {
                window.imageQuestions[id] = label.textContent.replace(/^[A-Z]\.\s*/, '').trim();
            }
            input.addEventListener("change", async event => {
                const file = (event.target.files || [])[0];
                if (file) {
                    arquivos[id] = await converterParaWebP(file);
                } else {
                    delete arquivos[id];
                }
                updatePreview(id);
            });
        }
    });
}
 
setupImageInputs();

const canvas = document.getElementById("signatureCanvas-checklist");
const ctx = canvas ? canvas.getContext("2d") : null;
let desenhando = false;

if (canvas && ctx) {
    ajustarCanvas();
    window.addEventListener("resize", ajustarCanvas);
    setupSignatureEvents();
}

function ensureButtonSpan(button) {
    if (!button) return null;

    let span = button.querySelector("span");
    if (span) return span;

    span = document.createElement("span");
    span.textContent = button.textContent.trim();
    button.textContent = "";
    button.appendChild(span);
    return span;
}

function setupSubmitActions() {
    if (submitButton) {
        submitButton.addEventListener("click", () => {
            if (typeof window.gerarPDF === "function") {
                window.gerarPDF();
            }
        });
    }
    if (iframe) {
        iframe.onload = function () {
            if (!formState.isProcessing) return;
            if (submitButton) {
                submitButton.classList.remove("loading");
                submitButton.classList.add("success");
            }
            if (submitButtonText) submitButtonText.textContent = "Enviado";
            limparFormulario();
            setTimeout(() => {
                if (submitButton) {
                    submitButton.classList.remove("success");
                    submitButton.disabled = false;
                }
                if (submitButtonText) submitButtonText.textContent = "Enviar documento";
                formState.isProcessing = false;

                const btnClearSignature = document.getElementById("btnClearSignature-checklist");
                if (canvas) {
                    canvas.style.pointerEvents = "auto";
                    canvas.style.opacity = "1";
                }
                if (btnClearSignature) {
                    btnClearSignature.disabled = false;
                    btnClearSignature.classList.remove("loading");
                    btnClearSignature.style.display = "";
                }
            }, 3000);
        };
    }
}
function renderFormQuestions() {
    const container = document.getElementById("camposFormulario-checklist");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < formQuestions.length; i += FORM_COLUMNS) {
        const row = document.createElement("div");
        row.className = "form-row-checklist";
        for (let column = 0; column < FORM_COLUMNS; column++) {
            const question = formQuestions[i + column];
            if (!question) continue;
            row.appendChild(createQuestionColumn(question));
        }
        container.appendChild(row);
    }
}
function createQuestionColumn(question) {
    const col = document.createElement("div");
    col.className = "form-col-checklist";
    const label = document.createElement("label");
    label.textContent = `${question.number}. ${question.label}`;
    col.appendChild(label);
    col.appendChild(createQuestionField(question));
    return col;
}
function createQuestionField(question) {
    if (question.type === "select") {
        return createSelectField(question);
    }

    if (question.type === "textarea") {
        return createTextareaField(question);
    }
    return createTextField(question);
}
function createSelectField(question) {
    const select = document.createElement("select");
    select.name = question.name;
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = question.placeholder || "Selecione";
    select.appendChild(emptyOption);
    const options = Array.isArray(question.options) ? question.options : [];
    options.forEach(optionData => {
        const option = document.createElement("option");
        option.value = typeof optionData === "string" ? optionData : optionData.value;
        option.textContent = typeof optionData === "string" ? optionData : optionData.text;
        select.appendChild(option);
    });
    return select;
}

function handleCpfInput(event) {
    let value = event.target.value;
    value = value.replace(/\D/g, "");
    value = value.substring(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    event.target.value = value;
}

function createTextField(question) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = question.name;
    input.placeholder = question.placeholder || "";
    if (question.name === 'cpf') {
        input.addEventListener('input', handleCpfInput);
        input.maxLength = 14;
    }
    return input;
}

function createTextareaField(question) {
    const textarea = document.createElement("textarea");
    textarea.name = question.name;
    textarea.placeholder = question.placeholder || "";
    return textarea;
}

function updateFixedLabels() {
    const imageLabel = document.getElementById("labelImagens-checklist");
    const signatureLabel = document.getElementById("labelAssinatura-checklist");

    if (imageLabel) {
        imageLabel.textContent = `${imagesBlockNumber}. Anexar imagens do veículo:`;
    }

    if (signatureLabel) {
        signatureLabel.textContent = `${signatureBlockNumber}. Assinatura do motorista:`;
    }
}

function createPreviewItem(src, inputId) {
    const div = document.createElement("div");
    div.classList.add("preview-item-checklist");

    const img = document.createElement("img");
    img.src = src;

    const button = document.createElement("button");
    button.className = "remove-btn-checklist";
    button.type = "button";
    button.textContent = "×";
    button.onclick = function () {
        removerImagem(inputId);
    };
    div.appendChild(img);
    div.appendChild(button);
    return div;
}

function updatePreview(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const previewContainer = input.nextElementSibling;
    if (!previewContainer) return;

    previewContainer.innerHTML = "";
    const file = arquivos[inputId];
    if (file) {
        const reader = new FileReader();
        reader.onload = event => {
            previewContainer.appendChild(createPreviewItem(event.target.result, inputId));
        };
        reader.readAsDataURL(file);
    }
}

function removerImagem(inputId) {
    delete arquivos[inputId];
    const input = document.getElementById(inputId);
    if (input) {
        input.value = "";
    }
    updatePreview(inputId);
}

function converterParaWebP(file) {
    return new Promise(resolve => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = event => {
            img.src = event.target.result;
        };

        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctxCanvas = canvas.getContext("2d");

            const maxWidth = 1200;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            ctxCanvas.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                blob => {
                    const webpFile = new File(
                        [blob],
                        file.name.replace(/\.\w+$/, ".webp"),
                        { type: "image/webp" }
                    );
                    resolve(webpFile);
                },
                "image/webp",
                0.7
            );
        };
        reader.readAsDataURL(file);
    });
}
function setupSignatureEvents() {
    canvas.addEventListener("mousedown", iniciar);
    canvas.addEventListener("mousemove", desenhar);
    canvas.addEventListener("mouseup", parar);
    canvas.addEventListener("mouseleave", parar);
    canvas.addEventListener("touchstart", iniciar);
    canvas.addEventListener("touchmove", desenhar);
    canvas.addEventListener("touchend", parar);
}

function ajustarCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
}

function getPosicao(event) {
    const rect = canvas.getBoundingClientRect();
    const ponto = event.touches ? event.touches[0] : event;

    return {
        x: ponto.clientX - rect.left,
        y: ponto.clientY - rect.top
    };
}

function iniciar(event) {
    desenhando = true;
    desenhar(event);
}

function desenhar(event) {
    if (!desenhando) return;

    event.preventDefault();
    const posicao = getPosicao(event);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(posicao.x, posicao.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(posicao.x, posicao.y);
}

function parar() {
    desenhando = false;
    ctx.beginPath();
}

function limparAssinatura() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function assinaturaVazia() {
    if (!canvas || !ctx) return true;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}

function limparFormulario() {
    const form = document.getElementById("form-checklist");
    if (form) form.reset();

    arquivos = {};
    imageQuestionIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const previewContainer = input.nextElementSibling;
            if (previewContainer) previewContainer.innerHTML = "";
        }
    });
    limparAssinatura();
}

function coletarDadosFormulario() {
    const form = document.getElementById("form-checklist");
    const dados = {};
    if (!form) return dados;

    const campos = form.querySelectorAll("input[name], textarea[name], select[name]");
    campos.forEach(campo => {
        dados[campo.name] = campo.value.trim();
    });

    return dados;
}

function existeCampoObrigatorioVazio(dados) {
    return requiredFieldNames.some(name => !dados[name] || dados[name].length === 0);
}

function montarLinhasPerguntasPdf(dados) {
    const rows = [];
    const gray = "#8D8E9C";
    const white = "#FFFFFF";
    const black = "#000000";

    for (let i = 0; i < pdfQuestions.length; i += 2) {
        const question1 = pdfQuestions[i];
        const question2 = pdfQuestions[i + 1];
        const row = [];

        [question1, question2].forEach(question => {
            if (!question) {
                row.push({ content: '', colSpan: 3, styles: {} });
                return;
            }

            if (question.type === 'select') {
                const answer = dados[question.name];
                row.push({ content: `${question.number}. ${question.label}`, styles: { valign: 'middle', halign: 'left' } });
                row.push({ content: 'Sim', styles: { halign: 'center', valign: 'middle', fillColor: answer === 'sim' ? gray : white, textColor: answer === 'sim' ? white : black } });
                row.push({ content: 'Não', styles: { halign: 'center', valign: 'middle', fillColor: answer === 'nao' ? gray : white, textColor: answer === 'nao' ? white : black } });
            } else {
                row.push({ content: `${question.number}. ${question.label}`, styles: { valign: 'middle', halign: 'left' } });
                row.push({ content: dados[question.name] || "", colSpan: 2, styles: { valign: 'middle', halign: 'left' } });
            }
        });

        rows.push(row);
    }

    return rows;
}

function iniciarEnvio() {
    formState.isProcessing = true;
    if (submitButton) {
        submitButton.classList.add("loading");
        submitButton.disabled = true;
    }

    const btnClearSignature = document.getElementById("btnClearSignature-checklist");
    if (canvas) {
        canvas.style.pointerEvents = "none";
        canvas.style.opacity = "0.5";
    }
    if (btnClearSignature) {
        ensureButtonSpan(btnClearSignature);
        btnClearSignature.disabled = true;
        btnClearSignature.classList.add("loading");
        btnClearSignature.style.display = "none";
    }
}

function finalizarEnvioComErro() {
    formState.isProcessing = false;
    if (submitButton) {
        submitButton.classList.remove("loading");
        submitButton.disabled = false;
    }

    const btnClearSignature = document.getElementById("btnClearSignature-checklist");
    if (canvas) {
        canvas.style.pointerEvents = "auto";
        canvas.style.opacity = "1";
    }
    if (btnClearSignature) {
        btnClearSignature.disabled = false;
        btnClearSignature.classList.remove("loading");
        btnClearSignature.style.display = "";
    }
}

function obterArquivos() {
    return Object.entries(arquivos);
}

function fileToDataURL(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.readAsDataURL(file);
    });
}

function carregarImagemComFundoBranco(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = `${src}?t=${Date.now()}`;
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctxCanvas = canvas.getContext("2d");
            ctxCanvas.fillStyle = "#FFFFFF";
            ctxCanvas.fillRect(0, 0, canvas.width, canvas.height);
            ctxCanvas.drawImage(img, 0, 0);

            resolve(canvas.toDataURL("image/webp"));
        };
    });
}

function capturarAssinaturaComFundoBranco() {
    return new Promise(resolve => {
        if (!canvas) {
            resolve("");
            return;
        }

        const assinaturaCanvas = document.createElement("canvas");
        assinaturaCanvas.width = canvas.width;
        assinaturaCanvas.height = canvas.height;

        const ctxCanvas = assinaturaCanvas.getContext("2d");
        ctxCanvas.fillStyle = "#FFFFFF";
        ctxCanvas.fillRect(0, 0, assinaturaCanvas.width, assinaturaCanvas.height);
        ctxCanvas.drawImage(canvas, 0, 0);
        resolve(assinaturaCanvas.toDataURL("image/webp"));
    });
}

function anexarPdfNoFormulario(doc, dados) {
    const blob = doc.output("blob");
    const nomeMotorista = (dados.motorista || "sem_motorista").replace(/\s+/g, "_");
    const placa = (dados.placa || "sem_placa").replace(/\s+/g, "_");
    const fileName = `checklist_${nomeMotorista}_${placa}.pdf`;

    const file = new File([blob], fileName, { type: "application/pdf" });
    const dt = new DataTransfer();
    dt.items.add(file);

    const pdfInput = document.getElementById("pdfInput-checklist");
    const pdfForm = document.getElementById("pdfForm-checklist");

    if (!pdfForm) return;

    if (pdfInput) pdfInput.files = dt.files;
    pdfForm.submit();
}

window.removerImagem = removerImagem;
window.limparAssinatura = limparAssinatura;
window.assinaturaVazia = assinaturaVazia;

window.coletarDadosFormulario = coletarDadosFormulario;
window.existeCampoObrigatorioVazio = existeCampoObrigatorioVazio;
window.montarLinhasPerguntasPdf = montarLinhasPerguntasPdf;
window.obterArquivos = obterArquivos;
window.iniciarEnvio = iniciarEnvio;
window.finalizarEnvioComErro = finalizarEnvioComErro;

window.fileToDataURL = fileToDataURL;
window.carregarImagemComFundoBranco = carregarImagemComFundoBranco;
window.capturarAssinaturaComFundoBranco = capturarAssinaturaComFundoBranco;
window.anexarPdfNoFormulario = anexarPdfNoFormulario;
