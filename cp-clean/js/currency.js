// currency.js — formats financial input fields as $1,000,000

function formatCurrency(value) {
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function getRawValue(formatted) {
  return parseFloat(formatted.replace(/[^0-9.]/g, '')) || 0;
}

function initCurrencyFields() {
  const fieldIds = [
    'rev0','rev1','rev2',
    'exp0','exp1','exp2',
    'assets0','assets1','assets2',
    'liab0','liab1','liab2',
    'cash0','cash1','cash2',
    'currassets0','currassets1','currassets2',
    'currliab0','currliab1','currliab2',
    'prog0','prog1','prog2',
    'mgmt0','mgmt1','mgmt2',
    'fund0','fund1','fund2',
    'contrib0','contrib1','contrib2',
    'toprev0','toprev1','toprev2',
  ];

  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Change to text input for formatting
    el.type = 'text';
    el.style.textAlign = 'right';

    // Format on blur
    el.addEventListener('blur', function() {
      const raw = getRawValue(this.value);
      this.value = raw ? formatCurrency(raw) : '';
      recalc();
    });

    // Strip formatting on focus so user can type freely
    el.addEventListener('focus', function() {
      const raw = getRawValue(this.value);
      this.value = raw ? raw.toString() : '';
    });

    // Allow only numbers while typing
    el.addEventListener('input', function() {
      // Strip non-numeric except decimal
      this.value = this.value.replace(/[^0-9.]/g, '');
      recalc();
    });
  });
}

// Override the g() function to handle formatted values
function g(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return getRawValue(el.value) || 0;
}

// Format existing values when loading an assessment
function formatAllFields() {
  const fieldIds = [
    'rev0','rev1','rev2','exp0','exp1','exp2',
    'assets0','assets1','assets2','liab0','liab1','liab2',
    'cash0','cash1','cash2','currassets0','currassets1','currassets2',
    'currliab0','currliab1','currliab2','prog0','prog1','prog2',
    'mgmt0','mgmt1','mgmt2','fund0','fund1','fund2',
    'contrib0','contrib1','contrib2','toprev0','toprev1','toprev2',
  ];
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = getRawValue(el.value);
    if (raw) el.value = formatCurrency(raw);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCurrencyFields();
});
