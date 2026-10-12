# Forex Session Board

[![Scriptable](https://img.shields.io/badge/Scriptable-iOS%20Widget-blue?logo=apple)](https://scriptable.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.txt)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20iPadOS-lightgrey)](https://www.apple.com/ios/)

A clean and modern [Scriptable](https://scriptable.app) widget that shows the real-time status of the four major Forex sessions — **Sydney**, **Tokyo**, **London**, and **New York**.

---

### Features

- Live open/closed status for all four major FX sessions
- Next open / close countdown
- Full 24-hour visual schedule in **your local time**
- Best liquidity hour, quietest hour, and NY “witching” hour
- Automatic Light / Dark mode support
- Correct handling of DST, weekends, and major holidays (Christmas, New Year, Good Friday)
- Supports Home Screen (Small / Medium / Large) and Lock Screen widgets

---

### Screenshots

> **Tip:** Replace the placeholder images below with real screenshots of your widget.

| Small | Medium | Large |
|:-----:|:------:|:-----:|
| ![Small](assets/small.png) | ![Medium](assets/medium.png) | ![Large](assets/large.png) |

| Lock Screen – Rectangular | Lock Screen – Circular |
|:-------------------------:|:----------------------:|
| ![Rectangular](assets/rectangular.png) | ![Circular](assets/circular.png) |

---

### Supported Widget Sizes

| Size                        | Supported |
|-----------------------------|:---------:|
| Small                       | ✅        |
| Medium                      | ✅        |
| Large                       | ✅        |
| Lock Screen – Rectangular   | ✅        |
| Lock Screen – Circular      | ✅        |
| Lock Screen – Inline        | ✅        |

---

### Installation

1. Install the free **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** app from the App Store.
2. Open Scriptable → tap **+** → paste the contents of [`widget.js`](widget.js).
3. Name the script whatever you like (e.g. “Forex Sessions”).
4. Long-press your Home Screen → **+** → search for **Scriptable** → add the desired size.
5. Tap the new widget → select the script you just created.

No parameters or configuration needed. The widget automatically uses your device’s local time zone and appearance setting.

---

### Preview & Testing

At the top of the script you can change these values for testing:

```js
// Which size to preview when running inside Scriptable
const PREVIEW_FAMILY = 'large'; 
// Options: 'small' | 'medium' | 'large' | 'accessoryRectangular' | 'accessoryCircular' | 'accessoryInline'

// Force Light or Dark mode while testing (null = follow system)
const THEME_OVERRIDE = null; // null | 'light' | 'dark'
