
const resultDisplay = document.getElementById("result");
const historyDisplay = document.getElementById("history");
const toast = document.getElementById("toast");

let expression = "";
let justCalculated = false;
let lastAnswer = 0;
let calculationHistory = [];

const operators = ["+", "−", "×", "÷"];

function render() {
  resultDisplay.textContent = expression;
  resultDisplay.style.fontSize =
    expression.length > 12
      ? `clamp(25px, ${90 / expression.length}vw, 42px)`
      : "";

  resultDisplay.scrollLeft = resultDisplay.scrollWidth;
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
    value.match(/^\d$/) &&
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

/* Safe arithmetic parser: no eval() or Function() */
function calculate(source) {
  let input = source
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");

  if (!input) throw new Error("Empty expression");
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

    while (
      input[pos] === "*" ||
      input[pos] === "/"
    ) {
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

    // Automatically close unfinished brackets.
    const openCount = (source.match(/\(/g) || []).length;
    const closeCount = (source.match(/\)/g) || []).length;
    source += ")".repeat(Math.max(0, openCount - closeCount));

    // Remove incomplete operators at the end.
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
    notify(
      error.message === "Cannot divide by zero"
        ? "Cannot divide by zero"
        : "Invalid calculation"
    );
  }
}

function toggleSign() {
  if (!expression) {
    expression = "−";
    render();
    return;
  }

  if (justCalculated) {
    expression = formatNumber(-lastAnswer);
    justCalculated = false;
    render();
    return;
  }

  // Toggle the sign of the last number.
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
  const before = expression.slice(0, start);

  if (before.endsWith("−") &&
      (before.length === 1 ||
       operators.includes(before.slice(-2, -1)) ||
       before.endsWith("("))) {
    expression = before.slice(0, -1) + number + percent;
  } else {
    expression = before + "−" + number + percent;
  }

  render();
}

document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === "clear") clearAll();
    else if (action === "equals") calculateResult();
    else if (action === "sign") toggleSign();
    else if (value !== undefined) appendValue(value);
  });
});

document.getElementById("delete").addEventListener(
  "click",
  deleteLast
);

/* Keyboard support */
document.addEventListener("keydown", event => {
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
    calculateResult();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape" || key === "Delete") {
    clearAll();
  }
});

/* Utility buttons */
document.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;

    if (tool === "history") {
      if (calculationHistory.length === 0) {
        notify("No calculation history yet");
      } else {
        const latest = calculationHistory[0];
        historyDisplay.textContent =
          latest.expression + " = " + latest.answer;
        notify("Latest calculation");
      }
    } else if (tool === "ruler") {
      notify("Unit converter can be added next");
    } else if (tool === "math") {
      notify("Scientific mode can be added next");
    }
  });
});

render();

