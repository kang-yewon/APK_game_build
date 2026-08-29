// Calculator Module with Secret Arcade Door, Settings Management & Easter Eggs

class Calculator {
  constructor(onSecretUnlocked) {
    this.onSecretUnlocked = onSecretUnlocked;
    this.expression = '';
    this.displayEl = null;
    this.historyEl = null;

    // PIN management
    this.PIN_STORAGE_KEY = 'calculator_secret_pin';
    this.defaultPin = '0000';

    // Feedback / Secret PIN Change flow state
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
    this.displayEl = document.getElementById('calc-current');
    this.historyEl = document.getElementById('calc-history');

    this.initKeypad();
    this.initSettingsModal();
    this.updateDisplay();
  }

  initKeypad() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      const handlePress = (e) => {
        if (e.cancelable) e.preventDefault();
        const val = btn.getAttribute('data-val');
        const action = btn.getAttribute('data-action');

        if (action === 'clear') {
          this.clear();
        } else if (action === 'backspace') {
          this.backspace();
        } else if (action === 'equals') {
          this.evaluate();
        } else if (action === 'parentheses') {
          this.toggleParentheses();
        } else if (action === 'percent') {
          this.appendValue('%');
        } else if (action === 'dot') {
          this.appendValue('.');
        } else if (val) {
          this.appendValue(val);
        }
      };

      btn.addEventListener('pointerdown', handlePress);
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

  toggleParentheses() {
    if (['Error', '💖', '칭구칭구', '👼'].includes(this.expression)) {
      this.expression = '';
      if (this.historyEl) this.historyEl.textContent = '';
    }

    const openCount = (this.expression.match(/\(/g) || []).length;
    const closeCount = (this.expression.match(/\)/g) || []).length;
    const lastChar = this.expression.slice(-1);

    if (openCount > closeCount && !['(', '+', '-', '×', '÷'].includes(lastChar)) {
      this.appendValue(')');
    } else {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ')'].includes(lastChar)) {
        this.appendValue('×(');
      } else {
        this.appendValue('(');
      }
    }
  }

  appendValue(val) {
    if (['Error', '💖', '칭구칭구', '👼'].includes(this.expression)) {
      this.expression = '';
      if (this.historyEl) this.historyEl.textContent = '';
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
    if (['Error', '💖', '칭구칭구', '👼'].includes(this.expression)) {
      this.clear();
      return;
    }
    if (this.expression.length > 0) {
      this.expression = this.expression.slice(0, -1);
      this.updateDisplay();
    }
  }

  evaluate() {
    const raw = this.expression.trim();
    if (!raw) return;

    // 1. Secret Arcade Unlock PIN
    const secretPin = this.getSecretPin();
    if (raw === secretPin) {
      this.clear();
      if (typeof this.onSecretUnlocked === 'function') {
        // Prevent touch through to home screen buttons
        setTimeout(() => {
          this.onSecretUnlocked();
        }, 120);
      }
      return;
    }

    // 2. Easter Eggs
    if (raw === '486') {
      if (this.historyEl) this.historyEl.textContent = '486 =';
      this.expression = '💖';
      this.updateDisplay();
      return;
    }
    if (raw === '7942') {
      if (this.historyEl) this.historyEl.textContent = '7942 =';
      this.expression = '칭구칭구';
      this.updateDisplay();
      return;
    }
    if (raw === '1004') {
      if (this.historyEl) this.historyEl.textContent = '1004 =';
      this.expression = '👼';
      this.updateDisplay();
      return;
    }

    // 3. Normal Math Calculation
    try {
      let evalExpr = raw
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/%/g, '/100');

      if (!/^[0-9+\-*/().\s]+$/.test(evalExpr)) {
        throw new Error('Invalid input');
      }

      const result = new Function(`return ${evalExpr}`)();

      if (result === undefined || isNaN(result) || !isFinite(result)) {
        throw new Error('Math error');
      }

      if (this.historyEl) {
        this.historyEl.textContent = `${this.expression} =`;
      }
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
    const btnGear = document.getElementById('btn-calc-settings');
    const settingsModal = document.getElementById('calc-settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    // Menu Item Buttons
    const btnFeedback = document.getElementById('btn-menu-feedback');
    const btnAbout = document.getElementById('btn-menu-about');
    const btnPremium = document.getElementById('btn-menu-premium');

    // Subviews
    const menuMain = document.getElementById('settings-main-menu');
    const viewFeedback = document.getElementById('settings-view-feedback');
    const viewAbout = document.getElementById('settings-view-about');

    const showSubView = (targetView) => {
      menuMain?.classList.add('hidden');
      viewFeedback?.classList.add('hidden');
      viewAbout?.classList.add('hidden');
      targetView?.classList.remove('hidden');
    };

    const showMainMenu = () => {
      viewFeedback?.classList.add('hidden');
      viewAbout?.classList.add('hidden');
      menuMain?.classList.remove('hidden');
    };

    // Open Settings Modal
    btnGear?.addEventListener('pointerdown', (e) => {
      if (e.cancelable) e.preventDefault();
      showMainMenu();
      settingsModal?.classList.remove('hidden');
    });

    // Close Settings Modal
    btnCloseSettings?.addEventListener('click', () => {
      settingsModal?.classList.add('hidden');
    });

    // 1. Feedback (PIN Change)
    btnFeedback?.addEventListener('click', () => {
      this.resetPinChangeFlow();
      showSubView(viewFeedback);
    });

    // 2. About App
    btnAbout?.addEventListener('click', () => {
      showSubView(viewAbout);
    });

    document.getElementById('btn-about-back')?.addEventListener('click', () => {
      showMainMenu();
    });

    // 3. Premium Update (Easter Egg 💸💸💸)
    btnPremium?.addEventListener('click', () => {
      this.showToast('💸💸💸');
    });

    // Feedback PIN Change Flow buttons
    const btnFeedbackNext = document.getElementById('btn-feedback-next');
    const btnFeedbackCancel = document.getElementById('btn-feedback-cancel');
    const inputPin = document.getElementById('input-pin-change');

    btnFeedbackCancel?.addEventListener('click', () => {
      showMainMenu();
    });

    btnFeedbackNext?.addEventListener('click', () => {
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
    const descEl = document.getElementById('feedback-step-desc');
    const inputPin = document.getElementById('input-pin-change');
    const errorEl = document.getElementById('feedback-error-msg');

    if (titleEl) titleEl.textContent = '1단계: 기존 비밀번호 입력';
    if (descEl) descEl.textContent = '현재 설정된 4자리 비밀번호를 입력하세요.';
    if (inputPin) {
      inputPin.value = '';
      inputPin.placeholder = '기존 비밀번호';
      inputPin.focus();
    }
    if (errorEl) {
      errorEl.style.color = '#ef4444';
      errorEl.textContent = '';
    }
  }

  handlePinStepSubmit(inputVal) {
    const val = inputVal.trim();
    const titleEl = document.getElementById('feedback-step-title');
    const descEl = document.getElementById('feedback-step-desc');
    const inputPin = document.getElementById('input-pin-change');
    const errorEl = document.getElementById('feedback-error-msg');

    const setError = (msg) => {
      if (errorEl) {
        errorEl.style.color = '#ef4444';
        errorEl.textContent = msg;
      }
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
      if (titleEl) titleEl.textContent = '2단계: 새 비밀번호 입력';
      if (descEl) descEl.textContent = '변경할 새 4자리 비밀번호를 입력하세요.';
      if (inputPin) { inputPin.value = ''; inputPin.placeholder = '새 비밀번호'; inputPin.focus(); }
      if (errorEl) errorEl.textContent = '';

    } else if (this.pinChangeStep === 2) {
      // Step 2: Validate New PIN != Old PIN
      if (val === this.tempOldPin) {
        setError('기존 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.');
        return;
      }
      this.tempNewPin = val;
      this.pinChangeStep = 3;
      if (titleEl) titleEl.textContent = '3단계: 새 비밀번호 확인';
      if (descEl) descEl.textContent = '새 비밀번호를 한 번 더 입력하세요.';
      if (inputPin) { inputPin.value = ''; inputPin.placeholder = '새 비밀번호 확인'; inputPin.focus(); }
      if (errorEl) errorEl.textContent = '';

    } else if (this.pinChangeStep === 3) {
      // Step 3: Validate Confirmation
      if (val !== this.tempNewPin) {
        setError('비밀번호가 일치하지 않습니다. 다시 입력해주세요.');
        return;
      }

      // Success! Save new PIN
      this.setSecretPin(this.tempNewPin);
      if (errorEl) {
        errorEl.style.color = '#10b981';
        errorEl.textContent = '✅ 새 비밀번호가 성공적으로 설정되었습니다!';
      }
      setTimeout(() => {
        document.getElementById('settings-view-feedback')?.classList.add('hidden');
        document.getElementById('settings-main-menu')?.classList.remove('hidden');
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
