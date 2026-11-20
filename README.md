# BudgetWise

A simple budget app anyone can use: your salary, your local costs and the costs you pay back home, and how much you can save each month.

**Open it:** https://vonrmangaron.github.io/BudgetWise/

- Set your name, salary and payday (weekly, fortnightly, monthly, or custom like the 3rd Friday of the month).
- Two lists: costs back home (Philippines by default — any country works) and local costs. Each cost can repeat (once, weekly, fortnightly, monthly, every 3 months, yearly) and can be a debt that counts down to the day it's paid off.
- The exchange rate is checked automatically each day ([Exchange Rate API](https://www.exchangerate-api.com)), or you can set your own.
- History keeps each month's income, costs and savings.
- No login. Everything is saved in your browser on your phone — use Setup › Save backup now and then.
- Works offline and can be added to your home screen.

Plain HTML, CSS and JavaScript — no build step. Bump `CACHE` in `sw.js` on every release.
