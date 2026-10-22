
"use strict";

const resultDisplay = document.getElementById("result");
const historyDisplay = document.getElementById("history");
const toast = document.getElementById("toast");
const scientificPanel = document.getElementById("scientificPanel");
const mathButton = document.querySelector('[data-tool="math"]');
const angleButton = document.querySelector('[data-sci="angle"]');

let expression = "";
let justCalculated = false;
let lastAnswer = 0;
let scientificDegrees = true;
let calculationHistory = [];

const operators = ["+", "−", "×", "÷"];

function render() {
  resultDisplay.textContent = expression;

  if (expression.length > 12) {
    resultDisplay.style.fontSize =
      `clamp(24px, ${Math.max(5, 90 / expression.length)}vw, 42px)`;
  } else {
    resultDisplay.style.fontSize = "";
  }
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function clearAll() {
  expression = "";
  justCalculated = false;
  historyDisplay.textContent = "";
  render();
}

function deleteLast() {
  if (justCalculated) {
    clearAll();
    return;
  }

  expression = expression.slice(0, -1);
  render();
}

function appendValue(value) {
  if (value === "( )") {
    if (justCalculated) {
      expression = "";
      justCalculated = false;
    }

    const opens = (expression.match(/\(/g) || []).length;
    const closes = (expression.match(/\)/g) || []).length;
    const last = expression.slice(-1);

    if (
      expression === "" ||
      operators.includes(last) ||
      last === "("
    ) {
      expression += "(";
    } else if (opens > closes) {
      expression += ")";
    } else {
      expression += "×(";
    }

    render();
    return;
  }

  if (justCalculated) {
    if (operators.includes(value) || value === "%") {
      justCalculated = false;
    } else {
      expression = "";
      justCalculated = false;
    }
  }

  const last = expression.slice(-1);

  if (operators.includes(value)) {
    if (!expression && value !== "−") return;

    if (operators.includes(last)) {
      expression = expression.slice(0, -1);
    }

    if (expression.endsWith("(") && value !== "−") return;

    expression += value;
    render();
    return;
  }

  if (value === ".") {
    const currentNumber = expression.split(/[+\−×÷()%]/).pop();

    if (currentNumber.includes(".")) return;

    if (
      !expression ||
      operators.includes(last) ||
      last === "("
    ) {
      expression += "0";
    }
  }

  if (value === "%") {
    if (!expression || operators.includes(last) || last === "(") {
      return;
    }
  }

  if (
    /^\d/.test(value) &&
    (last === ")" || last === "%")
  ) {
    expression += "×";
  }

  if (
    value === "(" &&
    /[\d)%]$/.test(expression)
  ) {
    expression += "×";
  }

  expression += value;
  render();
}

/* Safe arithmetic parser; no eval() is used. */
function calculate(source) {
  const input = source
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");

  if (!input) throw new Error("Enter a calculation");

  if (!/^[\d.+\-*/()%]+$/.test(input)) {
    throw new Error("Invalid expression");
  }

  let pos = 0;

  function parseExpression() {
    let value = parseTerm();

    while (input[pos] === "+" || input[pos] === "-") {
      const op = input[pos++];
      const right = parseTerm();

      value = op === "+" ? value + right : value - right;
    }

    return value;
  }

  function parseTerm() {
    let value = parseUnary();

    while (input[pos] === "*" || input[pos] === "/") {
      const op = input[pos++];
      const right = parseUnary();

      if (op === "/" && right === 0) {
        throw new Error("Cannot divide by zero");
      }

      value = op === "*" ? value * right : value / right;
    }

    return value;
  }

  function parseUnary() {
    if (input[pos] === "+") {
      pos++;
      return parseUnary();
    }

    if (input[pos] === "-") {
      pos++;
      return -parseUnary();
    }

    return parsePercent();
  }

  function parsePercent() {
    let value = parsePrimary();

    while (input[pos] === "%") {
      pos++;
      value /= 100;
    }

    return value;
  }

  function parsePrimary() {
    if (input[pos] === "(") {
      pos++;

      const value = parseExpression();

      if (input[pos] !== ")") {
        throw new Error("Missing bracket");
      }

      pos++;
      return value;
    }

    const match = input.slice(pos).match(
      /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/
    );

    if (!match) throw new Error("Invalid number");

    pos += match[0].length;
    return Number(match[0]);
  }

  const value = parseExpression();

  if (pos !== input.length || !Number.isFinite(value)) {
    throw new Error("Invalid calculation");
  }

  return value;
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return "Error";

  if (Object.is(number, -0)) number = 0;

  return Number(number.toPrecision(12)).toString();
}

function calculateResult() {
  if (!expression) return;

  try {
    let source = expression;

    const openCount = (source.match(/\(/g) || []).length;
    const closeCount = (source.match(/\)/g) || []).length;

    source += ")".repeat(Math.max(0, openCount - closeCount));
    source = source.replace(/[+\−×÷.]+$/, "");

    const answer = calculate(source);
    const formatted = formatNumber(answer);

    calculationHistory.unshift({
      expression: expression,
      answer: formatted
    });

    calculationHistory = calculationHistory.slice(0, 30);

    historyDisplay.textContent = expression + " =";
    expression = formatted;
    lastAnswer = answer;
    justCalculated = true;

    render();
  } catch (error) {
    notify(error.message || "Invalid calculation");
  }
}

function toggleSign() {
  if (!expression) {
    expression = "−";
    render();
    return;
  }

  try {
    const value = calculate(expression);

    expression = formatNumber(-value);
    lastAnswer = -value;
    justCalculated = true;
    render();
    return;
  } catch {
    // If the expression is unfinished, toggle its last number below.
  }

  const match = expression.match(/(\d*\.?\d+)(%?)$/);

  if (!match) {
    if (expression.endsWith("−")) {
      expression = expression.slice(0, -1);
    } else {
      expression += "−";
    }

    render();
    return;
  }

  const start = match.index;
  const number = match[1];
  const percent = match[2];
  let before = expression.slice(0, start);

  if (before.endsWith("−")) {
    const previous = before.slice(0, -1).slice(-1);

    if (
      before.length === 1 ||
      operators.includes(previous) ||
      previous === "("
    ) {
      before = before.slice(0, -1);
      expression = before + number + percent;
    } else {
      expression = before + "−" + number + percent;
    }
  } else {
    expression = before + "−" + number + percent;
  }

  render();
}

/* Main keypad */
document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === "clear") {
      clearAll();
    } else if (action === "equals") {
      calculateResult();
    } else if (action === "sign") {
      toggleSign();
    } else if (value !== undefined) {
      appendValue(value);
    }
  });
});

/* Delete button */
document.getElementById("delete").addEventListener("click", deleteLast);

/* Scientific mode toggle */
mathButton.addEventListener("click", () => {
  scientificPanel.hidden = !scientificPanel.hidden;

  mathButton.setAttribute(
    "aria-expanded",
    String(!scientificPanel.hidden)
  );
});

/* Scientific calculations */
function scientificValue() {
  if (!expression || expression === "−") {
    throw new Error("Enter a number first");
  }

  return calculate(expression);
}

function setScientificResult(value, label) {
  if (!Number.isFinite(value)) {
    notify("Math error: result is out of range");
    return;
  }

  calculationHistory.unshift({
    expression: label,
    answer: formatNumber(value)
  });

  calculationHistory = calculationHistory.slice(0, 30);

  historyDisplay.textContent = label;
  expression = formatNumber(value);
  lastAnswer = value;
  justCalculated = true;

  render();
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n) || n > 170) {
    throw new Error("Factorial needs a whole number from 0 to 170");
  }

  let answer = 1;

  for (let i = 2; i <= n; i++) {
    answer *= i;
  }

  return answer;
}

function insertConstant(value) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const last = expression.slice(-1);

  if (/[\d)%]$/.test(last)) {
    expression += "×";
  }

  expression += value;
  render();
}

scientificPanel.querySelectorAll("[data-sci]").forEach(button => {
  button.addEventListener("click", () => {
    const operation = button.dataset.sci;

    if (operation === "angle") {
      scientificDegrees = !scientificDegrees;
      button.textContent = scientificDegrees ? "DEG" : "RAD";

      notify(
        scientificDegrees
          ? "Angle mode: Degrees"
          : "Angle mode: Radians"
      );

      return;
    }

    if (operation === "pi") {
      insertConstant(String(Math.PI));
      return;
    }

    if (operation === "e") {
      insertConstant(String(Math.E));
      return;
    }

    let x;

    try {
      x = scientificValue();
    } catch (error) {
      notify(error.message);
      return;
    }

    if (operation === "power") {
      const input = prompt("Enter the power (y):", "2");

      if (input === null || !input.trim()) return;

      const power = Number(input);

      if (!Number.isFinite(power)) {
        notify("Enter a valid power");
        return;
      }

      setScientificResult(
        Math.pow(x, power),
        `${x} ^ ${power} =`
      );

      return;
    }

    const angle = scientificDegrees
      ? x * Math.PI / 180
      : x;

    let answer;

    try {
      switch (operation) {
        case "sin":
          answer = Math.sin(angle);
          break;

        case "cos":
          answer = Math.cos(angle);
          break;

        case "tan":
          if (Math.abs(Math.cos(angle)) < 1e-12) {
            throw new Error("Tangent is undefined at this angle");
          }

          answer = Math.tan(angle);
          break;

        case "sqrt":
          if (x < 0) {
            throw new Error("Square root requires a non-negative number");
          }

          answer = Math.sqrt(x);
          break;

        case "square":
          answer = x * x;
          break;

        case "log":
          if (x <= 0) throw new Error("Log requires a positive number");

          answer = Math.log10(x);
          break;

        case "ln":
          if (x <= 0) throw new Error("Ln requires a positive number");

          answer = Math.log(x);
          break;

        case "inverse":
          if (x === 0) throw new Error("Cannot divide by zero");

          answer = 1 / x;
          break;

        case "factorial":
          answer = factorial(x);
          break;

        case "abs":
          answer = Math.abs(x);
          break;

        case "exp":
          answer = Math.exp(x);
          break;

        case "tenpower":
          answer = Math.pow(10, x);
          break;

        default:
          return;
      }

      setScientificResult(
        answer,
        `${button.textContent}(${formatNumber(x)}) =`
      );
    } catch (error) {
      notify(error.message || "Math error");
    }
  });
});

/* History icon */
document.querySelector('[data-tool="history"]').addEventListener("click", () => {
  if (calculationHistory.length === 0) {
    notify("No calculation history yet");
    return;
  }

  const lines = calculationHistory
    .slice(0, 10)
    .map(item => `${item.expression} ${item.answer}`);

  historyDisplay.textContent = lines[0];
  notify(`Last answer: ${calculationHistory[0].answer}`);
});

/* Unit converter placeholder */
document.querySelector('[data-tool="ruler"]').addEventListener("click", () => {
  notify("Unit converter is not implemented yet");
});

/* Physical keyboard support */
document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  const key = event.key;

  if (/^\d$/.test(key) || key === ".") {
    appendValue(key);
  } else if (key === "+") {
    appendValue("+");
  } else if (key === "-") {
    appendValue("−");
  } else if (key === "*") {
    appendValue("×");
  } else if (key === "/") {
    event.preventDefault();
    appendValue("÷");
  } else if (key === "%") {
    appendValue("%");
  } else if (key === "(" || key === ")") {
    appendValue(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculateResult();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape" || key === "Delete") {
    clearAll();
  }
});

/* Initial screen */
render();
