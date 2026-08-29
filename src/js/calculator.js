// Calculator Module with Secret Arcade Door & Settings Management

class Calculator {
  constructor(onSecretUnlocked) {
    this.onSecretUnlocked = onSecretUnlocked;
    this.expression = '';
    this.displayEl = null;
    this.historyEl = null;

    // PIN management
    this.PIN_STORAGE_KEY = 'calculator_secret_pin';
    this.defaultPin = '0000';

    // Feedback/PIN Change flow state
    this.pinChangeStep = 1; // 1: Old PIN, 2: New PIN, 3: Confirm PIN
    this.tempOldPin = '';
    this.tempNewPin = '';

    this.init();
  }

  getSecretPin() {
    return localStorage.getItem(this.PIN_STORAGE_KEY) || this.defaultPin;
  }

  setSecretPin(newPin) {
    localStorage.setItem(this.PIN_STORAGE_KEY, newPin);
  }

  init() {
    this.displayEl = document.getElementById('calc-display-current');
    this.historyEl = document.getElementById('calc-display-history');

    this.initKeypad();
    this.initSettingsModal();
  }

  initKeypad() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = btn.getAttribute('data-val');
        const action = btn.getAttribute('data-action');

        if (action === 'clear') {
          this.clear();
        } else if (action === 'backspace') {
          this.backspace();
        } else if (action === 'equals') {
          this.evaluate();
        } else if (val) {
          this.appendValue(val);
        }
      });
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      const calcScreen = document.getElementById('screen-calculator');
      if (!calcScreen || calcScreen.classList.contains('hidden')) return;

      if (e.key >= '0' && e.key <= '9') {
        this.appendValue(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        const opMap = { '+': '+', '-': '-', '*': '×', '/': '÷' };
        this.appendValue(opMap[e.key]);
      } else if (e.key === '.') {
        this.appendValue('.');
      } else if (e.key === '(' || e.key === ')') {
        this.appendValue(e.key);
      } else if (e.key === '%') {
        this.appendValue('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.evaluate();
      } else if (e.key === 'Backspace') {
        this.backspace();
      } else if (e.key === 'Escape') {
        this.clear();
      }
    });
  }

  appendValue(val) {
    // If expression was previously showing error, clear it
    if (this.expression === 'Error') {
      this.expression = '';
    }
    this.expression += val;
    this.updateDisplay();
  }

  clear() {
    this.expression = '';
    if (this.historyEl) this.historyEl.textContent = '';
    this.updateDisplay();
  }

  backspace() {
    if (this.expression.length > 0) {
      this.expression = this.expression.slice(0, -1);
      this.updateDisplay();
    }
  }

  evaluate() {
    const raw = this.expression.trim();
    if (!raw) return;

    // Check if the entered text is the 4-digit secret PIN!
    const secretPin = this.getSecretPin();
    if (raw === secretPin) {
      // Secret unlocked!
      this.clear();
      if (typeof this.onSecretUnlocked === 'function') {
        this.onSecretUnlocked();
      }
      return;
    }

    try {
      // Replace display operators with JS operators
      let evalExpr = raw
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '/100');

      // Sanitize: only allow numbers, math operators, parentheses, decimal point
      if (!/^[0-9+\-*/().\s]+$/.test(evalExpr)) {
        throw new Error('Invalid characters');
      }

      // Safe evaluation using Function
      const result = new Function(`return ${evalExpr}`)();

      if (result === undefined || isNaN(result) || !isFinite(result)) {
        throw new Error('Math error');
      }

      if (this.historyEl) {
        this.historyEl.textContent = `${this.expression} =`;
      }
      // Format result (trim long decimals)
      const formatted = Number(Math.round(result * 1e8) / 1e8).toString();
      this.expression = formatted;
      this.updateDisplay();
    } catch (err) {
      if (this.historyEl) this.historyEl.textContent = `${this.expression} =`;
      this.expression = 'Error';
      this.updateDisplay();
    }
  }

  updateDisplay() {
    if (this.displayEl) {
      this.displayEl.textContent = this.expression || '0';
    }
  }

  initSettingsModal() {
    const btnGear = document.getElementById('calc-btn-settings');
    const settingsModal = document.getElementById('calc-settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-calc-settings');

    // Main Settings Menu Buttons
    const btnAppInfo = document.getElementById('settings-opt-appinfo');
    const btnFeedback = document.getElementById('settings-opt-feedback');
    const btnThanks = document.getElementById('settings-opt-thanks');
    const btnPremium = document.getElementById('settings-opt-premium');

    // Sub Views in Settings
    const viewMain = document.getElementById('settings-view-main');
    const viewAppInfo = document.getElementById('settings-view-appinfo');
    const viewFeedback = document.getElementById('settings-view-feedback');
    const viewThanks = document.getElementById('settings-view-thanks');

    const showView = (targetView) => {
      [viewMain, viewAppInfo, viewFeedback, viewThanks].forEach(v => v?.classList.add('hidden'));
      targetView?.classList.remove('hidden');
    };

    // Open Settings
    btnGear?.addEventListener('click', () => {
      showView(viewMain);
      settingsModal?.classList.remove('hidden');
    });

    // Close Settings
    btnCloseSettings?.addEventListener('click', () => {
      settingsModal?.classList.add('hidden');
    });

    // Back to main settings menu buttons
    document.querySelectorAll('.btn-back-settings-main').forEach(btn => {
      btn.addEventListener('click', () => showView(viewMain));
    });

    // 1. App Info
    btnAppInfo?.addEventListener('click', () => {
      showView(viewAppInfo);
    });

    // 2. Feedback (Secret PIN Change)
    btnFeedback?.addEventListener('click', () => {
      this.resetPinChangeFlow();
      showView(viewFeedback);
    });

    // 3. Thanks
    btnThanks?.addEventListener('click', () => {
      showView(viewThanks);
    });

    // 4. Premium Update (Easter egg: 💸💸💸)
    btnPremium?.addEventListener('click', () => {
      this.showToast('💸💸💸');
    });

    // Handle Feedback (PIN Change) submit button
    const btnPinSubmit = document.getElementById('btn-pin-submit');
    const inputPin = document.getElementById('input-pin-step');

    btnPinSubmit?.addEventListener('click', () => {
      this.handlePinStepSubmit(inputPin?.value || '');
    });

    inputPin?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handlePinStepSubmit(inputPin?.value || '');
      }
    });
  }

  resetPinChangeFlow() {
    this.pinChangeStep = 1;
    this.tempOldPin = '';
    this.tempNewPin = '';

    const titleEl = document.getElementById('feedback-step-title');
    const inputPin = document.getElementById('input-pin-step');
    const errorEl = document.getElementById('feedback-step-error');

    if (titleEl) titleEl.textContent = '1단계: 기존 비밀번호를 입력하세요';
    if (inputPin) {
      inputPin.value = '';
      inputPin.placeholder = '4자리 기존 비밀번호';
      inputPin.focus();
    }
    if (errorEl) errorEl.textContent = '';
  }

  handlePinStepSubmit(inputVal) {
    const val = inputVal.trim();
    const titleEl = document.getElementById('feedback-step-title');
    const inputPin = document.getElementById('input-pin-step');
    const errorEl = document.getElementById('feedback-step-error');

    const setError = (msg) => {
      if (errorEl) errorEl.textContent = msg;
      if (inputPin) { inputPin.value = ''; inputPin.focus(); }
    };

    if (!/^\d{4}$/.test(val)) {
      setError('비밀번호는 숫자 4자리여야 합니다.');
      return;
    }

    if (this.pinChangeStep === 1) {
      // Step 1: Validate Old PIN
      const currentPin = this.getSecretPin();
      if (val !== currentPin) {
        setError('기존 비밀번호가 일치하지 않습니다.');
        return;
      }
      this.tempOldPin = val;
      this.pinChangeStep = 2;
      if (titleEl) titleEl.textContent = '2단계: 새 비밀번호를 입력하세요';
      if (inputPin) { inputPin.value = ''; inputPin.placeholder = '새 4자리 비밀번호'; inputPin.focus(); }
      if (errorEl) errorEl.textContent = '';

    } else if (this.pinChangeStep === 2) {
      // Step 2: Validate New PIN != Old PIN
      if (val === this.tempOldPin) {
        setError('새 비밀번호는 기존 비밀번호와 같을 수 없습니다.');
        return;
      }
      this.tempNewPin = val;
      this.pinChangeStep = 3;
      if (titleEl) titleEl.textContent = '3단계: 새 비밀번호를 다시 입력하세요';
      if (inputPin) { inputPin.value = ''; inputPin.placeholder = '새 비밀번호 확인'; inputPin.focus(); }
      if (errorEl) errorEl.textContent = '';

    } else if (this.pinChangeStep === 3) {
      // Step 3: Validate Confirmation
      if (val !== this.tempNewPin) {
        setError('새 비밀번호가 일치하지 않습니다. 다시 시도하세요.');
        return;
      }

      // Success! Save new PIN
      this.setSecretPin(this.tempNewPin);
      if (errorEl) {
        errorEl.style.color = '#10b981';
        errorEl.textContent = '✅ 비밀번호가 성공적으로 변경되었습니다!';
      }
      setTimeout(() => {
        document.getElementById('settings-view-feedback')?.classList.add('hidden');
        document.getElementById('settings-view-main')?.classList.remove('hidden');
        document.getElementById('calc-settings-modal')?.classList.add('hidden');
      }, 1200);
    }
  }

  showToast(message) {
    let toast = document.getElementById('calc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'calc-toast';
      toast.className = 'calc-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
}

export { Calculator };
