const { jsPDF } = window.jspdf;

const botao = document.querySelector(".btn-submit");

if (!botao.querySelector("span")) {
    const span = document.createElement("span");
    span.textContent = botao.textContent.trim();
    botao.textContent = "";
    botao.appendChild(span);
}
const botaoTexto = botao.querySelector("span");

let processando = false;

botao.addEventListener("click", gerarPDF);

const iframe = document.querySelector('iframe[name="invisible_iframe"]');
iframe.onload = function() {
    if (processando) {
        botao.classList.remove("loading");
        botao.classList.add("success");
        botaoTexto.textContent = "Sucesso!";

        limparFormulario();

        setTimeout(() => {
            botao.classList.remove("success");
            botaoTexto.textContent = "Enviar documento";
            processando = false;
        }, 3000);
    }
};

async function gerarPDF() {
    if (processando) return;

    const form = document.getElementById("form");
    const dados = {};
    const inputsText = form.querySelectorAll("input[type='text'], textarea, select");
    inputsText.forEach(input => {
        dados[input.name] = input.value.trim();
    });

    if (!dados.motorista) return alert("Informe o nome do motorista.");
    if (!dados.placa) return alert("Informe a placa do veículo.");
    if (!dados.relato || dados.relato.length < 10) return alert("O relato deve conter pelo menos 10 caracteres.");
    if (!arquivos || arquivos.length === 0) return alert("Adicione pelo menos uma imagem.");
    if (assinaturaVazia()) return alert("Por favor, assine o documento.");

    processando = true;
    botao.classList.add("loading");

    try {
        const doc = new jsPDF("p", "mm", "a4");
        const largura = doc.internal.pageSize.getWidth();
        const altura = doc.internal.pageSize.getHeight();
        let y = 15;

        doc.setFontSize(9);
        doc.text(new Date().toLocaleString(), 10, y);
        y += 5;

        const logo = await carregarImagemComFundoBranco("logo.webp");
        const tamanhoLogo = 30;
        doc.addImage(logo, "WEBP", 10, y, tamanhoLogo, tamanhoLogo);

        doc.setFontSize(16);
        doc.text("Check List Veicular Diário", largura / 2, y + tamanhoLogo / 2, { align: "center", baseline: "middle" });
        y += tamanhoLogo + 10;

        doc.setFontSize(11);
        const perguntas = [
            { num: 1, label: "Nome do motorista?", value: dados.motorista },
            { num: 2, label: "Qual a placa do veículo?", value: dados.placa },
            { num: 3, label: "Quantos KM rodados?", value: dados.km_rodados },
            { num: 4, label: "Pneus estão calibrados?", value: dados.pneus_calibrados },
            { num: 5, label: "Pneus apresentam cortes, bolhas ou desgaste excessivo?", value: dados.pneus_danificados },
            { num: 6, label: "Estepe está em boas condições?", value: dados.estepe_condicoes },
            { num: 7, label: "Faróis estão funcionando?", value: dados.farol_funcionando },
            { num: 8, label: "Lanternas traseiras funcionando?", value: dados.lanternas_traseras },
            { num: 9, label: "Luz de freio funcionando?", value: dados.luz_freio },
            { num: 10, label: "Setas funcionando?", value: dados.setas_funcionando },
            { num: 11, label: "Luz de ré funcionando?", value: dados.luz_re },
            { num: 12, label: "Vidros e retrovisores estão limpos?", value: dados.vidros_limpos },
            { num: 13, label: "Há vazamento de óleo ou água no chão?", value: dados.vazamento },
            { num: 14, label: "Nível do óleo do motor está correto?", value: dados.nivel_oleo },
            { num: 15, label: "Nível da água do radiador está correto?", value: dados.nivel_agua },
            { num: 16, label: "Nível do fluido de freio está correto?", value: dados.nivel_freio },
            { num: 17, label: "Nível do fluido de direção está correto?", value: dados.nivel_direcao },
            { num: 18, label: "Nível do limpador de para-brisa está correto?", value: dados.nivel_limpador },
            { num: 19, label: "Bateria tem sinais de corrosão?", value: dados.bateria_corrosao },
            { num: 20, label: "Motor funcionando sem ruídos?", value: dados.motor_ruidos },
            { num: 21, label: "Freio estão funcionando?", value: dados.freio_funcionando },
            { num: 22, label: "Freio de mão funcionando?", value: dados.freio_mao },
            { num: 23, label: "Embreagem está funcionado?", value: dados.embreagem_funcionando },
            { num: 24, label: "Direção está com folga?", value: dados.direcao_folga },
            { num: 25, label: "Painel sem luz de alerta acesa?", value: dados.painel_alerta },
            { num: 26, label: "Cinto de segurança está funcionando?", value: dados.cinto_funcionando },
            { num: 27, label: "Buzina está funcionando?", value: dados.buzina_funcionando },
            { num: 28, label: "Limpador de para-brisa está normal?", value: dados.limpador_normal },
            { num: 29, label: "Documento do veículo está em dia?", value: dados.documento_dia },
            { num: 30, label: "CNH está válida?", value: dados.cnh_valida },
            { num: 32, label: "CIP/CIPP está válida?", value: dados.cip_valida },
            { num: 33, label: "Triângulo de segurança está presente?", value: dados.triangulo_presente },
            { num: 34, label: "Macaco automotivo está presente?", value: dados.macaco_presente },
            { num: 35, label: "Chave de roda está presente?", value: dados.chave_roda },
            { num: 36, label: "Extintor veicular está presente?", value: dados.extintor_presente }
        ];

        for (let i = 0; i < perguntas.length; i += 2) {
            let p1 = perguntas[i];
            let p2 = perguntas[i + 1];
            if (y + 10 > altura - 30) { doc.addPage(); y = 20; }
            doc.text(`${p1.num}. ${p1.label} ${p1.value || ''}`, 10, y);
            if (p2) doc.text(`${p2.num}. ${p2.label} ${p2.value || ''}`, largura - 10, y, { align: "right" });
            y += 7;
        }

        if (y + 20 > altura - 30) { doc.addPage(); y = 20; }
        doc.text(`37. Observação do motorista:`, 10, y);
        const obs = doc.splitTextToSize(dados.relato || '', largura / 2 - 15);
        doc.text(obs, largura / 2 + 5, y);
        y += obs.length * 6 + 10;

        if (y + 10 > altura - 30) { doc.addPage(); y = 20; }
        doc.text("38. Anexar imagens do veículo:", largura / 2, y, { align: "center" });
        y += 5;

        const tamanhoImagem = 50;
        let x = 10;
        let linha = 0;

        for (let file of arquivos) {
            if (linha === 3) { linha = 0; x = 10; y += tamanhoImagem + 5; }
            if (y + tamanhoImagem > altura - 30) { doc.addPage(); y = 20; x = 10; linha = 0; }
            const imgData = await fileToDataURL(file);
            doc.addImage(imgData, "WEBP", x, y, tamanhoImagem, tamanhoImagem);
            x += tamanhoImagem + 5;
            linha++;
        }
        y += tamanhoImagem + 10;

        if (y + 30 > altura - 30) { doc.addPage(); y = 20; }

        doc.text("39. Assinatura do motorista:", 10, y);
        const assinatura = await capturarAssinaturaComFundoBranco();
        const larguraAss = 60;
        doc.addImage(assinatura, "WEBP", largura - larguraAss - 10, y, larguraAss, 25);
        y += 30;

        doc.setFontSize(9);
        doc.text("Nome da Empresa / CNPJ", largura - 10, altura - 10, { align: "right" });

        const blob = doc.output("blob");
        const file = new File([blob], "checklist.pdf", { type: "application/pdf" });

        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById("pdfInput").files = dt.files;
        document.getElementById("pdfForm").submit();

    } catch (e) {
        alert("Erro ao gerar PDF: " + e.message);
        botao.classList.remove("loading");
        processando = false;
    }
}

function limparFormulario() {
    const form = document.getElementById("form");
    form.reset();
    arquivos = [];
    document.getElementById("preview").innerHTML = "";
    limparAssinatura();
}

function assinaturaVazia() {
    const canvas = document.getElementById("signatureCanvas");
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) return false;
    }
    return true;
}

function fileToDataURL(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function carregarImagemComFundoBranco(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/webp"));
        };
    });
}

function capturarAssinaturaComFundoBranco() {
    return new Promise(resolve => {
        const assinaturaCanvas = document.getElementById("signatureCanvas");
        const canvas = document.createElement("canvas");
        canvas.width = assinaturaCanvas.width;
        canvas.height = assinaturaCanvas.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(assinaturaCanvas, 0, 0);
        resolve(canvas.toDataURL("image/webp"));
    });
}