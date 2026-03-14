window.FORM_QUESTIONS = [
  {
    name: "responsavel",
    label: "Responsável pela análise?",
    type: "text",
    placeholder: "Digite o nome completo",
    required: true,
  },
  {
    name: "documento",
    label: "Documento do técnico?",
    type: "text",
    placeholder: "Digite seu CPF",
    required: true,
  },
  {
    name: "amostras",
    label: "Quantas amostras?",
    type: "text",
    placeholder: "Digite o número de amostras",
    required: true,
    numericOnly: true,
  },
  {
    name: "resultado",
    label: "Resultado da análise?",
    type: "text",
    placeholder: "(Umidade/Densidade)",
    required: true,
  },
  {
    name: "observacao",
    label: "Observação do técnico:",
    type: "textarea",
    placeholder: "Digite qualquer observação...",
    required: true,
    includeInPdfTable: false,
  },
];
