const API_BASE = 'http://localhost:5000';

let variantsContainer;
let btnAddVariant, btnOpenNomenclatureModal;

let variantModal, variantForm;
let variantModalTitle, variantIdInput, variantDayNumberInput, btnCancelVariant;

let dishModal, dishForm;
let dishModalTitle, dishVariantIdInput;
let dishNameSelect, dishTypeSelect, btnCancelDish;

let nomenclatureModal, nomenclatureForm;
let nomenclatureNameInput, nomenclatureDefaultTypeInput;
let btnCancelNomenclature;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  variantsContainer = document.getElementById('variants-container');

  btnAddVariant = document.getElementById('btn-add-variant');
  btnOpenNomenclatureModal = document.getElementById('btn-open-nomenclature-modal');

  variantModal = document.getElementById('variant-modal');
  variantModalTitle = document.getElementById('variant-modal-title');
  variantForm = document.getElementById('variant-form');
  variantIdInput = document.getElementById('variant-id');
  variantDayNumberInput = document.getElementById('variant-day-number');
  btnCancelVariant = document.getElementById('btn-cancel-variant');

  dishModal = document.getElementById('dish-modal');
  dishModalTitle = document.getElementById('dish-modal-title');
  dishForm = document.getElementById('dish-form');
  dishVariantIdInput = document.getElementById('dish-variant-id');
  dishNameSelect = document.getElementById('dish-name-select');
  dishTypeSelect = document.getElementById('dish-type');
  btnCancelDish = document.getElementById('btn-cancel-dish');

  nomenclatureModal = document.getElementById('nomenclature-modal');
  nomenclatureForm = document.getElementById('nomenclature-form');
  nomenclatureNameInput = document.getElementById('nomenclature-name');
  nomenclatureDefaultTypeInput = document.getElementById('nomenclature-default-type');
  btnCancelNomenclature = document.getElementById('btn-cancel-nomenclature');

  btnAddVariant.addEventListener('click', () => showVariantModal(null));
  btnCancelVariant.addEventListener('click', hideVariantModal);
  variantForm.addEventListener('submit', onVariantFormSubmit);

  btnCancelDish.addEventListener('click', hideDishModal);
  dishForm.addEventListener('submit', onDishFormSubmit);

  btnOpenNomenclatureModal.addEventListener('click', showNomenclatureModal);
  btnCancelNomenclature.addEventListener('click', hideNomenclatureModal);
  nomenclatureForm.addEventListener('submit', onNomenclatureFormSubmit);

  dishNameSelect.addEventListener('change', onDishNameChange);

  await fetchNomenclature();

  fetchVariants();
}

async function fetchNomenclature() {
  try {
    const resp = await fetch(`${API_BASE}/nomenclature`);
    if (!resp.ok) throw new Error('Ошибка при загрузке номенклатуры');
    const data = await resp.json(); 

    dishNameSelect.innerHTML = '<option value="">-- Выберите блюдо --</option>';
    data.forEach(item => {
      const opt = document.createElement('option');
      // в value можно класть имя
      opt.value = item.name;
      opt.textContent = item.name;
      // сохраняем default_type в data-атрибут
      opt.dataset.type = item.default_type;
      dishNameSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('fetchNomenclature:', err);
  }
}

function onDishNameChange() {
  const selectedOpt = dishNameSelect.selectedOptions[0];
  if (!selectedOpt) return;
  const autoType = selectedOpt.dataset.type;
  if (autoType) {
    dishTypeSelect.value = autoType;
  }
}

function showNomenclatureModal() {
  nomenclatureModal.classList.remove('hidden');
  nomenclatureNameInput.value = '';
  nomenclatureDefaultTypeInput.value = '';
}
function hideNomenclatureModal() {
  nomenclatureModal.classList.add('hidden');
}

async function onNomenclatureFormSubmit(e) {
  e.preventDefault();
  const name = nomenclatureNameInput.value.trim();
  const default_type = nomenclatureDefaultTypeInput.value;
  if (!name || !default_type) return;

  try {
    const resp = await fetch(`${API_BASE}/nomenclature`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, default_type })
    });
    if (!resp.ok) throw new Error('Ошибка при добавлении в номенклатуру');
    hideNomenclatureModal();

    await fetchNomenclature();
  } catch (err) {
    console.error('onNomenclatureFormSubmit:', err);
  }
}

async function fetchVariants() {
  try {
    const resp = await fetch(`${API_BASE}/variants`);
    const data = await resp.json();
    renderVariants(data);
  } catch (err) {
    console.error('fetchVariants:', err);
  }
}

function renderVariants(variants) {
  variantsContainer.innerHTML = '';
  variants.forEach(variant => {
    const cardEl = createVariantCard(variant);
    variantsContainer.appendChild(cardEl);
  });
}

function createVariantCard(variant) {
  const card = document.createElement('div');
  card.classList.add('variant-card');

  const header = document.createElement('div');
  header.classList.add('variant-card-header');

  const h3 = document.createElement('h3');
  h3.textContent = variant.day_and_number;
  header.appendChild(h3);

  const actions = document.createElement('div');
  actions.classList.add('variant-actions');

  const editBtn = document.createElement('button');
  editBtn.classList.add('btn', 'btn-outline');
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => showVariantModal(variant));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.classList.add('btn', 'btn-outline');
  delBtn.textContent = 'Удалить';
  delBtn.addEventListener('click', () => onDeleteVariant(variant.id));
  actions.appendChild(delBtn);

  header.appendChild(actions);
  card.appendChild(header);

  const info = document.createElement('div');
  info.classList.add('variant-info');
  info.innerHTML = `<p>ID: ${variant.id}</p>`;
  card.appendChild(info);

  const dishesContainer = document.createElement('div');
  dishesContainer.classList.add('dishes-list');
  const h4 = document.createElement('h4');
  h4.textContent = `Блюда (${variant.dishes.length}):`;
  dishesContainer.appendChild(h4);

  variant.dishes.forEach(dish => {
    const dishItem = document.createElement('div');
    dishItem.classList.add('dish-item');

    const leftPart = document.createElement('div');
    leftPart.innerHTML = `
      <span class="dish-item-name">${dish.name}</span>
      <span class="dish-item-type">[${dish.type}]</span>
    `;

    const dishBtns = document.createElement('div');
    dishBtns.classList.add('dish-item-buttons');

    const delDishBtn = document.createElement('button');
    delDishBtn.classList.add('btn', 'btn-outline');
    delDishBtn.textContent = 'Удалить';
    delDishBtn.addEventListener('click', () => onDeleteDish(variant.id, dish.id));
    dishBtns.appendChild(delDishBtn);

    const transferBtn = document.createElement('button');
    transferBtn.classList.add('btn', 'btn-outline');
    transferBtn.textContent = 'Перенести';
    transferBtn.addEventListener('click', () => onTransferDish(variant.id, dish.id));
    dishBtns.appendChild(transferBtn);

    dishItem.appendChild(leftPart);
    dishItem.appendChild(dishBtns);
    dishesContainer.appendChild(dishItem);
  });

  const addDishBtn = document.createElement('button');
  addDishBtn.classList.add('btn', 'btn-primary');
  addDishBtn.textContent = 'Добавить блюдо';
  addDishBtn.addEventListener('click', () => showDishModal(variant.id));
  dishesContainer.appendChild(addDishBtn);

  card.appendChild(dishesContainer);
  return card;
}

function showVariantModal(variant) {
  variantModal.classList.remove('hidden');
  if (variant) {
    variantModalTitle.textContent = 'Редактировать вариант';
    variantIdInput.value = variant.id;
    variantDayNumberInput.value = variant.day_and_number;
  } else {
    variantModalTitle.textContent = 'Новый вариант';
    variantIdInput.value = '';
    variantDayNumberInput.value = '';
  }
}
function hideVariantModal() {
  variantModal.classList.add('hidden');
}

async function onVariantFormSubmit(e) {
  e.preventDefault();
  const id = variantIdInput.value;
  const dayAndNumber = variantDayNumberInput.value.trim();
  if (!dayAndNumber) return;

  try {
    if (id) {
      const resp = await fetch(`${API_BASE}/variants/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ day_and_number: dayAndNumber })
      });
      if (!resp.ok) throw new Error('Ошибка при редактировании варианта');
    } else {
      const resp = await fetch(`${API_BASE}/variants`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ day_and_number: dayAndNumber })
      });
      if (!resp.ok) throw new Error('Ошибка при создании варианта');
    }
    hideVariantModal();
    fetchVariants();
  } catch (err) {
    console.error('onVariantFormSubmit:', err);
  }
}

async function onDeleteVariant(variantId) {
  if (!confirm('Удалить вариант?')) return;
  try {
    const resp = await fetch(`${API_BASE}/variants/${variantId}`, {method:'DELETE'});
    if (!resp.ok) throw new Error('Ошибка при удалении варианта');
    fetchVariants();
  } catch (err) {
    console.error('onDeleteVariant:', err);
  }
}

function showDishModal(variantId) {
  dishModal.classList.remove('hidden');
  dishVariantIdInput.value = variantId;
  dishNameSelect.value = '';
  dishTypeSelect.value = '';
}
function hideDishModal() {
  dishModal.classList.add('hidden');
}

async function onDishFormSubmit(e) {
  e.preventDefault();
  const variantId = dishVariantIdInput.value;
  const name = dishNameSelect.value;
  const type = dishTypeSelect.value;
  if (!variantId || !name || !type) return;

  try {
    const resp = await fetch(`${API_BASE}/variants/${variantId}/dishes`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, type })
    });
    if (!resp.ok) {
      const errData = await resp.json();
      alert(errData.error || 'Ошибка при добавлении блюда');
      return;
    }
    hideDishModal();
    fetchVariants();
  } catch (err) {
    console.error('onDishFormSubmit:', err);
  }
}

async function onDeleteDish(variantId, dishId) {
  if (!confirm('Удалить блюдо?')) return;
  try {
    const resp = await fetch(`${API_BASE}/variants/${variantId}/dishes/${dishId}`, {
      method: 'DELETE'
    });
    if (!resp.ok) throw new Error('Ошибка при удалении блюда');
    fetchVariants();
  } catch (err) {
    console.error('onDeleteDish:', err);
  }
}

async function onTransferDish(fromVariantId, dishId) {
  const toVariantId = prompt('Введите ID варианта, куда перенести блюдо:');
  if (!toVariantId) return;

  try {
    const url = `${API_BASE}/variants/${fromVariantId}/dishes/${dishId}/transfer?toVariantId=${toVariantId}`;
    const resp = await fetch(url, { method: 'PATCH' });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Ошибка при переносе блюда');
      return;
    }
    alert('Блюдо перенесено успешно!');
    fetchVariants();
  } catch (err) {
    console.error('onTransferDish:', err);
  }
}
