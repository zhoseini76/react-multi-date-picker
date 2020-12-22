import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Calendar from "../calendar/calendar"
import DateObject from "react-date-object"
import { getAllDatesInRange } from "../days_panel/days_panel"
import { ReactComponent as Icon } from "./calendar.svg"
import "./date_picker.css"

export default function DatePicker({
    value,
    calendar = "gregorian",
    local = "en",
    format,
    timePicker,
    onlyTimePicker,
    onlyMonthPicker,
    onlyYearPicker,
    onChange,
    range = false,
    multiple = false,
    mustShowDates = true,
    name,
    placeholder,
    style = {},
    className = "",
    inputClass,
    disabled,
    type = "input",
    render,
    weekDays,
    months,
    showOtherDays,
    children,
    inputMode,
    scrollSensitive = true,
    hideOnScroll,
    minDate,
    maxDate,
    formattingIgnoreList,
    containerStyle,
    containerClassName,
    calendarPosition = "auto",
    animation,
    editable = true,
    onlyShowInRangeDates = true,
    editClick,
    cancleClick,
    ...otherProps
}) {
    let [date, setDate] = useState(),
        [stringDate, setStringDate] = useState(""),
        [isVisible, setIsVisible] = useState(false),
        [isCalendarReady, setIsCalendarReady] = useState(false),
        datePickerRef = useRef(null),
        inputRef = useRef(null),
        calendarRef = useRef(null),
        ref = useRef({}),
        separator = useMemo(() => range ? " تا " : ", ", [range]),
        closeCalendar = useCallback(() => {
            if (calendarRef.current) calendarRef.current.classList.remove("active")

            setIsVisible(false)
            setIsCalendarReady(false)
        }, [])

    if (isMobileMode() && !ref.current.mobile) ref.current = { ...ref.current, mobile: true }
    if (!isMobileMode() && ref.current.mobile) ref.current = { ...ref.current, mobile: false }
    if (!Array.isArray(formattingIgnoreList)) formattingIgnoreList = []

    formattingIgnoreList = JSON.stringify(formattingIgnoreList)

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                datePickerRef.current &&
                !datePickerRef.current.contains(event.target) &&
                !event.target.classList.contains("b-deselect") &&
                !ref.current.mobile
            ) {
                closeCalendar()
            } else if (
                inputRef.current && calendarRef.current &&
                calendarRef.current.contains(event.target) &&
                !Array.isArray(ref.current.date) &&
                event.target.classList.contains("sd") &&
                !ref.current.mobile
            ) {
                closeCalendar()
            }
        }

        document.addEventListener("click", handleClickOutside, false)

        function isRTL() {
            let div = document.createElement("div"),
                a = document.createElement("div"),
                b = document.createElement("div"),
                isRTL

            a.style.width = "10px"
            b.style.width = "5px"

            div.append(a)
            div.append(b)

            datePickerRef.current.append(div)

            isRTL = a.getBoundingClientRect().left - b.getBoundingClientRect().left !== 0

            datePickerRef.current.removeChild(div)

            return isRTL
        }

        ref.current.isRTL = isRTL()

        return () => document.removeEventListener("click", handleClickOutside, false)
    }, [closeCalendar])

    useEffect(() => {
        let date = value,
            getLastDate = () => date[date.length - 1]

        function checkDate(date) {
            if (!date) return
            if (!(date instanceof DateObject)) date = new DateObject({ date, calendar, local, format })

            if (date.calendar !== calendar) date.setCalendar(calendar)
            if (date.local !== local) date.setLocal(local)
            if (date.format !== format) date.setFormat(format)
            if (isValidMonths(months)) date.months = months
            if (isValidWeekDays(weekDays)) date.weekDays = weekDays

            date.setFormat(getFormat(timePicker, onlyTimePicker, onlyMonthPicker, onlyYearPicker, format, range, multiple))

            return date
        }

        if (range || multiple || Array.isArray(date)) {
            if (!Array.isArray(date)) date = [date]

            date = date.map(checkDate).filter(value => value !== undefined)

            if (range && date.length > 2) date = [date[0], getLastDate()]

            setStringDate(getStringDate(date, type, separator, format, formattingIgnoreList))
        } else {
            if (Array.isArray(date)) date = getLastDate()

            date = checkDate(date)

            let input = getInput(inputRef)

            if (document.activeElement !== input) {
                setStringDate(date ? date.format(undefined, JSON.parse(formattingIgnoreList)) : "")
            }
        }

        ref.current = { ...ref.current, date, separator }

        setDate(date)
    }, [
        value,
        calendar,
        local,
        format,
        range,
        multiple,
        separator,
        type,
        timePicker,
        onlyTimePicker,
        onlyMonthPicker,
        onlyYearPicker,
        weekDays,
        months,
        formattingIgnoreList
    ])

    useEffect(() => {
        if (type !== "input") return

        inputRef.current.selectionStart = inputRef.current.selectionEnd = ref.current.start
    }, [stringDate, type])

    useEffect(() => {
        const calendar = calendarRef.current

        if (!isCalendarReady || !calendar) return
        if (ref.current.mobile) return calendar.classList.add("active")

        function checkPosition(e) {
            const resize = e?.type === "resize",
                wrapper = calendar.querySelector(".rmdp-wrapper")

            if (!wrapper || !inputRef.current) return
            if (resize) e = undefined

            if (e) {
                if (hideOnScroll) {
                    const input = getInput(inputRef)

                    if (input) input.blur()

                    return closeCalendar()
                }

                if (!e.target.querySelector(".rmdp-calendar-container") || !scrollSensitive) return
            }

            let { height: calendarHeight, width: calendarWidth } = wrapper.getBoundingClientRect(),
                { top, height: inputHeight, width: inputWidth, right } = inputRef.current.getBoundingClientRect(),
                { clientHeight, clientWidth } = document.documentElement,
                translateY = (wrapper.style.transform.match(/translateY\((.*?)px\)/) || [])[1] || 2,
                translateX = 0,
                distance = inputWidth - calendarWidth,
                halfDistance = distance / 2,
                getTransform = (x, y) => `translateX(${x}px) translateY(${y}px)`,
                left = datePickerRef.current.offsetLeft,
                mustAddAnimation = animation && !e && !resize,
                isRTL = ref.current.isRTL,
                [positionY, positionX] = calendarPosition === "auto" ?
                    [] :
                    calendarPosition.split("-")

            if (e) {
                top -= clientHeight - e.target.clientHeight
                clientHeight = e.target.clientHeight
            }

            if (
                (
                    top + calendarHeight + inputHeight > clientHeight &&
                    top - (calendarHeight / 1.5) > 0 &&
                    (calendarPosition === "auto" || positionY === "auto")
                ) ||
                positionY === "top"
            ) {
                translateY = -(calendarHeight + inputHeight + 4)
            } else if (top - calendarHeight < 0) {
                translateY = 2
            }

            if (
                (
                    (
                        (left > Math.abs(halfDistance) && right + Math.abs(halfDistance) < clientWidth) ||
                        inputWidth > calendarWidth
                    ) &&
                    (calendarPosition === "auto" || positionX === "auto")
                ) ||
                positionX === "center"
            ) {
                translateX = isRTL ? -halfDistance : halfDistance
            } else if (
                (right + Math.abs(halfDistance) > clientWidth) ||
                positionX === "right"
            ) {
                translateX = isRTL ? 0 : distance
            } else if (positionX === "left") {
                translateX = isRTL ? -distance : 0
            }

            if (mustAddAnimation) translateY += translateY >= 0 ? 12 : -12

            wrapper.style.transform = getTransform(translateX, translateY)

            if (mustAddAnimation) {
                setTimeout(() => {
                    wrapper.style.transition = "0.4s"
                    wrapper.style.transform = getTransform(translateX, translateY + (translateY > 0 ? -12 : 12))
                }, 8);
            }

            calendar.classList.add("active")
        }

        checkPosition()

        document.addEventListener("scroll", checkPosition, true)
        window.addEventListener("resize", checkPosition)

        return () => {
            document.removeEventListener("scroll", checkPosition, true)
            window.removeEventListener("resize", checkPosition)
        }
    }, [scrollSensitive, hideOnScroll, isCalendarReady, closeCalendar, isVisible, calendarPosition, animation])

    if (multiple || range || Array.isArray(date) || !editable) inputMode = "none"

    return (
        <div
            ref={datePickerRef}
            className={`rmdp-container ${containerClassName}`}
            style={containerStyle}
        >
            {renderInput()}
            {isVisible && (
                <div
                    ref={calendarRef}
                    className={`rmdp-calendar-container ${isMobileMode() ? "rmdp-calendar-container-mobile" : ""}`}
                >
                    <Calendar
                        value={date}
                        onChange={handleChange}
                        range={range}
                        multiple={multiple}
                        calendar={calendar}
                        local={local}
                        format={format}
                        timePicker={timePicker}
                        onlyTimePicker={onlyTimePicker}
                        onlyMonthPicker={onlyMonthPicker}
                        onlyYearPicker={onlyYearPicker}
                        mustShowDates={mustShowDates}
                        className={className}
                        weekDays={weekDays}
                        months={months}
                        showOtherDays={showOtherDays}
                        minDate={minDate}
                        maxDate={maxDate}
                        formattingIgnoreList={JSON.parse(formattingIgnoreList)}
                        onReady={() => setIsCalendarReady(true)}
                        onlyShowInRangeDates={onlyShowInRangeDates}
                        {...otherProps}
                    >
                        {children}
                        {isMobileMode() &&
                            <div className={`rmdp-action-buttons ${["fa", "ar"].includes(local) ? "rmdp-rtl" : ""}`} >
                                <button
                                    type="button"
                                    className="rmdp-button rmdp-action-button"
                                    onClick={() => {
                                        if (ref.current.temporaryDate) {
                                            handleChange(ref.current.temporaryDate, true)
                                            delete ref.current.temporaryDate
                                        }
                                        if(editClick) editClick()
                                        closeCalendar()
                                    }}
                                >
                                    {toLocal("OK")}
                                </button>
                                <button
                                    type="button"
                                    className="rmdp-button rmdp-action-button"
                                    onClick={() => {
if(cancleClick)cancleClick()
                                        closeCalendar()
                                        delete ref.current.temporaryDate
                                    }}
                                >
                                    {toLocal("CANCEL")}
                                </button>
                            </div>
                        }
                    </Calendar>
                </div>
            )}
        </div>
    )

    function isMobileMode() {
        return typeof className === "string" && className.includes("rmdp-mobile")
    }

    function toLocal(string) {
        let actions = {
            [DateObject.locals.EN]: { OK: "OK", CANCEL: "CANCEL" },
            [DateObject.locals.FA]: { OK: "تأیید", CANCEL: "لغو" },
            [DateObject.locals.AR]: { OK: "تأكيد", CANCEL: "الغاء" },
            [DateObject.locals.HI]: { OK: "पुष्टि", CANCEL: "रद्द करें" }
        }

        if (typeof local === "string" && actions[local.toUpperCase()]) return actions[local.toUpperCase()][string]

        return string
    }

    function openCalendar() {
        if (disabled) return

        let isMobile = isMobileMode()
        let isInput = inputRef.current.tagName === "INPUT" || inputRef.current.querySelector("input")

        if (!value && !ref.current.date && !range && !multiple) {
            let date = new DateObject({ calendar, local, format })

            if (
                (!minDate || (minDate && date > minDate)) &&
                (!maxDate || (maxDate && date < maxDate))
            ) {
                handleChange(date, isMobile)

                ref.current.date = date
            }
        }

        if (isMobile && isInput) inputRef.current.blur()

        if (isInput || (!isInput && !isVisible)) {
            setIsVisible(true)
        } else if (!isInput && isVisible) {
            closeCalendar()
        }
    }

    function setCustomNames(date) {
        if (isValidMonths(months)) date.months = months
        if (isValidWeekDays(weekDays)) date.weekDays = weekDays
    }

    function handleChange(date, force) {
        if (isMobileMode() && !force) return ref.current.temporaryDate = date

        setDate(date)

        ref.current = { ...ref.current, date }

        if (onChange instanceof Function) {
            if (!Array.isArray(date)) {
                onChange(new DateObject(date))
            } else {
                onChange(date.map(d => new DateObject(d)))
            }
        }

        if (date) {
            if (Array.isArray(date)) {
                date.map(setCustomNames)

                setStringDate(getStringDate(date, type, separator, format, formattingIgnoreList))
            } else {
                setCustomNames(date)

                setStringDate(date.format(getFormat(timePicker, onlyTimePicker, onlyMonthPicker, onlyYearPicker, format, range, multiple), JSON.parse(formattingIgnoreList)))
            }
        }
    }

    function handleValueChange(e) {
        if (Array.isArray(date) || !editable) return

        let value = e.target.value,
            object = { year: 1, calendar, local, format },
            digits = date && date.isValid ? date.digits : new DateObject(object).digits

        if (type === "input") {
            let start = e.target.selectionStart

            ref.current.start = start
        }

        if (!value) {
            setStringDate("")

            return handleChange(new DateObject({}))
        }

        if (!digits) return

        for (let digit of digits) {
            value = value.replace(new RegExp(digit, "g"), digits.indexOf(digit))
        }

        let newDate = new DateObject(date?.isValid ? date : object).parse(value)

        handleChange(newDate)

        setStringDate(value.replace(/[0-9]/g, w => digits[w]))
    }

    function renderInput() {
        let isMultiple = (!range && Array.isArray(date)) || multiple

        let multipleStyle = isMultiple ? {
            whiteSpace: "nowrap",
            overflow: "hidden"
        } : {}

        switch (type) {
            case "button":
                return (
                    <button
                        ref={inputRef}
                        onClick={openCalendar}
                        name={name || ""}
                        className={inputClass || "rmdp-button"}
                        style={{
                            minWidth: Array.isArray(date) ? "185px" : "unset",
                            ...multipleStyle,
                            ...style
                        }}
                        disabled={disabled ? true : false}
                        type="button"
                    >
                        {stringDate || placeholder || "click to select"}
                    </button>
                )
            case "icon":
                return (
                    <div
                        ref={inputRef}
                        style={{ display: "inline-block" }}
                    >
                        <Icon
                            onClick={openCalendar}
                            name={name || ""}
                            className={`rmdp-icon ${inputClass || ""}`}
                            style={style}
                        />
                    </div>
                )
            case "custom":
                let strDate = stringDate || ""
                let toString = date => date.format(format, JSON.parse(formattingIgnoreList))

                if (
                    multiple ||
                    (range && !otherProps.eachDaysInRange)
                ) {
                    if (!Array.isArray(date)) {
                        strDate = []
                    } else {
                        strDate = date.map(toString)
                    }
                } else if (range && otherProps.eachDaysInRange) {
                    if (!Array.isArray(date)) {
                        strDate = []
                    } else {
                        strDate = getAllDatesInRange(date).map(toString)
                    }
                }

                return (
                    <div ref={inputRef}>
                        {React.isValidElement(render) ?
                            React.cloneElement(render, {
                                [multiple || range ? "stringDates" : "stringDate"]: strDate,
                                openCalendar,
                                handleValueChange
                            }) :
                            render instanceof Function ?
                                render(strDate, openCalendar, handleValueChange) :
                                null
                        }
                    </div>
                )
            default:
                return (
                    <div style={{ position: "relative" }}>
                        <input
                            ref={inputRef}
                            type="text"
                            name={name || ""}
                            onFocus={openCalendar}
                            className={inputClass || "rmdp-input"}
                            placeholder={placeholder || ""}
                            value={stringDate}
                            onChange={handleValueChange}
                            style={style}
                            autoComplete="off"
                            disabled={disabled ? true : false}
                            inputMode={inputMode || (isMobileMode() ? "none" : undefined)}
                        />
                        {type === "input-icon" &&
                            <Icon
                                className="rmdp-input-icon"
                                style={{
                                    marginTop: `${((((inputRef.current?.clientHeight - 21) / 2) | 0) + 2) || 2}px`
                                }}
                                onClick={() => {
                                    if (isVisible) {
                                        closeCalendar()
                                    } else {
                                        inputRef.current.focus()
                                    }
                                }}
                            />
                        }
                    </div>
                )
        }
    }
}

function getFormat(timePicker, onlyTimePicker, onlyMonthPicker, onlyYearPicker, format, range, multiple) {
    if (format) return format
    if (timePicker && !range && !multiple) return "YYYY/MM/DD HH:mm:ss"
    if (onlyTimePicker) return "HH:mm:ss"
    if (onlyMonthPicker) return "MM/YYYY"
    if (onlyYearPicker) return "YYYY"
    if (range || multiple) return "YYYY/MM/DD"
}

function isValidMonths(value) {
    return Array.isArray(value) && value.length === 12 && value.every(array => {
        return Array.isArray(array) && array.length === 2 && array.every(string => typeof string === "string")
    })
}

function isValidWeekDays(value) {
    return Array.isArray(value) && value.length === 7 && value.every(array => {
        return Array.isArray(array) && array.length === 2 && array.every(string => typeof string === "string")
    })
}

function getStringDate(date, type, separator, format, formattingIgnoreList) {
    if (!date) return ""

    let toString = date => date.format(format, JSON.parse(formattingIgnoreList))

    return type === "button" && date.length > 1 ?
        [date[0], date[1]].map(toString).join(separator)
        :
        date.map(toString).join(separator)
}

function getInput(inputRef) {
    if (!inputRef.current) return

    return inputRef.current.tagName === "INPUT" ? inputRef.current : inputRef.current.querySelector("input")
}
