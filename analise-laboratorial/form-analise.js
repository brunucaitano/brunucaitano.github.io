async function gerarPDF() {
  if (window.formState.isProcessing) return;

  const dados = window.coletarDadosFormulario();

  if (window.existeCampoObrigatorioVazio(dados))
    return alert(window.formConfig.alerts.requiredFields);

  if (window.obterArquivos().length === 0)
    return alert(window.formConfig.alerts.noImages);

  if (window.assinaturaVazia())
    return alert(window.formConfig.alerts.noSignature);

  window.iniciarEnvio();

  try {
    const assinatura = await window.capturarAssinaturaComFundoBranco();

    const doc = new window.jspdf.jsPDF("p", "mm", "a4");

    const largura = doc.internal.pageSize.getWidth();

    const altura = doc.internal.pageSize.getHeight();

    const margemTopo = 20;

    const margemBase = 25;

    const areaUtilAltura = altura - margemBase;

    const rodapeAltura = 17;

    const tamanhoTimbrado = 45;

    let pagesWithFooter = new Set();

    let y = margemTopo;

    function adicionarCabecalho() {
      const dataAtual = new Date().toLocaleString();

      doc.setFontSize(9);

      doc.setTextColor("#000000");

      doc.text(dataAtual, largura - 10, 15, { align: "right" });
    }

    function adicionarRodape() {
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

      if (pagesWithFooter.has(currentPage)) return;

      doc.setFillColor("#8D8E9C");

      doc.rect(0, altura - rodapeAltura, largura, rodapeAltura, "F");

      doc.setTextColor("#FFFFFF");

      doc.setFontSize(9);

      doc.text(
        "Distrito Industrial de Luziânia, S/N Lote Área 32 Bloco Módulo 03 - Luziânia-GO | Cep: 72.832-000",
        largura / 2,
        altura - rodapeAltura + 6,
        { align: "center" },
      );

      doc.text(
        "www.reflow.eco | @reflow.eco",
        largura / 2,
        altura - rodapeAltura + 12,
        { align: "center" },
      );

      pagesWithFooter.add(currentPage);
    }

    function novaPagina() {
      adicionarRodape();

      doc.addPage();

      adicionarCabecalho();

      y = margemTopo;
    }

    adicionarCabecalho();

    const timbrado = await window.carregarImagemComFundoBranco(
      "../images/timbrado.webp",
    );

    doc.addImage(timbrado, "WEBP", 4, 0, tamanhoTimbrado, tamanhoTimbrado);

    doc.setFontSize(16);

    doc.setTextColor("#000000");

    doc.text(
      "Relatório da Análise Laboratorial",
      largura / 2,
      y + tamanhoTimbrado / 2,
      { align: "center", baseline: "middle" },
    );

    y += tamanhoTimbrado + 10;

    doc.setFontSize(11);

    doc.autoTable({
      startY: y,

      body: window.montarLinhasPerguntasPdf(dados),

      theme: "grid",

      styles: { valign: "middle", fontSize: 10 },

      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 25 },
        3: { cellWidth: "auto" },
      },

      margin: { left: 10, right: 10 },

      didDrawPage: adicionarRodape,
    });

    y = doc.lastAutoTable.finalY + 10;

    if (y + 70 > areaUtilAltura) novaPagina();

    const observacao = window.formConfig.observationQuestion;

    doc.text(`${observacao.number}. ${observacao.label}`, largura / 2, y, {
      align: "center",
    });

    y += 8;

    const obsAltura = 40;

    doc.rect(20, y, largura - 40, obsAltura);

    const textoObservacao = dados[observacao.name] || "";

    const obs = doc.splitTextToSize(textoObservacao, largura - 50);

    doc.text(obs, largura / 2, y + 5, { align: "center" });

    y += obsAltura + 15;

    if (y + 70 > areaUtilAltura) novaPagina();

    doc.text(
      `${window.formConfig.imagesBlockNumber}. Anexar imagens da perícia:`,
      largura / 2,
      y,
      { align: "center" },
    );

    y += 10;

    const imagensPorLinha = 3;
    const tamanhoImagem = 50;
    const espaco = 10;

    const alturaTextoPergunta = 12;
    const padding = 2;

    const larguraGrupoImagens =
      tamanhoImagem * imagensPorLinha + espaco * (imagensPorLinha - 1);
    const margemEsquerdaImagens = (largura - larguraGrupoImagens) / 2;

    let xImg = margemEsquerdaImagens;
    let contador = 0;

    const arquivosComId = window.obterArquivos();

    for (let i = 0; i < arquivosComId.length; i++) {
      const [id, file] = arquivosComId[i];

      if (contador === imagensPorLinha) {
        contador = 0;
        xImg = margemEsquerdaImagens;
        y += tamanhoImagem + alturaTextoPergunta + 10;
      }

      if (y + tamanhoImagem + alturaTextoPergunta > areaUtilAltura) {
        novaPagina();
        xImg = margemEsquerdaImagens;
        contador = 0;
      }

      const questionText =
        (window.imageQuestions && window.imageQuestions[id]) || "";
      const letter = String.fromCharCode(65 + i);
      doc.setFontSize(9);
      doc.text(`${letter}. ${questionText}`, xImg, y, {
        maxWidth: tamanhoImagem,
      });

      const yDaImagem = y + alturaTextoPergunta;
      const imgData = await window.fileToDataURL(file);

      doc.addImage(
        imgData,
        "WEBP",
        xImg + padding,
        yDaImagem + padding,
        tamanhoImagem - padding * 2,
        tamanhoImagem - padding * 2,
      );

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(xImg, yDaImagem, tamanhoImagem, tamanhoImagem, "S");

      xImg += tamanhoImagem + espaco;

      contador++;
    }

    if (arquivosComId.length > 0) {
      y += alturaTextoPergunta + tamanhoImagem;
    }
    y += 15;

    if (y + 50 > areaUtilAltura) novaPagina();

    doc.text(
      `${window.formConfig.signatureBlockNumber}. Assinatura do técnico:`,
      largura / 2,
      y,
      { align: "center" },
    );
    y += 8;

    const larguraAssinatura = 60;
    doc.addImage(
      assinatura,
      "WEBP",
      (largura - larguraAssinatura) / 2,
      y,
      larguraAssinatura,
      25,
    );

    y += 35;

    doc.setFontSize(12);

    doc.text(dados.responsavel || "", largura / 2, y, { align: "center" });

    y += 8;

    doc.text(dados.documento || "", largura / 2, y, { align: "center" });

    adicionarRodape();

    window.anexarPdfNoFormulario(doc, dados);
  } catch (e) {
    alert("Erro ao gerar PDF: " + e.message);

    window.finalizarEnvioComErro();
  }
}

window.gerarPDF = gerarPDF;
