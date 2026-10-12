# Forex Session Board



A clean, modern \[Scriptable](https://scriptable.app) widget that shows the real-time status of the four major Forex sessions — \*\*Sydney\*\*, \*\*Tokyo\*\*, \*\*London\*\*, and \*\*New York\*\*.



\### Features



\- Live open/closed status for all four major FX sessions

\- Next open / close countdown

\- Full 24-hour visual schedule in \*\*your local time\*\*

\- Best liquidity hour, quietest hour, and NY “witching” hour

\- Automatic Light / Dark mode support

\- Correct handling of DST, weekends, and major holidays (Christmas, New Year, Good Friday)

\- Works on Home Screen (Small / Medium / Large) and Lock Screen (Circular / Rectangular / Inline)



\### Supported Widget Sizes



| Size                        | Supported |

|-----------------------------|-----------|

| Small                       | ✅        |

| Medium                      | ✅        |

| Large                       | ✅        |

| Lock Screen – Rectangular   | ✅        |

| Lock Screen – Circular      | ✅        |

| Lock Screen – Inline        | ✅        |



\### Installation



1\. Install the free \*\*Scriptable\*\* app from the App Store.

2\. Open Scriptable → tap \*\*+\*\* → paste the contents of \[`widget.js`](widget.js).

3\. Name the script whatever you like (e.g. “Forex Sessions”).

4\. Long-press your Home Screen → \*\*+\*\* → search for \*\*Scriptable\*\* → add the desired size.

5\. Tap the widget → select the script you just created.



No parameters or configuration needed. The widget automatically uses your device’s local time zone.



\### Preview inside Scriptable



At the top of the script you can change:



```js

const PREVIEW\_FAMILY = 'large'; // 'small' | 'medium' | 'large' | 'accessoryRectangular' | ...

Run the script inside the Scriptable app to see a live preview.

Theme Override (for testing)

JavaScript
const THEME_OVERRIDE = null; // null = system | 'light' | 'dark'