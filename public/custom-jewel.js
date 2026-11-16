'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const form = byId('customJewelForm');
  const fields = byId('customFields');
  const tone = byId('customTone');
  const stone = byId('customStone');
  const idea = byId('customIdea');
  const figure = document.querySelector('.custom-figure');
  const review = byId('customQuoteReview');
  const contact = byId('customWhatsApp');
  const baseContact = byId('camicatContactWhatsApp').getAttribute('href');
  const reference = byId('customReference');
  const measure = byId('customMeasure');
  const measureField = byId('customMeasureField');
  const step = byId('customStepLabel');
  const peek = byId('customPeek');
  const stage = byId('customStage');
  const messageDetails = byId('customQuoteText').parentElement;
  const summary = byId('customQuoteSummary');
  const previewReturn = byId('customPreviewReturn');
  peek.addEventListener('click', () => {
    previewReturn.hidden = false;
    stage.focus({preventScroll:true});
    stage.scrollIntoView({block:'start',behavior:'instant'});
  });
  previewReturn.addEventListener('click', () => {
    peek.focus({preventScroll:true});
    peek.scrollIntoView({block:'center',behavior:'instant'});
    previewReturn.hidden = true;
  });
  const measurements = {
    earring: ['Largo del aro', 'Ej.: 3 cm'],
    necklace: ['Largo del collar', 'Ej.: 45 cm'],
    bracelet: ['Contorno de muñeca', 'Ej.: 16 cm'],
    ring: ['Talla del anillo', 'Ej.: talla 14'],
  };
  let previousPiece = null;

  const pieces = new Map([
    ['earring', 'Aros'], ['necklace', 'Collar'], ['bracelet', 'Pulsera'], ['ring', 'Anillo'],
    ['guide', 'Por definir, necesito orientación']
  ]);
  const piece = () => form.querySelector('input[name="customPiece"]:checked')?.value;
  const optionText = select => select.selectedOptions[0]?.textContent.trim();
  function refresh() {
    figure.dataset.piece = pieces.has(piece()) ? piece() : 'guide';
    figure.dataset.tone = tone.value;
    figure.dataset.stone = stone.value;
    const chosen = measurements[piece()];
    byId('customSketchName').textContent = chosen ? pieces.get(piece()) : 'Aros de alambre';
    peek.disabled = !chosen;
    const details = [tone.value === 'guide' ? '' : optionText(tone), stone.value === 'guide' ? '' : optionText(stone)].filter(Boolean);
    byId('customSketchDetails').textContent = chosen ? (details.join(' · ') || 'Puedes elegir el alambre y una piedra') : 'Ejemplo de diseño · elige una pieza para empezar';
    if (previousPiece !== piece()) {
      previousPiece = piece();
      measure.value = '';
      const config = measurements[piece()];
      measureField.hidden = !config;
      measure.disabled = !config;
      if (config) {
        byId('customMeasureTitle').textContent = config[0];
        measure.placeholder = config[1];
      }
    }
  }

  function showForm() {
    review.hidden = true;
    previewReturn.hidden = true;
    form.hidden = false;
    step.textContent = 'Paso 1 de 2 · Diseña';
    contact.removeAttribute('href');
  }

  byId('customEditQuote').addEventListener('click', () => {
    showForm();
    form.querySelector('input[name="customPiece"]:checked')?.focus();
  });

  form.addEventListener('change', refresh);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity() || !pieces.has(piece())) return;
    const note = idea.value.trim().replace(/\s+/gu, ' ').slice(0, 400);
    const rows = [['Pieza', pieces.get(piece())], ['Tono del alambre', optionText(tone)], ['Piedra', optionText(stone)]];
    const size = measure.disabled ? '' : measure.value.trim().replace(/\s+/gu, ' ').slice(0, 55);
    if (size) rows.push([measurements[piece()][0], size]);
    if (note) rows.push(['Mi idea', note]);
    const lines = ['Hola, Camicat. Quiero cotizar una joya personalizada.', '', ...rows.map(([label, value]) => label + ': ' + value)];
    if (reference.checked) lines.push('Tengo una foto de referencia y se las puedo enviar por aquí.');
    lines.push('', '¿Me pueden confirmar los materiales disponibles, el precio y el plazo? Gracias.');
    const message = lines.join('\n');
    const url = new URL(baseContact);
    url.searchParams.set('text', message);
    byId('customQuoteText').textContent = message;
    summary.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      return row;
    }));
    messageDetails.open = false;
    previewReturn.hidden = true;
    contact.href = url.href;
    form.hidden = true;
    review.hidden = false;
    step.textContent = 'Paso 2 de 2 · Revisa';
    byId('customQuoteTitle').focus();
  });
  refresh();
  fields.disabled = false;
})();
