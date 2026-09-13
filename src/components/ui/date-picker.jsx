"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toDateValue(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(date, min, max) {
  const value = toDateValue(date);
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
}

export default function DatePicker({
  value,
  defaultValue = "",
  onChange,
  name,
  min,
  max,
  placeholder = "Select date",
  className = "form-input",
  required = false,
  disabled = false,
  style,
  id,
  ariaLabel = "Choose date",
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = isControlled ? value || "" : internalValue;
  const selectedDate = useMemo(() => toDate(currentValue), [currentValue]);
  const initialMonth = selectedDate || toDate(max) || new Date();
  const [viewDate, setViewDate] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (selectedDate) setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !popoverStyle) return;
    const today = new Date();
    const candidate = selectedDate && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear()
      ? selectedDate
      : today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear()
        ? today
        : new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    requestAnimationFrame(() => popoverRef.current?.querySelector(`[data-date="${toDateValue(candidate)}"]`)?.focus());
  }, [open, popoverStyle, selectedDate, viewDate]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 296;
      const gap = 8;
      const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap);
      const belowTop = rect.bottom + gap;
      const aboveTop = rect.top - 348 - gap;
      const top = belowTop + 348 > window.innerHeight && aboveTop > gap ? aboveTop : belowTop;
      setPopoverStyle({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const commitValue = (nextValue) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.({ target: { name, value: nextValue } });
  };

  const selectDate = (date) => {
    if (!inRange(date, min, max)) return;
    commitValue(toDateValue(date));
    setOpen(false);
  };

  const goToMonth = (delta) => {
    setViewDate(date => new Date(date.getFullYear(), date.getMonth() + delta, 1));
  };

  const goToday = () => {
    const today = new Date();
    if (!inRange(today, min, max)) return;
    selectDate(today);
  };

  const handleCalendarKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in offsets)) return;
    const buttons = Array.from(popoverRef.current?.querySelectorAll(".date-picker-day:not(:disabled)") || []);
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, index + offsets[event.key]))]?.focus();
  };

  return (
    <div className="date-picker" ref={rootRef}>
      {name && <input type="hidden" name={name} value={currentValue} required={required} />}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`${className} date-picker-trigger`}
        style={style}
        disabled={disabled}
        onClick={() => setOpen(isOpen => !isOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={currentValue ? "date-picker-value" : "date-picker-placeholder"}>
          {currentValue ? formatDisplay(currentValue) : placeholder}
        </span>
        <CalendarDays size={15} aria-hidden="true" />
      </button>

      {open && popoverStyle && createPortal(
        <div ref={popoverRef} className="date-picker-popover" style={popoverStyle} role="dialog" aria-label={ariaLabel} onKeyDown={handleCalendarKeyDown}>
          <div className="date-picker-top">
            <button type="button" className="date-picker-month" onClick={() => setViewDate(new Date())}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </button>
            <div className="date-picker-nav">
              <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => goToMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>

          <div className="date-picker-grid">
            {days.map(date => {
              const value = toDateValue(date);
              const muted = date.getMonth() !== viewDate.getMonth();
              const selected = sameDay(date, selectedDate);
              const today = sameDay(date, new Date());
              const disabledDay = !inRange(date, min, max);
              return (
                <button
                  type="button"
                  key={value}
                  className={[
                    "date-picker-day",
                    muted ? "muted" : "",
                    selected ? "selected" : "",
                    today ? "today" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={disabledDay}
                  data-date={value}
                  aria-label={date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  aria-pressed={selected}
                  tabIndex={selected || (today && !selected) || (!selectedDate && date.getDate() === 1 && !muted) ? 0 : -1}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-picker-footer">
            <button type="button" onClick={() => { commitValue(""); setOpen(false); triggerRef.current?.focus(); }}><X size={12} /> Clear</button>
            <button type="button" onClick={goToday}>Today</button>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
