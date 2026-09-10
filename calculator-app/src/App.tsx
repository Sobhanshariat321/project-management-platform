import { useState, useEffect, useCallback } from "react";
import "./App.css";

function App() {
  const [displayValue, setDisplayValue] = useState<string>("0");
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/":
        if (b === 0) throw new Error("Division by zero");
        return a / b;
      default: return b;
    }
  };

  const handleNumberClick = useCallback((num: string) => {
    if (error) {
      setError(false);
      setDisplayValue(num);
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
      return;
    }
    if (waitingForSecondOperand) {
      setDisplayValue(num);
      setWaitingForSecondOperand(false);
    } else {
      const current = displayValue === "0" ? "" : displayValue;
      // limit display length to avoid overflow
      if (current.length >= 12) return;
      setDisplayValue(current + num);
    }
  }, [displayValue, waitingForSecondOperand, error]);

  const handleDecimalClick = useCallback(() => {
    if (error) {
      setError(false);
      setDisplayValue("0.");
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
      return;
    }
    if (waitingForSecondOperand) {
      setDisplayValue("0.");
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes(".")) {
      setDisplayValue(displayValue + ".");
    }
  }, [displayValue, waitingForSecondOperand, error]);

  const handleOperatorClick = useCallback((nextOperator: string) => {
    if (error) return;
    const inputValue = parseFloat(displayValue);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator && !waitingForSecondOperand) {
      try {
        const result = calculate(firstOperand, inputValue, operator);
        const resultStr = String(result).length > 12 ? result.toPrecision(8) : String(result);
        setDisplayValue(resultStr);
        setFirstOperand(result);
      } catch {
        setError(true);
        setDisplayValue("Error");
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(false);
        return;
      }
    }
    setOperator(nextOperator);
    setWaitingForSecondOperand(true);
  }, [displayValue, firstOperand, operator, waitingForSecondOperand, error]);

  const handleEqualsClick = useCallback(() => {
    if (error) return;
    if (operator === null || waitingForSecondOperand || firstOperand === null) return;
    const secondOperand = parseFloat(displayValue);
    try {
      const result = calculate(firstOperand, secondOperand, operator);
      const resultStr = String(result).length > 12 ? result.toPrecision(8) : String(result);
      setDisplayValue(resultStr);
      setFirstOperand(result);
      setOperator(null);
      setWaitingForSecondOperand(true);
    } catch {
      setError(true);
      setDisplayValue("Error");
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
    }
  }, [displayValue, firstOperand, operator, waitingForSecondOperand, error]);

  const handleClearClick = useCallback(() => {
    setDisplayValue("0");
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
    setError(false);
  }, []);

  const handleBackspaceClick = useCallback(() => {
    if (error) {
      handleClearClick();
      return;
    }
    if (waitingForSecondOperand) return;
    if (displayValue.length === 1) {
      setDisplayValue("0");
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  }, [displayValue, waitingForSecondOperand, error, handleClearClick]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key >= "0" && key <= "9") {
        handleNumberClick(key);
        event.preventDefault();
      } else if (key === ".") {
        handleDecimalClick();
        event.preventDefault();
      } else if (key === "+" || key === "-" || key === "*" || key === "/") {
        handleOperatorClick(key);
        event.preventDefault();
      } else if (key === "Enter" || key === "=") {
        handleEqualsClick();
        event.preventDefault();
      } else if (key === "Escape" || key === "Delete") {
        handleClearClick();
        event.preventDefault();
      } else if (key === "Backspace") {
        handleBackspaceClick();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNumberClick, handleDecimalClick, handleOperatorClick, handleEqualsClick, handleClearClick, handleBackspaceClick]);

  return (
    <div className={`calculator ${error ? "error" : ""}`}>
      <div className="display" aria-live="polite">{displayValue}</div>
      <div className="keypad">
        <button onClick={handleClearClick} aria-label="Clear" className="btn-clear">C</button>
        <button onClick={() => handleOperatorClick("/")} aria-label="Divide">÷</button>
        <button onClick={() => handleOperatorClick("*")} aria-label="Multiply">×</button>
        <button onClick={handleBackspaceClick} aria-label="Backspace">←</button>
      </div>
      <div className="buttons">
        <button onClick={() => handleNumberClick("7")} aria-label="Number 7">7</button>
        <button onClick={() => handleNumberClick("8")} aria-label="Number 8">8</button>
        <button onClick={() => handleNumberClick("9")} aria-label="Number 9">9</button>
        <button onClick={() => handleOperatorClick("-")} aria-label="Subtract" className="btn-operator">−</button>
      </div>
      <div className="buttons">
        <button onClick={() => handleNumberClick("4")} aria-label="Number 4">4</button>
        <button onClick={() => handleNumberClick("5")} aria-label="Number 5">5</button>
        <button onClick={() => handleNumberClick("6")} aria-label="Number 6">6</button>
        <button onClick={() => handleOperatorClick("+")} aria-label="Add" className="btn-operator">+</button>
      </div>
      <div className="buttons">
        <button onClick={() => handleNumberClick("1")} aria-label="Number 1">1</button>
        <button onClick={() => handleNumberClick("2")} aria-label="Number 2">2</button>
        <button onClick={() => handleNumberClick("3")} aria-label="Number 3">3</button>
        <button onClick={handleEqualsClick} aria-label="Equals" className="btn-equals">=</button>
      </div>
      <div className="buttons">
        <button onClick={() => handleNumberClick("0")} aria-label="Number 0" className="btn-zero">0</button>
        <button onClick={handleDecimalClick} aria-label="Decimal point">.</button>
        <button onClick={handleEqualsClick} aria-label="Equals" className="btn-equals-mobile">=</button>
        <span className="btn-placeholder" aria-hidden="true"></span>
      </div>
    </div>
  );
}

export default App;
