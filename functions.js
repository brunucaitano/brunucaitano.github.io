const inputImagens = document.getElementById("imagens");
const preview = document.getElementById("preview");

let arquivos = [];

inputImagens.addEventListener("change", async function () {
    const files = Array.from(this.files);
    arquivos = [];

    for (let file of files) {
        const webpFile = await converterParaWebP(file);
        arquivos.push(webpFile);
    }

    atualizarInputFiles();
    atualizarPreview();
});

function atualizarPreview() {
    preview.innerHTML = "";

    arquivos.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const div = document.createElement("div");
            div.classList.add("preview-item");

            div.innerHTML = `
                <img src="${e.target.result}">
                <button class="remove-btn" onclick="removerImagem(${index})">×</button>
            `;

            preview.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
}

function removerImagem(index) {
    arquivos.splice(index, 1);
    atualizarInputFiles();
    atualizarPreview();
}

function removerTodas() {
    arquivos = [];
    atualizarInputFiles();
    atualizarPreview();
}

function atualizarInputFiles() {
    const dataTransfer = new DataTransfer();
    arquivos.forEach(file => dataTransfer.items.add(file));
    inputImagens.files = dataTransfer.files;
}

function converterParaWebP(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function (e) {
            img.src = e.target.result;
        };

        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const maxWidth = 1200;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
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

const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");

let desenhando = false;

function ajustarCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.scale(ratio, ratio);
}

ajustarCanvas();
window.addEventListener("resize", ajustarCanvas);

function getPosicao(event) {
    const rect = canvas.getBoundingClientRect();

    if (event.touches) {
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
        };
    } else {
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
}

function iniciar(event) {
    desenhando = true;
    desenhar(event);
}

function desenhar(event) {
    if (!desenhando) return;

    event.preventDefault();

    const pos = getPosicao(event);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function parar() {
    desenhando = false;
    ctx.beginPath();
}

function limparAssinatura() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

canvas.addEventListener("mousedown", iniciar);
canvas.addEventListener("mousemove", desenhar);
canvas.addEventListener("mouseup", parar);
canvas.addEventListener("mouseleave", parar);

canvas.addEventListener("touchstart", iniciar);
canvas.addEventListener("touchmove", desenhar);
canvas.addEventListener("touchend", parar);