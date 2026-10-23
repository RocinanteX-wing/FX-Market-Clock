# FX Market Clock

[![Scriptable](https://img.shields.io/badge/Scriptable-iOS%20Widget-blue?logo=apple)](https://scriptable.app)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20iPadOS-lightgrey)](https://www.apple.com/ios/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.txt)

A premium-style Scriptable widget for iOS that tracks the four major foreign exchange sessions in real time: Sydney, Tokyo, London, and New York.

It surfaces the current market state, next open/close event, 24-hour session schedule in local time, and liquidity-focused windows such as the best liquidity period, quietest hour, and the New York witching hour.

This is built for traders, market participants, and anyone who wants a quick read on global FX market activity from their Home Screen, Lock Screen, or StandBy display.

It also includes a dedicated StandBy layout for iPhone charging mode.

---

## Overview

FX Market Clock is a single self-contained Scriptable widget file with no backend, API key, or server, plus an optional second file for StandBy.

Instead of fetching live market data from a remote service, it calculates the current market phase from session timing rules, local time zones, and market calendar logic. That means it remains lightweight and dependable while still capturing the essentials of global FX market behavior.

The widget is especially useful for:

- Monitoring which FX sessions are open right now
- Seeing when the next market open or close will happen
- Viewing the full 24-hour schedule in your local time
- Identifying the strongest or quietest liquidity windows
- Checking daylight-saving-time-safe session timing on the fly
- Using a dedicated StandBy layout when your iPhone is charging in landscape

---

## Features

- Live detection of open and closed status for Sydney, Tokyo, London, and New York
- Countdown to the next session open or close, as a live ticking timer that keeps counting between refreshes
- Visual 24-hour market timeline aligned to your device’s local time
- Best liquidity window, quiet hour, and NY witching-hour markers
- StandBy-ready black-screen layout optimized for iPhone landscape charging mode
- Automatic light/dark mode compatibility via the device appearance
- Correct handling of:
  - daylight saving time
  - weekend market closure
  - Christmas Day and New Year’s Day closures
  - Good Friday for London and Sydney trading sessions
- Works across Home Screen and Lock Screen widget sizes
- No configuration required for normal use
- Main widget is one self-contained file with no backend or API key, plus an optional second file for StandBy

---

## Screenshots

<p align="center">
  <img src="assets/large-mockup.png" width="560" alt="Large FX Market Clock widget preview">
</p>

<table align="center">
  <tr>
    <td align="center" valign="top">
      <img src="assets/small-mockup.png" width="320" alt="Small widget preview"><br>
      <sub><strong>Small</strong></sub>
    </td>
    <td width="32"></td>
    <td align="center" valign="top">
      <img src="assets/medium-mockup.png" width="320" alt="Medium widget preview"><br>
      <sub><strong>Medium</strong></sub>
    </td>
  </tr>
</table>

<p align="center">
  <img src="assets/lockscreen-mockup.png" width="500" alt="Lock Screen widget preview"><br>
  <sub><strong>Lock Screen</strong></sub>
</p>

<p align="center">
  <img src="assets/standby-mockup.png" width="420" alt="StandBy widget preview"><br>
  <sub><strong>StandBy</strong></sub>
</p>

---

## Supported Widget Sizes

| Size | Supported |
| --- | :---: |
| Small | ✅ |
| Medium | ✅ |
| Large | ✅ |
| Lock Screen – Rectangular | ✅ |
| Lock Screen – Circular | ✅ |
| Lock Screen – Inline | ✅ |
| StandBy (iPhone landscape charging view) | ✅ |

---

## How It Works

The widget models the session timing using time-zone-aware calculations rather than fixed UTC assumptions.

Each session is defined with:

- city name
- short code
- time zone
- local open time
- local close time
- relative weighting used to estimate daily liquidity

For each session, the script computes:

- the UTC offset for that market at the current time
- the opening and closing boundaries in UTC
- whether the session is currently open
- the next scheduled open/close boundary
- whether the market is affected by weekend or holiday closure rules

### Market logic

The widget uses a few explicit rules to determine whether the market is active:

- FX is closed from Friday 17:00 New York time through Sunday 17:00 New York time
- Christmas Day is treated as a global closure
- New Year's Day is treated as a global closure
- Good Friday is treated as a closure for London and Sydney

This is implemented in JavaScript using the system’s time-zone and date APIs so the widget will stay consistent across DST transitions and international market calendars.

### Session weighting and liquidity windows

The script assigns approximate market activity weights to each session:

- Sydney: 0.06
- Tokyo: 0.19
- London: 0.43
- New York: 0.32

These weights are used to estimate where the market is busiest and quietest over the day. The widget highlights:

- Best liquidity hour: highest combined volume window
- Quiet hour: lowest combined volume window
- Witching hour: late New York close period, used as a FX market timing reference

---

## Installation

1. Install the free [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) app from the App Store.
2. Open Scriptable.
3. Tap the `+` button to create a new script.
4. Paste the full contents of `fx-market-clock.js` into the editor.
5. Save the script with a name such as `FX Market Clock`.
6. Add a Scriptable widget to your Home Screen or Lock Screen (the size is chosen when adding it).
7. Tap the widget and select the script you created.

No parameters are required under normal use. The script automatically uses the device’s local timezone and system light/dark appearance.

### StandBy setup

StandBy (iPhone on its side while charging) shows the small widget, scaled up, on a black screen. Scriptable cannot detect StandBy, so the StandBy layout only appears when you ask for it, and your normal Home Screen small widget is never affected.

Use either of these methods:

- Same script: in the StandBy widget, choose `fx-market-clock.js` and set the widget Parameter to `standby`.
- Separate script: paste `fx-market-clock-standby.js` into a new Scriptable script (for example, "FX Market Clock StandBy") and choose it for the StandBy widget. No parameter is needed, because it has `STANDBY_ONLY_SCRIPT = true`.

Never set `STANDBY_ONLY_SCRIPT = true` in the main script, because every small widget using that script would then show the StandBy layout.

This layout has a black background and a large live countdown, and shows open/closed status by shape (filled dot vs. ring) so it stays readable in StandBy’s red Night Mode.

---

## Preview and Testing

The script includes a preview mode for testing directly inside Scriptable.

At the top of `fx-market-clock.js`, you can adjust:

```js
const PREVIEW_FAMILY = 'large';
// 'small' | 'medium' | 'large' | 'accessoryRectangular' | 'accessoryCircular' | 'accessoryInline'

const STANDBY_ONLY_SCRIPT = false;
// true only in a separate copy used for StandBy

const PREVIEW_STANDBY = false;
// preview the StandBy layout inside Scriptable; set PREVIEW_FAMILY = 'small'; no effect on real widgets

const THEME_OVERRIDE = null;
// null = follow system | 'light' | 'dark'
```

This is useful when you want to:

- preview a specific widget size
- test dark mode and light mode rendering
- verify layout behavior before placing it on your Home Screen
- preview the StandBy rendering in the Scriptable editor

---

## Project Structure

```text
FX-Market-Clock/
├── LICENSE.txt
├── README.md
├── fx-market-clock.js
├── fx-market-clock-standby.js
└── assets/
    ├── large-mockup.png
    ├── medium-mockup.png
    ├── small-mockup.png
    ├── lockscreen-mockup.png
    └── standby-mockup.png
```

- `fx-market-clock.js` — the main widget implementation
- `fx-market-clock-standby.js` — optional StandBy layout for iPhone landscape charging view
- `assets/` — mockup images used in the documentation
- `LICENSE.txt` — project licensing terms
- `README.md` — usage and project documentation

---

## Customization

The widget styling is centralized in the theme block at the top of `fx-market-clock.js`.

You can tailor the appearance by editing the color values defined in `C`:

```js
const C = {
  surface: themed('#F5F3ED', '#191C1A'),
  surfaceRaised: themed('#FBFAF6', '#1F2320'),
  ink: themed('#1D211F', '#EEECE4'),
  inkSoft: themed('#3F4441', '#C6C6BD'),
  muted: themed('#777C77', '#90958F'),
  accent: themed('#9A7135', '#C59A57'),
  // ...
};
```

This lets you change the visual language while keeping the existing layout intact.

---

## Why Use This Widget?

Unlike generic time widgets, FX Market Clock is purpose-built around the rhythm of global financial markets.

It gives you a quick, glanceable overview of:

- when the market is open or closed
- where overlap is occurring across trading sessions
- when the next key event will happen
- which periods are likely to offer better liquidity conditions
- how the market looks in a dedicated StandBy reading mode

For many users, this is a more meaningful view than a simple clock because it reflects the actual operational behavior of the FX market across the 24-hour trading cycle.

---

## License

This project is distributed under the MIT License. See [`LICENSE.txt`](LICENSE.txt) for the full text.

---

## Notes

This repository is intentionally lightweight and focused. It is designed to be easy to understand, easy to customize, and easy to drop into Scriptable for daily use without redesigning the widget.

If you want a different visual theme, alternate session definitions, or more explicit trading-day logic, the implementation is already structured so those changes can be made in one place without redesigning the widget.

---

## Acknowledgements

- [Scriptable](https://scriptable.app) for the widget runtime and app platform
- The global forex market schedule model used in this widget for session timing and liquidity interpretation
- The open-source community for inspiration around widget design and market visualizations
